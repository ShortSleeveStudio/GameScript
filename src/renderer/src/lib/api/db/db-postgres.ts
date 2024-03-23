import type {
    DbConnection,
    DbConnectionConfig,
    DbResult,
    DbTransaction,
} from '@common/common-db-types';
import type { AppNotification } from '@common/common-notification';
import type { Row } from '@common/common-schema';
import { updateRowQueryPostgres } from '@common/common-sql';
import {
    DATABASE_TABLES,
    DB_OP_ALTER,
    DB_OP_CREATE,
    DB_OP_DELETE,
    DB_OP_UPDATE,
    type DatabaseTableType,
    type FieldTypeId,
} from '@common/common-types';
import { TABLE_DEFINITIONS } from '@common/table-generators/table-generator';
import {
    generateTablePostgres,
    typeForFieldTypePostgres,
} from '@common/table-generators/table-generator-postgres';
import { EVENT_DB_COLUMN_DELETING, type DbColumnDeleting } from '@lib/constants/events';
import type { FocusManager } from '@lib/stores/app/focus';
import { type Writable } from 'svelte/store';
import { DbBase } from './db-base';
import type { Filter } from './db-filter-interface';
import { DbRowView } from './db-view-row';
import type { IDbRowView } from './db-view-row-interface';

/**PostgreSQL database implementation */
export class PostgresDb extends DbBase {
    private _db: DbConnection | undefined;
    private _dbListen: DbConnection | undefined;
    private _dbConnectionConfig: DbConnectionConfig | undefined;
    private _transactionNotifications: AppNotification[];

    constructor(isConnected: Writable<boolean>, focusManager: FocusManager) {
        super(isConnected, focusManager);
        this._transactionNotifications = [];
    }

    async isDbInitialized(config: DbConnectionConfig): Promise<boolean> {
        let conn: DbConnection;
        try {
            conn = await window.api.postgres.open(config);
            const tablesNames: { name: string }[] = await window.api.postgres.all(
                conn,
                `SELECT table_name as name FROM information_schema.tables;`,
            );
            const nameSet: Set<string> = new Set();
            for (let i = 0; i < tablesNames.length; i++) nameSet.add(tablesNames[i].name);
            for (let i = 0; i < DATABASE_TABLES.length; i++) {
                if (!nameSet.has(DATABASE_TABLES[i].name)) return false;
            }
        } catch {
            // do nothing
            return false;
        } finally {
            if (conn) await window.api.postgres.close(conn);
        }
        return true;
    }

    async initializeSchema(): Promise<void> {
        for (let i = 0; i < TABLE_DEFINITIONS.length; i++) {
            const tableDefString: string = generateTablePostgres(TABLE_DEFINITIONS[i]);
            await window.api.postgres.exec(this._db, tableDefString);
        }
    }

    async connect(config: DbConnectionConfig, initialize: boolean): Promise<void> {
        // Only attempt to connect if we have valid configuration
        if (!this.isConfigValid(config)) return;

        // Ensure we don't connect without disconnecting
        if (
            this._db !== undefined ||
            this._dbListen !== undefined ||
            this._dbConnectionConfig !== undefined
        ) {
            throw new Error('You must disconnect before changing connections');
        }

        // Attempt connection
        this._db = await window.api.postgres.open(config);
        this._dbListen = await window.api.postgres.open(config);
        this._dbConnectionConfig = config;

        // Initialize if necessary
        if (initialize) {
            await this.initializeSchema();
            await this.initializeDefaultRows();
        }

        // Listen for changes
        await window.api.postgres.listen(this._dbListen, this.onNotification);

        // Notify connected
        this._isConnected.set(true);

        // Notify tables
        await this.reloadAllTables();
    }

    async disconnect(): Promise<void> {
        await this.destroyConnection();
        await this.reloadAllTables();
    }

