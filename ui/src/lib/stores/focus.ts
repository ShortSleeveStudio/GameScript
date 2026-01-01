/**
 * Focus management store.
 *
 * Tracks which entities are currently selected across all panels.
 * Ported from GameScriptElectron with adaptations for IDE plugin architecture.
 *
 * In a multi-webview IDE architecture, focus synchronization happens via:
 * 1. Panel A selects an item -> posts message to extension
 * 2. Extension broadcasts selection to all panels
 * 3. All panels update their focus stores
 *
 * In the current single-webview architecture (Golden Layout), focus is
 * shared directly within the same JavaScript context.
 */

import { writable, derived, type Writable, type Readable } from 'svelte/store';
import { bridge } from '$lib/api/bridge.js';
import {
    DATABASE_TABLES,
    TABLE_CONVERSATIONS,
    TABLE_NODES,
    TABLE_EDGES,
    TABLE_ACTORS,
    TABLE_LOCALES,
    TABLE_LOCALIZATIONS,
    TABLE_CONVERSATION_TAG_CATEGORIES,
    TABLE_LOCALIZATION_TAG_CATEGORIES,
} from '@gamescript/shared';
import type { IDbRowView } from '$lib/db/db-view-row-interface.js';
import type { FocusChangeEvent, LocalePrincipal  } from '@gamescript/shared';
import type { TableType } from '$lib/db';
import { dbConnected } from './connection.js';
import type { UniqueNameTracker } from './unique-name-tracker.js';

// Re-export for backwards compatibility with stores/index.ts
export type { UniqueNameTracker };

// ============================================================================
// Types
// ============================================================================

/** Focus request types */
export const FOCUS_CLEAR = 0;
export const FOCUS_REPLACE = 1;
export const FOCUS_ADD = 2;
export const FOCUS_REMOVE = 3;
export const FOCUS_REQUEST_TYPES: number[] = [
    FOCUS_CLEAR,
    FOCUS_REPLACE,
    FOCUS_ADD,
    FOCUS_REMOVE,
] as const;
export type FocusRequestType = (typeof FOCUS_REQUEST_TYPES)[number];

/** Focus mode types */
export const FOCUS_MODE_MODIFY = 0;
export const FOCUS_MODE_REPLACE = 1;
export const FOCUS_MODE_TYPES: number[] = [FOCUS_MODE_MODIFY, FOCUS_MODE_REPLACE] as const;
export type FocusModeType = (typeof FOCUS_MODE_TYPES)[number];

/** Focus source constants - identifies where a focus change originated */
export const FOCUS_SOURCE_GRAPH = 'graph';
export const FOCUS_SOURCE_INSPECTOR = 'inspector';
export const FOCUS_SOURCE_SEARCH = 'search';
export const FOCUS_SOURCE_EXTERNAL = 'external';
export type FocusSource = typeof FOCUS_SOURCE_GRAPH | typeof FOCUS_SOURCE_INSPECTOR | typeof FOCUS_SOURCE_SEARCH | typeof FOCUS_SOURCE_EXTERNAL | null;

/** A focused item with optional payload data */
export interface Focus {
    rowId: number;
    payload?: FocusPayload;
}

/** A request to modify focus state for a table */
export interface FocusRequest {
    tableType: TableType;
    focus: Map<number, Focus>;
    type: FocusRequestType;
}

/** A batch of focus requests */
export interface FocusRequests {
    type: FocusModeType;
    requests: FocusRequest[];
    source?: FocusSource;
}

/** Focus payload types for different inspectors */
export interface FocusPayload {}

export interface FocusPayloadActor extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
}

export interface FocusPayloadLocale extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
    localePrincipalRowView: IDbRowView<LocalePrincipal>;
}

export interface FocusPayloadGraphElement extends FocusPayload {
    requestIsFromGraph: boolean;
}

export interface FocusPayloadLocalization extends FocusPayload {
    // Currently empty, but can be extended with additional data if needed
}

export interface FocusPayloadConversationTagCategory extends FocusPayload {
    // Currently empty, but can be extended with additional data if needed
}

export interface FocusPayloadLocalizationTagCategory extends FocusPayload {
    // Currently empty, but can be extended with additional data if needed
}

// ============================================================================
// Action Pattern (shared utility)
// ============================================================================

import { Action, type ActionHandler, type ActionUnsubscriber } from '$lib/utility/action.js';
export type { ActionHandler, ActionUnsubscriber };

