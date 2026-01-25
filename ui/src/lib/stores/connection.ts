/**
 * Database connection state stores.
 *
 * Manages the connection status and database type, synchronized with the
 * extension backend via the postMessage bridge.
 */

import { writable, derived, type Writable, type Readable } from 'svelte/store';
import type { DatabaseType } from '@gamescript/shared';
import { bridge } from '$lib/api/bridge.js';
// Note: db import removed to avoid circular dependency
// Dialect is set via onConnected callback passed to initConnectionStores()
import {
    LS_KEY_SETTINGS_DB_TYPE,
    LS_KEY_SETTINGS_DB_CONNECTION_CONFIG,
} from '$lib/constants/local-storage.js';
import { toastWarning } from './notifications';

// ============================================================================
// Types
// ============================================================================

export interface SavedConnectionConfig {
    type: DatabaseType;
    filepath?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    // Note: password is NOT saved for security reasons
}

// ============================================================================
// Connection State
// ============================================================================

/** Whether the database is currently connected */
export const dbConnected: Writable<boolean> = writable(false);

/** The current database type (sqlite or postgres) */
export const dbType: Writable<DatabaseType | null> = writable(null);

/** Derived store indicating if we're in a connecting state */
export const isConnecting: Writable<boolean> = writable(false);

/** Last connection error message, if any */
export const connectionError: Writable<string | null> = writable(null);

// Track the current config for saving on successful connect
let pendingConfig: SavedConnectionConfig | null = null;

// ============================================================================
// Connection Status Derived
// ============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const connectionStatus: Readable<ConnectionStatus> = derived(
    [dbConnected, isConnecting, connectionError],
    ([$dbConnected, $isConnecting, $connectionError]) => {
        if ($connectionError) return 'error';
        if ($isConnecting) return 'connecting';
        if ($dbConnected) return 'connected';
        return 'disconnected';
    }
);

// ============================================================================
// Connection Persistence
// ============================================================================

/**
 * Save connection config to localStorage for auto-reconnect.
 */
function saveConnectionConfig(config: SavedConnectionConfig): void {
    if (typeof localStorage === 'undefined') return;

    try {
        localStorage.setItem(LS_KEY_SETTINGS_DB_TYPE, config.type);
        // Don't save password for security
        const configToSave = { ...config };
        delete (configToSave as { password?: string }).password;
        localStorage.setItem(LS_KEY_SETTINGS_DB_CONNECTION_CONFIG, JSON.stringify(configToSave));
    } catch (error) {
        toastWarning('[Connection] Failed to save connection config:', error);
    }
}

/**
 * Load saved connection config from localStorage.
 */
function loadConnectionConfig(): SavedConnectionConfig | null {
    if (typeof localStorage === 'undefined') return null;

    try {
        const type = localStorage.getItem(LS_KEY_SETTINGS_DB_TYPE) as DatabaseType | null;
        const configJson = localStorage.getItem(LS_KEY_SETTINGS_DB_CONNECTION_CONFIG);

        if (!type || !configJson) return null;

        const config = JSON.parse(configJson) as SavedConnectionConfig;
        return { ...config, type };
    } catch (error) {
        toastWarning('[Connection] Failed to load connection config:', error);
        return null;
    }
}

/**
 * Clear saved connection config.
 */
function clearConnectionConfig(): void {
    if (typeof localStorage === 'undefined') return;

    try {
        localStorage.removeItem(LS_KEY_SETTINGS_DB_TYPE);
        localStorage.removeItem(LS_KEY_SETTINGS_DB_CONNECTION_CONFIG);
    } catch (error) {
        toastWarning('[Connection] Failed to clear connection config:', error);
    }
}

// ============================================================================
// Bridge Integration
// ============================================================================

// Callback for when connection is established
let onConnectedCallback: ((type: DatabaseType) => void) | null = null;

/**
 * Initialize connection stores and set up bridge listeners.
 * Call this once when the app starts.
 * @param onConnected - Optional callback when connection is established (used to set db dialect)
 */
