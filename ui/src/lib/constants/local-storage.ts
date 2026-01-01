/**
 * localStorage key constants.
 *
 * Note: Layout defaults (auto-layout, vertical) are in stores/layout-defaults.ts
 * using the persisted store pattern with 'gamescript:' namespaced keys.
 */

// Dock
export const LS_KEY_DOCK_LAYOUT: string = 'dock-layout';

// Settings
export const LS_KEY_SETTINGS_DB_TYPE: string = 'settings-database-type';
export const LS_KEY_SETTINGS_DB_CONNECTION_CONFIG: string = 'settings-database-connection-config';

// Conversation Editor - viewport persistence per conversation
export const LS_KEY_CONVERSATION_EDITOR_VIEWPORT_PREFIX = 'graph-layout-';
export function conversationIdToViewportKey(conversationId: number): string {
    return LS_KEY_CONVERSATION_EDITOR_VIEWPORT_PREFIX + conversationId;
}
export function isConversationViewportKey(key: string): boolean {
    return Boolean(key && key.startsWith(LS_KEY_CONVERSATION_EDITOR_VIEWPORT_PREFIX));
}
