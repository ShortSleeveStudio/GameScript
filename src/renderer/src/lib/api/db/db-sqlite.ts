import type {
    DbConnection,
    DbConnectionConfig,
    DbNotification,
    DbResult,
    DbTransaction,
} from '@common/common-db-types';
import { type Row } from '@common/common-schema';
import { updateRowQuery } from '@common/common-sql';
import {
    DATABASE_TABLES,
    DB_OP_ALTER,
    DB_OP_CREATE,
    DB_OP_DELETE,
    DB_OP_UPDATE,
    type DatabaseTableType,
    type FieldTypeId,
    type OpTypeId,
} from '@common/common-types';
import { TABLE_DEFINITIONS } from '@common/table-generators/table-generator';
import {
    generateTableSqlite,
    typeForFieldTypeSqlite,
} from '@common/table-generators/table-generator-sqlite';
import { EVENT_DB_COLUMN_DELETING, type DbColumnDeleting } from '@lib/constants/events';
import {
    FOCUS_MODE_MODIFY,
    FOCUS_REMOVE,
    type Focus,
    type FocusManager,
    type FocusRequests,
} from '@lib/stores/app/focus';
import { wait } from '@lib/utility/wait';
import type { IpcRendererEvent } from 'electron';
import { get, type Writable } from 'svelte/store';
import { DbBase, type DbQueuedNotification } from './db-base';
import { createFilter } from './db-filter';
import type { Filter } from './db-filter-interface';
import { DbRowView } from './db-view-row';
import type { IDbRowView } from './db-view-row-interface';
import type { DbTableView } from './db-view-table';

/**SQLite database implementation */
export class SqliteDb extends DbBase {
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
        let wasError: boolean = false;
        let conn: DbConnection;
        try {
            conn = await window.api.sqlite.open(this._dbConnectionConfig);
            await window.api.sqlite.exec(conn, 'BEGIN;');
            await transaction(conn);
        } catch (err) {
            wasError = true;
            await window.api.sqlite.exec(conn, 'ROLLBACK;');
            throw err;
        } finally {
            // Preserve and reset notifications. If you don't clear these before notifying,
            // transactions in the notifications will end up looping over these irrelevant
            // notifications
            const preservedTransactions: DbQueuedNotification[] = this._transactionNotifications;
            this._transactionNotifications = [];
            if (!wasError) {
                await window.api.sqlite.exec(conn, 'COMMIT;');
                await window.api.sqlite.close(conn);
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
                await window.api.sqlite.close(conn);
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
        const typeString: string = typeForFieldTypeSqlite(type);

        const query: string = `ALTER TABLE ${tableType.name} ADD COLUMN ${name} ${typeString};`;
        try {
            await window.api.sqlite.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to add column: ${err}`);
        }

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        await this.notify(DB_OP_ALTER, tableType, undefined, connection);
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
        const query: string = `ALTER TABLE ${tableType.name} DROP COLUMN ${name}`;
        try {
            await window.api.sqlite.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to drop column: ${err}`);
        }

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        await this.notify(DB_OP_ALTER, tableType, undefined, connection);
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

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        await this.notify<RowType>(DB_OP_CREATE, tableType, rows, connection);

        // Return new id
        return rows;
    }

