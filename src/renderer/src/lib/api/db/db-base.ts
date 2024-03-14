import { DB_INITIAL_ROWS, type InitialTableRows } from '@common/common-db-initialization';
import type { DbConnection, DbConnectionConfig, DbTransaction } from '@common/common-db-types';
import type { Actor, Locale, Row } from '@common/common-schema';
import {
    DATABASE_TABLES,
    TABLE_ACTORS,
    TABLE_ACTOR_PRINCIPAL,
    TABLE_LOCALES,
    TABLE_LOCALE_PRINCIPAL,
    TABLE_PROGRAMMING_LANGUAGES,
    TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
    TABLE_ROUTINES,
    TABLE_ROUTINE_TYPES,
    TABLE_VERSION,
    type DatabaseTableType,
    type FieldTypeId,
} from '@common/common-types';
import { actorsCreate } from '@lib/crud/actor-crud';
import { localesCreate } from '@lib/crud/locale-crud';
import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { get, type Writable } from 'svelte/store';
import type { Filter } from './db-filter-interface';
import type { Db } from './db-interface';
import type { DbRowView } from './db-view-row';
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

    protected _isConnected: Writable<boolean>;

    constructor(isConnected: Writable<boolean>) {
        this._isConnected = isConnected;
    }

    abstract isDbInitialized(config: DbConnectionConfig): Promise<boolean>;

    /**
     * Connect to the database.
     * @param config Connection configuration
     */
    abstract connect(config: DbConnectionConfig, initialize: boolean): Promise<void>;

    /**
     * Disconnect from the database.
     */
    abstract disconnect(): Promise<void>;

    /**
     * Creates a table view.
     * @param tableType Type of the table
     * @param filter Filter for the table
     */
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

    /**
     * Disposes of a single table view
     * @param tableView The table view to release
     */
    releaseTable<RowType extends Row>(tableView: IDbTableView<RowType>): void {
        // Delete table view from registry
        const tableViewMap: Map<number, IDbTableView<RowType>> = this.getTableViewsForTable(
            tableView.tableType,
        );
        tableViewMap.delete(tableView.viewId);

        // Dispose of table
        (<DbTableView<RowType>>tableView).dispose();
    }

    /**
     * Execute a function within a database transaction.
     * @param transaction A function to execute within a database transaction
     */
    abstract executeTransaction(transaction: DbTransaction): Promise<void>;

    /**
     * Add a column to a table.
     * @param tableId Table to add a column to
     * @param name Name of the new column
     * @param type Type of the new column
     * @param connection Optional connection to execute with
     */
    abstract createColumn(
        tableType: DatabaseTableType,
        name: string,
        type: FieldTypeId,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * Remove a column from a table.
     * @param tableId Table to remove a column to
     * @param name Name of the column to delete
     * @param connection Optional connection to execute with
     */
    abstract deleteColumn(
        tableType: DatabaseTableType,
        name: string,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * This creates a single row in the table.
     * Throws an error during failures.
     * Returns the id of the newly created row.
     * @param tableType Type of the table
     * @param row The row to create
     * @param connection Optional connection to execute with
     */
    abstract createRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<RowType>;

    /**
     * This creates a list of rows in the table.
     * Throws an error during failures.
     * Returns the rows with their id fields populated.
     * @param tableType Type of the table
     * @param rows The rows to create
     * @param connection Optional connection to execute with
     */
    abstract createRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<RowType[]>;

    /**
     * Fetch the total number of rows in a given table.
     * @param tableType Type of the table
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     */
    abstract fetchRowCount<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<number>;

    /**
     * Fetch raw rows that won't be used by a table view or updated when changes happen.
     * @param tableType Type of the table
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     */
    abstract fetchRowsRaw<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<RowType[]>;

    /**
     * This fetches (all) rows in a table and returns them sorted by id.
     * Throws an error during failures.
     * @param tableType Type of the table
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     * @internal
     */
    abstract fetchRows<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<IDbRowView<RowType>[]>;

    /**
     * This updates multiple rows in a table.
     * @param tableType Type of the table
     * @param rows The rows to update
     * @param connection Optional connection to execute with
     */
    abstract updateRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * This updates a single row in a table.
     * @param tableType Type of the table
     * @param row The row to update
     * @param connection Optional connection to execute with
     */
    abstract updateRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * This deletes a single row in the table.
     * Throws an error during failures.
     * @param tableType Type of the table
     * @param row The row to delete
     * @param connection Optional connection to execute with
     */
    abstract deleteRow<RowType extends Row>(
        tableType: DatabaseTableType,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * This deletes a list of rows in the table.
     * Throws an error during failures.
     * @param tableType Type of the table
     * @param rows The rows to delete
     * @param connection Optional connection to execute with
     */
    abstract deleteRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * Search for and replace a string of text.
     * @param tableType Type of the table
     * @param filter Filter for the query
     * @param field Field to search in
     * @param search String to search for
     * @param replace String to replace with
     * @param connection Optional connection to execute with
     */
    abstract searchAndReplace<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        field: string,
        search: string,
        replace: string,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * Initialize all tables.
     */
    protected abstract initializeSchema(): Promise<void>;

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
}
