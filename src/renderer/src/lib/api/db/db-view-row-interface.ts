import type { DatabaseTableId, DatabaseTableType } from '@common/common-types';
import { type Invalidator, type Readable, type Subscriber, type Unsubscriber } from 'svelte/store';
import type { Row } from './db-schema';

/**Interface for row views. This interface exists to prevent circular dependency. */
export interface IDbRowView<RowType extends Row> extends Readable<RowType> {
    // Used for DataTable
    id: number;
    tableId: DatabaseTableId;
    tableType: DatabaseTableType;
    isDisposed: boolean;
    subscribe(
        run: Subscriber<RowType>,
        invalidate?: Invalidator<RowType> | undefined,
    ): Unsubscriber;
}
