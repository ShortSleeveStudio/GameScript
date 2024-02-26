import {
    DATABASE_TYPES,
    LOCALIZATION_DIVISION_SINGLE,
    LOCALIZATION_FORMAT_CSV,
    LOCALIZATION_HEADER_INCLUDE_TRUE,
    type DatabaseTypeId,
} from '@common/common-types';
import {
    LS_KEY_BUILD_EXPORT_LOCALIZATION_DIVISION,
    LS_KEY_BUILD_EXPORT_LOCALIZATION_FORMAT,
    LS_KEY_BUILD_EXPORT_LOCALIZATION_HEADER_INCLUDE,
    LS_KEY_BUILD_EXPORT_PATH_DATA,
    LS_KEY_BUILD_EXPORT_PATH_LOCALIZATION,
    LS_KEY_BUILD_EXPORT_PATH_ROUTINES,
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
export const dbType: Writable<DatabaseTypeId> = persisted(
    LS_KEY_SETTINGS_DB_TYPE,
    DATABASE_TYPES[0].id,
);
/**SQLite database file path */
export const dbSqlitePath: Writable<DialogResult> = persisted(
    LS_KEY_SETTINGS_DB_SQLITE_PATH,
    <DialogResult>{},
);

///
/// Build Settings
///
export const buildExportPathData: Writable<DialogResult> = persisted(
    LS_KEY_BUILD_EXPORT_PATH_DATA,
    <DialogResult>{},
);
export const buildExportPathRoutines: Writable<DialogResult> = persisted(
    LS_KEY_BUILD_EXPORT_PATH_ROUTINES,
    <DialogResult>{},
);
export const buildExportPathLocalization: Writable<DialogResult> = persisted(
    LS_KEY_BUILD_EXPORT_PATH_LOCALIZATION,
    <DialogResult>{},
);
export const buildExportLocalizationDivision: Writable<number> = persisted(
    LS_KEY_BUILD_EXPORT_LOCALIZATION_DIVISION,
    LOCALIZATION_DIVISION_SINGLE.id,
);
export const buildExportLocalizationHeaderInclude: Writable<number> = persisted(
    LS_KEY_BUILD_EXPORT_LOCALIZATION_HEADER_INCLUDE,
    LOCALIZATION_HEADER_INCLUDE_TRUE.id,
);
export const buildExportLocalizationFormat: Writable<number> = persisted(
    LS_KEY_BUILD_EXPORT_LOCALIZATION_FORMAT,
    LOCALIZATION_FORMAT_CSV.id,
);

///
/// Coding Settings
///
export const defaultRoutine: Writable<number> = persisted(LS_KEY_SETTINGS_DEFAULT_ROUTINE, 0);

/**This is used to lock the UI when the auto-complete code scan is happening. */
export const codeScanInProgress: Writable<boolean> = writable<boolean>(false);
