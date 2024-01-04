import { type Invalidator, type Readable, type Subscriber, type Unsubscriber } from 'svelte/store';
import type { Filter } from './db-filter-interface';
import { type DatabaseTableId, type DatabaseTableName, type Row } from './db-schema';
import type { IDbRowView } from './db-view-row-interface';

/**
 * Interface for table views. The idea is that the view should never show the entirety of a table
 * if it's massive. Usually, it should show only a window (view) into the table. For small tables,
 * it won't matter.
 *
 * When updates come in, currently we completely replace cached data. This is safe only so long as
 * the window remains small.
 */
export interface IDbTableView<RowType extends Row> extends Readable<IDbRowView<RowType>[]> {
    isLoading: Readable<boolean>;
    tableId: DatabaseTableId;
    tableName: DatabaseTableName;
    filter: Filter<RowType>;
    subscribe(
        run: Subscriber<IDbRowView<RowType>[]>,
        invalidate?: Invalidator<IDbRowView<RowType>[]> | undefined,
    ): Unsubscriber;
    createRow(row: RowType): Promise<RowType>;
    createRows(rows: RowType[]): Promise<RowType[]>;
    deleteRow(row: RowType): Promise<void>;
    deleteRows(rows: RowType[]): Promise<void>;
    dispose(): void;
    /**@internal */
    onRowsDeleted(rows: number[]): Promise<void>;
    /**@internal */
    onRowsCreated(rows: IDbRowView<RowType>[]): Promise<void>;
    /**@internal */
    onReloadRequired(): Promise<void>;
}
