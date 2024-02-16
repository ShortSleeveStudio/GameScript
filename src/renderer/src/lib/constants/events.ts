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

// Localizations
export const EVENT_LOCALIZATIONS_FILTER_BY_PARENT = 'localizations-filter-by-parent';

// Conversation Editor
export const EVENT_GRAPH_SELECT_NODE: string = 'graph-select-node';

/**
 * Events
 */
export interface DockSelectionRequest {
    layoutId: LayoutId;
}
export interface DockSelectionChanged {
    layoutId: LayoutId;
}
export interface LocalizationsFilterByParent {
    parent: number;
}
export interface GraphSelectNodeRequest {
    id: number;
}

/**
 * Helpers
 */
export function isCustomEvent(event: Event): event is CustomEvent {
    return 'detail' in event;
}
