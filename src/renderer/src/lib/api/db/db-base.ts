import { DB_INITIAL_ROWS, type InitialTableRows } from '@common/common-db-initialization';
import type { DbConnection, DbConnectionConfig, DbTransaction } from '@common/common-db-types';
import type { AppNotification } from '@common/common-notification';
import type { Actor, Locale, Row } from '@common/common-schema';
import {
    DATABASE_TABLES,
    DB_OP_ALTER,
    DB_OP_CREATE,
    DB_OP_DELETE,
    DB_OP_UPDATE,
    TABLE_ACTORS,
    TABLE_ACTOR_PRINCIPAL,
    TABLE_LOCALES,
    TABLE_LOCALE_PRINCIPAL,
    TABLE_PROGRAMMING_LANGUAGES,
    TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
    TABLE_PROPERTY_TYPES,
    TABLE_ROUTINES,
    TABLE_ROUTINE_TYPES,
    TABLE_VERSION,
    type DatabaseTableId,
    type DatabaseTableType,
    type FieldTypeId,
    type OpTypeId,
} from '@common/common-types';
import { EVENT_DB_COLUMN_DELETING, type DbColumnDeleting } from '@lib/constants/events';
import { actorsCreate } from '@lib/crud/actor-crud';
import { localesCreate } from '@lib/crud/locale-crud';
import {
    FOCUS_MODE_MODIFY,
    FOCUS_REMOVE,
    FocusManager,
    type Focus,
    type FocusRequests,
} from '@lib/stores/app/focus';
import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import type { IpcRendererEvent } from 'electron';
import type { SqlApi } from 'preload/api-sql';
import { get, type Writable } from 'svelte/store';
import { createFilter } from './db-filter';
import type { Filter } from './db-filter-interface';
import type { Db } from './db-interface';
import { DbRowView } from './db-view-row';
import type { IDbRowView } from './db-view-row-interface';
import { DbTableView } from './db-view-table';
import type { IDbTableView } from './db-view-table-interface';

// Row view destructor
export type RowViewDestructor = () => void;

// TODO
const DUMMY_IS_LOADING: IsLoadingStore = new IsLoadingStore();

/**The interface all databases must implement */
export abstract class DbBase implements Db {
    protected static _tableToRowView: Map<number, DbRowView<Row>>[]; // Lookup table using table id
    protected static _tableToTableView: Map<number, DbTableView<Row>>[]; // Lookup table using table id
    static {
        DbBase._tableToRowView = <Map<number, DbRowView<Row>>[]>(
            DATABASE_TABLES.map(() => new Map())
        );
        DbBase._tableToTableView = <Map<number, DbTableView<Row>>[]>(
            DATABASE_TABLES.map(() => new Map())
        );
    }

    protected _db: DbConnection | undefined;
    protected _isConnected: Writable<boolean>;
    protected _focusManager: FocusManager;
    protected _transactionNotifications: AppNotification[];

    constructor(isConnected: Writable<boolean>, focusManager: FocusManager) {
        this._isConnected = isConnected;
        this._focusManager = focusManager;
        this._transactionNotifications = [];
    }

    /**
     * Initialize all tables.
     */
    protected abstract initializeSchema(): Promise<void>;

    abstract isDbInitialized(config: DbConnectionConfig): Promise<boolean>;

    abstract connect(config: DbConnectionConfig, initialize: boolean): Promise<void>;

    abstract disconnect(): Promise<void>;

