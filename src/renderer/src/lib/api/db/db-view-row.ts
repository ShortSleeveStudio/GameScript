import type { DatabaseTableId } from '@common/common-types';
import {
    get,
    writable,
    type Invalidator,
    type Subscriber,
    type Unsubscriber,
    type Writable,
} from 'svelte/store';
import type { Row, Table } from '../../../../../common/common-schema';
import type { RowViewDestructor } from './db-base';
import type { IDbRowView } from './db-view-row-interface';

/**Base class for row views */
export class DbRowView<RowType extends Row> implements IDbRowView<RowType> {
    private _owners: Set<number>;
    private _tableType: Table;
    private _internalWritable: Writable<RowType>;
    private _isDisposed: boolean;
    private _destructor: RowViewDestructor;

    constructor(tableType: Table, row: RowType, destructor: RowViewDestructor) {
        this._owners = new Set();
        this._tableType = tableType;
        this._internalWritable = writable<RowType>(row);
        this._isDisposed = false;
        this._destructor = destructor;
    }

    get id(): number {
        return get(this._internalWritable).id;
    }

    get tableType(): Table {
        return this._tableType;
    }

    get tableId(): DatabaseTableId {
        return this._tableType.id;
    }

    get isDisposed(): boolean {
        return this._isDisposed;
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
        if (this._owners.size === 0) {
            this._destructor();
            this._isDisposed = true;
            this._internalWritable.update((value) => value);
        }
    }
}
