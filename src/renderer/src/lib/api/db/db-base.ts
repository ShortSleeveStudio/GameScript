import { get, type Writable } from 'svelte/store';
import type { Filter } from './db-filter-interface';
import type { DatabaseTableId, Row } from './db-schema';
import type { IDbRowView } from './db-view-row-interface';
import type { IDbTableView } from './db-view-table-interface';

// Operation types
export const OPS = [0, 1, 2];
export type OpType = (typeof OPS)[number];
export const OP_CREATE: OpType = 0;
export const OP_DELETE: OpType = 1;
export const OP_UPDATE: OpType = 2;

// Transaction type
export type Transaction = () => Promise<void>;

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
     * This creates a single row in the table.
     * Throws an error during failures.
     * Returns the id of the newly created row.
     * @param tableId Id of the table
     * @param row The row to create
     */
    abstract createRow<RowType extends Row>(
        tableId: DatabaseTableId,
        row: RowType,
    ): Promise<RowType>;

    /**
     * This creates a list of rows in the table.
     * Throws an error during failures.
     * Returns the rows with their id fields populated.
     * @param tableId Id of the table
     * @param rows The rows to create
     */
    abstract createRows<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
    ): Promise<RowType[]>;

    /**
     * The fetches (all) rows in a table and returns them sorted by id.
     * TODO: filter rows so the data isn't so huge
     * Throws an error during failures.
     * @param tableId Id of the table
     */
    abstract fetchRows<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
    ): Promise<IDbRowView<RowType>[]>;

    /**
     * This updates a single row in a table.
     * @param tableId Id of the table
     * @param row The row to update
     */
    abstract updateRow<RowType extends Row>(tableId: DatabaseTableId, row: RowType): Promise<void>;

    /**
     * This deletes a single row in the table.
     * Throws an error during failures.
     * @param tableId Id of the table
     * @param row The row to delete
     */
    abstract deleteRow<RowType extends Row>(tableId: DatabaseTableId, row: RowType): Promise<void>;

    /**
     * This deletes a list of rows in the table.
     * Throws an error during failures.
     * @param tableId Id of the table
     * @param rows The rows to delete
     */
    abstract deleteRows<RowType extends Row>(
        tableId: DatabaseTableId,
        rows: RowType[],
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