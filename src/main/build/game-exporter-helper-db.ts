import { SQL_BATCH_SIZE } from '../../common/common-db';
import { DbClient, DbConnection } from '../../common/common-db-types';
import { filterIdToColumn } from '../../common/common-filter';
import { localeIdToColumn } from '../../common/common-locale';
import { Filter, Locale, Row } from '../../common/common-schema';
import {
    TABLE_CONVERSATIONS,
    TABLE_FILTERS,
    TABLE_LOCALES,
    TABLE_LOCALIZATIONS,
} from '../../common/common-types';
import { TableDefinition } from '../../common/table-definitions/table-definitions';
import { TABLE_DEFINITIONS } from '../../common/table-generators/table-generator';
import { generateTableSqlite } from '../../common/table-generators/table-generator-sqlite';
import { GameExportRequest } from '../../preload/api-build';
import { GameHelperDbExporter } from './build-common';

export class GameHelperDbExporterDefault implements GameHelperDbExporter {
    async export(
        mainDb: DbClient,
        helperDb: DbClient,
        _: GameExportRequest,
        mainConn: DbConnection,
        helperConn: DbConnection,
    ): Promise<void> {
        // Create and Populate Tables
        await this.createAndPopulateTables(mainDb, helperDb, mainConn, helperConn);
    }

    async teardown(): Promise<void> {}

    private async createAndPopulateTables(
        mainDb: DbClient,
        helperDb: DbClient,
        mainConn: DbConnection,
        helperConn: DbConnection,
    ): Promise<void> {
        for (let i = 0; i < TABLE_DEFINITIONS.length; i++) {
            const tableDefinition: TableDefinition = TABLE_DEFINITIONS[i];

            // Create tables
            await this.createTable(mainDb, helperDb, mainConn, helperConn, tableDefinition);

            // Grab single row from original database
            const row: Row = await mainDb.get(
                mainConn,
                `SELECT * FROM ${tableDefinition.tableType.name} LIMIT 1;`,
            );

            // Some tables may be empty and we can ignore them since there's nothing to copy
            if (!row) continue;

            // Grab columns for row
            const columnsList: string[] = [];
            for (const column of Object.keys(row)) {
                columnsList.push(column);
            }
            const columns: string = columnsList.join(', ');

            // Read through database in batches and create tables in the new database with
            // a copy of the original data.
            const count: number = (<{ count: number }>await mainDb.get(
                mainConn,
                `SELECT COUNT(*) as count 
                    FROM ${tableDefinition.tableType.name};`,
            )).count;
            for (let j = 0; j < count; j += SQL_BATCH_SIZE) {
                const limit: number = SQL_BATCH_SIZE;
                const offset: number = j;
                const queryFetchBatch: string = `
                SELECT ${columns} 
                FROM ${tableDefinition.tableType.name} 
                ORDER BY id ASC LIMIT ${limit} OFFSET ${offset};`;
                const rows = await mainDb.all(mainConn, queryFetchBatch);
                for (let k = 0; k < rows.length; k++) {
                    const valueList: unknown[] = Object.values(<object>rows[k]).map((value) => {
                        if (typeof value === 'boolean') return value ? 1 : 0;
                        return value;
                    });
                    const queryInsertBatch = `INSERT INTO ${
                        tableDefinition.tableType.name
                    } (${columns}) VALUES (${valueList.map(() => '?')});`;
                    await helperDb.run(helperConn, queryInsertBatch, valueList);
                }
            }
        }
    }

    private async createTable(
        mainDb: DbClient,
        helperDb: DbClient,
        mainConn: DbConnection,
        helperConn: DbConnection,
        tableDefinition: TableDefinition,
    ): Promise<void> {
        // Create table
        const tableDefString: string = generateTableSqlite(tableDefinition);
        await helperDb.exec(helperConn, tableDefString);

        // Add columns if necessary
        if (tableDefinition.tableType.id === TABLE_LOCALIZATIONS.id) {
            // Add columns to locales
            const locales: Locale[] = <Locale[]>(
                await mainDb.all(
                    mainConn,
                    `SELECT id, name FROM ${TABLE_LOCALES.name} ORDER BY id ASC;`,
                )
            );
            for (let i = 0; i < locales.length; i++) {
                await helperDb.exec(
                    helperConn,
                    `ALTER TABLE ${TABLE_LOCALIZATIONS.name} ADD COLUMN ${localeIdToColumn(
                        locales[i].id,
                    )} TEXT;`,
                );
            }
        } else if (tableDefinition.tableType.id === TABLE_CONVERSATIONS.id) {
            // Add columns to conversations
            const filters: Filter[] = <Filter[]>(
                await mainDb.all(
                    mainConn,
                    `SELECT id, name FROM ${TABLE_FILTERS.name} ORDER BY id ASC;`,
                )
            );
            for (let i = 0; i < filters.length; i++) {
                await helperDb.exec(
                    helperConn,
                    `ALTER TABLE ${TABLE_CONVERSATIONS.name} ADD COLUMN ${filterIdToColumn(
                        filters[i].id,
                    )} TEXT;`,
                );
            }
        }
    }
}
export const gameHelperDbExporterDefault: GameHelperDbExporterDefault =
    new GameHelperDbExporterDefault();
