import type { Writable } from 'svelte/store';
import { Db } from './db-base';
import type { DatabaseTableName, Row } from './db-types';
import type { IDbRowView } from './db-view-row-interface';
import type { IDbTableView } from './db-view-table-interface';

/**PostgreSQL database implementation */
export class PostgresDb extends Db {
    constructor(isConnected: Writable<boolean>) {
        super(isConnected);
    }

    fetchTable<RowType extends Row>(tableName: DatabaseTableName): IDbTableView<RowType> {
        throw new Error(`Method not implemented. ${tableName}`);
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
    fetchRows<RowType extends Row>(tableName: DatabaseTableName): Promise<IDbRowView<RowType>[]> {
        throw new Error(`Method not implemented. ${tableName}`);
    }
    fetchRow<RowType extends Row>(
        tableName: DatabaseTableName,
        row: RowType,
    ): Promise<IDbRowView<RowType>> {
        throw new Error(`Method not implemented. ${tableName} ${row}`);
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
