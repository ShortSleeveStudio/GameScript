import { IsLoading } from '@lib/stores/utility/is-loading';
import type { DbConnection } from 'preload/api-db';
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
import {
    DATABASE_TABLE_NAMES,
    type DatabaseTableId,
    type DatabaseTableName,
    type Row,
} from './db-schema';
import type { IDbRowView } from './db-view-row-interface';
import type { IDbTableView } from './db-view-table-interface';

export class DbTableView<RowType extends Row> implements IDbTableView<RowType> {
    private _db: Db;
    private _tableId: DatabaseTableId;
    private _isLoading: IsLoading;
    private _internalWritable: Writable<IDbRowView<RowType>[]>;
    private _filter: Filter<RowType>;
    private _idToRowMap: Map<number, IDbRowView<RowType>>;

    constructor(database: Db, tableId: DatabaseTableId, filter: Filter<RowType>) {
        this._db = database;
        this._tableId = tableId;
        this._filter = filter;
        this._idToRowMap = new Map();
        this._isLoading = new IsLoading();
        this._internalWritable = writable<IDbRowView<RowType>[]>([]);
        this.onReloadRequired();
    }

    // TODO: https://svelte-5-preview.vercel.app/status
    get isLoading(): Readable<boolean> {
        return this._isLoading;
    }

    get tableId(): DatabaseTableId {
        return this._tableId;
    }

    get tableName(): DatabaseTableName {
        return DATABASE_TABLE_NAMES[this.tableId];
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

    async createRow(row: RowType, connection?: DbConnection): Promise<RowType> {
        this._isLoading.increment();
        try {
            row = await this._db.createRow<RowType>(this._tableId, row, connection);
        } finally {
            this._isLoading.decrement();
        }
        return row;
    }

    async createRows(rows: RowType[], connection?: DbConnection): Promise<RowType[]> {
        this._isLoading.increment();
        try {
            rows = await this._db.createRows<RowType>(this._tableId, rows, connection);
        } finally {
            this._isLoading.decrement();
        }
        return rows;
    }

    async deleteRow(row: RowType, connection?: DbConnection): Promise<void> {
        this._isLoading.increment();
        try {
            await this._db.deleteRow<RowType>(this._tableId, row, connection);
        } finally {
            this._isLoading.decrement();
        }
    }

    async deleteRows(rows: RowType[], connection?: DbConnection): Promise<void> {
        this._isLoading.increment();
        try {
            await this._db.deleteRows<RowType>(this._tableId, rows, connection);
        } finally {
            this._isLoading.decrement();
        }
    }

    getRowViewById(id: number): IDbRowView<RowType> | undefined {
        return this._idToRowMap.get(id);
    }

    getRowViewsById(ids: number[]): IDbRowView<RowType>[] {
        const rows: IDbRowView<RowType>[] = [];
        ids.forEach((rowId) => {
            const rowView: IDbRowView<RowType> | undefined = this.getRowViewById(rowId);
            if (rowView) {
                rows.push(rowView);
            }
        });
        return rows;
    }

    getRowById(id: number): RowType | undefined {
        const rowView: IDbRowView<RowType> | undefined = this.getRowViewById(id);
        return rowView ? get(rowView) : undefined;
    }

    getRowsById(ids: number[]): RowType[] {
        const rows: RowType[] = [];
        ids.forEach((rowId) => {
            const rowView: IDbRowView<RowType> | undefined = this.getRowViewById(rowId);
            if (rowView) {
                rows.push(get(rowView));
            }
        });
        return rows;
    }

    dispose(): void {
        this._db.releaseTable(this);
    }

    async onRowsCreated(rows: IDbRowView<RowType>[]): Promise<void> {
        const newList: IDbRowView<RowType>[] = [];
        const oldList: IDbRowView<RowType>[] = get(this._internalWritable);
        let oldI = 0;
        let createdI = 0;
        this._idToRowMap.clear();
        for (; createdI < rows.length && oldI < oldList.length; ) {
            const oldRow: IDbRowView<RowType> = oldList[oldI];
            const newRow: IDbRowView<RowType> = rows[createdI];

            // Add new rows, retain old
            if (oldRow.id < newRow.id) {
                this.addToListAndMap(oldRow, newList, this._idToRowMap);
                oldI++;
            } else if (oldRow.id > newRow.id) {
                this.addToListAndMap(newRow, newList, this._idToRowMap);
                createdI++;
            } else {
                this.addToListAndMap(newRow, newList, this._idToRowMap);
                oldI++;
                createdI++;
            }
        }
        // Add any remaining rows
        for (; oldI < oldList.length; oldI++)
            this.addToListAndMap(oldList[oldI], newList, this._idToRowMap);
        for (; createdI < rows.length; createdI++)
            this.addToListAndMap(rows[createdI], newList, this._idToRowMap);

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
                this.addToListAndMap(oldList[oldI], newList, this._idToRowMap);
                oldI++;
            } else if (oldRow.id > deletedRowId) {
                deletedI++;
            } else {
                oldI++;
                deletedI++;
            }
        }
        // Add any remaining new rows
        for (; oldI < oldList.length; oldI++)
            this.addToListAndMap(oldList[oldI], newList, this._idToRowMap);

        // Notify
        this._internalWritable.set(newList);
    }

    async onReloadRequired(): Promise<void> {
        // Load new rows
        const newRowViews: IDbRowView<RowType>[] = await this._db.fetchRows(
            this._tableId,
            this._filter,
        );

        // Add to map
        this._idToRowMap.clear();
        newRowViews.forEach((rowView) => this._idToRowMap.set(rowView.id, rowView));

        // Update store
        this._internalWritable.set(newRowViews);
    }

    private addToListAndMap(
        rowView: IDbRowView<RowType>,
        list: IDbRowView<RowType>[],
        map: Map<number, IDbRowView<RowType>>,
    ): void {
        list.push(rowView);
        map.set(rowView.id, rowView);
    }
}
