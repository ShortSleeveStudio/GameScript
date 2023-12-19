import {
    LS_KEY_SETTINGS_ACTORS_OPEN,
    LS_KEY_SETTINGS_CONVERSATIONS_OPEN,
    LS_KEY_SETTINGS_DATABASE_OPEN,
    LS_KEY_SETTINGS_DB_SQLITE_PATH,
    LS_KEY_SETTINGS_DB_TYPE,
    LS_KEY_SETTINGS_SCRIPTING_OPEN,
} from '@lib/constants/local-storage';
import type { FileResponse } from '@lib/types/file-response';
import { persisted } from '@lib/vendor/svelte-persisted-store';
import { appDataDir, join } from '@tauri-apps/api/path';
import { writable, type Writable } from 'svelte/store';

///
/// Accordion Settings
///
/** Persistent store for database settings being open. */
export const dbOpen: Writable<boolean> = persisted(LS_KEY_SETTINGS_DATABASE_OPEN, true);
/** Persistent store for conversation editor settings being open. */
export const conversationsOpen: Writable<boolean> = persisted(
    LS_KEY_SETTINGS_CONVERSATIONS_OPEN,
    false,
);
/** Persistent store for scripting settings being open. */
export const scriptingOpen: Writable<boolean> = persisted(LS_KEY_SETTINGS_SCRIPTING_OPEN, false);
/** Persistent store for actors settings being open. */
export const actorsOpen: Writable<boolean> = persisted(LS_KEY_SETTINGS_ACTORS_OPEN, false);

///
/// Database Settings
///
/**List of supported databases */
export const DATABASE_TYPES = ['SQLite', 'PostgreSQL'] as const;
/**Database data type */
export type DbType = (typeof DATABASE_TYPES)[number];

/**Database connection state store */
export const dbConnected: Writable<boolean> = writable(false);
/**Database type store */
export const dbType: Writable<DbType> = persisted(LS_KEY_SETTINGS_DB_TYPE, DATABASE_TYPES[0]);
/**SQLite database file path */
export const dbSqlitePath: Writable<FileResponse> = persisted(LS_KEY_SETTINGS_DB_SQLITE_PATH, {
    path: await join(await appDataDir(), 'GameScript.db'),
    name: 'GameScript.db',
    size: 0,
});
/**SQLite database file path error */
export const dbSqlitePathError: Writable<string> = writable('Invalid database file');
