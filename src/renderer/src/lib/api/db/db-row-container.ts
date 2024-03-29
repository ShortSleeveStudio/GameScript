import type { DbConnection } from '@common/common-db-types';
import type { Row, Table } from '@common/common-schema';
import type { DatabaseTableId, DatabaseTableName } from '@common/common-types';
import { get } from 'svelte/store';
import { db } from './db';
import type { Filter } from './db-filter-interface';
import type { DbRowView } from './db-view-row';
import type { IDbRowView } from './db-view-row-interface';

/**
 * This is a simple container for row views. It loads them and unloads them updating their ownership
 * as appropriate.
 */
export class DbRowViewContainer<RowType extends Row> {
    private static nextId = 0;
    private _containerId: number;
    private _filter: Filter<RowType>;
    private _tableType: Table;
    private _idToRowMap: Map<number, DbRowView<RowType>>;

    private _rowViews: DbRowView<RowType>[];
    private _totalRowCount: number;

    constructor(tableType: Table, filter: Filter<RowType>) {
        this._containerId = DbRowViewContainer.nextId++;
        this._filter = filter;
        this._tableType = tableType;
        this._idToRowMap = new Map();
        this._totalRowCount = 0;
        this._rowViews = [];
    }

    get containerId(): number {
        return this._containerId;
    }

    get tableType(): Table {
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

    get totalRowCount(): number {
        return this._totalRowCount;
    }

    get rowViews(): IDbRowView<RowType>[] {
        return this._rowViews;
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

    async reload(): Promise<void> {
        let newRowCount: number;
        let newRowViews: DbRowView<RowType>[];
        await db.executeTransaction(async (conn: DbConnection) => {
            newRowCount = await db.fetchRowCount(this._tableType, this._filter, conn);
            newRowViews = <DbRowView<RowType>[]>(
                await db.fetchRows(this._tableType, this._filter, conn)
            );
        });
        this._totalRowCount = newRowCount;
        this._rowViews.length = 0;
        this._rowViews.push(...newRowViews);
        this.updateInternalState();
    }

    clear(): void {
        this._totalRowCount = 0;
        this._rowViews.length = 0;
        this.updateInternalState();
    }

    private updateInternalState(): void {
        // Update row view ownership
        const oldMap: Map<number, DbRowView<RowType>> = this._idToRowMap;
        const newMap: Map<number, DbRowView<RowType>> = new Map();
        for (let i = 0; i < this._rowViews.length; i++) {
            const newRowView: DbRowView<RowType> = this._rowViews[i];
            newRowView.ownerAdd(this._containerId);
            newMap.set(newRowView.id, newRowView);
            oldMap.delete(newRowView.id);
        }
        // Anything left in the old map is no longer tracked by this table view
        for (const value of oldMap.values()) value.ownerRemove(this._containerId);
        this._idToRowMap = newMap;
    }
}
