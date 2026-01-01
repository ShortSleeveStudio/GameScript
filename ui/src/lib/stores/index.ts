/**
 * Store exports for GameScript UI.
 *
 * @example
 * ```ts
 * import { dbConnected, focusedNode, isDarkMode } from '$lib/stores';
 *
 * // Subscribe to stores in Svelte components
 * $: isConnected = $dbConnected;
 * $: selectedNode = $focusedNode;
 * ```
 */

// Connection
export {
  dbConnected,
  dbType,
  isConnecting,
  connectionError,
  connectionStatus,
  initConnectionStores,
  connect,
  disconnect,
  clearConnectionError,
  tryAutoReconnect,
  getSavedConnectionConfig,
  type ConnectionStatus,
  type SavedConnectionConfig,
} from './connection.js';

// Focus
export {
  // Focus request types
  FOCUS_CLEAR,
  FOCUS_REPLACE,
  FOCUS_ADD,
  FOCUS_REMOVE,
  // Focus mode types
  FOCUS_MODE_MODIFY,
  FOCUS_MODE_REPLACE,
  // Derived stores
  focusedConversations,
  focusedNodes,
  focusedEdges,
  focusedActors,
  focusedConversation,
  focusedNode,
  focusedEdge,
  focusedActor,
  hasSelection,
  // FocusManager
  focusManager,
  FocusManager,
  // Convenience functions
  clearAllFocus,
  isFocused,
  focusConversation,
  focusNode,
  focusEdge,
  initFocusStore,
  // Types
  type Focus,
  type FocusPayload,
  type FocusPayloadActor,
  type FocusPayloadLocale,
  type FocusPayloadFilter,
  type FocusPayloadGraphElement,
  type FocusRequest,
  type FocusRequests,
  type FocusRequestType,
  type FocusModeType,
  type UniqueNameTracker as FocusUniqueNameTracker,
  type ActionHandler,
  type ActionUnsubscriber,
} from './focus.js';

// Notifications (routed to native IDE notifications)
export {
  NOTIFICATION_KINDS,
  notifyError,
  notifyWarning,
  notifyInfo,
  notifySuccess,
  toastError,
  toastWarning,
  toastInfo,
  toastSuccess,
  type NotificationKind,
} from './notifications.js';

// Theme
export {
  THEME_MODES,
  themeMode,
  isDarkMode,
  themeName,
  initThemeStore,
  setTheme,
  toggleTheme,
  cycleTheme,
  type ThemeMode,
} from './theme.js';

// Registry
export {
  registry,
  actions,
  conditions,
  actionsByCategory,
  hasActions,
  hasConditions,
  isScanning,
  initRegistryStore,
  scanRegistry,
  clearRegistry,
  findAction,
  findCondition,
  searchActions,
  searchConditions,
  type ActionCategory,
  type RegistryState,
} from './registry.js';

// Loading State
export {
  IsLoadingStore,
  globalLoading,
} from './is-loading.js';

// Unique Name Tracker
export {
  UniqueNameTracker,
  type NameEntry,
} from './unique-name-tracker.js';

// Layout Defaults
export {
  graphLayoutAutoLayoutDefault,
  graphLayoutVerticalDefault,
} from './layout-defaults.js';

// Layout Visibility (Golden Layout panels)
// Note: Inspector is now a fixed panel (not in Golden Layout), so no inspectorIsVisible
export {
  conversationEditorIsVisible,
  conversationFinderIsVisible,
  localizationEditorIsVisible,
  actorManagerIsVisible,
  localeManagerIsVisible,
  settingsIsVisible,
} from './layout.js';

// ============================================================================
// Initialization
// ============================================================================

import { bridge } from '$lib/api';
import { db } from '$lib/db';
import { dbConnected, initConnectionStores, tryAutoReconnect } from './connection.js';
import { initThemeStore } from './theme.js';
import { initRegistryStore } from './registry.js';
import { initFocusStore } from './focus.js';
import { undo, redo } from '$lib/undo';

/**
 * Initialize all stores and set up bridge listeners.
 * This performs pure initialization without side effects.
 * Call this once when the app starts.
 */
export function initStores(): void {
  // Initialize bridge first
  bridge.init();

  // Initialize individual stores
  // Pass callback to set db dialect when connected (avoids circular import)
  // Also reload all tables when connected (matches Electron's pattern)
  initConnectionStores((type) => {
    db.setDialect(type === 'postgres' ? 'postgres' : 'sqlite');
    // Reload all table views after connection - this is how Electron does it
    void db.reloadAllTables();
  });
  initThemeStore();
  initRegistryStore();
  initFocusStore();

  // Wire up db with connection store (breaks circular import)
  db.setConnectionStore(dbConnected);

  // Initialize database (sets up change listeners)
  db.init();

  // Set up global message listener for undo/redo commands from extension
  if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'undo') {
        undo();
      } else if (message.type === 'redo') {
        redo();
      }
    });
  }
}

/**
 * Start the application after stores are initialized.
 * This triggers side effects like auto-reconnecting to the last database.
 */
export function startApp(): void {
  // Attempt to auto-reconnect to the last used database
  // This is done after all stores are initialized so event handlers are ready
  tryAutoReconnect();
}
