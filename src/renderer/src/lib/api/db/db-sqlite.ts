import type { Focusable } from '@lib/stores/app/focus';
import { NotificationItem, NotificationManager } from '@lib/stores/app/notifications';
import { dialogResultReset } from '@lib/utility/dialog';
import { wait } from '@lib/utility/wait';
import type { DbConnection } from 'preload/api-db';
import type { DialogResult } from 'preload/api-dialog';
import type { SqliteResult } from 'preload/api-sqlite';
import { get, type Unsubscriber, type Writable } from 'svelte/store';
import { Db, OP_CREATE, OP_DELETE, OP_UPDATE, type OpType, type Transaction } from './db-base';
import type { Filter } from './db-filter-interface';
import { DATABASE_TABLE_NAMES, type DatabaseTableId, type Row } from './db-schema';
import { CREATE_TABLE_QUERIES, INITIALIZE_TABLE_QUERIES } from './db-sqlite-queries';
import { DbRowView } from './db-view-row';
import type { IDbRowView } from './db-view-row-interface';
import { DbTableView } from './db-view-table';
import type { IDbTableView } from './db-view-table-interface';

/**
 * SQLite database implementation
 * NOTE:
 * The default database file location is:
 * C:\Users\<username>\AppData\Roaming\com.tauri.dev\GameScript.db
 */
export class SqliteDb extends Db {
    private _db: DbConnection | undefined;
    private _tableToRowView: Map<number, IDbRowView<Row>>[]; // Lookup table using table id
    private _tableToTableView: IDbTableView<Row>[][]; // Lookup table using table id
    private _unsubscribeSqlitePath: Unsubscriber;
    private _unsubscribeDbConnected: Unsubscriber;
    private _sqlitePathStore: Writable<DialogResult>;
    private _appInitializationErrors: Writable<Error[]>;
    private _notificationManager: NotificationManager;
    private _focused: Writable<Focusable>;

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
        this._tableToTableView = <IDbTableView<Row>[][]>DATABASE_TABLE_NAMES.map(() => []);
        this._sqlitePathStore = sqlitePathStore;
        this._appInitializationErrors = appInitializationError;
        this._notificationManager = notificationManager;
        this._focused = focused;
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
            }
            await window.api.sqlite.close(conn);
        }
    }

    fetchTable<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
    ): IDbTableView<RowType> {
        // Create view
        const tableView = new DbTableView<RowType>(<Db>this, tableId, filter);

        // Store it in the map
        this.getTableViewsForTable(tableId).push(tableView);

        // Return
        return tableView;
    }

    releaseTable<RowType extends Row>(tableView: IDbTableView<RowType>): void {
        const tableViews: IDbTableView<RowType>[] = this.getTableViewsForTable(tableView.tableId);
        const indexToRemove: number = tableViews.indexOf(tableView);
        if (indexToRemove > -1) {
            tableViews.splice(indexToRemove, 1);
        }
        // No more table views, remove the row views too
        if (tableViews.length === 0) {
            this._tableToRowView[tableView.tableId] = new Map();
        }
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
        this.notify<RowType>(OP_CREATE, tableId, rows);

        // Return new id
        return rows;
    }

    async fetchRows<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<IDbRowView<RowType>[]> {
        if (!this.isConnected()) return <IDbRowView<RowType>[]>[];

        // Fetch rows
        const filterString: string = filter.toString();
        const query: string = `SELECT * FROM ${DATABASE_TABLE_NAMES[tableId]} ${
            filterString ? `WHERE ${filterString}` : ''
        } ORDER BY id ASC`;
        let results: RowType[];
        try {
            results = await window.api.sqlite.all(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to fetch rows: ${err}`);
        }

        // Fetch row views
        const rowViews: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableId);

        // Map to row views
        const newRowViews: IDbRowView<RowType>[] = results.map<IDbRowView<RowType>>(
            (result: RowType) => {
                // Fetched cached row view, or create a new one if it doesn't exist
                return this.getOrCreateRowView(rowViews, tableId, result);
            },
        );

        // TODO: REMOVE THIS
        await wait(300);

        return newRowViews;
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
        this.notify<RowType>(OP_UPDATE, tableId, [row]);
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
        this.notify<RowType>(OP_DELETE, tableId, rows);
    }

    async shutdown(): Promise<void> {
        this.destroyConnection();
        this._unsubscribeSqlitePath();
        this._unsubscribeDbConnected();
    }

    // This will look very different for postgres
    private notify<RowType extends Row>(
        op: OpType,
        tableId: DatabaseTableId,
        rows: RowType[],
    ): void {
        switch (op) {
            case OP_CREATE: {
                this.notifyOnRowCreated(tableId, rows);
                break;
            }
            case OP_DELETE: {
                this.notifyOnRowDeleted(tableId, rows);
                break;
            }
            case OP_UPDATE: {
                this.notifyOnRowUpdated(tableId, rows);
                break;
            }
            default:
                throw new Error(`Unknown database operation type encountered: ${op}`);
        }
    }

    private notifyOnRowCreated<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
    ): void {
        // Fetch row views for the table view to store
        const rowViews: IDbRowView<RowType>[] = <IDbRowView<RowType>[]>[];
        const rowViewMap: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableId);
        for (let i = 0; i < rows.length; i++) {
            const rowView: IDbRowView<RowType> = this.getOrCreateRowView(
                rowViewMap,
                tableId,
                rows[i],
            );
            rowViews.push(rowView);
        }

        // Notify the table views of the created rows
        const tableViewList: IDbTableView<RowType>[] = this.getTableViewsForTable<RowType>(tableId);
        for (let i = 0; i < tableViewList.length; i++) {
            const tableView: IDbTableView<RowType> = tableViewList[i];
            if (tableView.filter.wouldAffectRows(rows)) {
                tableViewList[i].onRowsCreated(rowViews);
            }
        }
    }

    private notifyOnRowDeleted<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
    ): void {
        // Create a list of deleted row ids
        const deletedRowIds: number[] = [];
        for (let i = 0; i < rows.length; i++) {
            deletedRowIds.push(rows[i].id);
        }

        // Notify the table views of the deleted rows
        const tableViewList: IDbTableView<RowType>[] = this.getTableViewsForTable<RowType>(tableId);
        for (let i = 0; i < tableViewList.length; i++) {
            const tableView: IDbTableView<RowType> = tableViewList[i];
            if (tableView.filter.wouldAffectRows(rows)) {
                tableView.onRowsDeleted(deletedRowIds);
            }
        }
    }

    private notifyOnRowUpdated<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
    ): void {
        const rowViews = this.getRowViewsForTable(tableId);
        for (let i = 0; i < rows.length; i++) {
            const rowView = rowViews?.get(rows[i].id);
            rowView?.onRowUpdated(rows[i]);
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
        this._tableToTableView.forEach((tableViewList: IDbTableView<Row>[]) => {
            for (let i = 0; i < tableViewList.length; i++) {
                tableViewList[i].onReloadRequired();
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
    ): IDbTableView<RowType>[] {
        return <IDbTableView<RowType>[]>this._tableToTableView[tableId];
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

    private getOrCreateRowView<RowType extends Row>(
        rowViews: Map<number, IDbRowView<RowType>>,
        tableId: DatabaseTableId,
        row: RowType,
    ): IDbRowView<RowType> {
        let rowView = rowViews.get(row.id);
        if (!rowView) {
            rowView = new DbRowView<RowType>(tableId, row);
            rowViews.set(row.id, rowView);
        }
        return rowView;
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
