import type { DbConnection, DbConnectionConfig, DbTransaction } from '@common/common-db-types';
import type { AppNotification } from '@common/common-notification';
import type { Row } from '@common/common-schema';
import { updateRowQueryPostgres } from '@common/common-sql';
import {
    DATABASE_TABLES,
    DB_OP_ALTER,
    DB_OP_CREATE,
    DB_OP_UPDATE,
    type DatabaseTableType,
    type FieldTypeId,
} from '@common/common-types';
import { TABLE_DEFINITIONS } from '@common/table-generators/table-generator';
import {
    generateTablePostgres,
    typeForFieldTypePostgres,
} from '@common/table-generators/table-generator-postgres';
import type { FocusManager } from '@lib/stores/app/focus';
import { type Writable } from 'svelte/store';
import { DbBase } from './db-base';
import type { Filter } from './db-filter-interface';

/**PostgreSQL database implementation */
export class PostgresDb extends DbBase {
    private _dbConnectionConfig: DbConnectionConfig | undefined;

    constructor(isConnected: Writable<boolean>, focusManager: FocusManager) {
        super(isConnected, focusManager);
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
        if (this._db !== undefined || this._dbConnectionConfig !== undefined) {
            throw new Error('You must disconnect before changing connections');
        }

        // Attempt connection
        this._db = await window.api.postgres.open(config);
        this._dbConnectionConfig = config;

        // Initialize if necessary
        if (initialize) {
            await this.initializeSchema();
            await this.initializeDefaultRows();
        }

        // Listen for changes
        await window.api.postgres.listen(this._dbConnectionConfig, this.onNotification);

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
            window.api.postgres,
            this._dbConnectionConfig,
            transaction,
        );
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
        await super.notify(DB_OP_ALTER, tableType.id, undefined, connection);
    }

    async deleteColumn(
        tableType: DatabaseTableType,
        name: string,
        connection?: DbConnection,
    ): Promise<void> {
        await super.deleteColumnInternal(window.api.postgres, tableType, name, connection);
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
            let lastInsertRowId: number;
            try {
                const results: { id: number }[] = <{ id: number }[]>(
                    await window.api.postgres.all(connection ?? this._db, query, argumentArray)
                );
                if (!results || results.length !== 1) throw new Error('Failed to create row');
                lastInsertRowId = results[0].id;
            } catch (err) {
                throw new Error(`Failed to create row: ${err}`);
            }

            // Set row id
            row.id = lastInsertRowId;
        }

        // Notify
        await super.notify(DB_OP_CREATE, tableType.id, rows, connection);

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
        return await super.fetchRowsRawInternal(window.api.postgres, tableType, filter, connection);
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
                await window.api.postgres.all(connection ?? this._db, query, argumentArray);
            } catch (err) {
                throw new Error(`Failed to update row: ${err}`);
            }
        }

        // Notify
        await this.notify(DB_OP_UPDATE, tableType.id, rows, connection);
    }

    async deleteRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void> {
        await super.deleteRowsInternal(window.api.postgres, tableType, rows, connection);
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
            await window.api.postgres.all(connection ?? this._db, query, [search, replace]);
        } catch (err) {
            throw new Error(`Failed to update row: ${err}`);
        }

        // Notify
        await super.notify(DB_OP_ALTER, tableType.id, undefined, connection);
    }

    protected async doNotify(notification: AppNotification): Promise<void> {
        await window.api.postgres.notify(this._db, notification);
    }

    private async destroyConnection(): Promise<void> {
        this._isConnected.set(false);
        await window.api.postgres.unlisten(this.onNotification);
        await window.api.postgres.closeAll();
        this._db = undefined;
        this._dbConnectionConfig = undefined;
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
