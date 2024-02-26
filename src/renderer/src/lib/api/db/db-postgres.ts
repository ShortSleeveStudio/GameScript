import type { Row } from '@common/common-schema';
import type { DatabaseTableType, FieldTypeId } from '@common/common-types';
import type { Transaction } from '@common/common-types-db';
import type { Writable } from 'svelte/store';
import { Db } from './db-base';
import type { Filter } from './db-filter-interface';
import type { IDbRowView } from './db-view-row-interface';

/**PostgreSQL database implementation */
export class PostgresDb extends Db {
    constructor(isConnected: Writable<boolean>) {
        super(isConnected);
    }
    executeTransaction(transaction: Transaction): Promise<void> {
        throw new Error(`Method not implemented. ${transaction}`);
    }
    createColumn(tableType: DatabaseTableType, name: string, type: FieldTypeId): Promise<void> {
        throw new Error(`Method not implemented. ${tableType} ${name} ${type}`);
    }
    deleteColumn(tableType: DatabaseTableType, name: string): Promise<void> {
        throw new Error(`Method not implemented. ${tableType} ${name}`);
    }
    createRow<RowType extends Row>(tableType: DatabaseTableType, row: RowType): Promise<RowType> {
        throw new Error(`Method not implemented. ${tableType} ${row}`);
    }
    createRows<RowType extends Row>(
        tableType: DatabaseTableType,
        rows: RowType[],
    ): Promise<RowType[]> {
        throw new Error(`Method not implemented. ${tableType} ${rows}`);
    }
    fetchRowCount<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
    ): Promise<number> {
        throw new Error(`Method not implemented. ${tableType} ${filter}`);
    }
    fetchRowsRaw<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
    ): Promise<RowType[]> {
        throw new Error(`Method not implemented. ${tableType} ${filter}`);
    }
    fetchRows<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
    ): Promise<IDbRowView<RowType>[]> {
        throw new Error(`Method not implemented. ${tableType} ${filter}`);
    }
    updateRows<RowType extends Row>(tableType: DatabaseTableType, rows: RowType[]): Promise<void> {
        throw new Error(`Method not implemented. ${tableType} ${rows}`);
    }
    updateRow<RowType extends Row>(tableType: DatabaseTableType, row: RowType): Promise<void> {
        throw new Error(`Method not implemented. ${tableType} ${row}`);
    }
    deleteRow<RowType extends Row>(tableType: DatabaseTableType, row: RowType): Promise<void> {
        throw new Error(`Method not implemented. ${tableType} ${row}`);
    }
    deleteRows<RowType extends Row>(tableType: DatabaseTableType, rows: RowType[]): Promise<void> {
        throw new Error(`Method not implemented. ${tableType} ${rows}`);
    }
    searchAndReplace<RowType extends Row>(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        field: string,
        search: string,
        replace: string,
    ): Promise<void> {
        throw new Error(
            `Method not implemented. ${tableType} ${filter} ${field} ${search} ${replace}`,
        );
    }
    shutdown(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
