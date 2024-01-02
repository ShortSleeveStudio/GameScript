import { NotificationItem, NotificationManager } from '@lib/stores/app/notifications';
import type { FileDetails } from '@lib/utility/file-details';
import { wait } from '@lib/utility/wait';
import Database, { type QueryResult } from '@tauri-apps/plugin-sql';
import { type Unsubscriber, type Writable } from 'svelte/store';
import { Db, OP_CREATE, OP_DELETE, OP_UPDATE, type OpType } from './db-base';
import type { Filter } from './db-filter-interface';
import { type DatabaseTableName, type Row } from './db-schema';
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
    private _tableToRowView: Map<string, Map<number, IDbRowView<Row>>>;
    private _tableToTableView: Map<string, IDbTableView<Row>[]>;
    private _unsubscribeSqlitePath: Unsubscriber;
    private _unsubscribeDbConnected: Unsubscriber;
    private _sqlitePathStore: Writable<FileDetails>;
    private _dbSqlitePathError: Writable<string>;
    private _notificationManager: NotificationManager;

    constructor(
        isConnected: Writable<boolean>,
        sqlitePathStore: Writable<FileDetails>,
        dbSqlitePathError: Writable<string>,
        notificationManager: NotificationManager,
    ) {
        super(isConnected);
        this._tableToRowView = new Map();
        this._tableToTableView = new Map();
        this._sqlitePathStore = sqlitePathStore;
        this._dbSqlitePathError = dbSqlitePathError;
        this._notificationManager = notificationManager;
        this._unsubscribeDbConnected = this._isConnected.subscribe(this.onDbConnectedChanged);
        this._unsubscribeSqlitePath = this._sqlitePathStore.subscribe(this.onDbPathChanged);
    }

    fetchTable<RowType extends Row>(
        tableName: DatabaseTableName,
        filter: Filter<RowType>,
    ): IDbTableView<RowType> {
        // Create view
        const tableView = new DbTableView<RowType>(<Db>this, tableName, filter);

        // Store it in the map
        this.getTableViewsForTable(tableName).push(tableView);

        // Return
        return tableView;
    }

    releaseTable<RowType extends Row>(tableView: IDbTableView<RowType>): void {
        const tableViews: IDbTableView<RowType>[] = this.getTableViewsForTable(tableView.tableName);
        const indexToRemove: number = tableViews.indexOf(tableView);
        if (indexToRemove > -1) {
            tableViews.splice(indexToRemove, 1);
        }
        // No more table views, remove the row views too
        if (tableViews.length === 0) {
            this._tableToRowView.delete(tableView.tableName);
        }
    }

    async createRow<RowType extends Row>(
        tableName: DatabaseTableName,
        row: RowType,
    ): Promise<RowType> {
        this.assertConnected();
        return (await this.createRows(tableName, [row]))[0];
    }

    async createRows<RowType extends Row>(
        tableName: DatabaseTableName,
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
                `INSERT INTO ${tableName} (${propertyNames}) VALUES (${placeHolders});`,
                argumentArray,
            );
            this.assertQueryResult(result, 'Failed to create row');

            // Set row id
            row.id = result.lastInsertId;
        }

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        this.notify<RowType>(OP_CREATE, tableName, rows);

        // Return new id
        return rows;
    }

    // TODO: add filters and aliases
    async fetchRows<RowType extends Row>(
        tableName: DatabaseTableName,
        filter: Filter<RowType>,
    ): Promise<IDbRowView<RowType>[]> {
        if (!this.isConnected()) return <IDbRowView<RowType>[]>[];

        // Fetch rows
        const filterString: string = filter.toString();
        const query: string = `SELECT * FROM ${tableName} ${
            filterString ? `WHERE ${filterString}` : ''
        } ORDER BY id ASC`;
        const results = await this._db.select<RowType[]>(query);

        // Fetch row views
        const rowViews: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableName);

        // Map to row views
        const newRowViews: IDbRowView<RowType>[] = results.map<IDbRowView<RowType>>(
            (result: RowType) => {
                // Fetched cached row view, or create a new one if it doesn't exist
                return this.getOrCreateRowView(rowViews, tableName, result);
            },
        );

        // TODO: REMOVE THIS
        await wait(300);

        return newRowViews;
    }

    async updateRow<RowType extends Row>(
        tableName: DatabaseTableName,
        row: RowType,
    ): Promise<void> {
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
        const query = `UPDATE ${tableName} SET ${keyValuePairs} WHERE id = $${++i};`;
        const result: QueryResult = await this._db.execute(query, argumentArray);
        this.assertQueryResult(result, 'Failed to update row');

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        this.notify<RowType>(OP_UPDATE, tableName, [row]);
    }

    async deleteRow<RowType extends Row>(
        tableName: DatabaseTableName,
        row: RowType,
    ): Promise<void> {
        this.assertConnected();
        await this.deleteRows(tableName, [row]);
    }

    async deleteRows<RowType extends Row>(
        tableName: DatabaseTableName,
        rows: RowType[],
    ): Promise<void> {
        this.assertConnected();
        // Delete
        const result: QueryResult = await this._db.execute(
            `DELETE FROM ${tableName} WHERE id IN (${rows.map((row) => row.id).join(', ')})`,
        );
        this.assertQueryResult(result, 'Failed to delete row');

        // Remove from cache
        this.removeRowViews(tableName, rows);

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        this.notify<RowType>(OP_DELETE, tableName, rows);
    }

    async shutdown(): Promise<void> {
        await super.shutdown();
        this._unsubscribeSqlitePath();
        this._unsubscribeDbConnected();
    }

    // [C|U|D]
    // TableName
    // <object>
    // This will look very different for postgres
    private notify<RowType extends Row>(op: OpType, tableName: DatabaseTableName, rows: RowType[]) {
        switch (op) {
            case OP_CREATE: {
                this.notifyOnRowCreated(tableName, rows);
                break;
            }
            case OP_DELETE: {
                this.notifyOnRowDeleted(tableName, rows);
                break;
            }
            case OP_UPDATE: {
                this.notifyOnRowChanged(tableName, rows);
                break;
            }
            default:
                throw new Error(`Unknown database operation type encountered: ${op}`);
        }
    }

    private notifyOnRowCreated<RowType extends Row>(tableName: DatabaseTableName, rows: RowType[]) {
        // Fetch row views for the table view to store
        const rowViews: IDbRowView<RowType>[] = <IDbRowView<RowType>[]>[];
        const rowViewMap: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableName);
        for (let i = 0; i < rows.length; i++) {
            const rowView: IDbRowView<RowType> = this.getOrCreateRowView(
                rowViewMap,
                tableName,
                rows[i],
            );
            rowViews.push(rowView);
        }

        // Notify the table views of the created rows
        const tableViewList: IDbTableView<RowType>[] =
            this.getTableViewsForTable<RowType>(tableName);
        for (let i = 0; i < tableViewList.length; i++) {
            const tableView: IDbTableView<RowType> = tableViewList[i];
            if (tableView.filter.wouldAffectRows(rows)) {
                tableViewList[i].onRowsCreated(rowViews);
            }
        }
    }

    private notifyOnRowDeleted<RowType extends Row>(tableName: DatabaseTableName, rows: RowType[]) {
        // Create a list of deleted row ids
        const deletedRowIds: number[] = [];
        for (let i = 0; i < rows.length; i++) {
            deletedRowIds.push(rows[i].id);
        }

        // Notify the table views of the deleted rows
        const tableViewList: IDbTableView<RowType>[] =
            this.getTableViewsForTable<RowType>(tableName);
        for (let i = 0; i < tableViewList.length; i++) {
            const tableView: IDbTableView<RowType> = tableViewList[i];
            if (tableView.filter.wouldAffectRows(rows)) {
                tableView.onRowsDeleted(deletedRowIds);
            }
        }
    }

    private notifyOnRowChanged<RowType extends Row>(tableName: DatabaseTableName, rows: RowType[]) {
        const rowViews = this.getRowViewsForTable(tableName);
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
        } catch (e: unknown) {
            this._dbSqlitePathError.set(this.extractError(e));
            throw e;
        }
    };

    private getTableViewsForTable<RowType extends Row>(tableName: string): IDbTableView<RowType>[] {
        let tableViewList: IDbTableView<RowType>[] = <IDbTableView<RowType>[]>(
            this._tableToTableView.get(tableName)
        );
        if (!tableViewList) {
            tableViewList = [];
            this._tableToTableView.set(tableName, tableViewList);
        }
        return tableViewList;
    }

    private getRowViewsForTable<RowType extends Row>(
        tableName: DatabaseTableName,
    ): Map<number, IDbRowView<RowType>> {
        let rowViewMap: Map<number, IDbRowView<RowType>> = <Map<number, IDbRowView<RowType>>>(
            this._tableToRowView.get(tableName)
        );
        if (!rowViewMap) {
            rowViewMap = new Map();
            this._tableToRowView.set(tableName, rowViewMap);
        }
        return rowViewMap;
    }

    private getOrCreateRowView<RowType extends Row>(
        rowViews: Map<number, IDbRowView<RowType>>,
        tableName: DatabaseTableName,
        row: RowType,
    ): IDbRowView<RowType> {
        let rowView = rowViews.get(row.id);
        if (!rowView) {
            rowView = new DbRowView<RowType>(<Db>this, tableName, row);
            rowViews.set(row.id, rowView);
        }
        return rowView;
    }

    private removeRowViews<RowType extends Row>(tableName: DatabaseTableName, row: RowType[]) {
        const rowViews: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableName);
        row.forEach((row) => rowViews.delete(row.id));
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

    private extractError(e: unknown): string {
        let message: string;
        switch (typeof e) {
            case 'string':
                message = <string>e;
                break;
            case 'object':
                if ('message' in <object>e) {
                    message = (<Error>e).message;
                    break;
                }
            // @t s-expect-error fallthrough
            default:
                message = 'Invalid database file';
                break;
        }
        return message;
    }
}
