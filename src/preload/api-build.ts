import {
    DatabaseTypeId,
    LocalizationDivisionTypeId,
    LocalizationFormatTypeId,
} from '../common/common-types';

export interface DatabaseInfo {
    database: DatabaseTypeId;
}
export interface DatabaseInfoSqlite extends DatabaseInfo {
    sqliteFilePath: string;
}
export interface DatabaseInfoPostgres extends DatabaseInfo {}

export interface LocalizationExportRequest {
    database: DatabaseInfoSqlite | DatabaseInfoPostgres;
    format: LocalizationFormatTypeId;
    division: LocalizationDivisionTypeId;
    location: string; // full path
}

export interface BuildApi {
    localizationExport(request: LocalizationExportRequest): Promise<void>;
}

export const buildApi: BuildApi = {
    localizationExport: async (request: LocalizationExportRequest) => {
        console.log(request);
    },
};
