import {
    type Invalidator,
    type Readable,
    type Subscriber,
    type Unsubscriber,
    type Updater,
    type Writable,
} from 'svelte/store';
import type { Row } from './db-types';

/**Interface for row views. This exists to prevent circular dependency. */
export interface IDbRowView<RowType extends Row> extends Writable<RowType> {
    // Used for DataTable
    id: number;
    isLoading: Readable<boolean>;
    set(value: RowType): Promise<void>;
    update(updater: Updater<RowType>): void;
    subscribe(
        run: Subscriber<RowType>,
        invalidate?: Invalidator<RowType> | undefined,
    ): Unsubscriber;
    /**@internal */
    onRowUpdated(newValue: RowType): void;
}