// ============================================================================
// FocusManager Class (matches Electron pattern)
// ============================================================================

export class FocusManager {
    private _focus: Map<number, Focus>[];
    private _action: Action<void>;
    private _dbConnected: Writable<boolean>;
    private _source: FocusSource = null;

    constructor(dbConnectedStore: Writable<boolean>) {
        this._focus = DATABASE_TABLES.map(() => new Map());
        this._action = new Action<void>();
        this._dbConnected = dbConnectedStore;
        this._dbConnected.subscribe(this.onConnectionChanged);
    }

    focus(request: FocusRequests): void {
        let mutationOccurred: boolean = false;
        const focusRequests: FocusRequest[] = request.requests;
        const modifiedTables: Set<number> = new Set();

        for (let i = 0; i < focusRequests.length; i++) {
            const req: FocusRequest = focusRequests[i];
            modifiedTables.add(req.tableType.id);
            let focusMap: Map<number, Focus> = this._focus[req.tableType.id];

            switch (req.type) {
                case FOCUS_ADD:
                    for (const value of req.focus.values()) {
                        if (focusMap.has(value.rowId)) continue;
                        else {
                            focusMap.set(value.rowId, value);
                            mutationOccurred = true;
                        }
                    }
                    break;
                case FOCUS_REMOVE:
                    for (const value of req.focus.values()) {
                        if (!focusMap.has(value.rowId)) continue;
                        else {
                            focusMap.delete(value.rowId);
                            mutationOccurred = true;
                        }
                    }
                    break;
                case FOCUS_REPLACE:
                    if (req.focus.size === focusMap.size) {
                        for (const value of req.focus.values()) {
                            if (focusMap.has(value.rowId)) {
                                continue;
                            } else {
                                focusMap = req.focus;
                                mutationOccurred = true;
                                break;
                            }
                        }
                    } else {
                        focusMap = req.focus;
                        mutationOccurred = true;
                    }
                    break;
                case FOCUS_CLEAR:
                    if (focusMap.size === 0) continue;
                    else {
                        focusMap.clear();
                        mutationOccurred = true;
                    }
                    break;
                default:
                    throw new Error(`Unexpected focus type requested: ${req.type}`);
            }
            // In case replace happened, reassign the map
            this._focus[req.tableType.id] = focusMap;
        }

        if (request.type === FOCUS_MODE_REPLACE) {
            const tablesNeedClearing: number[] = [];
            for (let i = 0; i < DATABASE_TABLES.length; i++) {
                if (!modifiedTables.has(i)) {
                    tablesNeedClearing.push(i);
                }
            }
            if (tablesNeedClearing.length > 0) {
                for (let i = 0; i < tablesNeedClearing.length; i++) {
                    this._focus[tablesNeedClearing[i]].clear();
                }
                mutationOccurred = true;
            }
        }

        if (mutationOccurred) {
            this._source = request.source ?? null;
            this._action.fire();
        }
    }

    get(): readonly Map<number, Focus>[] {
        return this._focus;
    }

    getSource(): FocusSource {
        return this._source;
    }

    subscribe(handler: ActionHandler<void>): ActionUnsubscriber {
        const unsubscriber: ActionUnsubscriber = this._action.register(handler);
        handler();
        return unsubscriber;
    }

    unsubscribe(handler: ActionHandler<void>): void {
        this._action.unregister(handler);
    }

    private onConnectionChanged = (isConnected: boolean): void => {
        if (isConnected) return;
        for (let i = 0; i < this._focus.length; i++) {
            this._focus[i].clear();
        }
    };
}

/** Export singleton FocusManager */
export const focusManager: FocusManager = new FocusManager(dbConnected);

// ============================================================================
// Svelte Store Interface (for components that prefer stores)
// ============================================================================

/** Map of table id -> Map of row id -> Focus */
type FocusState = Map<number, Map<number, Focus>>;

function createEmptyFocusState(): FocusState {
    const state = new Map<number, Map<number, Focus>>();
    for (const table of DATABASE_TABLES) {
        state.set(table.id, new Map());
    }
    return state;
}

/** Internal writable store for all focus state */
const focusState: Writable<FocusState> = writable(createEmptyFocusState());

// Sync focusManager changes to the store
focusManager.subscribe(() => {
    const focus = focusManager.get();
    focusState.update((state) => {
        for (let i = 0; i < focus.length; i++) {
            state.set(i, new Map(focus[i]));
        }
        return state;
    });
});

