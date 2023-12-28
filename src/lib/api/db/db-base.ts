import type Database from '@tauri-apps/plugin-sql';
import { get, type Writable } from 'svelte/store';
import type { DatabaseTableName, Row } from './db-types';
import type { IDbRowView } from './db-view-row-interface';
import type { IDbTableView } from './db-view-table-interface';

/**The interface all databases must implement */
export abstract class Db {
    protected _db!: Database; // Will be initialized by children
    protected _isConnected: Writable<boolean>;

    constructor(isConnected: Writable<boolean>) {
        this._isConnected = isConnected;
    }

    /**
     * Creates a table view.
     * @param tableName Name of the table
     */
    abstract fetchTable<RowType extends Row>(tableName: DatabaseTableName): IDbTableView<RowType>;

    /**
     * This creates a single row in the table.
     * Throws an error during failures.
     * Returns the id of the newly created row.
     * @param tableName Name of the table
     * @param row The row to create
     */
    abstract createRow<RowType extends Row>(
        tableName: DatabaseTableName,
        row: RowType,
    ): Promise<RowType>;

    /**
     * This creates a list of rows in the table.
     * Throws an error during failures.
     * Returns the rows with their id fields populated.
     * @param tableName Name of the table
     * @param rows The rows to create
     */
    abstract createRows<RowType extends Row>(
        tableName: DatabaseTableName,
        rows: RowType[],
    ): Promise<RowType[]>;

    /**
     * The fetches (all) rows in a table and returns them sorted by id.
     * TODO: filter rows so the data isn't so huge
     * Throws an error during failures.
     * @param tableName Name of the table
     */
    abstract fetchRows<RowType extends Row>(
        tableName: DatabaseTableName,
    ): Promise<IDbRowView<RowType>[]>;

    /**
     * This updates a single row in a table.
     * @param tableName Name of the table
     * @param row The row to update
     */
    abstract updateRow<RowType extends Row>(
        tableName: DatabaseTableName,
        row: RowType,
    ): Promise<void>;

    /**
     * This deletes a single row in the table.
     * Throws an error during failures.
     * @param tableName Name of the table
     * @param row The row to delete
     */
    abstract deleteRow<RowType extends Row>(
        tableName: DatabaseTableName,
        row: RowType,
    ): Promise<void>;

    /**
     * This deletes a list of rows in the table.
     * Throws an error during failures.
     * @param tableName Name of the table
     * @param rows The rows to delete
     */
    abstract deleteRows<RowType extends Row>(
        tableName: DatabaseTableName,
        rows: RowType[],
    ): Promise<void>;

    /**
     * Shutdown this database connection.
     */
    async shutdown(): Promise<void> {
        await this.destroyConnection();
    }

    protected async destroyConnection() {
        this._isConnected.set(false);
        if (this._db) {
            await this._db.close();
        }
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
