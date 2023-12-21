import {
    get,
    writable,
    type Invalidator,
    type Readable,
    type Subscriber,
    type Unsubscriber,
    type Updater,
    type Writable,
} from 'svelte/store';
import type { Db } from './db-base';
import type { DatabaseTableName, Row } from './db-types';
import type { IDbRowView } from './db-view-row-interface';

/**Base class for row views */
export class DbRowView<RowType extends Row> implements IDbRowView<RowType> {
    private _db: Db;
    private _tableName: DatabaseTableName;
    private _pendingChanges: number;
    private _internalIsLoading: Writable<boolean>;
    private _isLoading: Readable<boolean>;
    private _internalWritable: Writable<RowType>;

    constructor(database: Db, tableName: DatabaseTableName, row: RowType) {
        this._db = database;
        this._tableName = tableName;
        this._pendingChanges = 0;
        this._internalIsLoading = writable(false);
        this._isLoading = { subscribe: this._internalIsLoading.subscribe };
        this._internalWritable = writable<RowType>(row);
    }

    get id() {
        return get(this._internalWritable).id;
    }

    // TODO: https://svelte-5-preview.vercel.app/status
    get isLoading() {
        return this._isLoading;
    }

    async set(value: RowType): Promise<void> {
        // Update database
        this.incrementLoading();
        await this._db.updateRow(this._tableName, value);
        this.decrementLoading();
    }

    update(updater: Updater<RowType>): void {
        this.set(updater(get(this._internalWritable)));
    }

    subscribe(
        run: Subscriber<RowType>,
        invalidate?: Invalidator<RowType> | undefined,
    ): Unsubscriber {
        return this._internalWritable.subscribe(run, invalidate);
    }

    onRowUpdated(newRow: RowType): void {
        // Set value
        this._internalWritable.set(newRow);
    }

    private incrementLoading() {
        this._internalIsLoading.set(++this._pendingChanges > 0);
    }

    private decrementLoading() {
        this._internalIsLoading.set(--this._pendingChanges > 0);
    }
}
