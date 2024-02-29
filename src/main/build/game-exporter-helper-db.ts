import { filterIdToColumn } from '../../common/common-filter';
import { localeIdToColumn } from '../../common/common-locale';
import {
    CREATE_TABLE_INFOS,
    EXPORT_DUMMY_TABLE_PREFIX,
    EXPORT_ORIGINAL_ID_COLUMN_NAME,
    TableCreateInfo,
} from '../../common/common-queries-sqlite';
import { Filter, Locale, Row } from '../../common/common-schema';
import {
    DatabaseTableType,
    TABLE_ACTORS,
    TABLE_AUTO_COMPLETES,
    TABLE_CONVERSATIONS,
    TABLE_FILTERS,
    TABLE_LOCALES,
    TABLE_LOCALE_PRINCIPAL,
    TABLE_LOCALIZATIONS,
    TABLE_PROGRAMMING_LANGUAGES,
    TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
    TABLE_TABLES,
} from '../../common/common-types';
import { DbClient, DbConnection } from '../../common/common-types-db';
import { GameExportRequest } from '../../preload/api-build';
import { EXPORTER_BATCH_SIZE, GameHelperDbExporter } from './build-common';

const IGNORED_TABLE_SET: Set<DatabaseTableType> = new Set();
IGNORED_TABLE_SET.add(TABLE_TABLES);
IGNORED_TABLE_SET.add(TABLE_AUTO_COMPLETES);
IGNORED_TABLE_SET.add(TABLE_PROGRAMMING_LANGUAGES);
IGNORED_TABLE_SET.add(TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL);
IGNORED_TABLE_SET.add(TABLE_LOCALE_PRINCIPAL);
IGNORED_TABLE_SET.add(TABLE_ACTORS);

export class GameHelperDbExporterDefault implements GameHelperDbExporter {
    async export(
        db: DbClient,
        _importRequest: GameExportRequest,
        mainConn: DbConnection,
        helperConn: DbConnection,
    ): Promise<void> {
        // Create and Populate Tables
        await this.createAndPopulateTables(db, mainConn, helperConn);

        // Remap Foreign Keys
        await this.remapForeignKeys(db, mainConn, helperConn);
    }

    async teardown(): Promise<void> {}

    private async createAndPopulateTables(
        db: DbClient,
        mainConn: DbConnection,
        helperConn: DbConnection,
    ): Promise<void> {
        for (let i = 0; i < CREATE_TABLE_INFOS.length; i++) {
            const tableCreateInfo: TableCreateInfo = CREATE_TABLE_INFOS[i];

            // Skip ignored tables
            if (IGNORED_TABLE_SET.has(tableCreateInfo.type)) continue;

            // Create tables
            await this.createTable(db, mainConn, helperConn, tableCreateInfo);

            // Grab single row
            const row: Row = await db.get(
                mainConn,
                `SELECT * FROM ${tableCreateInfo.type.name} LIMIT 1`,
            );

            // Some tables may be empty
            if (!row) continue;

            // Grab columns for row
            const columnsSelectList: string[] = [];
            const columnsInsertList: string[] = [];
            for (const column of Object.keys(row)) {
                if (column === 'id') {
                    columnsSelectList.push(`id as ${EXPORT_ORIGINAL_ID_COLUMN_NAME}`);
                    columnsInsertList.push(EXPORT_ORIGINAL_ID_COLUMN_NAME);
                    continue;
                }
                columnsSelectList.push(column);
                columnsInsertList.push(column);
            }
            const columnsSelect: string = columnsSelectList.join(', ');
            const columnsInsert: string = columnsInsertList.join(', ');

            // Read through database in batches
            const whereClauseForConversations: string =
                tableCreateInfo.type.id === TABLE_CONVERSATIONS.id
                    ? ' WHERE isDeleted = false '
                    : '';
            const count: number = (<{ count: number }>(
                await db.get(
                    mainConn,
                    `SELECT COUNT(*) as count FROM ${tableCreateInfo.type.name} ${whereClauseForConversations};`,
                )
            )).count;
            for (let i = 0; i < count; i += EXPORTER_BATCH_SIZE) {
                const limit: number = EXPORTER_BATCH_SIZE;
                const offset: number = i;
                const queryFetchBatch: string = `SELECT ${columnsSelect} FROM ${tableCreateInfo.type.name} ${whereClauseForConversations} ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`;
                const rows = await db.all(mainConn, queryFetchBatch);
                for (let i = 0; i < rows.length; i++) {
                    const valueList: unknown[] = Object.values(<object>rows[i]);
                    const queryInsertBatch = `INSERT INTO ${
                        tableCreateInfo.type.name + EXPORT_DUMMY_TABLE_PREFIX
                    } (${columnsInsert}) VALUES (${valueList.map(() => '?')})`;
                    await db.run(helperConn, queryInsertBatch, valueList);
                }
            }
        }
    }

    private async createTable(
        db: DbClient,
        mainConn: DbConnection,
        helperConn: DbConnection,
        tableCreateInfo: TableCreateInfo,
    ): Promise<void> {
        // Create table
        await db.exec(helperConn, tableCreateInfo.creator(true));

        // Add columns if necessary
        if (tableCreateInfo.type.id === TABLE_LOCALIZATIONS.id) {
            // Add columns to locales
            const locales: Locale[] = <Locale[]>(
                await db.all(mainConn, `SELECT id, name FROM ${TABLE_LOCALES.name} ORDER BY id ASC`)
            );
            // We skip the first locale since it must exist
            for (let i = 1; i < locales.length; i++) {
                await db.exec(
                    helperConn,
                    `ALTER TABLE ${
                        TABLE_LOCALIZATIONS.name + EXPORT_DUMMY_TABLE_PREFIX
                    } ADD COLUMN ${localeIdToColumn(locales[i].id)} TEXT`,
                );
            }
        } else if (tableCreateInfo.type.id === TABLE_CONVERSATIONS.id) {
            // Add columns to conversations
            const filters: Filter[] = <Filter[]>(
                await db.all(mainConn, `SELECT id, name FROM ${TABLE_FILTERS.name} ORDER BY id ASC`)
            );
            for (let i = 0; i < filters.length; i++) {
                await db.exec(
                    helperConn,
                    `ALTER TABLE ${
                        TABLE_CONVERSATIONS.name + EXPORT_DUMMY_TABLE_PREFIX
                    } ADD COLUMN ${filterIdToColumn(filters[i].id)} TEXT`,
                );
            }
        }
    }

    private async remapForeignKeys(
        db: DbClient,
        mainConn: DbConnection,
        helperConn: DbConnection,
    ): Promise<void> {}
}
export const gameHelperDbExporterDefault: GameHelperDbExporterDefault =
    new GameHelperDbExporterDefault();
