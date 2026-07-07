/**
 * Recently used SQLite database tracking.
 *
 * Persists a most-recent-first list of SQLite database file paths in
 * localStorage so the connection panel can offer quick reconnection to
 * previously opened databases. PostgreSQL connections are not tracked here.
 */

import { writable, type Writable } from 'svelte/store';
import { LS_KEY_RECENT_SQLITE_DATABASES } from '$lib/constants/local-storage.js';
import { toastWarning } from './notifications';

/** Maximum number of recent database paths to retain. */
const MAX_RECENT = 8;

function load(): string[] {
    if (typeof localStorage === 'undefined') return [];

    try {
        const json = localStorage.getItem(LS_KEY_RECENT_SQLITE_DATABASES);
        if (!json) return [];
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((p): p is string => typeof p === 'string');
    } catch (error) {
        toastWarning('[RecentDatabases] Failed to load recent databases:', error);
        return [];
    }
}

function persist(list: string[]): void {
    if (typeof localStorage === 'undefined') return;

    try {
        localStorage.setItem(LS_KEY_RECENT_SQLITE_DATABASES, JSON.stringify(list));
    } catch (error) {
        toastWarning('[RecentDatabases] Failed to save recent databases:', error);
    }
}

/** Recently used SQLite file paths, most-recent first. */
export const recentSqliteDatabases: Writable<string[]> = writable<string[]>(load());

/**
 * Record a SQLite database path as most-recently-used.
 * Moves an existing entry to the front and caps the list at MAX_RECENT.
 */
export function addRecentSqliteDatabase(filepath: string): void {
    if (!filepath) return;

    recentSqliteDatabases.update((list) => {
        const next = [filepath, ...list.filter((p) => p !== filepath)].slice(0, MAX_RECENT);
        persist(next);
        return next;
    });
}

/** Remove a SQLite database path from the recent list. */
export function removeRecentSqliteDatabase(filepath: string): void {
    recentSqliteDatabases.update((list) => {
        const next = list.filter((p) => p !== filepath);
        persist(next);
        return next;
    });
}
