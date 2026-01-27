/**
 * Google Sheets state store.
 *
 * Manages authentication state, spreadsheet selection, and loading states
 * for Google Sheets integration. Auth tokens are stored in the IDE's
 * SecretStorage (via extension), while spreadsheet selection is persisted
 * in localStorage.
 */

import { writable, derived, type Writable, type Readable } from 'svelte/store';
import { persisted } from '$lib/vendor/svelte-persisted-store';
import { bridge } from '$lib/api/bridge.js';
import type { GoogleSheetsSpreadsheetInfo } from '@gamescript/shared';

// Re-export for convenience
export type { GoogleSheetsSpreadsheetInfo };

// ============================================================================
// Storage Keys
// ============================================================================

const LS_KEY_SPREADSHEET = 'gamescript:google-sheets-spreadsheet';

// ============================================================================
// Credential State (from extension SecretStorage)
// ============================================================================

/** Whether Google API credentials are configured */
export const googleSheetsHasCredentials: Writable<boolean> = writable(false);

// ============================================================================
// Auth State (from extension SecretStorage)
// ============================================================================

/** Whether the user is authenticated with Google */
export const googleSheetsAuthenticated: Writable<boolean> = writable(false);

/** The authenticated user's email address */
export const googleSheetsEmail: Writable<string | null> = writable(null);

// ============================================================================
// Spreadsheet State (from localStorage)
// ============================================================================

/** The currently selected spreadsheet, persisted in localStorage */
export const googleSheetsSpreadsheet: Writable<GoogleSheetsSpreadsheetInfo | null> = persisted(
    LS_KEY_SPREADSHEET,
    null
);

// ============================================================================
// Derived State
// ============================================================================

/** Whether Google Sheets is ready for push/pull (hasCredentials AND authenticated AND spreadsheet selected) */
export const googleSheetsReady: Readable<boolean> = derived(
    [googleSheetsHasCredentials, googleSheetsAuthenticated, googleSheetsSpreadsheet],
    ([$hasCredentials, $authenticated, $spreadsheet]) => $hasCredentials && $authenticated && $spreadsheet !== null
);

// ============================================================================
// Loading States
// ============================================================================

/** Whether a sign-in/sign-out operation is in progress */
export const googleSheetsAuthLoading: Writable<boolean> = writable(false);

/** Whether spreadsheet selection is in progress */
export const googleSheetsSelectLoading: Writable<boolean> = writable(false);

// ============================================================================
// Initialization
// ============================================================================

/** Unsubscribe functions for event listeners */
let unsubscribers: Array<() => void> = [];

/**
 * Initialize the Google Sheets store.
 * Sets up bridge event listeners and fetches initial credential/auth status.
 * Call this once when the app starts.
 */
export async function initGoogleSheetsStore(): Promise<void> {
    // Clean up any existing listeners (in case of re-initialization)
    cleanupGoogleSheetsStore();

    // Listen for auth changes from the extension
    const unsubAuth = bridge.on('googleSheetsAuthChanged', (authenticated: boolean, email?: string) => {
        googleSheetsAuthenticated.set(authenticated);
        googleSheetsEmail.set(email ?? null);

        // Clear spreadsheet if user signs out
        if (!authenticated) {
            googleSheetsSpreadsheet.set(null);
        }
    });
    unsubscribers.push(unsubAuth);

    // Listen for spreadsheet changes from the extension
    const unsubSpreadsheet = bridge.on('googleSheetsSpreadsheetChanged', (spreadsheet: GoogleSheetsSpreadsheetInfo | null) => {
        googleSheetsSpreadsheet.set(spreadsheet);
    });
    unsubscribers.push(unsubSpreadsheet);

    // Fetch initial credential status
    try {
        const credResult = await bridge.googleSheetsGetCredentials();
        googleSheetsHasCredentials.set(credResult.hasCredentials);
    } catch (err) {
        if (import.meta.env?.DEV) {
            console.warn('[GoogleSheets] Failed to get credentials status:', err);
        }
        googleSheetsHasCredentials.set(false);
    }

    // Fetch initial auth status
    try {
        const status = await bridge.googleSheetsGetStatus();
        googleSheetsAuthenticated.set(status.authenticated);
        googleSheetsEmail.set(status.email ?? null);
    } catch (err) {
        // Extension might not support Google Sheets yet (e.g., older version)
        if (import.meta.env?.DEV) {
            console.warn('[GoogleSheets] Failed to get initial status:', err);
        }
        googleSheetsAuthenticated.set(false);
        googleSheetsEmail.set(null);
    }
}

/**
 * Clean up Google Sheets store event listeners.
 * Call this if you need to reinitialize or tear down the store.
 */
export function cleanupGoogleSheetsStore(): void {
    for (const unsub of unsubscribers) {
        unsub();
    }
    unsubscribers = [];
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Store Google API credentials.
 * @param clientId - Google OAuth client ID
 * @param clientSecret - Google OAuth client secret
 * @param apiKey - Google API key (optional, for Picker)
 * @returns Whether the operation succeeded
 */
export async function setGoogleSheetsCredentials(
    clientId: string,
    clientSecret: string,
    apiKey: string
): Promise<boolean> {
    try {
        const result = await bridge.googleSheetsSetCredentials(clientId, clientSecret, apiKey);
        if (result.success) {
            googleSheetsHasCredentials.set(true);
        }
        return result.success;
    } catch (err) {
        if (import.meta.env?.DEV) {
            console.error('[GoogleSheets] Failed to set credentials:', err);
        }
        return false;
    }
}

/**
 * Sign in to Google Sheets via OAuth.
 * Opens browser for authentication.
 *
 * Note: State updates happen via the bridge event listener (googleSheetsAuthChanged),
 * not here. This function only returns the result for the caller to handle toasts.
 *
 * @returns Result with success status and optional error
 */
export async function signInGoogleSheets(): Promise<{ success: boolean; error?: string }> {
    googleSheetsAuthLoading.set(true);

    try {
        const result = await bridge.googleSheetsSignIn();
        // State is updated by the bridge event listener (googleSheetsAuthChanged)
        return result.success ? { success: true } : { success: false, error: result.error };
    } finally {
        googleSheetsAuthLoading.set(false);
    }
}

/**
 * Sign out from Google Sheets.
 * Clears OAuth tokens and spreadsheet selection.
 *
 * Note: State updates happen via the bridge event listener (googleSheetsAuthChanged),
 * which also clears the spreadsheet when auth becomes false.
 */
export async function signOutGoogleSheets(): Promise<void> {
    googleSheetsAuthLoading.set(true);

    try {
        await bridge.googleSheetsSignOut();
        // State is updated by the bridge event listener (googleSheetsAuthChanged)
    } finally {
        googleSheetsAuthLoading.set(false);
    }
}

/**
 * Open Google Picker to select a spreadsheet.
 * @returns Result with success status and optional error (error='cancelled' if user closed picker)
 */
export async function selectGoogleSheetsSpreadsheet(): Promise<{ success: boolean; error?: string }> {
    googleSheetsSelectLoading.set(true);

    try {
        const result = await bridge.googleSheetsSelectSpreadsheet();

        if (result.success && result.spreadsheet) {
            googleSheetsSpreadsheet.set(result.spreadsheet);
            return { success: true };
        } else {
            return { success: false, error: result.error };
        }
    } finally {
        googleSheetsSelectLoading.set(false);
    }
}

/**
 * Clear the currently selected spreadsheet.
 */
export async function clearGoogleSheetsSpreadsheet(): Promise<void> {
    await bridge.googleSheetsClearSpreadsheet();
    googleSheetsSpreadsheet.set(null);
}
