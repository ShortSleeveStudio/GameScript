/**
 * Theme and dark mode management.
 *
 * This store tracks the current theme state and provides an API for theme management.
 *
 * ## IDE Plugin Architecture (Multi-IDE Portable)
 *
 * The webview does NOT detect which IDE it's running in. Instead:
 * 1. The IDE plugin (VSCode, Rider, Visual Studio) detects its own theme
 * 2. The IDE plugin sends a `theme:changed` message via the bridge
 * 3. This store updates `isDarkMode` based on that message
 *
 * This approach means:
 * - No VSCode-specific code in the webview
 * - Each IDE plugin implements theme detection in its native language
 * - The webview just receives "isDark: true/false"
 *
 * ## Standalone Mode
 *
 * When running outside an IDE (dev server, browser), uses:
 * - System preference via `prefers-color-scheme` media query
 * - User override via localStorage
 *
 * ## CSS Variables
 *
 * Theme colors are applied via CSS variables in lib/styles/theme.css:
 * - --gs-bg-primary, --gs-fg-primary, etc.
 * - Each IDE plugin injects its own CSS variable mappings
 *
 * See lib/styles/theme.css for the full variable abstraction layer.
 */

import { writable, derived, get, type Writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { bridge } from '$lib/api';

// ============================================================================
// Types
// ============================================================================

export const THEME_MODES = ['system', 'dark', 'light'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

// ============================================================================
// Theme State
// ============================================================================

const STORAGE_KEY = 'gamescript-theme';

/** User's theme preference (only used in standalone mode) */
export const themeMode: Writable<ThemeMode> = writable('system');

/** Whether dark mode is currently active (resolved from IDE or preference + system) */
export const isDarkMode: Writable<boolean> = writable(true);

/** System preference for dark mode (standalone mode only) */
const systemPrefersDark: Writable<boolean> = writable(true);

/** Whether running inside an IDE webview */
let isIdeMode = false;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the theme store.
 * Call this once when the app starts.
 */
export function initThemeStore(): void {
  if (!browser) return;

  // Check if bridge is in IDE mode (VSCode, Rider, VS, etc.)
  isIdeMode = bridge.isIde;

  if (isIdeMode) {
    // In IDE mode, listen for theme changes from the plugin
    bridge.on('themeChanged', (isDark) => {
      isDarkMode.set(isDark);
    });

    // The IDE plugin will send initial theme on connection
    // Default to dark until we receive the actual theme
    isDarkMode.set(true);
  } else {
    // Standalone mode - use system preference and local storage
    loadSavedTheme();
    setupSystemThemeListener();
    setupStandaloneSubscriptions();
  }
}

/**
 * Load saved theme preference from localStorage.
 */
function loadSavedTheme(): void {
  if (!browser) return;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEME_MODES.includes(saved as ThemeMode)) {
      themeMode.set(saved as ThemeMode);
    }
  } catch {
    // localStorage not available
  }
}

/**
 * Set up system theme preference listener.
 */
function setupSystemThemeListener(): void {
  if (!browser) return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemPrefersDark.set(mediaQuery.matches);

  mediaQuery.addEventListener('change', (e) => {
    systemPrefersDark.set(e.matches);
  });
}

/**
 * Set up subscriptions for standalone mode.
 * These derive isDarkMode from themeMode + systemPrefersDark.
 */
function setupStandaloneSubscriptions(): void {
  // Subscribe to changes and update isDarkMode
  themeMode.subscribe(($mode) => {
    if (isIdeMode) return; // IDE controls theme in IDE mode

    let dark: boolean;
    const $systemPrefersDark = get(systemPrefersDark);

    switch ($mode) {
      case 'dark':
        dark = true;
        break;
      case 'light':
        dark = false;
        break;
      case 'system':
      default:
        dark = $systemPrefersDark;
        break;
    }

    isDarkMode.set(dark);

    // Save preference
    try {
      localStorage.setItem(STORAGE_KEY, $mode);
    } catch {
      // localStorage not available
    }
  });

  systemPrefersDark.subscribe(($sysDark) => {
    if (isIdeMode) return; // IDE controls theme in IDE mode

    const $mode = get(themeMode);
    if ($mode === 'system') {
      isDarkMode.set($sysDark);
    }
  });
}

// ============================================================================
// Theme Actions (Standalone mode only - IDE mode ignores these)
// ============================================================================

/**
 * Set the theme mode.
 * Note: In IDE mode, theme is controlled by the IDE.
 */
export function setTheme(mode: ThemeMode): void {
  if (isIdeMode) return;
  themeMode.set(mode);
}

/**
 * Toggle between dark and light mode.
 * Note: In IDE mode, theme is controlled by the IDE.
 */
export function toggleTheme(): void {
  if (isIdeMode) return;
  isDarkMode.update((dark) => {
    const newDark = !dark;
    themeMode.set(newDark ? 'dark' : 'light');
    return newDark;
  });
}

/**
 * Cycle through theme modes: system -> dark -> light -> system
 * Note: In IDE mode, theme is controlled by the IDE.
 */
export function cycleTheme(): void {
  if (isIdeMode) return;
  themeMode.update((mode) => {
    const index = THEME_MODES.indexOf(mode);
    const nextIndex = (index + 1) % THEME_MODES.length;
    return THEME_MODES[nextIndex];
  });
}

// ============================================================================
// Derived Stores
// ============================================================================

/** Human-readable theme name */
export const themeName: Readable<string> = derived(themeMode, ($mode) => {
  switch ($mode) {
    case 'system':
      return 'System';
    case 'dark':
      return 'Dark';
    case 'light':
      return 'Light';
  }
});
