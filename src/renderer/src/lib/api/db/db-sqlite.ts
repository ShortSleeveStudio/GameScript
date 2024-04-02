import type {
    DbConnection,
    DbConnectionConfig,
    DbResult,
    DbTransaction,
} from '@common/common-db-types';
import type { AppNotification } from '@common/common-notification';
import type { Row, Table } from '@common/common-schema';
import { bulkUpdateQuerySqlite, updateRowQuerySqlite } from '@common/common-sql';
import {
    DATABASE_TABLES,
    DB_OP_ALTER,
    DB_OP_CREATE,
    DB_OP_UPDATE,
    type FieldTypeId,
} from '@common/common-types';
import { TABLE_DEFINITIONS } from '@common/table-generators/table-generator';
import {
    generateTableSqlite,
    typeForFieldTypeSqlite,
} from '@common/table-generators/table-generator-sqlite';
import { type FocusManager } from '@lib/stores/app/focus';
import { type Writable } from 'svelte/store';
import { DbBase } from './db-base';
import type { Filter } from './db-filter-interface';

/**SQLite database implementation */
export class SqliteDb extends DbBase {
    private _dbConnectionConfig: DbConnectionConfig | undefined;

    constructor(isConnected: Writable<boolean>, focusManager: FocusManager) {
        super(isConnected, focusManager);
    }

    async isDbInitialized(config: DbConnectionConfig): Promise<boolean> {
        let conn: DbConnection;
        try {
            if (!config.sqliteFile || !(await window.api.fs.doesFileExist(config.sqliteFile))) {
                return false;
            }
            conn = await window.api.sqlite.open(<DbConnectionConfig>{
                sqliteFile: config.sqliteFile,
            });
            const tablesNames: { name: string }[] = await window.api.sqlite.all(
                conn,
                `SELECT name FROM sqlite_master WHERE type='table';`,
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
            if (conn) await window.api.sqlite.close(conn);
        }
        return true;
    }

    protected async initializeSchema(): Promise<void> {
        for (let i = 0; i < TABLE_DEFINITIONS.length; i++) {
            const tableDefString: string = generateTableSqlite(TABLE_DEFINITIONS[i]);
            await window.api.sqlite.exec(this._db, tableDefString);
        }
    }

    async connect(config: DbConnectionConfig, initialize: boolean): Promise<void> {
        // Only attempt to connect if we have a valid path
        if (!config || !config.sqliteFile) {
            return;
        }

        // Ensure we don't connect without disconnecting
        if (this._db !== undefined || this._dbConnectionConfig !== undefined) {
            throw new Error('You must disconnect before changing connections');
        }

        // Attempt connection
        this._db = await window.api.sqlite.open(<DbConnectionConfig>{
            sqliteFile: config.sqliteFile,
        });
        this._dbConnectionConfig = config;

        // Initialize if necessary
        if (initialize) {
            await this.initializeSchema();
            await this.initializeDefaultRows();
        }

        // Listen for changes
        await window.api.sqlite.listen(undefined, this.onNotification);

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
        await super.executeTransactionInternal(
            window.api.sqlite,
            this._dbConnectionConfig,
            transaction,
        );
    }

    async createColumn(
        tableType: Table,
        name: string,
        type: FieldTypeId,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        const typeString: string = typeForFieldTypeSqlite(type);
        const query: string = `ALTER TABLE ${tableType.name} ADD COLUMN ${name} ${typeString};`;
        try {
            await window.api.sqlite.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to add column: ${err}`);
        }

        // Notify
        await this.notify(DB_OP_ALTER, tableType.id, undefined, connection);
    }

    async deleteColumn(tableType: Table, name: string, connection?: DbConnection): Promise<void> {
        await super.deleteColumnInternal(window.api.sqlite, tableType, name, connection);
    }

    async createRows<RowType extends Row>(
        tableType: Table,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<RowType[]> {
        this.assertConnected();
        if (!rows || rows.length === 0) return [];
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
                placeHolders += `?`;
                const value: unknown = row[prop];
                argumentArray.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
            }

            // Execute
            const query: string = `INSERT INTO ${tableType.name} (${propertyNames}) VALUES (${placeHolders});`;
            let result: DbResult;
            try {
                result = await window.api.sqlite.run(connection ?? this._db, query, argumentArray);
            } catch (err) {
                throw new Error(`Failed to create row: ${err}`);
            }

            // Set row id
            row.id = result.lastInsertRowId;
        }

        // Notify
        await this.notify(DB_OP_CREATE, tableType.id, rows, connection);

        // Return new id
        return rows;
    }

    async fetchRowCount<RowType extends Row>(
        tableType: Table,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<number> {
        const query: string = `SELECT COUNT(*) as count FROM ${
            tableType.name
        } ${filter.whereClause()};`;
        let result: number = 0;
        try {
            const resultObj = await window.api.sqlite.get(connection ?? this._db, query);
            result = resultObj['count'];
        } catch (err) {
            throw new Error(`Failed to fetch row count: ${err}`);
        }
        return result;
    }

    async fetchRowsRaw<RowType extends Row>(
        tableType: Table,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<RowType[]> {
        return await super.fetchRowsRawInternal(window.api.sqlite, tableType, filter, connection);
    }

    async updateRows<RowType extends Row>(
        tableType: Table,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        for (let i = 0; i < rows.length; i++) {
            const row: RowType = rows[i];
            const [query, argumentArray]: [string, unknown[]] = updateRowQuerySqlite(
                tableType,
                row,
            );
            try {
                await window.api.sqlite.run(connection ?? this._db, query, argumentArray);
            } catch (err) {
                throw new Error(`Failed to update row: ${err}`);
            }
        }

        // Notify
        await this.notify(DB_OP_UPDATE, tableType.id, rows, connection);
    }

    async bulkUpdate<RowType extends Row>(
        tableType: Table,
        row: RowType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        const [query, argumentArray]: [string, unknown[]] = bulkUpdateQuerySqlite(
            tableType,
            row,
            filter.toString(),
        );
        try {
            await window.api.sqlite.run(connection ?? this._db, query, argumentArray);
        } catch (err) {
            throw new Error(`Failed to bulk update rows: ${err}`);
        }

        // Notify
        await this.notify(DB_OP_ALTER, tableType.id, undefined, connection);
    }

    async deleteRows<RowType extends Row>(
        tableType: Table,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void> {
        await super.deleteRowsInternal(window.api.sqlite, tableType, rows, connection);
    }

    async bulkDelete<RowType extends Row>(
        tableType: Table,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<void> {
        await super.bulkDeleteInternal(window.api.sqlite, tableType, filter, connection);
    }

    async searchAndReplace<RowType extends Row>(
        tableType: Table,
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
        } SET ${field} = REPLACE(${field},?,?) ${filter.toString()};`;
        try {
            await window.api.sqlite.run(connection ?? this._db, query, [search, replace]);
        } catch (err) {
            throw new Error(`Failed to update row: ${err}`);
        }

        // Notify
        await this.notify(DB_OP_ALTER, tableType.id, undefined, connection);
    }

    protected async doNotify(notification: AppNotification): Promise<void> {
        // We can skip the main process, this came from us
        if (!this._db) return;
        await this.onNotification(undefined, notification);
    }

    private async destroyConnection(): Promise<void> {
        this._isConnected.set(false);
        await window.api.sqlite.unlisten(this.onNotification);
        await window.api.sqlite.closeAll();
        this._db = undefined;
        this._dbConnectionConfig = undefined;
    }
}