// ============================================================================
// Derived Stores for Common Access Patterns
// ============================================================================

/** Currently focused conversation IDs */
export const focusedConversations: Readable<number[]> = derived(focusState, ($state) =>
    Array.from($state.get(TABLE_CONVERSATIONS.id)?.keys() ?? [])
);

/** Currently focused node IDs */
export const focusedNodes: Readable<number[]> = derived(focusState, ($state) =>
    Array.from($state.get(TABLE_NODES.id)?.keys() ?? [])
);

/** Currently focused edge IDs */
export const focusedEdges: Readable<number[]> = derived(focusState, ($state) =>
    Array.from($state.get(TABLE_EDGES.id)?.keys() ?? [])
);

/** Currently focused actor IDs */
export const focusedActors: Readable<number[]> = derived(focusState, ($state) =>
    Array.from($state.get(TABLE_ACTORS.id)?.keys() ?? [])
);

/** The single focused conversation (if exactly one is selected) */
export const focusedConversation: Readable<number | null> = derived(focusedConversations, ($ids) =>
    $ids.length === 1 ? $ids[0] : null
);

/** The single focused node (if exactly one is selected) */
export const focusedNode: Readable<number | null> = derived(focusedNodes, ($ids) =>
    $ids.length === 1 ? $ids[0] : null
);

/** The single focused edge (if exactly one is selected) */
export const focusedEdge: Readable<number | null> = derived(focusedEdges, ($ids) =>
    $ids.length === 1 ? $ids[0] : null
);

/** The single focused actor (if exactly one is selected) */
export const focusedActor: Readable<number | null> = derived(focusedActors, ($ids) =>
    $ids.length === 1 ? $ids[0] : null
);

/** Currently focused conversation tag category IDs */
export const focusedConversationTagCategories: Readable<number[]> = derived(focusState, ($state) =>
    Array.from($state.get(TABLE_CONVERSATION_TAG_CATEGORIES.id)?.keys() ?? [])
);

/** The single focused conversation tag category (if exactly one is selected) */
export const focusedConversationTagCategory: Readable<number | null> = derived(focusedConversationTagCategories, ($ids) =>
    $ids.length === 1 ? $ids[0] : null
);

/** Currently focused localization tag category IDs */
export const focusedLocalizationTagCategories: Readable<number[]> = derived(focusState, ($state) =>
    Array.from($state.get(TABLE_LOCALIZATION_TAG_CATEGORIES.id)?.keys() ?? [])
);

/** The single focused localization tag category (if exactly one is selected) */
export const focusedLocalizationTagCategory: Readable<number | null> = derived(focusedLocalizationTagCategories, ($ids) =>
    $ids.length === 1 ? $ids[0] : null
);

/** Whether anything is currently selected */
export const hasSelection: Readable<boolean> = derived(focusState, ($state) => {
    for (const map of $state.values()) {
        if (map.size > 0) return true;
    }
    return false;
});

// ============================================================================
// Convenience Focus Functions
// ============================================================================

/**
 * Focus a single conversation.
 */
export function focusConversation(id: number, payload?: FocusPayload): void {
    const focusMap = new Map<number, Focus>();
    focusMap.set(id, { rowId: id, payload });
    focusManager.focus({
        type: FOCUS_MODE_REPLACE,
        requests: [{
            tableType: TABLE_CONVERSATIONS,
            focus: focusMap,
            type: FOCUS_REPLACE,
        }],
    });
}

/**
 * Focus a single node.
 */
export function focusNode(id: number, payload?: FocusPayload): void {
    const focusMap = new Map<number, Focus>();
    focusMap.set(id, { rowId: id, payload });
    focusManager.focus({
        type: FOCUS_MODE_MODIFY,
        requests: [{
            tableType: TABLE_NODES,
            focus: focusMap,
            type: FOCUS_REPLACE,
        }],
    });
}

/**
 * Focus a single edge.
 */
export function focusEdge(id: number, payload?: FocusPayload): void {
    const focusMap = new Map<number, Focus>();
    focusMap.set(id, { rowId: id, payload });
    focusManager.focus({
        type: FOCUS_MODE_MODIFY,
        requests: [{
            tableType: TABLE_EDGES,
            focus: focusMap,
            type: FOCUS_REPLACE,
        }],
    });
}

/**
 * Focus a single actor.
 */
