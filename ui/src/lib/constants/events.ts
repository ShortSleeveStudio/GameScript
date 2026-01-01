/**
 * Event constants for cross-panel communication.
 *
 * These events are dispatched as CustomEvents on the window object
 * to enable communication between Golden Layout panels.
 *
 * Ported from GameScriptElectron.
 */

import type { LayoutId } from './default-layout';
import type { TableType } from '$lib/db';

// ============================================================================
// Event Names
// ============================================================================

// Global
export const EVENT_COPY: string = 'copy';
export const EVENT_PASTE: string = 'paste';

// Dock
export const EVENT_DOCK_RESET_LAYOUT: string = 'dock-reset-layout';
export const EVENT_DOCK_SELECTION_REQUEST: string = 'dock-selection';
export const EVENT_DOCK_SELECTION_CHANGED: string = 'dock-selection-changed';

// Database
export const EVENT_DB_CHANGED: string = 'db-changed';
export const EVENT_DB_COLUMN_DELETING: string = 'db-column-deleting';

// Conversation Finder
export const EVENT_CF_FILTER_BY_PARENT: string = 'cf-filter-by-parent';

// Localization Finder
export const EVENT_LF_FILTER_BY_PARENT = 'lf-filter-by-parent';
export const EVENT_LF_FILTER_BY_ID: string = 'lf-filter-by-id';

// ============================================================================
// Event Interfaces
// ============================================================================

export interface DockSelectionRequest {
    layoutId: LayoutId;
}

export interface DockSelectionChanged {
    layoutId: LayoutId;
}

export interface GridFilterByParentRequest {
    parent: number;
}

export interface GridFilterByIdRequest {
    id: number;
}

export interface DbColumnDeleting {
    tableType: TableType;
}

// ============================================================================
// Helpers
// ============================================================================

export function isCustomEvent(event: Event): event is CustomEvent {
    return 'detail' in event;
}

/**
 * Dispatch a dock selection request event.
 * This will cause the dock to select/focus the specified panel.
 */
export function requestDockSelection(layoutId: LayoutId): void {
    dispatchEvent(
        new CustomEvent(EVENT_DOCK_SELECTION_REQUEST, {
            detail: { layoutId } as DockSelectionRequest,
        }),
    );
}

/**
 * Dispatch a filter by parent event to the localization editor.
 */
export function filterLocalizationsByParent(parent: number): void {
    dispatchEvent(
        new CustomEvent(EVENT_LF_FILTER_BY_PARENT, {
            detail: { parent } as GridFilterByParentRequest,
        }),
    );
}

/**
 * Dispatch a filter by ID event to the localization editor.
 */
export function filterLocalizationsById(id: number): void {
    dispatchEvent(
        new CustomEvent(EVENT_LF_FILTER_BY_ID, {
            detail: { id } as GridFilterByIdRequest,
        }),
    );
}
