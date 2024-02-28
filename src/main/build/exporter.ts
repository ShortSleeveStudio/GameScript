import { localeIdToColumn } from '../../common/common-locale';
import { Locale, Localization } from '../../common/common-schema';
import {
    LOCALIZATION_FORMAT_CSV,
    TABLE_LOCALES,
    TABLE_LOCALIZATIONS,
} from '../../common/common-types';
import { DbClient, DbConnection } from '../../common/common-types-db';
import { LocalizationExportRequest } from '../../preload/api-build';
import { executeTransaction } from '../db/db-client';
import { ColumnDescriptor, EXPORTER_BATCH_SIZE, Exporter, doesFolderExist } from './build-common';
import { exporterCsv } from './exporter-csv';
import { exporterJson } from './exporter-json';

export async function localizationExport(
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
            for (let i = 0; i < count; i += EXPORTER_BATCH_SIZE) {
                // Fetch batch
                const limit: number = EXPORTER_BATCH_SIZE;
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
