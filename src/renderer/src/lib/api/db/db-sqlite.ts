import type { Focusable } from '@lib/stores/app/focus';
import { NotificationItem, NotificationManager } from '@lib/stores/app/notifications';
import { dialogResultReset } from '@lib/utility/dialog';
import { wait } from '@lib/utility/wait';
import type { DbConnection } from 'preload/api-db';
import type { DialogResult } from 'preload/api-dialog';
import type { SqliteResult } from 'preload/api-sqlite';
import { get, type Unsubscriber, type Writable } from 'svelte/store';
import {
    Db,
    OP_ALTER,
    OP_CREATE,
    OP_DELETE,
    OP_UPDATE,
    type OpType,
    type Transaction,
} from './db-base';
import { createFilter } from './db-filter';
import type { Filter } from './db-filter-interface';
import {
    DATABASE_TABLE_NAMES,
    FIELD_TYPE_ID_DECIMAL,
    FIELD_TYPE_ID_INTEGER,
    FIELD_TYPE_ID_TEXT,
    type DatabaseTableId,
    type FieldTypeId,
    type Row,
} from './db-schema';
import { CREATE_TABLE_QUERIES, INITIALIZE_TABLE_QUERIES } from './db-sqlite-queries';
import { DbRowView } from './db-view-row';
import type { IDbRowView } from './db-view-row-interface';
import type { DbTableView } from './db-view-table';

/**Used to queue notifications when needed. */
interface DbNotification {
    op: OpType;
    tableId: DatabaseTableId;
    rows?: Row[];
}

/**
 * SQLite database implementation
 * NOTE:
 * The default database file location is:
 * C:\Users\<username>\AppData\Roaming\com.tauri.dev\GameScript.db
 */
export class SqliteDb extends Db {
    private _db: DbConnection | undefined;
    private _unsubscribeSqlitePath: Unsubscriber;
    private _unsubscribeDbConnected: Unsubscriber;
    private _sqlitePathStore: Writable<DialogResult>;
    private _appInitializationErrors: Writable<Error[]>;
    private _notificationManager: NotificationManager;
    private _focused: Writable<Focusable>;
    private _transactionNotifications: DbNotification[];

    constructor(
        isConnected: Writable<boolean>,
        sqlitePathStore: Writable<DialogResult>,
        appInitializationError: Writable<Error[]>,
        notificationManager: NotificationManager,
        focused: Writable<Focusable>,
    ) {
        super(isConnected);

        this._sqlitePathStore = sqlitePathStore;
        this._appInitializationErrors = appInitializationError;
        this._notificationManager = notificationManager;
        this._focused = focused;
        this._transactionNotifications = [];
        this._unsubscribeDbConnected = this._isConnected.subscribe(this.onDbConnectedChanged);
        this._unsubscribeSqlitePath = this._sqlitePathStore.subscribe(this.onDbPathChanged);
    }

    async executeTransaction(transaction: Transaction): Promise<void> {
        let wasError: boolean = false;
        const dbFile: DialogResult = get(this._sqlitePathStore);
        let conn: DbConnection;
        try {
            conn = await window.api.sqlite.open(dbFile.fullPath);
            await window.api.sqlite.exec(conn, 'BEGIN;');
            await transaction(conn);
        } catch (err) {
            wasError = true;
            await window.api.sqlite.exec(conn, 'ROLLBACK;');
            throw err;
        } finally {
            if (!wasError) {
                window.api.sqlite.exec(conn, 'COMMIT;');
                // Only notify if there were no errors
                for (let i = 0; i < this._transactionNotifications.length; i++) {
                    const notification: DbNotification = this._transactionNotifications[i];
                    await this.notify(
                        notification.op,
                        notification.tableId,
                        notification.rows,
                        undefined,
                    );
                }
            }
            await window.api.sqlite.close(conn);
            this._transactionNotifications.length = 0;
        }
    }

