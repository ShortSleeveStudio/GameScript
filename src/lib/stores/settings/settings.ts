import { DATABASE_TYPE_NAMES, type DatabaseTypeName } from '@lib/api/db/db-types';
import {
    LS_KEY_SETTINGS_DB_SQLITE_PATH,
    LS_KEY_SETTINGS_DB_TYPE,
} from '@lib/constants/local-storage';
import type { FileDetails } from '@lib/utility/file-details';
import { persisted } from '@lib/vendor/svelte-persisted-store';
import { appDataDir, join } from '@tauri-apps/api/path';
import { writable, type Writable } from 'svelte/store';

///
/// Database Settings
///
/**Database connection state store */
export const dbConnected: Writable<boolean> = writable(false);
/**Database type store */
export const dbType: Writable<DatabaseTypeName> = persisted(
    LS_KEY_SETTINGS_DB_TYPE,
    DATABASE_TYPE_NAMES[0],
);
/**SQLite database file path */
export const dbSqlitePath: Writable<FileDetails> = persisted(LS_KEY_SETTINGS_DB_SQLITE_PATH, {
    path: await join(await appDataDir(), 'GameScript.db'),
    fileName: 'GameScript.db',
});
/**SQLite database file path error */
export const dbSqlitePathError: Writable<string> = writable('Invalid database file');

///
/// Conversation Editor Settings
///

///
/// Scripting Settings
///
