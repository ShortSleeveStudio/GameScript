import type { Row, Table } from '@common/common-schema';
import type { DatabaseTableId, DatabaseTableName } from '@common/common-types';
import { type Invalidator, type Readable, type Subscriber, type Unsubscriber } from 'svelte/store';
import type { Filter } from './db-filter-interface';
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
    viewId: number;
    tableType: Table;
    tableId: DatabaseTableId;
    tableName: DatabaseTableName;
    filter: Filter<RowType>;
    totalRowCount: number;
    isInitialized: boolean;
    subscribe(
        run: Subscriber<IDbRowView<RowType>[]>,
        invalidate?: Invalidator<IDbRowView<RowType>[]> | undefined,
    ): Unsubscriber;
    getRowViewById(id: number): IDbRowView<RowType> | undefined;
    getRowViewsById(id: number[]): IDbRowView<RowType>[];
    getRowById(id: number): RowType | undefined;
    getRowsById(id: number[]): RowType[];
}
