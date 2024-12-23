// Constants
export const APP_NAME = 'GameScript';

// Style
export const ACTORS_DEFAULT_COLOR = '#11856C';

// System
export const API_SYSTEM_ON_ERROR = '/api/system/on-error';

// Dialog
export const API_DIALOG_OPEN = '/api/dialog/open';
export const API_DIALOG_SAVE = '/api/dialog/save';
export const API_DIALOG_AUTO_COMPLETE_OPEN = '/api/dialog/auto-complete-open';

// FileSystem
export const API_FS_APP_DATA_DIRECTORY = '/api/fs/app-data-directory';
export const API_FS_DEFAULT_SQLITE_FILE = '/api/fs/default-sqlite-file';
export const API_FS_DOES_FILE_EXIST = '/api/fs/does-file-exist';

// Window
export const API_WINDOW_CLOSE = '/api/window/close';
export const API_WINDOW_MINIMIZE = '/api/window/minimize';
export const API_WINDOW_MAXIMIZE = '/api/window/maximize';
export const API_WINDOW_UNMAXIMIZE = '/api/window/unmaximize';
export const API_WINDOW_IS_MAXIMIZED = '/api/window/is-maximized';
export const API_WINDOW_ON_RESIZE = '/api/window/on-resize';

// Sqlite
export const API_SQLITE_OPEN = '/api/sqlite/open';
export const API_SQLITE_CLOSE = '/api/sqlite/close';
export const API_SQLITE_CLOSE_ALL = '/api/sqlite/close-all';
export const API_SQLITE_RUN = '/api/sqlite/run';
export const API_SQLITE_ALL = '/api/sqlite/all';
export const API_SQLITE_GET = '/api/sqlite/get';
export const API_SQLITE_EXEC = '/api/sqlite/exec';
export const API_SQLITE_NOTIFY = '/api/sqlite/notify';
export const API_SQLITE_LISTEN = '/api/sqlite/listen';
export const API_SQLITE_UNLISTEN = '/api/sqlite/unlisten';
export const API_SQLITE_ON_NOTIFICATION = '/api/sqlite/on-notification';

// Postgres
export const API_POSTGRES_OPEN = '/api/postgres/open';
export const API_POSTGRES_CLOSE = '/api/postgres/close';
export const API_POSTGRES_CLOSE_ALL = '/api/postgres/close-all';
export const API_POSTGRES_RUN = '/api/postgres/run';
export const API_POSTGRES_ALL = '/api/postgres/all';
export const API_POSTGRES_GET = '/api/postgres/get';
export const API_POSTGRES_EXEC = '/api/postgres/exec';
export const API_POSTGRES_NOTIFY = '/api/postgres/notify';
export const API_POSTGRES_LISTEN = '/api/postgres/listen';
export const API_POSTGRES_UNLISTEN = '/api/postgres/unlisten';
export const API_POSTGRES_ON_NOTIFICATION = '/api/postgres/on-notification';

// Build
export const API_BUILD_LOCALIZATION_EXPORT = '/api/build/localization/export';
export const API_BUILD_LOCALIZATION_IMPORT = '/api/build/localization/import';
export const API_BUILD_GAME_EXPORT = '/api/build/game/export';

// Transpile
export const API_TRANSPILE_VALIDATE = '/api/transpile/validate';

// Encryption
export const API_ENCRYPTION_ENCRYPT = '/api/encryption/encrypt';
export const API_ENCRYPTION_DECRYPT = '/api/encryption/decrypt';
