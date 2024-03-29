import type { DbConnection, DbConnectionConfig, DbTransaction } from '@common/common-db-types';
import type { Row, Table } from '@common/common-schema';
import type { FieldTypeId } from '@common/common-types';
import type { Filter } from './db-filter-interface';
import type { IDbRowView } from './db-view-row-interface';
import type { IDbTableView } from './db-view-table-interface';

export interface Db {
    /**
     * Checks to see if the database has been initialized.
     */
    isDbInitialized(config: DbConnectionConfig): Promise<boolean>;

    /**
     * Connect to the database.
     * @param config Connection configuration
     */
    connect(config: DbConnectionConfig, initialize: boolean): Promise<void>;

    /**
     * Disconnect from the database.
     */
    disconnect(): Promise<void>;

    /**
     * Creates a table view.
     * @param tableType Type of the table
     * @param filter Filter for the table
     */
    fetchTable<RowType extends Row>(
        tableType: Table,
        filter: Filter<RowType>,
    ): IDbTableView<RowType>;

    /**
     * Disposes of a single table view
     * @param tableView The table view to release
     */
    releaseTable<RowType extends Row>(tableView: IDbTableView<RowType>): void;

    /**
     * Execute a function within a database transaction.
     * @param transaction A function to execute within a database transaction
     */
    executeTransaction(transaction: DbTransaction): Promise<void>;

    /**
     * Add a column to a table.
     * @param tableId Table to add a column to
     * @param name Name of the new column
     * @param type Type of the new column
     * @param connection Optional connection to execute with
     */
    createColumn(
        tableType: Table,
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
    deleteColumn(tableType: Table, name: string, connection?: DbConnection): Promise<void>;

    /**
     * This creates a single row in the table.
     * Throws an error during failures.
     * Returns the id of the newly created row.
     * @param tableType Type of the table
     * @param row The row to create
     * @param connection Optional connection to execute with
     */
    createRow<RowType extends Row>(
        tableType: Table,
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
    createRows<RowType extends Row>(
        tableType: Table,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<RowType[]>;

    /**
     * Fetch the total number of rows in a given table.
     * @param tableType Type of the table
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     */
    fetchRowCount<RowType extends Row>(
        tableType: Table,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<number>;

    /**
     * Fetch raw rows that won't be used by a table view or updated when changes happen.
     * @param tableType Type of the table
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     */
    fetchRowsRaw<RowType extends Row>(
        tableType: Table,
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
    fetchRows<RowType extends Row>(
        tableType: Table,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<IDbRowView<RowType>[]>;

    /**
     * This updates multiple rows in a table.
     * @param tableType Type of the table
     * @param rows The rows to update
     * @param connection Optional connection to execute with
     */
    updateRows<RowType extends Row>(
        tableType: Table,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * This updates a single row in a table.
     * @param tableType Type of the table
     * @param row The row to update
     * @param connection Optional connection to execute with
     */
    updateRow<RowType extends Row>(
        tableType: Table,
        row: RowType,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * Bulk update rows.
     * @param tableType Type of the table
     * @param row The row updates to apply to all matches
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     */
    bulkUpdate<RowType extends Row>(
        tableType: Table,
        row: RowType,
        filter: Filter<RowType>,
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * This deletes a single row in the table.
     * Throws an error during failures.
     * @param tableType Type of the table
     * @param row The row to delete
     * @param connection Optional connection to execute with
     */
    deleteRow<RowType extends Row>(
        tableType: Table,
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
    deleteRows<RowType extends Row>(
        tableType: Table,
        rows: RowType[],
        connection?: DbConnection,
    ): Promise<void>;

    /**
     * Bulk delete rows.
     * @param tableType Type of the table
     * @param filter Filter for the query
     * @param connection Optional connection to execute with
     */
    bulkDelete<RowType extends Row>(
        tableType: Table,
        filter: Filter<RowType>,
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
    searchAndReplace<RowType extends Row>(
        tableType: Table,
        filter: Filter<RowType>,
        field: string,
        search: string,
        replace: string,
        connection?: DbConnection,
    ): Promise<void>;
}
