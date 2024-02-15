// Dock
export const LS_KEY_DOCK_LAYOUT: string = 'dock-layout';

// Topbar
export const LS_KEY_DARKMODE: string = 'darkmode';

// Settings
export const LS_KEY_SETTINGS_DB_TYPE: string = 'settings-database-type';
export const LS_KEY_SETTINGS_DB_SQLITE_PATH: string = 'settings-database-sqlite-path';
export const LS_KEY_SETTINGS_DEFAULT_ROUTINE: string = 'settings-coding-default-routine';

// Finder
export const LS_KEY_FINDER_LAYOUT = 'finder-layout';

// Localization
export const LS_KEY_LOCALIZATION = 'localization-layout';

// Conversation Editor
export const LS_KEY_CONVERSATION_EDITOR_LAYOUT_VERTICAL_DEFAULT = 'graph-layout-vertical-default';
export const LS_KEY_CONVERSATION_EDITOR_LAYOUT_AUTO_DEFAULT = 'graph-layout-auto-default';
export const LS_KEY_CONVERSATION_EDITOR_VIEWPORT_PREFIX = 'graph-layout-';
export function conversationIdToViewportKey(conversationId: number): string {
    return LS_KEY_CONVERSATION_EDITOR_VIEWPORT_PREFIX + conversationId;
}
export function isConversationViewportKey(key: string): boolean {
    return key && key.startsWith(LS_KEY_CONVERSATION_EDITOR_VIEWPORT_PREFIX);
}
