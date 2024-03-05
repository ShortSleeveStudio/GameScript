import { DbClient, DbConnection } from '../../common/common-db-types';
import { filterIdToColumn } from '../../common/common-filter';
import { localeIdToColumn } from '../../common/common-locale';
import { Filter, Locale, Node, Row } from '../../common/common-schema';
import {
    DatabaseTableType,
    TABLE_CONVERSATIONS,
    TABLE_EDGES,
    TABLE_FILTERS,
    TABLE_LOCALES,
    TABLE_LOCALIZATIONS,
    TABLE_NODES,
    TABLE_ROUTINES,
} from '../../common/common-types';
import {
    ForeignKeyDefinition,
    TableDefinition,
} from '../../common/table-definitions/table-definitions';
import {
    EXPORT_DUMMY_TABLE_PREFIX,
    EXPORT_ORIGINAL_ID_COLUMN_NAME,
    TABLE_DEFINITIONS,
} from '../../common/table-generators/table-generator';
import { generateTableSqlite } from '../../common/table-generators/table-generator-sqlite';
import { GameExportRequest } from '../../preload/api-build';
import { EXPORTER_BATCH_SIZE, GameHelperDbExporter } from './build-common';

interface ReferencingTable {
    table: DatabaseTableType;
    columnName: string;
}

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
        await this.remapForeignKeys(db, helperConn);

        // Convert Link Nodes
        await this.convertLinkNodes(db, helperConn);

        // // Create Remapped Tables
        // await this.createRemappedTables(db, mainConn, helperConn);
    }

    async teardown(): Promise<void> {}

    private async createAndPopulateTables(
        db: DbClient,
        mainConn: DbConnection,
        helperConn: DbConnection,
    ): Promise<void> {
        for (let i = 0; i < TABLE_DEFINITIONS.length; i++) {
            const tableDefinition: TableDefinition = TABLE_DEFINITIONS[i];

            // Create tables
            await this.createTable(db, mainConn, helperConn, tableDefinition);

            // Grab single row from original database
            const row: Row = await db.get(
                mainConn,
                `SELECT * FROM ${tableDefinition.tableType.name} LIMIT 1`,
            );

            // Some tables may be empty and we can ignore them since there's nothing to copy
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

            // Read through database in batches and create dummy tables in the new database with
            // a copy of the original data with the IDs remapped to 'originalId'
            const whereClauseForConversations: string =
                tableDefinition.tableType.id === TABLE_CONVERSATIONS.id
                    ? ' WHERE isDeleted = false '
                    : '';
            const count: number = (<{ count: number }>(
                await db.get(
                    mainConn,
                    `SELECT COUNT(*) as count FROM ${tableDefinition.tableType.name} ${whereClauseForConversations};`,
                )
            )).count;
            for (let j = 0; j < count; j += EXPORTER_BATCH_SIZE) {
                const limit: number = EXPORTER_BATCH_SIZE;
                const offset: number = j;
                const queryFetchBatch: string = `SELECT ${columnsSelect} FROM ${tableDefinition.tableType.name} ${whereClauseForConversations} ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`;
                const rows = await db.all(mainConn, queryFetchBatch);
                for (let k = 0; k < rows.length; k++) {
                    const valueList: unknown[] = Object.values(<object>rows[k]);
                    const queryInsertBatch = `INSERT INTO ${
                        tableDefinition.tableType.name + EXPORT_DUMMY_TABLE_PREFIX
                    } (${columnsInsert}) VALUES (${valueList.map(() => '?')})`;
                    await db.run(helperConn, queryInsertBatch, valueList);
                }
            }
        }
    }

    private async remapForeignKeys(db: DbClient, helperConn: DbConnection): Promise<void> {
        for (let i = 0; i < TABLE_DEFINITIONS.length; i++) {
            const tableDefinition: TableDefinition = TABLE_DEFINITIONS[i];

            // Find all tables referencing this table
            const referencingTables: ReferencingTable[] = [];
            for (let j = 0; j < TABLE_DEFINITIONS.length; j++) {
                const foreignTable: TableDefinition = TABLE_DEFINITIONS[j];
                for (let k = 0; k < foreignTable.foreignKeys.length; k++) {
                    const foreignKey: ForeignKeyDefinition = foreignTable.foreignKeys[k];
                    if (foreignKey.table.id === tableDefinition.tableType.id) {
                        referencingTables.push({
                            table: foreignTable.tableType,
                            columnName: foreignKey.column,
                        });
                    }
                }
            }

            // Remap foreign keys
            const count: number = (<{ count: number }>(
                await db.get(
                    helperConn,
                    `SELECT COUNT(*) as count FROM ${
                        tableDefinition.tableType.name + EXPORT_DUMMY_TABLE_PREFIX
                    };`,
                )
            )).count;
            for (let j = 0; j < count; j += EXPORTER_BATCH_SIZE) {
                const limit: number = EXPORTER_BATCH_SIZE;
                const offset: number = j;
                const queryFetchBatch: string = `SELECT * FROM ${
                    tableDefinition.tableType.name + EXPORT_DUMMY_TABLE_PREFIX
                } ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`;
                const rows = await db.all(helperConn, queryFetchBatch);
                for (let k = 0; k < rows.length; k++) {
                    const row: object = <object>rows[k];
                    const oldId: number = row[EXPORT_ORIGINAL_ID_COLUMN_NAME];
                    const newId: number = row['id'];
                    for (let l = 0; l < referencingTables.length; l++) {
                        const referencingTable: ReferencingTable = referencingTables[l];
                        const updateQuery = `UPDATE ${
                            referencingTable.table.name + EXPORT_DUMMY_TABLE_PREFIX
                        }
                        SET ${referencingTable.columnName} = ${newId}
                        WHERE ${referencingTable.columnName} = ${oldId}`;
                        await db.exec(helperConn, updateQuery);
                    }
                }
            }
        }
    }

    private async convertLinkNodes(db: DbClient, helperConn: DbConnection): Promise<void> {
        // Fetch all link nodes in batches
        const count: number = (<{ count: number }>(
            await db.get(
                helperConn,
                `SELECT COUNT(*) as count FROM ${
                    TABLE_NODES.name + EXPORT_DUMMY_TABLE_PREFIX
                } WHERE link IS NOT NULL;`,
            )
        )).count;
        for (let i = 0; i < count; i += EXPORTER_BATCH_SIZE) {
            const limit: number = EXPORTER_BATCH_SIZE;
            const offset: number = i;
            const queryFetchBatch: string = `SELECT * FROM ${
                TABLE_NODES.name + EXPORT_DUMMY_TABLE_PREFIX
            } WHERE link IS NOT NULL ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`;
            const rows = await db.all(helperConn, queryFetchBatch);
            for (let j = 0; j < rows.length; j++) {
                const linkNode: Node = <Node>rows[j];

                // Fetch all incoming edges
                const updateQuery = `UPDATE ${TABLE_EDGES.name + EXPORT_DUMMY_TABLE_PREFIX}
                SET target = ${linkNode.link}
                WHERE target = ${linkNode.id}`;
                await db.exec(helperConn, updateQuery);
                console.log(updateQuery);

                // Destroy node (see: node-d)
                const deleteQuery: string = `
                BEGIN
                DELETE FROM ${TABLE_EDGES.name + EXPORT_DUMMY_TABLE_PREFIX} 
                WHERE target = ${linkNode.id};

                DELETE FROM ${TABLE_NODES.name + EXPORT_DUMMY_TABLE_PREFIX} 
                WHERE id = ${linkNode.id};

                DELETE FROM ${TABLE_ROUTINES.name + EXPORT_DUMMY_TABLE_PREFIX} 
                WHERE id in ${[linkNode.code, linkNode.condition].join(',')};

                DELETE FROM ${TABLE_LOCALIZATIONS.name + EXPORT_DUMMY_TABLE_PREFIX} 
                WHERE id in ${[linkNode.voiceText, linkNode.uiResponseText].join(',')};
                COMMIT;
                `;
                await db.exec(helperConn, deleteQuery);
                console.log(deleteQuery);
            }
        }
    }

    private async createRemappedTables(
        db: DbClient,
        mainConn: DbConnection,
        helperConn: DbConnection,
    ): Promise<void> {
        // REMEMBER TO DROP LINK COLUMN ON NODES
    }

    private async createTable(
        db: DbClient,
        mainConn: DbConnection,
        helperConn: DbConnection,
        tableDefinition: TableDefinition,
    ): Promise<void> {
        // Create table
        const tableDefString: string = generateTableSqlite(tableDefinition, true);
        await db.exec(helperConn, tableDefString);

        // Add columns if necessary
        if (tableDefinition.tableType.id === TABLE_LOCALIZATIONS.id) {
            // Add columns to locales
            const locales: Locale[] = <Locale[]>(
                await db.all(mainConn, `SELECT id, name FROM ${TABLE_LOCALES.name} ORDER BY id ASC`)
            );
            for (let i = 0; i < locales.length; i++) {
                await db.exec(
                    helperConn,
                    `ALTER TABLE ${
                        TABLE_LOCALIZATIONS.name + EXPORT_DUMMY_TABLE_PREFIX
                    } ADD COLUMN ${localeIdToColumn(locales[i].id)} TEXT`,
                );
            }
        } else if (tableDefinition.tableType.id === TABLE_CONVERSATIONS.id) {
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
}
export const gameHelperDbExporterDefault: GameHelperDbExporterDefault =
    new GameHelperDbExporterDefault();
