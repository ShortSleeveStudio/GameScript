import { IpcMainInvokeEvent, ipcMain } from 'electron';
import { DATABASE_TYPE_SQLITE } from '../common/common-types';
import { DbClient } from '../common/common-types-db';
import {
    API_BUILD_GAME_EXPORT,
    API_BUILD_LOCALIZATION_EXPORT,
    API_BUILD_LOCALIZATION_IMPORT,
} from '../common/constants';
import {
    DatabaseInfo,
    GameExportRequest,
    LocalizationExportRequest,
    LocalizationImportRequest,
} from '../preload/api-build';
import { gameExport } from './build/game-exporter';
import { localizationExport } from './build/localization-exporter';
import { localizationImport } from './build/localization-importer';
import { sqlite } from './db/db-client-sqlite';

ipcMain.handle(
    API_BUILD_LOCALIZATION_EXPORT,
    async (_event: IpcMainInvokeEvent, payload: LocalizationExportRequest): Promise<void> => {
        const db = getDatabase(payload.database);
        await localizationExport(db, payload);
    },
);

ipcMain.handle(
    API_BUILD_LOCALIZATION_IMPORT,
    async (_event: IpcMainInvokeEvent, payload: LocalizationImportRequest): Promise<void> => {
        const db = getDatabase(payload.database);
        await localizationImport(db, payload);
    },
);

ipcMain.handle(
    API_BUILD_GAME_EXPORT,
    async (_event: IpcMainInvokeEvent, payload: GameExportRequest): Promise<void> => {
        const db = getDatabase(payload.database);
        await gameExport(db, payload);
    },
);

function getDatabase(dbInfo: DatabaseInfo): DbClient {
    if (dbInfo.database === DATABASE_TYPE_SQLITE.id) {
        return sqlite;
    }
    throw new Error('Postgres is not implemented yet');
}
