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
import type { Filter } from './db-filter-interface';
import { type DatabaseTableName, type Row } from './db-schema';
import type { IDbRowView } from './db-view-row-interface';
import type { IDbTableView } from './db-view-table-interface';

export class DbTableView<RowType extends Row> implements IDbTableView<RowType> {
    private _db: Db;
    private _tableName: DatabaseTableName;
    private _isLoading: IsLoading;
    private _internalWritable: Writable<IDbRowView<RowType>[]>;
    private _filter: Filter<RowType>;

    constructor(database: Db, tableName: DatabaseTableName, filter: Filter<RowType>) {
        this._db = database;
        this._tableName = tableName;
        this._filter = filter;
        this._isLoading = new IsLoading();
        this._internalWritable = writable<IDbRowView<RowType>[]>([]);
        this.onReloadRequired();
    }

    // TODO: https://svelte-5-preview.vercel.app/status
    get isLoading(): Readable<boolean> {
        return this._isLoading;
    }

    get tableName(): DatabaseTableName {
        return this._tableName;
    }

    get filter(): Filter<RowType> {
        return this._filter;
    }

    subscribe(
        run: Subscriber<IDbRowView<RowType>[]>,
        invalidate?: Invalidator<IDbRowView<RowType>[]> | undefined,
    ): Unsubscriber {
        return this._internalWritable.subscribe(run, invalidate);
    }

    async createRow(row: RowType): Promise<RowType> {
        this._isLoading.increment();
        try {
            row = await this._db.createRow<RowType>(this._tableName, row);
        } finally {
            this._isLoading.decrement();
        }
        return row;
    }

    async createRows(rows: RowType[]): Promise<RowType[]> {
        this._isLoading.increment();
        try {
            rows = await this._db.createRows<RowType>(this._tableName, rows);
        } finally {
            this._isLoading.decrement();
        }
        return rows;
    }

    async deleteRow(row: RowType): Promise<void> {
        this._isLoading.increment();
        try {
            await this._db.deleteRow<RowType>(this._tableName, row);
        } finally {
            this._isLoading.decrement();
        }
    }

    async deleteRows(rows: RowType[]): Promise<void> {
        this._isLoading.increment();
        try {
            await this._db.deleteRows<RowType>(this._tableName, rows);
        } finally {
            this._isLoading.decrement();
        }
    }

    dispose(): void {
        this._db.releaseTable(this);
    }

    async onRowsCreated(rows: IDbRowView<RowType>[]): Promise<void> {
        const newList: IDbRowView<RowType>[] = [];
        const oldList: IDbRowView<RowType>[] = get(this._internalWritable);
        let oldI = 0;
        let createdI = 0;
        for (; createdI < rows.length && oldI < oldList.length; ) {
            const oldRow: IDbRowView<RowType> = oldList[oldI];
            const newRow: IDbRowView<RowType> = rows[createdI];

            // Add new rows, retain old
            if (oldRow.id < newRow.id) {
                newList.push(oldRow);
                oldI++;
            } else if (oldRow.id > newRow.id) {
                newList.push(newRow);
                createdI++;
            } else {
                newList.push(newRow);
                oldI++;
                createdI++;
            }
        }
        // Add any remaining rows
        for (; oldI < oldList.length; oldI++) newList.push(oldList[oldI]);
        for (; createdI < rows.length; createdI++) newList.push(rows[createdI]);

        // Notify
        this._internalWritable.set(newList);
    }

    async onRowsDeleted(rows: number[]): Promise<void> {
        const newList: IDbRowView<RowType>[] = [];
        const oldList: IDbRowView<RowType>[] = get(this._internalWritable);
        // Sanity
        if (rows.length > oldList.length) throw new Error('More rows deleted than exist');
        let oldI = 0;
        let deletedI = 0;
        for (; deletedI < rows.length && oldI < oldList.length; ) {
            const oldRow: IDbRowView<RowType> = oldList[oldI];
            const deletedRowId: number = rows[deletedI];

            // Retain non-deleted rows, skip deleted rows
            if (oldRow.id < deletedRowId) {
                newList.push(oldList[oldI]);
                oldI++;
            } else if (oldRow.id > deletedRowId) {
                deletedI++;
            } else {
                oldI++;
                deletedI++;
            }
        }
        // Add any remaining new rows
        for (; oldI < oldList.length; oldI++) newList.push(oldList[oldI]);

        // Notify
        this._internalWritable.set(newList);
    }

    async onReloadRequired(): Promise<void> {
        // Load new rows
        const newRowsViews: IDbRowView<RowType>[] = await this._db.fetchRows(
            this._tableName,
            this._filter,
        );

        // Update store
        this._internalWritable.set(newRowsViews);
    }
}
