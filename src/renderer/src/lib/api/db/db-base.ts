import type { DbConnection } from 'preload/api-db';
import { get, type Writable } from 'svelte/store';
import type { Filter } from './db-filter-interface';
import {
    DATABASE_TABLE_NAMES,
    type DatabaseTableId,
    type FieldTypeId,
    type Row,
} from './db-schema';
import type { DbRowView } from './db-view-row';
import type { IDbRowView } from './db-view-row-interface';
import { DbTableView } from './db-view-table';
import type { IDbTableView } from './db-view-table-interface';

// Operation types
export const OPS = [0, 1, 2];
export type OpType = (typeof OPS)[number];
export const OP_CREATE: OpType = 0;
export const OP_DELETE: OpType = 1;
export const OP_UPDATE: OpType = 2;
export const OP_ALTER: OpType = 3;

// Transaction type
export type Transaction = (connection: DbConnection) => Promise<void>;

// Row view destructor
export type RowViewDestructor = () => void;

/**The interface all databases must implement */
export abstract class Db {
    protected static _tableToRowView: Map<number, DbRowView<Row>>[]; // Lookup table using table id
    protected static _tableToTableView: Map<number, DbTableView<Row>>[]; // Lookup table using table id
    static {
        Db._tableToRowView = <Map<number, DbRowView<Row>>[]>(
            DATABASE_TABLE_NAMES.map(() => new Map())
        );
        Db._tableToTableView = <Map<number, DbTableView<Row>>[]>(
            DATABASE_TABLE_NAMES.map(() => new Map())
        );
    }

    protected _isConnected: Writable<boolean>;

    constructor(isConnected: Writable<boolean>) {
        this._isConnected = isConnected;
    }

    /**
     * Creates a table view.
     * @param tableId Id of the table
     */
    fetchTable<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
    ): IDbTableView<RowType> {
        // Create view
        const tableView = new DbTableView<RowType>(tableId, filter, this._isConnected);

        // Store it in the map
        this.getTableViewsForTable(tableId).set(tableView.viewId, tableView);

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
            tableView.tableId,
        );
        tableViewMap.delete(tableView.viewId);

        // Dispose of table
        (<DbTableView<RowType>>tableView).dispose();
    }

    protected destroyRowView<RowType extends Row>(tableId: DatabaseTableId, rowId: number): void {
        const rowViews: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableId);
        rowViews.delete(rowId);
    }

    /**
     * Execute a function within a database transaction.
     * @param transaction A function to execute within a database transaction
     */
    abstract executeTransaction(transaction: Transaction): Promise<void>;

    /**
     * Add a column to a table.
     * @param tableId Table to add a column to
     * @param name Name of the new column
     * @param type Type of the new column
     * @param connection Optional connection to execute with
     */
    abstract createColumn(
        tableId: DatabaseTableId,
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
        tableId: DatabaseTableId,
        name: string,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * This creates a single row in the table.
     * Throws an error during failures.
     * Returns the id of the newly created row.
     * @param tableId Id of the table
     * @param row The row to create
     * @param connection Optional connection to execute with
     */
    abstract createRow<RowType extends Row>(
        tableId: DatabaseTableId,
        row: RowType,
        connection?: DbConnection,
    ): Promise<RowType>;

    /**
     * This creates a list of rows in the table.
     * Throws an error during failures.
     * Returns the rows with their id fields populated.
     * @param tableId Id of the table
     * @param rows The rows to create
     * @param connection Optional connection to execute with
     */
    abstract createRows<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<RowType[]>;

    /**
     * Fetch the total number of rows in a given table.
     * @param tableId Id of the table
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     */
    abstract fetchRowCount<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<number>;

    /**
     * Fetch raw rows that won't be used by a table view or updated when changes happen.
     * @param tableId Id of the table
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     */
    abstract fetchRowsRaw<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<RowType[]>;

    /**
     * This fetches (all) rows in a table and returns them sorted by id.
     * Throws an error during failures.
     * @param tableId Id of the table
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     * @internal
     */
    abstract fetchRows<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<IDbRowView<RowType>[]>;

    /**
     * This updates multiple rows in a table.
     * @param tableId Id of the table
     * @param rows The rows to update
     * @param connection Optional connection to execute with
     */
    abstract updateRows<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * This updates a single row in a table.
     * @param tableId Id of the table
     * @param row The row to update
     * @param connection Optional connection to execute with
     */
    abstract updateRow<RowType extends Row>(
        tableId: DatabaseTableId,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * This deletes a single row in the table.
     * Throws an error during failures.
     * @param tableId Id of the table
     * @param row The row to delete
     * @param connection Optional connection to execute with
     */
    abstract deleteRow<RowType extends Row>(
        tableId: DatabaseTableId,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * This deletes a list of rows in the table.
     * Throws an error during failures.
     * @param tableId Id of the table
     * @param rows The rows to delete
     * @param connection Optional connection to execute with
     */
    abstract deleteRows<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * Search for and replace a string of text.
     * @param tableId Id of the table
     * @param filter Filter for the query
     * @param field Field to search in
     * @param search String to search for
     * @param replace String to replace with
     * @param connection Optional connection to execute with
     */
    abstract searchAndReplace<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
        field: string,
        search: string,
        replace: string,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * Shutdown this database connection.
     */
    abstract shutdown(): Promise<void>;

    protected getTableViewsForTable<RowType extends Row>(
        tableId: DatabaseTableId,
    ): Map<number, DbTableView<RowType>> {
        return <Map<number, DbTableView<RowType>>>Db._tableToTableView[tableId];
    }

    protected getRowViewsForTable<RowType extends Row>(
        tableId: DatabaseTableId,
    ): Map<number, DbRowView<RowType>> {
        let rowViewMap: Map<number, DbRowView<RowType>> = <Map<number, DbRowView<RowType>>>(
            Db._tableToRowView[tableId]
        );
        if (!rowViewMap) {
            rowViewMap = new Map();
            Db._tableToRowView[tableId] = rowViewMap;
        }
        return rowViewMap;
    }

    protected assertQueryResult(result: unknown, errorMessage: string): void {
        if (!result) throw new Error(errorMessage);
    }

    protected assertConnected(): void {
        if (this.isConnected()) return;
        throw new Error('Operation failed: no database connection');
    }

    protected isConnected(): boolean {
        return get(this._isConnected);
    }
}
