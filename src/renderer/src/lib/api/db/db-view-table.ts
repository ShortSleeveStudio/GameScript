import type { Row, Table } from '@common/common-schema';
import type { DatabaseTableId, DatabaseTableName } from '@common/common-types';
import {
    get,
    writable,
    type Invalidator,
    type Readable,
    type Subscriber,
    type Unsubscriber,
    type Writable,
} from 'svelte/store';
import type { Filter } from './db-filter-interface';
import { DbRowViewContainer } from './db-row-container';
import type { IDbRowView } from './db-view-row-interface';
import type { IDbTableView } from './db-view-table-interface';

export class DbTableView<RowType extends Row> implements IDbTableView<RowType> {
    private _isDisposed: boolean;
    private _isConnected: Readable<boolean>;
    private _rowContainer: DbRowViewContainer<RowType>;
    private _isInitialized: boolean;
    private _internalWritable: Writable<IDbRowView<RowType>[]>;

    constructor(tableType: Table, filter: Filter<RowType>, isConnected: Readable<boolean>) {
        this._isDisposed = false;
        this._isConnected = isConnected;
        this._rowContainer = new DbRowViewContainer(tableType, filter);
        this._isInitialized = false;
        this._internalWritable = writable<IDbRowView<RowType>[]>(this._rowContainer.rowViews);
        void this.onReloadRequired();
    }

    get isInitialized(): boolean {
        return this._isInitialized;
    }

    get viewId(): number {
        return this._rowContainer.containerId;
    }

    get tableType(): Table {
        return this._rowContainer.tableType;
    }

    get tableId(): DatabaseTableId {
        return this._rowContainer.tableType.id;
    }

    get tableName(): DatabaseTableName {
        return this._rowContainer.tableType.name;
    }

    get filter(): Filter<RowType> {
        return this._rowContainer.filter;
    }

    get totalRowCount(): number {
        return this._rowContainer.totalRowCount;
    }

    subscribe(
        run: Subscriber<IDbRowView<RowType>[]>,
        invalidate?: Invalidator<IDbRowView<RowType>[]> | undefined,
    ): Unsubscriber {
        return this._internalWritable.subscribe(run, invalidate);
    }

    getRowViewById(id: number): IDbRowView<RowType> | undefined {
        return this._rowContainer.getRowViewById(id);
    }

    getRowViewsById(ids: number[]): IDbRowView<RowType>[] {
        return this._rowContainer.getRowViewsById(ids);
    }

    getRowById(id: number): RowType | undefined {
        return this._rowContainer.getRowById(id);
    }

    getRowsById(ids: number[]): RowType[] {
        return this._rowContainer.getRowsById(ids);
    }

    dispose(): void {
        this._rowContainer.clear();
        this._isDisposed = true;
        this._isInitialized = false;
        this._internalWritable.set(this._rowContainer.rowViews);
    }

    async onReloadRequired(): Promise<void> {
        if (this._isDisposed) return;
        if (!get(this._isConnected)) {
            // Clear if we're not connected
            this._rowContainer.clear();
            return;
        }
        await this._rowContainer.reload();
        this._isInitialized = true;
        this._internalWritable.set(this._rowContainer.rowViews);
    }
}