export function initConnectionStores(onConnected?: (type: DatabaseType) => void): void {
    onConnectedCallback = onConnected ?? null;

    // Listen for connection events from the extension
    bridge.on('connected', (type: DatabaseType) => {
        dbConnected.set(true);
        dbType.set(type);
        isConnecting.set(false);
        connectionError.set(null);

        // Call the callback to update database dialect
        onConnectedCallback?.(type);

        // Save the connection config for auto-reconnect
        if (pendingConfig) {
            saveConnectionConfig(pendingConfig);
            pendingConfig = null;
        }
    });

    bridge.on('disconnected', () => {
        dbConnected.set(false);
        dbType.set(null);
        isConnecting.set(false);
        // Don't clear the saved config on disconnect - user might want to reconnect
    });

    bridge.on('error', (error: string) => {
        connectionError.set(error);
        isConnecting.set(false);
        pendingConfig = null;
        // Clear saved config on connection error so user sees fresh connection UI
        // This handles cases like deleted/corrupted database files
        clearConnectionConfig();
    });
}

/**
 * Attempt to reconnect to the last used database.
 * Returns true if a reconnect was attempted, false if no saved config exists.
 *
 * For SQLite: Attempts connection if filepath is saved AND file exists.
 *   If the file was deleted, clears the saved config and returns false.
 * For PostgreSQL: Attempts connection without password (works with trust auth,
 *   peer auth, .pgpass, etc.). If password is required, connection will fail
 *   and the error handler will clear the saved config.
 *
 * This function awaits bridge readiness before attempting to connect.
 * This is critical for JCEF (Rider) where the bridge is injected asynchronously.
 */
export async function tryAutoReconnect(): Promise<boolean> {
    // Wait for bridge to be ready before attempting connection
    // VS Code/standalone: resolves immediately
    // JCEF (Rider): resolves when bridge injection completes
    await bridge.ready();

    const savedConfig = loadConnectionConfig();

    if (!savedConfig) {
        return false;
    }

    if (savedConfig.type === 'sqlite' && savedConfig.filepath) {
        // Check if the SQLite file still exists before attempting to connect.
        // This prevents auto-creating an empty database when the file was deleted.
        try {
            const exists = await bridge.fileExists(savedConfig.filepath);
            if (!exists) {
                // File was deleted - clear saved config so user sees fresh connection UI
                clearConnectionConfig();
                return false;
            }
        } catch {
            // If we can't check file existence (e.g., standalone mode), clear config
            clearConnectionConfig();
            return false;
        }

        connect({
            type: 'sqlite',
            filepath: savedConfig.filepath,
        });
        return true;
    } else if (savedConfig.type === 'postgres' && savedConfig.host && savedConfig.database && savedConfig.username) {
        // Attempt passwordless connection (trust auth, peer auth, .pgpass, etc.)
        // If password is required, connection will fail and error handler clears config
        connect({
            type: 'postgres',
            host: savedConfig.host,
            port: savedConfig.port,
            database: savedConfig.database,
            username: savedConfig.username,
        });
        return true;
    }

    return false;
}

/**
 * Get the saved connection config (for pre-filling forms).
 */
export function getSavedConnectionConfig(): SavedConnectionConfig | null {
    return loadConnectionConfig();
}

/**
 * Request a database connection.
 */
export function connect(config: {
    type: DatabaseType;
    filepath?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
}, createNew = false): void {
    isConnecting.set(true);
    connectionError.set(null);

    // Store config to save on successful connection
    pendingConfig = {
        type: config.type,
        filepath: config.filepath,
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
    };

    bridge.connect(config, createNew);
}

/**
 * Clear connection error.
 */
export function clearConnectionError(): void {
    connectionError.set(null);
}

/**
 * Disconnect and optionally clear saved connection.
 */
export function disconnect(clearSaved = false): void {
    if (clearSaved) {
        clearConnectionConfig();
    }
    bridge.disconnect();
}
