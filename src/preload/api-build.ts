import { ipcRenderer } from 'electron';
import { DbConnectionConfig } from '../common/common-db-types';
import {
    DatabaseTypeId,
    LocalizationDivisionTypeId,
    LocalizationFormatTypeId,
} from '../common/common-types';
import {
    API_BUILD_GAME_EXPORT,
    API_BUILD_LOCALIZATION_EXPORT,
    API_BUILD_LOCALIZATION_IMPORT,
} from '../common/constants';

export interface DatabaseInfo {
    database: DatabaseTypeId;
    databaseConfig: DbConnectionConfig;
}

export interface LocalizationExportRequest {
    database: DatabaseInfo;
    format: LocalizationFormatTypeId;
    division: LocalizationDivisionTypeId;
    location: string; // full path
}

export interface LocalizationImportRequest {
    database: DatabaseInfo;
    format: LocalizationFormatTypeId;
    location: string; // full path
}

export interface GameExportRequest {
    database: DatabaseInfo;
    dataLocation: string; // full path
    codeLocation: string; // full path
}

export interface BuildApi {
    localizationExport(request: LocalizationExportRequest): Promise<void>;
    localizationImport(request: LocalizationImportRequest): Promise<void>;
    gameExport(request: GameExportRequest): Promise<void>;
}

export const buildApi: BuildApi = {
    localizationExport: async (request: LocalizationExportRequest) => {
        return await ipcRenderer.invoke(API_BUILD_LOCALIZATION_EXPORT, request);
    },
    localizationImport: async (request: LocalizationImportRequest) => {
        return await ipcRenderer.invoke(API_BUILD_LOCALIZATION_IMPORT, request);
    },
    gameExport: async (request: GameExportRequest) => {
        return await ipcRenderer.invoke(API_BUILD_GAME_EXPORT, request);
    },
};
