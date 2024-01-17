import { DATABASE_TYPE_NAMES, type DatabaseTypeName } from '@lib/api/db/db-types';
import {
    LS_KEY_SETTINGS_DB_SQLITE_PATH,
    LS_KEY_SETTINGS_DB_TYPE,
    LS_KEY_SETTINGS_DEFAULT_ROUTINE,
} from '@lib/constants/local-storage';
import { persisted } from '@lib/vendor/svelte-persisted-store';
import type { DialogResult } from 'preload/api-dialog';
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
export const dbSqlitePath: Writable<DialogResult> = persisted(
    LS_KEY_SETTINGS_DB_SQLITE_PATH,
    <DialogResult>{},
);

///
/// Conversation Editor Settings
///

///
/// Coding Settings
///
export const defaultRoutine: Writable<number> = persisted(LS_KEY_SETTINGS_DEFAULT_ROUTINE, 0);

/**This is used to lock the UI when the auto-complete code scan is happening. */
export const codeScanInProgress: Writable<boolean> = writable<boolean>(false);
