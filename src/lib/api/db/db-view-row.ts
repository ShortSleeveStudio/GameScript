import { IsLoading } from '@lib/stores/utility/is-loading';
import {
    get,
    writable,
    type Invalidator,
    type Readable,
    type Subscriber,
    type Unsubscriber,
    type Writable,
} from 'svelte/store';
import type { Db } from './db-base';
import type { DatabaseTableName, Row } from './db-types';
import type { IDbRowView } from './db-view-row-interface';

/**Base class for row views */
export class DbRowView<RowType extends Row> implements IDbRowView<RowType> {
    private _db: Db;
    private _tableName: DatabaseTableName;
    private _isLoading: IsLoading;
    private _internalWritable: Writable<RowType>;
    private _columnLoadingMap: Map<string, IsLoading>;

    constructor(database: Db, tableName: DatabaseTableName, row: RowType) {
        this._db = database;
        this._tableName = tableName;
        this._isLoading = new IsLoading();
        this._internalWritable = writable<RowType>(row);
        this._columnLoadingMap = new Map();
        for (const prop in row) {
            this._columnLoadingMap.set(prop, new IsLoading());
        }
    }

    get id() {
        return get(this._internalWritable).id;
    }

    // TODO: https://svelte-5-preview.vercel.app/status
    get isLoading(): Readable<boolean> {
        return this._isLoading;
    }

    isColumnLoading<K extends keyof RowType>(columnName: K): Readable<boolean> {
        return this.getColumnIsLoading(<string>columnName);
    }

    async updateRow(row: RowType): Promise<void> {
        this._isLoading.increment();
        await this._db.updateRow(this._tableName, row);
        this._isLoading.decrement();
    }

    async updateColumn<K extends keyof RowType, T extends RowType[K]>(
        columnName: K,
        columnValue: T,
    ): Promise<void> {
        this._isLoading.increment();
        const columnIsLoading: IsLoading = this.getColumnIsLoading(<string>columnName);
        columnIsLoading.increment();

        const rowVal: RowType = get(this._internalWritable);
        rowVal[columnName] = columnValue;
        await this._db.updateRow(this._tableName, rowVal);

        columnIsLoading.decrement();
        this._isLoading.decrement();
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

    private getColumnIsLoading(columnName: string) {
        return <IsLoading>this._columnLoadingMap.get(columnName);
    }
}
