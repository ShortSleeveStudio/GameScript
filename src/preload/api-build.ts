import { ipcRenderer } from 'electron';
import {
    DatabaseTypeId,
    LocalizationDivisionTypeId,
    LocalizationFormatTypeId,
    LocalizationHeaderIncludeTypeId,
} from '../common/common-types';
import { DbConnectionConfig } from '../common/common-types-db';
import { API_BUILD_LOCALIZATION_EXPORT } from '../common/constants';

export interface DatabaseInfo {
    database: DatabaseTypeId;
    databaseConfig: DbConnectionConfig;
}

export interface LocalizationExportRequest {
    database: DatabaseInfo;
    format: LocalizationFormatTypeId;
    division: LocalizationDivisionTypeId;
    headerInclude: LocalizationHeaderIncludeTypeId;
    location: string; // full path
}

export interface BuildApi {
    localizationExport(request: LocalizationExportRequest): Promise<void>;
}

export const buildApi: BuildApi = {
    localizationExport: async (request: LocalizationExportRequest) => {
        return await ipcRenderer.invoke(API_BUILD_LOCALIZATION_EXPORT, request);
    },
};
