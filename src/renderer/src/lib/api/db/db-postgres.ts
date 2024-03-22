import type { DbConnection, DbConnectionConfig, DbTransaction } from '@common/common-db-types';
import type { Row } from '@common/common-schema';
import {
    DATABASE_TABLES,
    DB_OP_ALTER,
    type DatabaseTableType,
    type FieldTypeId,
} from '@common/common-types';
import { TABLE_DEFINITIONS } from '@common/table-generators/table-generator';
import {
    generateTablePostgres,
    typeForFieldTypePostgres,
} from '@common/table-generators/table-generator-postgres';
import type { FocusManager } from '@lib/stores/app/focus';
import type { Writable } from 'svelte/store';
import { DbBase, type DbQueuedNotification } from './db-base';
import type { Filter } from './db-filter-interface';
import type { IDbRowView } from './db-view-row-interface';

/**PostgreSQL database implementation */
export class PostgresDb extends DbBase {
    private _db: DbConnection | undefined;
    private _focusManager: FocusManager;
    private _dbConnectionConfig: DbConnectionConfig | undefined;
    private _transactionNotifications: DbQueuedNotification[];

    constructor(isConnected: Writable<boolean>, focusManager: FocusManager) {
        super(isConnected);
        this._focusManager = focusManager;
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
            console.log(tableDefString);
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
            // await this.initializeDefaultRows();
        }

        // TODO

        // Listen for changes
        // await window.api.sqlite.listen(undefined, this.onNotification);

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
            const preservedTransactions: DbQueuedNotification[] = this._transactionNotifications;
            this._transactionNotifications = [];
            if (!wasError) {
                await window.api.postgres.exec(conn, 'COMMIT;');
                await window.api.postgres.close(conn);
                // Only notify if there were no errors
                for (let i = 0; i < preservedTransactions.length; i++) {
                    const notification: DbQueuedNotification = preservedTransactions[i];
                    await this.notify(
                        notification.op,
                        notification.tableType,
                        notification.rows,
                        undefined,
                    );
                }
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
        await this.notify(DB_OP_ALTER, tableType, undefined, connection);
    }

    async deleteColumn(
        tableType: DatabaseTableType,
        name: string,
        connection?: DbConnection,
    ): Promise<void> {}

    createRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<RowType> {
        throw new Error('Method not implemented.');
    }
    createRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<RowType[]> {
        throw new Error('Method not implemented.');
    }
    fetchRowCount<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<number> {
        throw new Error('Method not implemented.');
    }
    fetchRowsRaw<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<RowType[]> {
        throw new Error('Method not implemented.');
    }
    fetchRows<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<IDbRowView<RowType>[]> {
        throw new Error('Method not implemented.');
    }
    updateRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void> {
        throw new Error('Method not implemented.');
    }
    updateRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void> {
        throw new Error('Method not implemented.');
    }
    deleteRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void> {
        throw new Error('Method not implemented.');
    }
    deleteRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void> {
        throw new Error('Method not implemented.');
    }
    searchAndReplace<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        field: string,
        search: string,
        replace: string,
        connection?: DbConnection,
    ): Promise<void> {
        throw new Error('Method not implemented.');
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

    private async destroyConnection(): Promise<void> {
        this._isConnected.set(false);
        // TODO
        // await window.api.sqlite.unlisten(undefined, this.onNotification);
        await window.api.sqlite.closeAll();
        this._db = undefined;
        this._dbConnectionConfig = undefined;
    }

    private assertConnected(): void {
        if (!this._db) throw new Error('Operation failed: no database connection');
    }
}
