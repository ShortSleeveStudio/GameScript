import { IsLoading } from '@lib/stores/utility/is-loading';
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
    private _isLoading: IsLoading;
    private _internalWritable: Writable<IDbRowView<RowType>[]>;

    constructor(database: Db, tableName: DatabaseTableName) {
        this._db = database;
        this._tableName = tableName;
        this._isLoading = new IsLoading();
        this._internalWritable = writable<IDbRowView<RowType>[]>([]);
        this.onTableChange();
    }

    // TODO: https://svelte-5-preview.vercel.app/status
    get isLoading(): Readable<boolean> {
        return this._isLoading;
    }

    subscribe(
        run: Subscriber<IDbRowView<RowType>[]>,
        invalidate?: Invalidator<IDbRowView<RowType>[]> | undefined,
    ): Unsubscriber {
        return this._internalWritable.subscribe(run, invalidate);
    }

    async createRow(row: RowType): Promise<RowType> {
        this._isLoading.increment();
        row = await this._db.createRow<RowType>(this._tableName, row);
        this._isLoading.decrement();
        return row;
    }

    async createRows(rows: RowType[]): Promise<RowType[]> {
        this._isLoading.increment();
        rows = await this._db.createRows<RowType>(this._tableName, rows);
        this._isLoading.decrement();
        return rows;
    }

    async deleteRow(row: RowType): Promise<void> {
        this._isLoading.increment();
        await this._db.deleteRow<RowType>(this._tableName, row);
        this._isLoading.decrement();
    }

    async deleteRows(rows: RowType[]): Promise<void> {
        this._isLoading.increment();
        await this._db.deleteRows<RowType>(this._tableName, rows);
        this._isLoading.decrement();
    }

    // TODO: take an argument
    async onTableChange(): Promise<void> {
        // Load new rows
        const newRowsViews: IDbRowView<RowType>[] = await this._db.fetchRows(this._tableName);

        // Update store
        this._internalWritable.set(newRowsViews);
    }
}
