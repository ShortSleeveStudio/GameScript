import type { Writable } from 'svelte/store';
import { Db } from './db-base';
import type { Filter } from './db-filter-interface';
import type { DatabaseTableName, Row } from './db-schema';
import type { IDbRowView } from './db-view-row-interface';
import type { IDbTableView } from './db-view-table-interface';

/**PostgreSQL database implementation */
export class PostgresDb extends Db {
    constructor(isConnected: Writable<boolean>) {
        super(isConnected);
    }
    fetchTable<RowType extends Row>(
        tableName: DatabaseTableName,
        filter: Filter<RowType>,
    ): IDbTableView<RowType> {
        throw new Error(`Method not implemented. ${tableName} ${filter}`);
    }
    releaseTable<RowType extends Row>(tableView: IDbTableView<RowType>): void {
        throw new Error(`Method not implemented. ${tableView}`);
    }
    createRow<RowType extends Row>(tableName: DatabaseTableName, row: RowType): Promise<RowType> {
        throw new Error(`Method not implemented. ${tableName} ${row}`);
    }
    createRows<RowType extends Row>(
        tableName: DatabaseTableName,
        rows: RowType[],
    ): Promise<RowType[]> {
        throw new Error(`Method not implemented. ${tableName} ${rows}`);
    }
    fetchRows<RowType extends Row>(
        tableName: DatabaseTableName,
        filter: Filter<RowType>,
    ): Promise<IDbRowView<RowType>[]> {
        throw new Error(`Method not implemented. ${tableName} ${filter}`);
    }
    updateRow<RowType extends Row>(tableName: DatabaseTableName, row: RowType): Promise<void> {
        throw new Error(`Method not implemented. ${tableName} ${row}`);
    }
    deleteRow<RowType extends Row>(tableName: DatabaseTableName, row: RowType): Promise<void> {
        throw new Error(`Method not implemented. ${tableName} ${row}`);
    }
    deleteRows<RowType extends Row>(tableName: DatabaseTableName, rows: RowType[]): Promise<void> {
        throw new Error(`Method not implemented. ${tableName} ${rows}`);
    }
}
