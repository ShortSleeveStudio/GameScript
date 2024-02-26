import { IpcMainInvokeEvent, ipcMain } from 'electron';
import fs, { FileHandle } from 'fs/promises';
import Papa, { UnparseConfig } from 'papaparse';
import path from 'path';
import { localeIdToColumn } from '../common/common-locale';
import { Locale, Localization } from '../common/common-schema';
import {
    DATABASE_TYPE_SQLITE,
    LOCALIZATION_DIVISION_PER_CONVERSATION,
    LOCALIZATION_HEADER_INCLUDE_TRUE,
    TABLE_LOCALES,
    TABLE_LOCALIZATIONS,
} from '../common/common-types';
import { DbConnection } from '../common/common-types-db';
import { API_BUILD_LOCALIZATION_EXPORT } from '../common/constants';
import { LocalizationExportRequest } from '../preload/api-build';
import { DbClient, executeTransaction } from './db/db-client';
import { sqlite } from './db/db-client-sqlite';

const BATCH_SIZE: number = 489;

interface ColumnDescriptor {
    id: string;
    name: string;
}

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
    await executeTransaction(db, payload.database.databaseConfig, async (conn: DbConnection) => {
        let fileHandle: FileHandle | undefined;
        const writeList: unknown[] = [];
        const writeListContainer: unknown[][] = [writeList];
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

            // Read through database in batches
            let isFirstLineOfFile: boolean = false;
            const count: number = (<{ count: number }>(
                await db.get(conn, `SELECT COUNT(*) as count FROM ${TABLE_LOCALIZATIONS.name};`)
            )).count;
            for (let i = 0; i < count; i += BATCH_SIZE) {
                // Fetch batch
                const limit: number = BATCH_SIZE;
                const offset: number = i;
                const query: string = `SELECT * FROM ${TABLE_LOCALIZATIONS.name} ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`;
                const result: Localization[] = <Localization[]>await db.all(conn, query);

                // Create list to write
                let currentConversationId: number = -1;
                for (let i = 0; i < result.length; i++) {
                    // Grab localization
                    const localization: Localization = result[i];

                    // Ensure file descriptor
                    if (payload.division === LOCALIZATION_DIVISION_PER_CONVERSATION.id) {
                        if (currentConversationId !== localization.parent) {
                            // Close old descriptor
                            if (fileHandle) await fileHandle.close();

                            // Set new conversation id
                            currentConversationId = localization.parent;

                            // Open new descriptor
                            fileHandle = await fs.open(
                                path.join(
                                    payload.location,
                                    currentConversationId
                                        ? `conversation_${currentConversationId}.csv`
                                        : 'miscellaneous.csv',
                                ),
                                'a',
                            );
                            isFirstLineOfFile = true;

                            // Write header
                            if (payload.headerInclude === LOCALIZATION_HEADER_INCLUDE_TRUE.id) {
                                await writeLineToFileCsv(
                                    [headers],
                                    fileHandle!,
                                    !isFirstLineOfFile,
                                );
                                isFirstLineOfFile = false;
                            }
                        }
                    } else {
                        // Single file mode
                        if (!fileHandle) {
                            // Open file for single file mode if needed
                            fileHandle = await fs.open(
                                path.join(payload.location, 'localizations.csv'),
                                'a',
                            );
                            isFirstLineOfFile = true;

                            // Write header
                            if (payload.headerInclude === LOCALIZATION_HEADER_INCLUDE_TRUE.id) {
                                await writeLineToFileCsv(
                                    [headers],
                                    fileHandle!,
                                    !isFirstLineOfFile,
                                );
                                isFirstLineOfFile = false;
                            }
                        }
                    }

                    // Write to file
                    writeList.length = 0;
                    for (let j = 0; j < columns.length; j++) {
                        writeList.push(localization[columns[j].id]);
                    }
                    await writeLineToFileCsv(writeListContainer, fileHandle!, !isFirstLineOfFile);
                    isFirstLineOfFile = false;
                }
            }
        } finally {
            await fileHandle?.close();
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

async function writeLineToFileCsv(
    list: unknown[],
    fileHandle: FileHandle,
    prependNewline: boolean,
): Promise<void> {
    let csvLine: string = Papa.unparse(list, <UnparseConfig>{
        header: false,
        quotes: true,
    });
    if (prependNewline) csvLine = '\n' + csvLine;
    await fileHandle.write(csvLine, undefined, 'utf-8');
}
