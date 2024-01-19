import {
    get,
    writable,
    type Invalidator,
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
    private _internalWritable: Writable<IDbRowView<RowType>[]>;
    private _filter: Filter<RowType>;
    private _idToRowMap: Map<number, IDbRowView<RowType>>;

    constructor(database: Db, tableId: DatabaseTableId, filter: Filter<RowType>) {
        this._db = database;
        this._tableId = tableId;
        this._filter = filter;
        this._idToRowMap = new Map();
        this._internalWritable = writable<IDbRowView<RowType>[]>([]);
        this.onReloadRequired();
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
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            this._idToRowMap.set(row.id, rows[i]);
        }
        this._internalWritable.set([...this._idToRowMap.values()]);
    }

    async onRowsDeleted(rows: number[]): Promise<void> {
        // Sanity
        if (rows.length > get(this._internalWritable).length) {
            throw new Error('More rows deleted than exist');
        }
        for (let i = 0; i < rows.length; i++) this._idToRowMap.delete(rows[i]);
        this._internalWritable.set([...this._idToRowMap.values()]);
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
}