    async fetchRowCount<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<number> {
        const query: string = `SELECT COUNT(*) as count FROM ${
            tableType.name
        } ${filter.whereClause()}`;
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
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<RowType[]> {
        this.assertConnected();
        // Fetch rows
        const query: string = `SELECT * FROM ${tableType.name} ${filter.toString()}`;
        let results: RowType[];
        try {
            results = await window.api.sqlite.all(connection ?? this._db, query);
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
            const [query, argumentArray]: [string, unknown[]] = updateRowQuery(tableType, row);
            try {
                await window.api.sqlite.run(connection ?? this._db, query, argumentArray);
            } catch (err) {
                throw new Error(`Failed to update row: ${err}`);
            }
        }

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        await this.notify<RowType>(DB_OP_UPDATE, tableType, rows, connection);
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
            .join(', ')})`;

        try {
            await window.api.sqlite.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to delete rows: ${err}`);
        }

        // Remove from cache
        this.removeRowViews(tableType, rows);

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        await this.notify<RowType>(DB_OP_DELETE, tableType, rows, connection);
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
        } SET ${field} = REPLACE(${field},?,?) ${filter.toString()};`;
        try {
            await window.api.sqlite.run(connection ?? this._db, query, [search, replace]);
        } catch (err) {
            throw new Error(`Failed to update row: ${err}`);
        }

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        await this.notify(DB_OP_ALTER, tableType, undefined, connection);
    }

    protected async initializeSchema(): Promise<void> {
        for (let i = 0; i < TABLE_DEFINITIONS.length; i++) {
            const tableDefString: string = generateTableSqlite(TABLE_DEFINITIONS[i]);
            await window.api.sqlite.exec(this._db, tableDefString);
        }
    }

    private async notify<RowType extends Row>(
        op: OpTypeId,
        tableType: DatabaseTableType,
        rows?: RowType[],
        connection?: DbConnection,
    ): Promise<void> {
        // Don't do notifications if we're initializing
        if (!get(this._isConnected)) return;

        // Cache the notification for later if we're in a transaction
        if (connection) {
            this._transactionNotifications.push({
                op: op,
                tableType: tableType,
                rows: rows,
            });
            return;
        }

        // Fire notification
        await window.api.sqlite.notify(undefined, <DbNotification>{
            tableId: tableType.id,
            opType: op,
            rows: rows,
        });
    }

    private onNotification: (
        event: IpcRendererEvent,
        notification: DbNotification,
    ) => Promise<void> = async (_event: IpcRendererEvent, notification: DbNotification) => {
        switch (notification.opType) {
            case DB_OP_CREATE:
            case DB_OP_DELETE: {
                await this.notifyOnRowLifecycleEvent(
                    DATABASE_TABLES[notification.tableId],
                    notification.rows,
                );
                break;
            }
            case DB_OP_UPDATE: {
                await this.notifyOnRowsUpdated(
                    DATABASE_TABLES[notification.tableId],
                    notification.rows,
                );
                break;
            }
            case DB_OP_ALTER: {
                await this.notifyOnTableAltered(DATABASE_TABLES[notification.tableId]);
                break;
            }
            default:
                throw new Error(
                    `Unknown database operation type encountered: ${notification.opType}`,
                );
        }
    };

    private async notifyOnRowLifecycleEvent<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
    ): Promise<void> {
        const tableViews = super.getTableViewsForTable<RowType>(tableType);
        for (const tableView of tableViews.values()) {
            if (tableView.filter.wouldAffectRows(rows, true)) {
                await (<DbTableView<RowType>>tableView).onReloadRequired();
            }
        }
    }

    private async notifyOnRowsUpdated<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
    ): Promise<void> {
        const rowIds: number[] = rows.map((row) => row.id);
        await this.fetchRows(
            tableType,
            createFilter().where().column('id').in(rowIds).endWhere().build(),
        );
    }

    private async notifyOnTableAltered(tableType: DatabaseTableType): Promise<void> {
        const tableViews = super.getTableViewsForTable(tableType);
        for (const tableView of tableViews.values()) {
            tableView.onReloadRequired();
        }
    }

    private removeRowViews<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType[],
    ): void {
        const rowViews: Map<number, IDbRowView<RowType>> = super.getRowViewsForTable(tableType);
        const focusMap: Map<number, Focus> = new Map();
        row.forEach((row) => {
            if (rowViews.has(row.id)) {
                // Remove from focus if needed
                focusMap.set(row.id, { rowId: row.id });

                // Delete from cache
                rowViews.delete(row.id);
            }
        });
        if (focusMap.size > 0) {
            this._focusManager.focus(<FocusRequests>{
                type: FOCUS_MODE_MODIFY,
                requests: [
                    {
                        tableType: tableType,
                        focus: focusMap,
                        type: FOCUS_REMOVE,
                    },
                ],
            });
        }
    }

    private async destroyConnection(): Promise<void> {
        this._isConnected.set(false);
        await window.api.sqlite.unlisten(undefined, this.onNotification);
        await window.api.sqlite.closeAll();
        this._db = undefined;
        this._dbConnectionConfig = undefined;
    }

    private assertConnected(): void {
        if (!this._db) throw new Error('Operation failed: no database connection');
    }
}
