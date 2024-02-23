import type { DatabaseTableId, DatabaseTableName, DatabaseTableType } from '@common/common-types';
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
import { db } from './db';
import type { Filter } from './db-filter-interface';
import { type Row } from './db-schema';
import type { DbRowView } from './db-view-row';
import type { IDbRowView } from './db-view-row-interface';
import type { IDbTableView } from './db-view-table-interface';

export class DbTableView<RowType extends Row> implements IDbTableView<RowType> {
    private static nextId = 0;
    private _viewId: number;
    private _isInitialized: boolean;
    private _tableType: DatabaseTableType;
    private _internalWritable: Writable<DbRowView<RowType>[]>;
    private _filter: Filter<RowType>;
    private _idToRowMap: Map<number, DbRowView<RowType>>;
    private _isConnected: Readable<boolean>;
    private _totalRowCount: number;
    private _isDisposed: boolean;

    constructor(
        tableType: DatabaseTableType,
        filter: Filter<RowType>,
        isConnected: Readable<boolean>,
    ) {
        this._viewId = DbTableView.nextId++;
        this._isInitialized = false;
        this._tableType = tableType;
        this._filter = filter;
        this._idToRowMap = new Map();
        this._internalWritable = writable<DbRowView<RowType>[]>([]);
        this._isConnected = isConnected;
        this._totalRowCount = 0;
        this._isDisposed = false;
        this.onReloadRequired();
    }

    get isInitialized(): boolean {
        return this._isInitialized;
    }

    get viewId(): number {
        return this._viewId;
    }

    get tableType(): DatabaseTableType {
        return this._tableType;
    }

    get tableId(): DatabaseTableId {
        return this._tableType.id;
    }

    get tableName(): DatabaseTableName {
        return this._tableType.name;
    }

    get filter(): Filter<RowType> {
        return this._filter;
    }

    get rowCount(): number {
        return this._totalRowCount;
    }

    set filter(filter: Filter<RowType>) {
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
        for (let i = 0; i < ids.length; i++) {
            const rowView: IDbRowView<RowType> | undefined = this.getRowViewById(ids[i]);
            if (rowView) rows.push(rowView);
        }
        return rows;
    }

    getRowById(id: number): RowType | undefined {
        const rowView: IDbRowView<RowType> | undefined = this.getRowViewById(id);
        return rowView ? get(rowView) : undefined;
    }

    getRowsById(ids: number[]): RowType[] {
        const rows: RowType[] = [];
        for (let i = 0; i < ids.length; i++) {
            const rowView: IDbRowView<RowType> | undefined = this.getRowViewById(ids[i]);
            if (rowView) rows.push(get(rowView));
        }
        return rows;
    }

    dispose(): void {
        this._isDisposed = true;
        this._isInitialized = false;
        this.onReloadRequired();
    }

    async onReloadRequired(): Promise<void> {
        let newRowCount: number;
        let newRowViews: DbRowView<RowType>[];
        if (this._isDisposed || !get(this._isConnected)) {
            // Skip notification if we're already not showing data
            if (this._totalRowCount === 0 && get(this._internalWritable).length === 0) return;
            newRowCount = 0;
            newRowViews = [];
        } else {
            // Fetch new data
            await db.executeTransaction(async (conn: DbConnection) => {
                newRowCount = await db.fetchRowCount(this._tableType, this._filter, conn);
                newRowViews = <DbRowView<RowType>[]>(
                    await db.fetchRows(this._tableType, this._filter, conn)
                );
            });
        }

        // Update row view ownership
        const oldMap: Map<number, DbRowView<RowType>> = this._idToRowMap;
        const newMap: Map<number, DbRowView<RowType>> = new Map();
        for (let i = 0; i < newRowViews.length; i++) {
            const newRowView: DbRowView<RowType> = newRowViews[i];
            newRowView.ownerAdd(this._viewId);
            newMap.set(newRowView.id, newRowView);
            oldMap.delete(newRowView.id);
        }
        // Anything left in the old map is no longer tracked by this table view
        for (const value of oldMap.values()) value.ownerRemove(this._viewId);
        this._idToRowMap = newMap;

        // Update store
        this._totalRowCount = newRowCount;
        this._isInitialized = true;
        this._internalWritable.set(newRowViews);
    }
}
