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
import { DbTableView } from './db-view-table';
import type { IDbTableView } from './db-view-table-interface';

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
    private _tableToRowView: Map<number, IDbRowView<Row>>[]; // Lookup table using table id
    private _tableToTableView: Map<number, IDbTableView<Row>>[]; // Lookup table using table id
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
        this._tableToRowView = <Map<number, IDbRowView<Row>>[]>(
            DATABASE_TABLE_NAMES.map(() => new Map())
        );
        this._tableToTableView = <Map<number, IDbTableView<Row>>[]>(
            DATABASE_TABLE_NAMES.map(() => new Map())
        );
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

    fetchTable<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
    ): IDbTableView<RowType> {
        // Create view
        const tableView = new DbTableView<RowType>(<Db>this, tableId, filter, this._isConnected);

        // Store it in the map
        this.getTableViewsForTable(tableId).set(tableView.viewId, tableView);

        // Return
        return tableView;
    }

    releaseTable<RowType extends Row>(tableView: IDbTableView<RowType>): void {
        // Delete table view from registry
        const tableViewMap: Map<number, IDbTableView<RowType>> = this.getTableViewsForTable(
            tableView.tableId,
        );
        tableViewMap.delete(tableView.viewId);

        // Remove table view as owner of row views, potentially flushing cached row views
        const viewsToRemove: number[] = [];
        const rowViews: Map<number, IDbRowView<Row>> = this._tableToRowView[tableView.tableId];
        for (const rowView of rowViews.values()) {
            rowView.ownerRemove(tableView.viewId);
            if (rowView.ownerCount() === 0) {
                viewsToRemove.push(rowView.id);
            }
        }

        // Flush row views without owners
        for (let i = 0; i < viewsToRemove.length; i++) rowViews.delete(viewsToRemove[i]);
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

    async fetchRows<RowType extends Row>(
        fetcher: IDbTableView<RowType>,
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<IDbRowView<RowType>[]> {
        const rowViews: IDbRowView<RowType>[] = [];
        await this.fetchRowsInternal(
            tableId,
            filter,
            (rowView: IDbRowView<RowType>) => {
                rowView.ownerAdd(fetcher.viewId);
                rowViews.push(rowView);
            },
            connection,
        );
        return rowViews;
    }

    private async fetchRowsInternal<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
        handler?: (rowView: IDbRowView<RowType>) => void,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        // Fetch rows
        const filterString: string = filter.toString();
        const query: string = `SELECT * FROM ${DATABASE_TABLE_NAMES[tableId]} ${
            filterString ? filterString : ''
        }`;
        let results: RowType[];
        try {
            results = await window.api.sqlite.all(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to fetch rows: ${err}`);
        }

        // Map to row views
        const rowViewMap: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableId);
        for (let i = 0; i < results.length; i++) {
            const row: RowType = results[i];
            let rowView = rowViewMap.get(row.id);
            if (!rowView) {
                rowView = new DbRowView<RowType>(tableId, row);
                rowViewMap.set(row.id, rowView);
            } else {
                // Update the row just in case (there should never be variation)
                rowView.onRowUpdated(row);
            }
            if (handler) handler(rowView);
        }
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
            throw new Error(`Failed to delete row: ${err}`);
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

    private async refreshRow<RowType extends Row>(tableId: number, row: RowType): Promise<void> {
        console.log('REFRESH CALLED');
        this.fetchRowsInternal(
            tableId,
            createFilter().where().column('id').is(row.id).endWhere().build(),
        );
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
        console.log('LIFECYCLE');
        const tableViews = this.getTableViewsForTable<RowType>(tableId);
        for (const tableView of tableViews.values()) {
            if (tableView.filter.wouldAffectRows(rows)) {
                tableView.onReloadRequired();
            }
        }
    }

    private async notifyOnRowUpdated<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
    ): Promise<void> {
        for (let i = 0; i < rows.length; i++) {
            await this.refreshRow(tableId, rows[i]);
        }
    }

    private async notifyOnTableAltered(tableId: DatabaseTableId): Promise<void> {
        console.log('ALTERED');
        const tableViews = this.getTableViewsForTable(tableId);
        for (const tableView of tableViews.values()) {
            tableView.onReloadRequired();
        }
    }

    // TODO: I'm not sure the commented code is a good idea given how conversation finder works
    // private async notifyOnRowCreated<RowType extends Row>(
    //     tableId: DatabaseTableId,
    //     rows: RowType[],
    // ): Promise<void> {
    // // Fetch row views for the table view to store
    // const rowViews: IDbRowView<RowType>[] = <IDbRowView<RowType>[]>[];
    // const rowViewMap: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableId);
    // for (let i = 0; i < rows.length; i++) {
    //     const rowView: IDbRowView<RowType> = this.getOrCreateRowView(
    //         rowViewMap,
    //         tableId,
    //         rows[i],
    //     );
    //     rowViews.push(rowView);
    // }

    // // Notify the table views of the created rows
    // const tableViewList: IDbTableView<RowType>[] = this.getTableViewsForTable<RowType>(tableId);
    // for (let i = 0; i < tableViewList.length; i++) {
    //     const tableView: IDbTableView<RowType> = tableViewList[i];
    //     if (tableView.filter.wouldAffectRows(rows)) {
    //         tableViewList[i].onRowsCreated(rowViews);
    //     }
    // }
    // }
    // private async notifyOnRowDeleted<RowType extends Row>(
    //     tableId: DatabaseTableId,
    //     rows: RowType[],
    // ): Promise<void> {
    // // Create a list of deleted row ids
    // const deletedRowIds: number[] = [];
    // for (let i = 0; i < rows.length; i++) {
    //     deletedRowIds.push(rows[i].id);
    // }
    // // Notify the table views of the deleted rows
    // const tableViewList: IDbTableView<RowType>[] = this.getTableViewsForTable<RowType>(tableId);
    // for (let i = 0; i < tableViewList.length; i++) {
    //     const tableView: IDbTableView<RowType> = tableViewList[i];
    //     if (tableView.filter.wouldAffectRows(rows)) {
    //         tableView.onRowsDeleted(deletedRowIds);
    //     }
    // }
    // }

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
        this._tableToTableView.forEach((tableViewMap: Map<number, IDbTableView<Row>>) => {
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

    private getTableViewsForTable<RowType extends Row>(
        tableId: DatabaseTableId,
    ): Map<number, IDbTableView<RowType>> {
        return <Map<number, IDbTableView<RowType>>>this._tableToTableView[tableId];
    }

    private getRowViewsForTable<RowType extends Row>(
        tableId: DatabaseTableId,
    ): Map<number, IDbRowView<RowType>> {
        let rowViewMap: Map<number, IDbRowView<RowType>> = <Map<number, IDbRowView<RowType>>>(
            this._tableToRowView[tableId]
        );
        if (!rowViewMap) {
            rowViewMap = new Map();
            this._tableToRowView[tableId] = rowViewMap;
        }
        return rowViewMap;
    }

    private removeRowViews<RowType extends Row>(tableId: DatabaseTableId, row: RowType[]): void {
        const rowViews: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableId);
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
