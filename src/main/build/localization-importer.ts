import fs, { ReadStream } from 'fs';
import { DbClient, DbConnection, DbNotification } from '../../common/common-db-types';
import { localeIdToColumn } from '../../common/common-locale';
import { Locale } from '../../common/common-schema';
import {
    DB_OP_ALTER,
    LOCALIZATION_FORMAT_CSV,
    TABLE_LOCALES,
    TABLE_LOCALIZATIONS,
} from '../../common/common-types';
import { LocalizationImportRequest } from '../../preload/api-build';
import { doesFileExist } from '../common/common-helpers';
import { executeTransaction } from '../db/db-client';
import { ColumnDescriptor, LocalizationImporter, listFilesWithExtension } from './build-common';
import { localizationImporterCsv } from './localization-importer-csv';
import { localizationImporterJson } from './localization-importer-json';

export async function localizationImport(
    db: DbClient,
    payload: LocalizationImportRequest,
): Promise<void> {
    // Ensure folder exists
    const folderExists: boolean = await doesFileExist(payload.location);
    if (!folderExists) throw new Error('Selected export folder no longer exists');

    // Grab file list
    const filePaths: string[] = await listFilesWithExtension(payload.location, payload.format);

    // Start transaction
    const importer: LocalizationImporter =
        payload.format === LOCALIZATION_FORMAT_CSV.id
            ? localizationImporterCsv
            : localizationImporterJson;
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
            await importer.setup(payload, columns, headers);

            // Read all files
            for (let i = 0; i < filePaths.length; i++) {
                let fileStream: ReadStream | undefined;
                try {
                    fileStream = fs.createReadStream(filePaths[i], { encoding: 'utf-8' });
                    await importer.handleBatch(db, fileStream, conn);
                } finally {
                    fileStream?.close();
                }
            }

            // Notify
            await db.notify(conn, <DbNotification>{
                tableId: TABLE_LOCALIZATIONS.id,
                opType: DB_OP_ALTER, // Since we don't know how much has changed
            });
        } finally {
            await importer.teardown();
        }
    });
}
