import {
    writable,
    type Invalidator,
    type Readable,
    type Subscriber,
    type Unsubscriber,
    type Writable,
} from 'svelte/store';
import type { Db } from './db-base';
import { type DatabaseTableName, type Row } from './db-types';
import type { IDbRowView } from './db-view-row-interface';
import type { IDbTableView } from './db-view-table-interface';

export class DbTableView<RowType extends Row> implements IDbTableView<RowType> {
    private _db: Db;
    private _tableName: DatabaseTableName;
    private _pendingChanges: number;
    private _internalIsLoading: Writable<boolean>;
    private _isLoading: Readable<boolean>;
    private _internalWritable: Writable<IDbRowView<RowType>[]>;

    constructor(database: Db, tableName: DatabaseTableName) {
        this._db = database;
        this._tableName = tableName;
        this._pendingChanges = 0;
        this._internalIsLoading = writable(false);
        this._isLoading = { subscribe: this._internalIsLoading.subscribe };
        this._internalWritable = writable<IDbRowView<RowType>[]>([]);
        this.onTableChange();
    }

    // TODO: https://svelte-5-preview.vercel.app/status
    get isLoading() {
        return this._isLoading;
    }

    subscribe(
        run: Subscriber<IDbRowView<RowType>[]>,
        invalidate?: Invalidator<IDbRowView<RowType>[]> | undefined,
    ): Unsubscriber {
        return this._internalWritable.subscribe(run, invalidate);
    }

    async createRow(row: RowType): Promise<void> {
        this.incrementLoading();
        await this._db.createRow<RowType>(this._tableName, row);
        this.decrementLoading();
    }

    async deleteRow(row: RowType): Promise<void> {
        this.incrementLoading();
        await this._db.deleteRow<RowType>(this._tableName, row);
        this.decrementLoading();
    }

    async deleteRows(rows: RowType[]): Promise<void> {
        this.incrementLoading();
        await this._db.deleteRows<RowType>(this._tableName, rows);
        this.decrementLoading();
    }

    // TODO: take an argument
    async onTableChange(): Promise<void> {
        // Load new rows
        const newRowsViews: IDbRowView<RowType>[] = await this._db.fetchRows(this._tableName);

        // Update store
        this._internalWritable.set(newRowsViews);
    }

    private incrementLoading() {
        this._internalIsLoading.set(++this._pendingChanges > 0);
    }

    private decrementLoading() {
        this._internalIsLoading.set(--this._pendingChanges > 0);
    }
}