    fetchTable<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
    ): IDbTableView<RowType> {
        // Create view
        const tableView = new DbTableView<RowType>(tableType, filter, this._isConnected);

        // Store it in the map
        this.getTableViewsForTable(tableType).set(tableView.viewId, tableView);

        // Return
        return tableView;
    }

    releaseTable<RowType extends Row>(tableView: IDbTableView<RowType>): void {
        // Delete table view from registry
        const tableViewMap: Map<number, IDbTableView<RowType>> = this.getTableViewsForTable(
            tableView.tableType,
        );
        tableViewMap.delete(tableView.viewId);

        // Dispose of table
        (<DbTableView<RowType>>tableView).dispose();
    }

    abstract executeTransaction(transaction: DbTransaction): Promise<void>;

    abstract createColumn(
        tableType: DatabaseTableType,
        name: string,
        type: FieldTypeId,
        connection?: DbConnection,
    ): Promise<void>;

    abstract deleteColumn(
        tableType: DatabaseTableType,
        name: string,
        connection?: DbConnection,
    ): Promise<void>;

    async createRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<RowType> {
        this.assertConnected();
        return (await this.createRows(tableType, [row], connection))[0];
    }

    abstract createRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<RowType[]>;

    abstract fetchRowCount<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<number>;

    abstract fetchRowsRaw<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<RowType[]>;

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
        const rowViewMap: Map<number, DbRowView<RowType>> = this.getRowViewsForTable(tableType);
        for (let i = 0; i < results.length; i++) {
            const row: RowType = results[i];
            let rowView = rowViewMap.get(row.id);
            if (!rowView) {
                rowView = new DbRowView<RowType>(tableType, row, () =>
                    this.destroyRowView(tableType, row.id),
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

    abstract updateRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void>;

    async updateRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void> {
        await this.updateRows(tableType, [row], connection);
    }

    abstract bulkUpdate<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<void>;

    async deleteRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        await this.deleteRows(tableType, [row], connection);
    }

    abstract deleteRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void>;

    abstract bulkDelete<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<void>;

    abstract searchAndReplace<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        field: string,
        search: string,
        replace: string,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * Database specific functionality to broadcast a notification about a change to the database.
     * @param tableId Id of the table
     * @param opType Operation type
     * @param rowIds Ids of the rows changed
     */
    protected abstract doNotify(notification: AppNotification): Promise<void>;

    /**
     * Ensure a database connection exists.
     */
    protected assertConnected(): void {
        if (!this._db) throw new Error('Operation failed: no database connection');
    }

    /**
     * Broadcast a notification about a change to the database.
     * @param op Operation type
     * @param tableId Id of the table
     * @param rows Rows that were changed
     * @param connection Optional connection to execute with
     */
    protected async notify<RowType extends Row>(
        op: OpTypeId,
        tableId: DatabaseTableId,
        rows?: RowType[],
        connection?: DbConnection,
    ): Promise<void> {
        // Don't do notifications if we're initializing
        if (!get(this._isConnected)) return;

        // Create notification
        const notification: AppNotification = <AppNotification>{
            tableId: tableId,
            operationId: op,
            rows: rows,
        };

        // Cache the notification for later if we're in a transaction
        if (connection) {
            this._transactionNotifications.push(notification);
            return;
        }

        // Fire notification
        await this.doNotify(notification);
    }

    /**
     * Handle notifications coming from the database.
     * @param event IPC event, not used
     * @param notification Notification received
     */
    protected onNotification: (
        event: IpcRendererEvent,
        notification: AppNotification,
    ) => Promise<void> = async (_event: IpcRendererEvent, notification: AppNotification) => {
        switch (notification.operationId) {
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
                    `Unknown database operation type encountered: ${notification.operationId}`,
                );
        }
    };

    protected async executeTransactionInternal(
        api: SqlApi,
        dbConnectionConfig: DbConnectionConfig,
        transaction: DbTransaction,
    ): Promise<void> {
        let wasError: boolean = false;
        let conn: DbConnection;
        try {
            conn = await api.open(dbConnectionConfig);
            await api.exec(conn, 'BEGIN;');
            await transaction(conn);
        } catch (err) {
            wasError = true;
            await api.exec(conn, 'ROLLBACK;');
            throw err;
        } finally {
            // Preserve and reset notifications. If you don't clear these before notifying,
            // transactions in the notifications will end up looping over these irrelevant
            // notifications
            const preservedTransactions: AppNotification[] = this._transactionNotifications;
            this._transactionNotifications = [];
            // Only notify if there were no errors
            if (!wasError) {
                await api.exec(conn, 'COMMIT;');
                await api.close(conn);
                await this.combineAndBroadcastNotifications(preservedTransactions);
            } else {
                await api.close(conn);
            }
        }
    }

    protected async deleteColumnInternal(
        api: SqlApi,
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
            await api.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to drop column: ${err}`);
        }

        // Notify
        await this.notify(DB_OP_ALTER, tableType.id, undefined, connection);
    }

    protected async fetchRowsRawInternal<RowType extends Row>(
        api: SqlApi,
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<RowType[]> {
        this.assertConnected();
        // Fetch rows
        const query: string = `SELECT * FROM ${tableType.name} ${filter.toString()};`;
        let results: RowType[];
        try {
            results = await api.all(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to fetch rows: ${err}`);
        }
        return results;
    }

    protected async deleteRowsInternal<RowType extends Row>(
        api: SqlApi,
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
            await api.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to delete rows: ${err}`);
        }

        // Remove from cache
        this.removeRowViews(tableType, rows);

        // Notify
        await this.notify(DB_OP_DELETE, tableType.id, rows, connection);
    }

    /**
     * Bulk delete rows.
     * @param api api to use
     * @param tableType Type of the table
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     */
    async bulkDeleteInternal<RowType extends Row>(
        api: SqlApi,
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<void> {
        this.assertConnected();
        const query: string = `DELETE FROM ${tableType.name} ${filter.toString()};`;
        try {
            await api.exec(connection ?? this._db, query);
        } catch (err) {
            throw new Error(`Failed to bulk delete rows: ${err}`);
        }

        // Notify
        await this.notify(DB_OP_ALTER, tableType.id, undefined, connection);
    }

    /**
     * Initialize the default rows.
     */
    protected async initializeDefaultRows(): Promise<void> {
        for (let i = 0; i < DB_INITIAL_ROWS.length; i++) {
            const initialTableRows: InitialTableRows = DB_INITIAL_ROWS[i];
            switch (initialTableRows.table.id) {
                case TABLE_PROGRAMMING_LANGUAGES.id:
                case TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL.id:
                case TABLE_ROUTINE_TYPES.id:
                case TABLE_ROUTINES.id:
                case TABLE_LOCALE_PRINCIPAL.id:
                case TABLE_VERSION.id:
                case TABLE_PROPERTY_TYPES.id:
                case TABLE_ACTOR_PRINCIPAL.id: {
                    await this.createRows(initialTableRows.table, initialTableRows.rows);
                    break;
                }
                case TABLE_LOCALES.id: {
                    await localesCreate(
                        this,
                        <Locale[]>initialTableRows.rows,
                        DUMMY_IS_LOADING,
                        false,
                    );
                    break;
                }
                case TABLE_ACTORS.id: {
                    await actorsCreate(
                        this,
                        <Actor[]>initialTableRows.rows,
                        DUMMY_IS_LOADING,
                        false,
                    );
                    break;
                }
                default: {
                    throw new Error(
                        `Tried to initialize unknown table: ${initialTableRows.table.name}`,
                    );
                }
            }
        }
    }

    protected destroyRowView<RowType extends Row>(
        tableType: DatabaseTableType,
        rowId: number,
    ): void {
        const rowViews: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableType);
        rowViews.delete(rowId);
    }

    protected getTableViewsForTable<RowType extends Row>(
        tableType: DatabaseTableType,
    ): Map<number, DbTableView<RowType>> {
        return <Map<number, DbTableView<RowType>>>DbBase._tableToTableView[tableType.id];
    }

    protected getRowViewsForTable<RowType extends Row>(
        tableType: DatabaseTableType,
    ): Map<number, DbRowView<RowType>> {
        let rowViewMap: Map<number, DbRowView<RowType>> = <Map<number, DbRowView<RowType>>>(
            DbBase._tableToRowView[tableType.id]
        );
        if (!rowViewMap) {
            rowViewMap = new Map();
            DbBase._tableToRowView[tableType.id] = rowViewMap;
        }
        return rowViewMap;
    }

    protected async reloadAllTables(): Promise<void> {
        for (let i = 0; i < DbBase._tableToTableView.length; i++) {
            const tableViewMap: Map<number, DbTableView<Row>> = DbBase._tableToTableView[i];
            for (const tableView of tableViewMap.values()) {
                await tableView.onReloadRequired();
            }
        }
    }

    protected assertQueryResult(result: unknown, errorMessage: string): void {
        if (!result) throw new Error(errorMessage);
    }

    protected isConnected(): boolean {
        return get(this._isConnected);
    }

    protected removeRowViews<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType[],
    ): void {
        const rowViews: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableType);
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

    private async combineAndBroadcastNotifications(
        preservedTransactions: AppNotification[],
    ): Promise<void> {
        // Combine notifications
        const tableToOpToRows: Map<number, Map<number, Row[]>> = new Map();
        for (let i = 0; i < preservedTransactions.length; i++) {
            const notification: AppNotification = preservedTransactions[i];
            let opToRows: Map<number, Row[]> = tableToOpToRows.get(notification.tableId);
            if (!opToRows) {
                opToRows = new Map();
                tableToOpToRows.set(notification.tableId, opToRows);
            }
            let rows: Row[] = opToRows.get(notification.operationId);
            if (!rows) {
                rows = [];
                opToRows.set(notification.operationId, rows);
            }
            if (notification.rows) rows.push(...notification.rows);
        }

        // Send notifications
        for (const [tableId, opToRows] of tableToOpToRows) {
            for (const [opId, rows] of opToRows) {
                await this.notify(<OpTypeId>opId, <DatabaseTableId>tableId, rows, undefined);
            }
        }
    }

    private async notifyOnRowLifecycleEvent<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
    ): Promise<void> {
        const tableViews = this.getTableViewsForTable<RowType>(tableType);
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
        const rowViewMap: Map<number, DbRowView<RowType>> = this.getRowViewsForTable(tableType);
        rows = rows.filter((row) => rowViewMap.has(row.id));
        if (rows.length === 0) return;
        await this.fetchRows(
            tableType,
            createFilter()
                .where()
                .column('id')
                .in(rows.map((row) => row.id))
                .endWhere()
                .build(),
        );
    }

    private async notifyOnTableAltered(tableType: DatabaseTableType): Promise<void> {
        const tableViews = this.getTableViewsForTable(tableType);
        for (const tableView of tableViews.values()) {
            await tableView.onReloadRequired();
        }
    }
}
