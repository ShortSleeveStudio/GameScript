import type { LayoutId } from './default-layout';
/**
 * Event Names
 */
// Global
export const EVENT_SHUTDOWN: string = 'shutdown';

// Dock
export const EVENT_RESET_LAYOUT: string = 'reset-layout';
export const EVENT_SELECTION_REQUEST: string = 'selection-request';

// Database
export const EVENT_DB_CHANGED: string = 'db-changed';

/**
 * Events
 */
export interface SelectionRequest {
    layoutId: LayoutId;
}

/**
 * Helpers
 */
export function isCustomEvent(event: Event): event is CustomEvent {
    return 'detail' in event;
}
