import { CODE_OVERRIDE_DEFAULT } from '@common/common-db';
import type { DbConnectionConfig } from '@common/common-db-types';
import {
    DATABASE_TYPES,
    LOCALIZATION_DIVISION_SINGLE,
    LOCALIZATION_FORMAT_CSV,
    type DatabaseTypeId,
} from '@common/common-types';
import {
    LS_KEY_BUILD_EXPORT_LOCALIZATION_DIVISION,
    LS_KEY_BUILD_EXPORT_LOCALIZATION_FORMAT,
    LS_KEY_BUILD_EXPORT_PATH_DATA,
    LS_KEY_BUILD_EXPORT_PATH_LOCALIZATION,
    LS_KEY_BUILD_IMPORT_LOCALIZATION_FORMAT,
    LS_KEY_BUILD_IMPORT_PATH_LOCALIZATION,
    LS_KEY_SETTINGS_DB_CONNECTION_CONFIG,
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
export const dbConnectionConfig: Writable<DbConnectionConfig> = persisted(
    LS_KEY_SETTINGS_DB_CONNECTION_CONFIG,
    <DbConnectionConfig>{},
);

///
/// Build Settings
///
export const buildExportPathData: Writable<DialogResult> = persisted(
    LS_KEY_BUILD_EXPORT_PATH_DATA,
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
export const buildExportLocalizationFormat: Writable<number> = persisted(
    LS_KEY_BUILD_EXPORT_LOCALIZATION_FORMAT,
    LOCALIZATION_FORMAT_CSV.id,
);
export const buildImportPathLocalization: Writable<DialogResult> = persisted(
    LS_KEY_BUILD_IMPORT_PATH_LOCALIZATION,
    <DialogResult>{},
);
export const buildImportLocalizationFormat: Writable<number> = persisted(
    LS_KEY_BUILD_IMPORT_LOCALIZATION_FORMAT,
    LOCALIZATION_FORMAT_CSV.id,
);

///
/// Coding Settings
///
export const defaultRoutine: Writable<number> = persisted(
    LS_KEY_SETTINGS_DEFAULT_ROUTINE,
    CODE_OVERRIDE_DEFAULT,
);

/**This is used to lock the UI when the auto-complete code scan is happening. */
export const codeScanInProgress: Writable<boolean> = writable<boolean>(false);
