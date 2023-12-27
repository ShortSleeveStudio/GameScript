import { type Invalidator, type Readable, type Subscriber, type Unsubscriber } from 'svelte/store';
import type { Row } from './db-types';

/**Interface for row views. This interface exists to prevent circular dependency. */
export interface IDbRowView<RowType extends Row> extends Readable<RowType> {
    // Used for DataTable
    id: number;
    isLoading: Readable<boolean>;
    isColumnLoading<K extends keyof RowType>(columnName: K): Readable<boolean>;
    subscribe(
        run: Subscriber<RowType>,
        invalidate?: Invalidator<RowType> | undefined,
    ): Unsubscriber;
    updateRow(row: RowType): Promise<void>;
    updateColumn<K extends keyof RowType, T extends RowType[K]>(
        columnName: K,
        columnValue: T,
    ): Promise<void>;
    /**@internal */
    onRowUpdated(newValue: RowType): void;
}
