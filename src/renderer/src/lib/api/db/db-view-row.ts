import {
    get,
    writable,
    type Invalidator,
    type Subscriber,
    type Unsubscriber,
    type Writable,
} from 'svelte/store';
import type { DatabaseTableId, Row } from './db-schema';
import type { IDbRowView } from './db-view-row-interface';

/**Base class for row views */
export class DbRowView<RowType extends Row> implements IDbRowView<RowType> {
    private _owners: Set<number>;
    private _tableId: DatabaseTableId;
    private _internalWritable: Writable<RowType>;

    constructor(tableId: DatabaseTableId, row: RowType) {
        this._owners = new Set();
        this._tableId = tableId;
        this._internalWritable = writable<RowType>(row);
    }

    get id(): number {
        return get(this._internalWritable).id;
    }

    get tableId(): DatabaseTableId {
        return this._tableId;
    }

    subscribe(
        run: Subscriber<RowType>,
        invalidate?: Invalidator<RowType> | undefined,
    ): Unsubscriber {
        return this._internalWritable.subscribe(run, invalidate);
    }

    onRowUpdated(newRow: RowType): void {
        this._internalWritable.set(newRow);
    }
    ownerCount(): number {
        return this._owners.size;
    }
    ownerAdd(ownerId: number): void {
        this._owners.add(ownerId);
    }
    ownerRemove(ownerId: number): void {
        this._owners.delete(ownerId);
    }
}
