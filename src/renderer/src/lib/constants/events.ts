import type { Table } from '@common/common-schema';
import type { LayoutId } from './default-layout';
/**
 * Event Names
 */
// Global
export const EVENT_SHUTDOWN: string = 'shutdown';

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

/**
 * Events
 */
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
    tableType: Table;
}

/**
 * Helpers
 */
export function isCustomEvent(event: Event): event is CustomEvent {
    return 'detail' in event;
}
