import type { Focusable } from '@lib/stores/app/focus';
import { NotificationItem, NotificationManager } from '@lib/stores/app/notifications';
import type { FileDetails } from '@lib/utility/file-details';
import { wait } from '@lib/utility/wait';
import Database, { type QueryResult } from '@tauri-apps/plugin-sql';
import { get, type Unsubscriber, type Writable } from 'svelte/store';
import { Db, OP_CREATE, OP_DELETE, OP_UPDATE, type OpType } from './db-base';
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
    private _tableToRowView: Map<number, IDbRowView<Row>>[]; // Lookup table using table id
    private _tableToTableView: IDbTableView<Row>[][]; // Lookup table using table id
    private _unsubscribeSqlitePath: Unsubscriber;
    private _unsubscribeDbConnected: Unsubscriber;
    private _sqlitePathStore: Writable<FileDetails>;
    private _appInitializationErrors: Writable<Error[]>;
    private _notificationManager: NotificationManager;
    private _focused: Writable<Focusable>;

    constructor(
        isConnected: Writable<boolean>,
        sqlitePathStore: Writable<FileDetails>,
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

    async createRow<RowType extends Row>(tableId: DatabaseTableId, row: RowType): Promise<RowType> {
        this.assertConnected();
        return (await this.createRows(tableId, [row]))[0];
    }

    async createRows<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
    ): Promise<RowType[]> {
        this.assertConnected();
        for (let i = 0; i < rows.length; i++) {
            // Grab row
            const row: RowType = rows[i];

            // Generate query arguments
            let propertyNames: string = '';
            let placeHolders: string = '';
            const argumentArray: unknown[] = [];
            let index: number = 0;
            for (const prop in row) {
                if (argumentArray.length >= 1) {
                    propertyNames += ', ';
                    placeHolders += ', ';
                }
                propertyNames += prop;
                placeHolders += '$' + ++index; // starts at 1
                const value: unknown = row[prop];
                argumentArray.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
            }

            // Execute
            const result: QueryResult = await this._db.execute(
                `INSERT INTO ${DATABASE_TABLE_NAMES[tableId]} (${propertyNames}) VALUES (${placeHolders});`,
                argumentArray,
            );
            this.assertQueryResult(result, 'Failed to create row');

            // Set row id
            row.id = result.lastInsertId;
        }

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        this.notify<RowType>(OP_CREATE, tableId, rows);

        // Return new id
        return rows;
    }

    // TODO: add filters and aliases
    async fetchRows<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
    ): Promise<IDbRowView<RowType>[]> {
        if (!this.isConnected()) return <IDbRowView<RowType>[]>[];

        // Fetch rows
        const filterString: string = filter.toString();
        const query: string = `SELECT * FROM ${DATABASE_TABLE_NAMES[tableId]} ${
            filterString ? `WHERE ${filterString}` : ''
        } ORDER BY id ASC`;
        const results = await this._db.select<RowType[]>(query);

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

    async updateRow<RowType extends Row>(tableId: DatabaseTableId, row: RowType): Promise<void> {
        this.assertConnected();
        // Generate query arguments
        let keyValuePairs: string = '';
        const argumentArray: unknown[] = [];
        let i: number = 0;
        for (const prop in row) {
            // We never set id for updates
            if (prop === 'id') continue;
            if (argumentArray.length >= 1) keyValuePairs += ', ';
            keyValuePairs += `${prop} = $${++i}`; // start at 1
            const value: unknown = row[prop];
            argumentArray.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
        }
        argumentArray.push(row.id);

        // Execute
        const query = `UPDATE ${
            DATABASE_TABLE_NAMES[tableId]
        } SET ${keyValuePairs} WHERE id = $${++i};`;
        const result: QueryResult = await this._db.execute(query, argumentArray);
        this.assertQueryResult(result, 'Failed to update row');

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        this.notify<RowType>(OP_UPDATE, tableId, [row]);
    }

    async deleteRow<RowType extends Row>(tableId: DatabaseTableId, row: RowType): Promise<void> {
        this.assertConnected();
        await this.deleteRows(tableId, [row]);
    }

    async deleteRows<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
    ): Promise<void> {
        this.assertConnected();
        // Delete
        const result: QueryResult = await this._db.execute(
            `DELETE FROM ${DATABASE_TABLE_NAMES[tableId]} WHERE id IN (${rows
                .map((row) => row.id)
                .join(', ')})`,
        );
        this.assertQueryResult(result, 'Failed to delete row');

        // Remove from cache
        this.removeRowViews(tableId, rows);

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        this.notify<RowType>(OP_DELETE, tableId, rows);
    }

    async shutdown(): Promise<void> {
        await super.shutdown();
        this._unsubscribeSqlitePath();
        this._unsubscribeDbConnected();
    }

    // This will look very different for postgres
    private notify<RowType extends Row>(op: OpType, tableId: DatabaseTableId, rows: RowType[]) {
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
                this.notifyOnRowChanged(tableId, rows);
                break;
            }
            default:
                throw new Error(`Unknown database operation type encountered: ${op}`);
        }
    }

    private notifyOnRowCreated<RowType extends Row>(tableId: DatabaseTableId, rows: RowType[]) {
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

    private notifyOnRowDeleted<RowType extends Row>(tableId: DatabaseTableId, rows: RowType[]) {
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

    private notifyOnRowChanged<RowType extends Row>(tableId: DatabaseTableId, rows: RowType[]) {
        const rowViews = this.getRowViewsForTable(tableId);
        for (let i = 0; i < rows.length; i++) {
            const rowView = rowViews?.get(rows[i].id);
            rowView?.onRowUpdated(rows[i]);
        }
    }

    private onDbConnectedChanged = (isConnected: boolean) => {
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

    private onDbPathChanged = async (fileDetails: FileDetails) => {
        // Destroy previous connection
        super.destroyConnection();

        // Only attempt to connect if we have a valid path
        if (!fileDetails || !fileDetails.path) {
            return;
        }

        try {
            // Attempt to connect
            this._db = await Database.load(`sqlite:${fileDetails.path}`);

            // Ensure schema
            await this.initializeSchema();

            // Notify connected
            this._isConnected.set(true);
        } catch (e) {
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
            rowView = new DbRowView<RowType>(<Db>this, tableId, row);
            rowViews.set(row.id, rowView);
        }
        return rowView;
    }

    private removeRowViews<RowType extends Row>(tableId: DatabaseTableId, row: RowType[]) {
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
            const result: QueryResult | undefined = await this._db.execute(query);
            if (!result) throw new Error('Failed to create table');
        }

        // Ensure static tables are populated
        for (let i = 0; i < INITIALIZE_TABLE_QUERIES.length; i++) {
            const query = INITIALIZE_TABLE_QUERIES[i];
            const result: QueryResult | undefined = await this._db?.execute(query);
            if (!result) throw new Error('Failed to initialize tables');
        }
    }

    private isError(value: unknown): asserts value is Error {
        if (typeof value !== 'object' || !('message' in <object>value))
            throw new Error('Caught a non-error');
    }
}
