import { type LocalePrincipal } from '@common/common-schema';
import { DATABASE_TABLES, type Table } from '@common/common-types';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import { Action, type ActionHandler, type ActionUnsubscriber } from '@lib/utility/action';
import type { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
import type { Writable } from 'svelte/store';
import { dbConnected } from '../settings/settings';

export const FOCUS_MODE_MODIFY = 0;
export const FOCUS_MODE_REPLACE = 1;
export const FOCUS_MODE_TYPES: number[] = [FOCUS_MODE_MODIFY, FOCUS_MODE_REPLACE] as const;
export type FocusModeType = (typeof FOCUS_MODE_TYPES)[number];
export interface FocusRequests {
    type: FocusModeType;
    requests: FocusRequest[];
}

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
export interface FocusRequest {
    tableType: Table;
    focus: Map<number, Focus>; // Row ID -> Focus
    type: FocusRequestType;
}

export interface Focus {
    rowId: number;
    payload?: FocusPayload;
}

export class FocusManager {
    private _focus: Map<number, Focus>[];
    private _action: Action<void>;
    private _dbConnected: Writable<boolean>;

    constructor(dbConnected: Writable<boolean>) {
        this._focus = DATABASE_TABLES.map(() => new Map());
        this._action = new Action<void>();
        this._dbConnected = dbConnected;
        this._dbConnected.subscribe(this.onConnectionChanged);
    }

    focus(request: FocusRequests): void {
        let mutationOccurred: boolean = false;
        const focusRequests: FocusRequest[] = request.requests;
        const modifiedTables: Set<number> = new Set();
        for (let i = 0; i < focusRequests.length; i++) {
            const request: FocusRequest = focusRequests[i];
            modifiedTables.add(request.tableType.id);
            let focusMap: Map<number, Focus> = this._focus[request.tableType.id];
            switch (request.type) {
                case FOCUS_ADD:
                    for (const value of request.focus.values()) {
                        if (focusMap.has(value.rowId)) continue;
                        else {
                            focusMap.set(value.rowId, value);
                            mutationOccurred = true;
                        }
                    }
                    break;
                case FOCUS_REMOVE:
                    for (const value of request.focus.values()) {
                        if (!focusMap.has(value.rowId)) continue;
                        else {
                            focusMap.delete(value.rowId);
                            mutationOccurred = true;
                        }
                    }
                    break;
                case FOCUS_REPLACE:
                    if (request.focus.size === focusMap.size) {
                        for (const value of request.focus.values()) {
                            if (focusMap.has(value.rowId)) {
                                continue;
                            } else {
                                focusMap = request.focus;
                                mutationOccurred = true;
                                break;
                            }
                        }
                    } else {
                        focusMap = request.focus;
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
                    throw new Error(`Unexpected focus type requested: ${request.type}`);
            }
            // In case replace happened, reassign the map
            this._focus[request.tableType.id] = focusMap;
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
            this._action.fire();
        }
    }

    get(): readonly Map<number, Focus>[] {
        return this._focus;
    }

    subscribe(handler: ActionHandler<void>): ActionUnsubscriber {
        const unsubscriber: ActionUnsubscriber = this._action.register(handler);
        handler();
        return unsubscriber;
    }

    unsubscribe(handler: ActionHandler<void>): void {
        this._action.unregister(handler);
    }

    private onConnectionChanged: (isConnected: boolean) => void = (isConnected: boolean) => {
        if (isConnected) return;
        for (let i = 0; i < this._focus.length; i++) {
            this._focus[i].clear();
        }
    };
}

/**
 * Payloads
 */
/**Focus payload can be any required ancillary data the inspector might need. */
export interface FocusPayload {}
export interface FocusPayloadRoutine extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
}
export interface FocusPayloadAutoComplete extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
}
export interface FocusPayloadActor extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
}
export interface FocusPayloadLocale extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
    localePrincipalRowView: IDbRowView<LocalePrincipal>;
}
export interface FocusPayloadFilter extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
}
export interface FocusPayloadGraphElement extends FocusPayload {
    requestIsFromGraph: boolean;
}

/**Export Singleton */
export const focusManager: FocusManager = new FocusManager(dbConnected);
