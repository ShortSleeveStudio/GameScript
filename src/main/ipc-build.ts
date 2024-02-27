import { IpcMainInvokeEvent, ipcMain } from 'electron';
import fs from 'fs/promises';
import { localeIdToColumn } from '../common/common-locale';
import { Locale, Localization } from '../common/common-schema';
import {
    DATABASE_TYPE_SQLITE,
    LOCALIZATION_FORMAT_CSV,
    TABLE_LOCALES,
    TABLE_LOCALIZATIONS,
} from '../common/common-types';
import { DbClient, DbConnection } from '../common/common-types-db';
import { API_BUILD_LOCALIZATION_EXPORT } from '../common/constants';
import { LocalizationExportRequest } from '../preload/api-build';
import { ColumnDescriptor, Exporter } from './build/exporter';
import { exporterCsv } from './build/exporter-csv';
import { exporterJson } from './build/exporter-json';
import { executeTransaction } from './db/db-client';
import { sqlite } from './db/db-client-sqlite';

const BATCH_SIZE: number = 500;

ipcMain.handle(
    API_BUILD_LOCALIZATION_EXPORT,
    async (_event: IpcMainInvokeEvent, payload: LocalizationExportRequest): Promise<void> => {
        const db = getDatabase(payload);
        await localizationExportCsv(db, payload);
    },
);

async function localizationExportCsv(
    db: DbClient,
    payload: LocalizationExportRequest,
): Promise<void> {
    // Ensure folder exists
    const folderExists: boolean = await doesFolderExist(payload.location);
    if (!folderExists) throw new Error('Selected export folder no longer exists');

    // Start transaction
    const exporter: Exporter =
        payload.format === LOCALIZATION_FORMAT_CSV.id ? exporterCsv : exporterJson;
    await executeTransaction(db, payload.database.databaseConfig, async (conn: DbConnection) => {
        try {
            // Grab locale names
            const locales: Locale[] = <Locale[]>(
                await db.all(conn, `SELECT id, name FROM ${TABLE_LOCALES.name} ORDER BY id ASC`)
            );
            const columns: ColumnDescriptor[] = [
                { id: 'id', name: 'ID' },
                { id: 'name', name: 'Name' },
                { id: 'parent', name: 'Conversation ID' },
            ];
            for (let i = 0; i < locales.length; i++) {
                const locale: Locale = locales[i];
                columns.push({
                    id: localeIdToColumn(locale.id),
                    name: locale.name,
                });
            }
            const headers: string[] = columns.map((column) => column.name);

            // Setup
            await exporter.setup(payload, columns, headers);

            // Read through database in batches
            const count: number = (<{ count: number }>(
                await db.get(conn, `SELECT COUNT(*) as count FROM ${TABLE_LOCALIZATIONS.name};`)
            )).count;
            for (let i = 0; i < count; i += BATCH_SIZE) {
                // Fetch batch
                const limit: number = BATCH_SIZE;
                const offset: number = i;
                const query: string = `SELECT * FROM ${TABLE_LOCALIZATIONS.name} ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`;
                const localizations: Localization[] = <Localization[]>await db.all(conn, query);

                // Handle batch
                await exporter.handleBatch(localizations);
            }
        } finally {
            await exporter.teardown();
        }
    });
}

function getDatabase(payload: LocalizationExportRequest): DbClient {
    if (payload.database.database === DATABASE_TYPE_SQLITE.id) {
        return sqlite;
    }
    throw new Error('Postgres is not implemented yet');
}

async function doesFolderExist(path: string): Promise<boolean> {
    try {
        await fs.stat(path);
        return true;
    } catch (err) {
        return false;
    }
}
