import type { IsLoading } from '@lib/stores/utility/is-loading';
import type { DbConnection } from 'preload/api-db';
import { type Invalidator, type Readable, type Subscriber, type Unsubscriber } from 'svelte/store';
import type { Row } from './db-schema';

/**Interface for row views. This interface exists to prevent circular dependency. */
export interface IDbRowView<RowType extends Row> extends Readable<RowType> {
    // Used for DataTable
    id: number;
    isLoading: IsLoading;
    isColumnLoading<K extends keyof RowType>(columnName: K): Readable<boolean>;
    subscribe(
        run: Subscriber<RowType>,
        invalidate?: Invalidator<RowType> | undefined,
    ): Unsubscriber;
    updateRow(row: RowType, connection?: DbConnection): Promise<void>;
    updateColumn<K extends keyof RowType>(
        columnName: K,
        columnValue: unknown,
        connection?: DbConnection,
    ): Promise<void>;
    /**@internal */
    onRowUpdated(newValue: RowType): void;
}
