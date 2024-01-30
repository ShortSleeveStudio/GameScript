import {
    get,
    writable,
    type Invalidator,
    type Readable,
    type Subscriber,
    type Unsubscriber,
    type Writable,
} from 'svelte/store';
import { db } from './db';
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
    private static nextId = 0;
    private _viewId: number;
    private _tableId: DatabaseTableId;
    private _internalWritable: Writable<IDbRowView<RowType>[]>;
    private _filter: Filter<RowType>;
    private _idToRowMap: Map<number, IDbRowView<RowType>>;
    private _isConnected: Readable<boolean>;

    constructor(tableId: DatabaseTableId, filter: Filter<RowType>, isConnected: Readable<boolean>) {
        this._viewId = DbTableView.nextId++;
        this._tableId = tableId;
        this._filter = filter;
        this._idToRowMap = new Map();
        this._internalWritable = writable<IDbRowView<RowType>[]>([]);
        this._isConnected = isConnected;
        this.onReloadRequired();
    }

    get viewId(): number {
        return this._viewId;
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

    set filter(filter: Filter<RowType>) {
        if (this._filter.equals(filter)) {
            console.log('FILTER WAS EQUAL, SKIPPING SET');
            return;
        }

        this._filter = filter;
        this.onReloadRequired();
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
        db.releaseTable(this);
    }

    async onReloadRequired(): Promise<void> {
        // Only if connected
        if (!get(this._isConnected)) return;

        // Load new rows
        const newRowViews: IDbRowView<RowType>[] = await db.fetchRows(
            this._tableId,
            this._filter,
            this,
        );

        // Add to map
        this._idToRowMap.clear();
        newRowViews.forEach((rowView) => this._idToRowMap.set(rowView.id, rowView));

        // Update store
        this._internalWritable.set(newRowViews);
    }
}
