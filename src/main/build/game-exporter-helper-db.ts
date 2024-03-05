import { DbClient, DbConnection } from '../../common/common-db-types';
import { filterIdToColumn } from '../../common/common-filter';
import { localeIdToColumn } from '../../common/common-locale';
import { Edge, Filter, Locale, Node, Row } from '../../common/common-schema';
import {
    NODE_TYPE_LINK,
    TABLE_CONVERSATIONS,
    TABLE_EDGES,
    TABLE_FILTERS,
    TABLE_LOCALES,
    TABLE_LOCALIZATIONS,
    TABLE_NODES,
    TABLE_ROUTINES,
} from '../../common/common-types';
import { TableDefinition } from '../../common/table-definitions/table-definitions';
import { TABLE_DEFINITIONS } from '../../common/table-generators/table-generator';
import { generateTableSqlite } from '../../common/table-generators/table-generator-sqlite';
import { GameExportRequest } from '../../preload/api-build';
import { EXPORTER_BATCH_SIZE, GameHelperDbExporter } from './build-common';

export class GameHelperDbExporterDefault implements GameHelperDbExporter {
    async export(
        db: DbClient,
        _importRequest: GameExportRequest,
        mainConn: DbConnection,
        helperConn: DbConnection,
    ): Promise<void> {
        // Create and Populate Tables
        await this.createAndPopulateTables(db, mainConn, helperConn);

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
            const columnsList: string[] = [];
            for (const column of Object.keys(row)) {
                columnsList.push(column);
            }
            const columns: string = columnsList.join(', ');

            // Read through database in batches and create tables in the new database with
            // a copy of the original data.
            const count: number = (<{ count: number }>await db.get(
                mainConn,
                `SELECT COUNT(*) as count 
                    FROM ${tableDefinition.tableType.name};`,
            )).count;
            for (let j = 0; j < count; j += EXPORTER_BATCH_SIZE) {
                const limit: number = EXPORTER_BATCH_SIZE;
                const offset: number = j;
                const queryFetchBatch: string = `
                SELECT ${columns} 
                FROM ${tableDefinition.tableType.name} 
                ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`;
                const rows = await db.all(mainConn, queryFetchBatch);
                for (let k = 0; k < rows.length; k++) {
                    const valueList: unknown[] = Object.values(<object>rows[k]);
                    const queryInsertBatch = `INSERT INTO ${
                        tableDefinition.tableType.name
                    } (${columns}) VALUES (${valueList.map(() => '?')})`;
                    await db.run(helperConn, queryInsertBatch, valueList);
                }
            }
        }
    }

    private async convertLinkNodes(db: DbClient, helperConn: DbConnection): Promise<void> {
        // Fetch all link nodes in batches
        const count: number = (<{ count: number }>await db.get(
            helperConn,
            `SELECT COUNT(*) as count FROM ${TABLE_NODES.name} 
                WHERE type = '${NODE_TYPE_LINK.name}';`,
        )).count;
        for (let i = 0; i < count; i += EXPORTER_BATCH_SIZE) {
            const limit: number = EXPORTER_BATCH_SIZE;
            const offset: number = i;
            const queryFetchBatch: string = `SELECT * 
            FROM ${TABLE_NODES.name} 
            WHERE type = '${NODE_TYPE_LINK.name}' 
            ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`;
            const rows = await db.all(helperConn, queryFetchBatch);
            for (let j = 0; j < rows.length; j++) {
                const linkNode: Node = <Node>rows[j];

                if (linkNode.link) {
                    // Fetch all incoming edges
                    const fetchIncomingEdgeQuery: string = `
                    SELECT * FROM ${TABLE_EDGES.name}
                    WHERE target = ${linkNode.id};
                    `;
                    const incomingEdges: Edge[] = await db.all(helperConn, fetchIncomingEdgeQuery);
                    for (let k = 0; k < incomingEdges.length; k++) {
                        const incomingEdge: Edge = incomingEdges[k];

                        // Fetch all source nodes for incoming edges
                        const sourceNodeQuery: string = `
                        SELECT * FROM ${TABLE_NODES.name}
                        WHERE id = ${incomingEdge.source};
                        `;
                        const sourceNode: Node = await db.get(helperConn, sourceNodeQuery);

                        // Fetch all edges from source nodes to the link node's target
                        const sourceToLinkQuery: string = `
                        SELECT * FROM ${TABLE_EDGES.name} 
                        WHERE source = ${sourceNode.id}
                        AND target = ${linkNode.link};
                        `;
                        const edgeToLinkTarget: Edge = await db.get(helperConn, sourceToLinkQuery);

                        if (edgeToLinkTarget) {
                            // If edges are found, make sure to update their priority such that it
                            // matches the highest priority incoming edge from that source node.
                            // Then skip updating the edge (it will be deleted in a moment).
                            if (edgeToLinkTarget.priority < incomingEdge.priority) {
                                const updateQuery = `UPDATE ${TABLE_EDGES.name}
                                SET priority = ${incomingEdge.priority}
                                WHERE id = ${edgeToLinkTarget.id};`;
                                await db.exec(helperConn, updateQuery);
                            }
                        } else {
                            // If edges are NOT found, then update the incoming edge to point
                            // directly at the link node target
                            const updateQuery = `UPDATE ${TABLE_EDGES.name}
                            SET target = ${linkNode.link}
                            WHERE id = ${incomingEdge.id};`;
                            await db.exec(helperConn, updateQuery);
                        }
                    }
                }

                // Destroy node (see: node-d)
                const deleteQuery: string = `
                DELETE FROM ${TABLE_EDGES.name} 
                WHERE target = ${linkNode.id};
                DELETE FROM ${TABLE_NODES.name} 
                WHERE id = ${linkNode.id};
                DELETE FROM ${TABLE_ROUTINES.name} 
                WHERE id in (${[linkNode.code, linkNode.condition].join(',')});
                DELETE FROM ${TABLE_LOCALIZATIONS.name} 
                WHERE id in (${[linkNode.voiceText, linkNode.uiResponseText].join(',')});
                `;
                await db.exec(helperConn, deleteQuery);

                // Destroy any self referencing nodes
                const deleteLoops: string = `DELETE FROM ${TABLE_EDGES.name} WHERE target = source;`;
                await db.exec(helperConn, deleteLoops);
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
        const tableDefString: string = generateTableSqlite(tableDefinition);
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
                    `ALTER TABLE ${TABLE_LOCALIZATIONS.name} ADD COLUMN ${localeIdToColumn(
                        locales[i].id,
                    )} TEXT`,
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
                    `ALTER TABLE ${TABLE_CONVERSATIONS.name} ADD COLUMN ${filterIdToColumn(
                        filters[i].id,
                    )} TEXT`,
                );
            }
        }
    }
}
export const gameHelperDbExporterDefault: GameHelperDbExporterDefault =
    new GameHelperDbExporterDefault();
