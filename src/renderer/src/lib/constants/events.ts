import type { DatabaseTableType } from '@common/common-types';
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

// Localizations
export const EVENT_LOCALIZATIONS_FILTER_BY_PARENT = 'localizations-filter-by-parent';

// Conversation Finder
export const EVENT_FINDER_FILTER_BY_PARENT: string = 'finder-filter-by-parent';

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
export interface DbColumnDeleting {
    tableType: DatabaseTableType;
}

/**
 * Helpers
 */
export function isCustomEvent(event: Event): event is CustomEvent {
    return 'detail' in event;
}
