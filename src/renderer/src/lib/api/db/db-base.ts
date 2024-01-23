import type { DbConnection } from 'preload/api-db';
import { get, type Writable } from 'svelte/store';
import type { Filter } from './db-filter-interface';
import type { DatabaseTableId, FieldTypeId, Row } from './db-schema';
import type { IDbRowView } from './db-view-row-interface';
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

/**The interface all databases must implement */
export abstract class Db {
    protected _isConnected: Writable<boolean>;

    constructor(isConnected: Writable<boolean>) {
        this._isConnected = isConnected;
    }

    /**
     * Execute a function within a database transaction.
     * @param transaction A function to execute within a database transaction
     */
    abstract executeTransaction(transaction: Transaction): Promise<void>;

    /**
     * Creates a table view.
     * @param tableId Id of the table
     */
    abstract fetchTable<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
    ): IDbTableView<RowType>;

    /**
     * Disposes of a single table view
     * @param tableView The table view to release
     */
    abstract releaseTable<RowType extends Row>(tableView: IDbTableView<RowType>): void;

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
     * The fetches (all) rows in a table and returns them sorted by id.
     * Throws an error during failures.
     * @param tableId Id of the table
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     */
    abstract fetchRows<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<IDbRowView<RowType>[]>;

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
     * Shutdown this database connection.
     */
    abstract shutdown(): Promise<void>;

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