    async executeTransaction(transaction: DbTransaction): Promise<void> {
        let wasError: boolean = false;
        let conn: DbConnection;
        try {
            conn = await window.api.postgres.open(this._dbConnectionConfig);
            await window.api.postgres.exec(conn, 'BEGIN;');
            await transaction(conn);
        } catch (err) {
            wasError = true;
            await window.api.postgres.exec(conn, 'ROLLBACK;');
            throw err;
        } finally {
            // Preserve and reset notifications. If you don't clear these before notifying,
            // transactions in the notifications will end up looping over these irrelevant
            // notifications
            const preservedTransactions: AppNotification[] = this._transactionNotifications;
            this._transactionNotifications = [];
            // Only notify if there were no errors
            if (!wasError) {
                await window.api.postgres.exec(conn, 'COMMIT;');
                await window.api.postgres.close(conn);
                await super.combineAndBroadcastNotifications(preservedTransactions);
            } else {
                await window.api.postgres.close(conn);
            }
        }
    }

    async createColumn(
        tableType: DatabaseTableType,
        name: string,
        type: FieldTypeId,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        const typeString: string = typeForFieldTypePostgres(type, false);
        const query: string = `ALTER TABLE ${tableType.name} ADD COLUMN ${name} ${typeString};`;
        try {
            await window.api.postgres.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to add column: ${err}`);
        }

        // Notify
        await super.notify(
            DB_OP_ALTER,
            tableType.id,
            this._transactionNotifications,
            undefined,
            connection,
        );
    }

    async deleteColumn(
        tableType: DatabaseTableType,
        name: string,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        dispatchEvent(
            new CustomEvent(EVENT_DB_COLUMN_DELETING, {
                detail: <DbColumnDeleting>{ tableType: tableType },
            }),
        );
        const query: string = `ALTER TABLE ${tableType.name} DROP COLUMN ${name};`;
        try {
            await window.api.postgres.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to drop column: ${err}`);
        }