    async createColumn(
        tableId: number,
        name: string,
        type: FieldTypeId,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        let typeString: string;
        switch (type) {
            case FIELD_TYPE_ID_DECIMAL:
                typeString = 'NUMERIC DEFAULT 0';
                break;
            case FIELD_TYPE_ID_INTEGER:
                typeString = 'INTEGER DEFAULT 0';
                break;
            case FIELD_TYPE_ID_TEXT:
                typeString = 'TEXT';
                break;
            default:
                throw Error(`Unknown column type: ${type}`);
        }
        const query: string = `ALTER TABLE ${DATABASE_TABLE_NAMES[tableId]} ADD COLUMN ${name} ${typeString};`;
        try {
            await window.api.sqlite.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to add column: ${err}`);
        }

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        await this.notify(OP_ALTER, tableId, undefined, connection);
    }

    async deleteColumn(tableId: number, name: string, connection?: DbConnection): Promise<void> {
        this.assertConnected();
        const query: string = `ALTER TABLE ${DATABASE_TABLE_NAMES[tableId]} DROP COLUMN ${name}`;
        try {
            await window.api.sqlite.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to drop column: ${err}`);
        }

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        await this.notify(OP_ALTER, tableId, undefined, connection);
    }

    async createRow<RowType extends Row>(
        tableId: DatabaseTableId,
        row: RowType,
        connection?: DbConnection,
    ): Promise<RowType> {
        this.assertConnected();
        return (await this.createRows(tableId, [row], connection))[0];
    }

    async createRows<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<RowType[]> {
        this.assertConnected();
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
            const query: string = `INSERT INTO ${DATABASE_TABLE_NAMES[tableId]} (${propertyNames}) VALUES (${placeHolders});`;
            let result: SqliteResult;
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
        await this.notify<RowType>(OP_CREATE, tableId, rows, connection);

        // Return new id
        return rows;
    }

    async fetchRowCount<RowType extends Row>(
        tableId: number,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<number> {
        const query: string = `SELECT COUNT(*) as count FROM ${
            DATABASE_TABLE_NAMES[tableId]
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
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<RowType[]> {
        this.assertConnected();
        // Fetch rows
        const query: string = `SELECT * FROM ${DATABASE_TABLE_NAMES[tableId]} ${filter.toString()}`;
        let results: RowType[];
        try {
            results = await window.api.sqlite.all(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to fetch rows: ${err}`);
        }
        return results;
    }

    async fetchRows<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<IDbRowView<RowType>[]> {
        this.assertConnected();
        // Fetch rows
        const rowViews: IDbRowView<RowType>[] = [];
        const results: RowType[] = await this.fetchRowsRaw(tableId, filter, connection);

        // Map to row views
        const rowViewMap: Map<number, DbRowView<RowType>> = super.getRowViewsForTable(tableId);
        for (let i = 0; i < results.length; i++) {
            const row: RowType = results[i];
            let rowView = rowViewMap.get(row.id);
            if (!rowView) {
                rowView = new DbRowView<RowType>(tableId, row, () =>
                    super.destroyRowView(tableId, row.id),
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

    async updateRow<RowType extends Row>(
        tableId: DatabaseTableId,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        // Generate query arguments
        let keyValuePairs: string = '';
        const argumentArray: unknown[] = [];
        for (const prop in row) {
            // We add id last
            if (prop === 'id') continue;
            if (argumentArray.length >= 1) keyValuePairs += ', ';
            keyValuePairs += `${prop} = ?`;
            const value: unknown = row[prop];
            argumentArray.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
        }
        argumentArray.push(row.id);

        // Execute
        const query = `UPDATE ${DATABASE_TABLE_NAMES[tableId]} SET ${keyValuePairs} WHERE id = ?;`;
        try {
            await window.api.sqlite.run(connection ?? this._db, query, argumentArray);
        } catch (err) {
            throw new Error(`Failed to update row: ${err}`);
        }

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        await this.notify<RowType>(OP_UPDATE, tableId, [row], connection);
    }

    async deleteRow<RowType extends Row>(
        tableId: DatabaseTableId,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        await this.deleteRows(tableId, [row], connection);
    }

    async deleteRows<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        const query: string = `DELETE FROM ${DATABASE_TABLE_NAMES[tableId]} WHERE id IN (${rows
            .map((row) => row.id)
            .join(', ')})`;

        try {
            await window.api.sqlite.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to delete rows: ${err}`);
        }

        // Remove from cache
        this.removeRowViews(tableId, rows);

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        await this.notify<RowType>(OP_DELETE, tableId, rows, connection);
    }

    async shutdown(): Promise<void> {
        this.destroyConnection();
        this._unsubscribeSqlitePath();
        this._unsubscribeDbConnected();
    }

    // This will look very different for postgres
    private async notify<RowType extends Row>(
        op: OpType,
        tableId: DatabaseTableId,
        rows?: RowType[],
        connection?: DbConnection,
    ): Promise<void> {
        // Cache the notification for later if we're in a transaction
        if (connection) {
            this._transactionNotifications.push({
                op: op,
                tableId: tableId,
                rows: rows,
            });
            return;
        }

        switch (op) {
            case OP_CREATE:
            case OP_DELETE: {
                await this.notifyOnRowLifecycleEvent(tableId, rows);
                break;
            }
            case OP_UPDATE: {
                await this.notifyOnRowUpdated(tableId, rows);
                break;
            }
            case OP_ALTER: {
                await this.notifyOnTableAltered(tableId);
                break;
            }
            default:
                throw new Error(`Unknown database operation type encountered: ${op}`);
        }
    }

    private async notifyOnRowLifecycleEvent<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
    ): Promise<void> {
        const tableViews = super.getTableViewsForTable<RowType>(tableId);
        for (const tableView of tableViews.values()) {
            if (tableView.filter.wouldAffectRows(rows)) {
                (<DbTableView<RowType>>tableView).onReloadRequired();
            }
        }
    }

    private async notifyOnRowUpdated<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
    ): Promise<void> {
        for (let i = 0; i < rows.length; i++) {
            // This will update the cached rows
            await this.fetchRows(
                tableId,
                createFilter().where().column('id').eq(rows[i].id).endWhere().build(),
            );
        }
    }

    private async notifyOnTableAltered(tableId: DatabaseTableId): Promise<void> {
        const tableViews = super.getTableViewsForTable(tableId);
        for (const tableView of tableViews.values()) {
            tableView.onReloadRequired();
        }
    }

    private onDbConnectedChanged: (v: boolean) => void = (isConnected) => {
        // Notify user
        if (isConnected) {
            this._notificationManager.showNotification(
                new NotificationItem('success', '', 'Connected to database'),
            );
        } else {
            this._notificationManager.showNotification(
                new NotificationItem('warning', '', 'Disconnected from database'),
            );
        }

        // Notify tables
        Db._tableToTableView.forEach((tableViewMap: Map<number, DbTableView<Row>>) => {
            for (const tableView of tableViewMap.values()) {
                tableView.onReloadRequired();
            }
        });
    };

    private onDbPathChanged: (v: DialogResult) => Promise<void> = async (fileDetails) => {
        // Destroy previous connection/s
        await this.destroyConnection();

        // Only attempt to connect if we have a valid path
        if (!fileDetails || !fileDetails.fullPath) {
            return;
        }

        try {
            // Attempt to connect
            this._db = await window.api.sqlite.open(fileDetails.fullPath);

            // Ensure schema
            await this.initializeSchema();

            // Notify connected
            this._isConnected.set(true);
        } catch (e) {
            this._sqlitePathStore.update(dialogResultReset);
            this.isError(e);
            // https://svelte-5-preview.vercel.app/status
            const errors: Error[] = get(this._appInitializationErrors);
            errors.push(<Error>e);
            this._appInitializationErrors.set(errors);
        }
    };

    private removeRowViews<RowType extends Row>(tableId: DatabaseTableId, row: RowType[]): void {
        const rowViews: Map<number, IDbRowView<RowType>> = super.getRowViewsForTable(tableId);
        const focused = get(this._focused);
        row.forEach((row) => {
            // Delete from cache
            rowViews.delete(row.id);

            // Remove from focus if needed
            if (focused && focused.tableId === tableId) {
                this._focused.set(undefined);
            }
        });
    }

    private async initializeSchema(): Promise<void> {
        // Ensure tables exist
        for (let i = 0; i < CREATE_TABLE_QUERIES.length; i++) {
            const query = CREATE_TABLE_QUERIES[i];
            await window.api.sqlite.exec(this._db, query);
        }

        // Ensure static tables are populated
        for (let i = 0; i < INITIALIZE_TABLE_QUERIES.length; i++) {
            const query = INITIALIZE_TABLE_QUERIES[i];
            await window.api.sqlite.exec(this._db, query);
        }
    }

    private isError(value: unknown): asserts value is Error {
        if (typeof value !== 'object' || !('message' in <object>value))
            throw new Error('Caught a non-error');
    }

    private async destroyConnection(): Promise<void> {
        this._isConnected.set(false);
        await window.api.sqlite.closeAll();
        this._db = undefined;
    }
}
