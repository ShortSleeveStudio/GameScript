import type { Writable } from 'svelte/store';
import { Db, type Transaction } from './db-base';
import type { Filter } from './db-filter-interface';
import type { DatabaseTableId, FieldTypeId, Row } from './db-schema';
import type { IDbRowView } from './db-view-row-interface';
import type { IDbTableView } from './db-view-table-interface';

/**PostgreSQL database implementation */
export class PostgresDb extends Db {
    constructor(isConnected: Writable<boolean>) {
        super(isConnected);
    }
    executeTransaction(transaction: Transaction): Promise<void> {
        throw new Error(`Method not implemented. ${transaction}`);
    }
    fetchTable<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
    ): IDbTableView<RowType> {
        throw new Error(`Method not implemented. ${tableId} ${filter}`);
    }
    releaseTable<RowType extends Row>(tableId: IDbTableView<RowType>): void {
        throw new Error(`Method not implemented. ${tableId}`);
    }
    createColumn(tableId: DatabaseTableId, name: string, type: FieldTypeId): Promise<void> {
        throw new Error(`Method not implemented. ${tableId} ${name} ${type}`);
    }
    deleteColumn(tableId: DatabaseTableId, name: string): Promise<void> {
        throw new Error(`Method not implemented. ${tableId} ${name}`);
    }
    createRow<RowType extends Row>(tableId: DatabaseTableId, row: RowType): Promise<RowType> {
        throw new Error(`Method not implemented. ${tableId} ${row}`);
    }
    createRows<RowType extends Row>(tableId: DatabaseTableId, rows: RowType[]): Promise<RowType[]> {
        throw new Error(`Method not implemented. ${tableId} ${rows}`);
    }
    fetchRows<RowType extends Row>(
        tableId: DatabaseTableId,
        filter: Filter<RowType>,
    ): Promise<IDbRowView<RowType>[]> {
        throw new Error(`Method not implemented. ${tableId} ${filter}`);
    }
    refreshRow<RowType extends Row>(tableId: number, row: RowType): Promise<IDbRowView<RowType>> {
        throw new Error(`Method not implemented. ${tableId} ${row}`);
    }
    updateRow<RowType extends Row>(tableId: DatabaseTableId, row: RowType): Promise<void> {
        throw new Error(`Method not implemented. ${tableId} ${row}`);
    }
    deleteRow<RowType extends Row>(tableId: DatabaseTableId, row: RowType): Promise<void> {
        throw new Error(`Method not implemented. ${tableId} ${row}`);
    }
    deleteRows<RowType extends Row>(tableId: DatabaseTableId, rows: RowType[]): Promise<void> {
        throw new Error(`Method not implemented. ${tableId} ${rows}`);
    }
    shutdown(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