        // Notify
        await super.notify(
            DB_OP_ALTER,
            tableType.id,
            this._transactionNotifications,
            undefined,
            connection,
        );
    }

    async createRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<RowType> {
        this.assertConnected();
        return (await this.createRows(tableType, [row], connection))[0];
    }

    async createRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<RowType[]> {
        this.assertConnected();
        if (rows.length === 0) return [];
        for (let i = 0; i < rows.length; i++) {
            // Grab row
            const row: RowType = rows[i];

            // Generate query arguments
            let propertyNames: string = '';
            let placeHolders: string = '';
            const argumentArray: unknown[] = [];
            for (const prop in row) {
                if (argumentArray.length >= 1) {
                    propertyNames += ', ';
                    placeHolders += ', ';
                }
                propertyNames += prop;
                placeHolders += `$${argumentArray.length + 1}`;
                const value: unknown = row[prop];
                argumentArray.push(value);
            }

            // Execute
            const query: string = `INSERT INTO ${tableType.name} (${propertyNames}) VALUES (${placeHolders}) RETURNING id;`;
            let result: DbResult;
            try {
                result = await window.api.postgres.run(
                    connection ?? this._db,
                    query,
                    argumentArray,
                );
            } catch (err) {
                throw new Error(`Failed to create row: ${err}`);
            }

            // Set row id
            row.id = result.lastInsertRowId;
        }

        // Notify
        await super.notify(
            DB_OP_CREATE,
            tableType.id,
            this._transactionNotifications,
            rows,
            connection,
        );

        // Return new id
        return rows;
    }

    async fetchRowCount<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<number> {
        const query: string = `SELECT COUNT(*)::int as count FROM ${
            tableType.name
        } ${filter.whereClause()};`;
        let result: number = 0;
        try {
            const resultObj = await window.api.postgres.get(connection ?? this._db, query);
            result = resultObj['count'];
        } catch (err) {
            throw new Error(`Failed to fetch row count: ${err}`);
        }
        return result;
    }

    async fetchRowsRaw<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<RowType[]> {
        this.assertConnected();
        // Fetch rows
        const query: string = `SELECT * FROM ${tableType.name} ${filter.toString()};`;
        let results: RowType[];
        try {
            results = await window.api.postgres.all(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to fetch rows: ${err}`);
        }
        return results;
    }

    async fetchRows<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<IDbRowView<RowType>[]> {
        this.assertConnected();
        // Fetch rows
        const rowViews: IDbRowView<RowType>[] = [];
        const results: RowType[] = await this.fetchRowsRaw(tableType, filter, connection);

        // Map to row views
        const rowViewMap: Map<number, DbRowView<RowType>> = super.getRowViewsForTable(tableType);
        for (let i = 0; i < results.length; i++) {
            const row: RowType = results[i];
            let rowView = rowViewMap.get(row.id);
            if (!rowView) {
                rowView = new DbRowView<RowType>(tableType, row, () =>
                    super.destroyRowView(tableType, row.id),
                );
                rowViewMap.set(row.id, rowView);
            } else {
                // Update the row just in case (there should never be variation)
                rowView.onRowUpdated(row);
            }
            rowViews.push(rowView);
        }

        return rowViews;
    }

    async updateRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        for (let i = 0; i < rows.length; i++) {
            const row: RowType = rows[i];
            const [query, argumentArray]: [string, unknown[]] = updateRowQueryPostgres(
                tableType,
                row,
            );
            try {
                await window.api.postgres.run(connection ?? this._db, query, argumentArray);
            } catch (err) {
                throw new Error(`Failed to update row: ${err}`);
            }
        }

        // Notify
        await super.notify(
            DB_OP_UPDATE,
            tableType.id,
            this._transactionNotifications,
            rows,
            connection,
        );
    }

    async updateRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void> {
        await this.updateRows(tableType, [row], connection);
    }

    async deleteRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        await this.deleteRows(tableType, [row], connection);
    }

    async deleteRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        if (rows.length === 0) return;
        const query: string = `DELETE FROM ${tableType.name} WHERE id IN (${rows
            .map((row) => row.id)
            .join(', ')});`;

        try {
            await window.api.postgres.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to delete rows: ${err}`);
        }

        // Remove from cache
        super.removeRowViews(tableType, rows);

        // Notify
        await super.notify(
            DB_OP_DELETE,
            tableType.id,
            this._transactionNotifications,
            rows,
            connection,
        );
    }

    async searchAndReplace<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        field: string,
        search: string,
        replace: string,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        // Execute
        const query = `UPDATE ${
            tableType.name
        } SET ${field} = REPLACE(${field},$1,$2) ${filter.toString()};`;
        try {
            await window.api.postgres.run(connection ?? this._db, query, [search, replace]);
        } catch (err) {
            throw new Error(`Failed to update row: ${err}`);
        }

        // Notify
        await super.notify(
            DB_OP_ALTER,
            tableType.id,
            this._transactionNotifications,
            undefined,
            connection,
        );
    }

    protected async doNotify(notification: AppNotification): Promise<void> {
        await window.api.postgres.notify(this._db, notification);
    }

    private async destroyConnection(): Promise<void> {
        this._isConnected.set(false);
        if (this._dbListen) {
            await window.api.postgres.unlisten(this._dbListen, this.onNotification);
        }
        await window.api.postgres.closeAll();
        this._db = undefined;
        this._dbListen = undefined;
        this._dbConnectionConfig = undefined;
    }

    private assertConnected(): void {
        if (!this._db || !this._dbListen)
            throw new Error('Operation failed: no database connection');
    }

    private isConfigValid(config: DbConnectionConfig): boolean {
        if (
            config &&
            config.pgAddress &&
            config.pgPort &&
            config.pgDatabase &&
            config.pgUsername &&
            config.pgPassword
        )
            return true;
        return false;
    }
}