export function focusActor(id: number, payload?: FocusPayload): void {
    const focusMap = new Map<number, Focus>();
    focusMap.set(id, { rowId: id, payload });
    focusManager.focus({
        type: FOCUS_MODE_REPLACE,
        requests: [{
            tableType: TABLE_ACTORS,
            focus: focusMap,
            type: FOCUS_REPLACE,
        }],
    });
}

/**
 * Focus a single locale.
 */
export function focusLocale(id: number, payload?: FocusPayload): void {
    const focusMap = new Map<number, Focus>();
    focusMap.set(id, { rowId: id, payload });
    focusManager.focus({
        type: FOCUS_MODE_REPLACE,
        requests: [{
            tableType: TABLE_LOCALES,
            focus: focusMap,
            type: FOCUS_REPLACE,
        }],
    });
}

/**
 * Focus a single localization.
 */
export function focusLocalization(id: number, payload?: FocusPayload): void {
    const focusMap = new Map<number, Focus>();
    focusMap.set(id, { rowId: id, payload });
    focusManager.focus({
        type: FOCUS_MODE_REPLACE,
        requests: [{
            tableType: TABLE_LOCALIZATIONS,
            focus: focusMap,
            type: FOCUS_REPLACE,
        }],
    });
}

/**
 * Focus a single conversation tag category.
 */
export function focusConversationTagCategory(id: number, payload?: FocusPayload): void {
    const focusMap = new Map<number, Focus>();
    focusMap.set(id, { rowId: id, payload });
    focusManager.focus({
        type: FOCUS_MODE_REPLACE,
        requests: [{
            tableType: TABLE_CONVERSATION_TAG_CATEGORIES,
            focus: focusMap,
            type: FOCUS_REPLACE,
        }],
    });
}

/**
 * Focus a single localization tag category.
 */
export function focusLocalizationTagCategory(id: number, payload?: FocusPayload): void {
    const focusMap = new Map<number, Focus>();
    focusMap.set(id, { rowId: id, payload });
    focusManager.focus({
        type: FOCUS_MODE_REPLACE,
        requests: [{
            tableType: TABLE_LOCALIZATION_TAG_CATEGORIES,
            focus: focusMap,
            type: FOCUS_REPLACE,
        }],
    });
}

/**
 * Check if an item is focused.
 */
export function isFocused(tableType: TableType, id: number): boolean {
    const focus = focusManager.get();
    return focus[tableType.id]?.has(id) ?? false;
}

/**
 * Clear all focus state.
 */
export function clearAllFocus(): void {
    const requests: FocusRequest[] = DATABASE_TABLES.map((table) => ({
        tableType: table,
        focus: new Map(),
        type: FOCUS_CLEAR,
    }));
    focusManager.focus({
        type: FOCUS_MODE_MODIFY,
        requests,
    });
}

// ============================================================================
// Cross-Panel Synchronization
// ============================================================================

/**
 * Map FocusableTable strings to TableType constants.
 */
const FOCUSABLE_TABLE_MAP: Record<string, TableType> = {
    conversations: TABLE_CONVERSATIONS,
    nodes: TABLE_NODES,
    edges: TABLE_EDGES,
    actors: TABLE_ACTORS,
    locales: TABLE_LOCALES,
    localizations: TABLE_LOCALIZATIONS,
    conversation_tag_categories: TABLE_CONVERSATION_TAG_CATEGORIES,
    localization_tag_categories: TABLE_LOCALIZATION_TAG_CATEGORIES,
};

let focusStoreInitialized = false;

/**
 * Initialize focus store and set up cross-panel synchronization.
 * Call this once when the app starts.
 */
export function initFocusStore(): void {
    if (focusStoreInitialized) return;
    focusStoreInitialized = true;

    // Listen for focus broadcasts from other panels via the extension
    bridge.on('focusChanged', (event: FocusChangeEvent) => {
        const tableType = FOCUSABLE_TABLE_MAP[event.table];
        if (!tableType) {
            return;
        }

        // Convert FocusItem[] to Map<number, Focus>
        const focusMap = new Map<number, Focus>();
        for (const item of event.items) {
            focusMap.set(item.id, {
                rowId: item.id,
                payload: item.payload as FocusPayload | undefined,
            });
        }

        // Apply the focus change using REPLACE mode
        // This replaces focus for this table while keeping other tables unchanged
        focusManager.focus({
            type: FOCUS_MODE_MODIFY,
            requests: [{
                tableType,
                focus: focusMap,
                type: FOCUS_REPLACE,
            }],
        });
    });
}
