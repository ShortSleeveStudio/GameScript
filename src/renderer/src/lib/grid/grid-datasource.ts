import type { IDatasource, IGetRowsParams, SortModelItem } from '@ag-grid-community/core';
import { type Row } from '@common/common-schema';
import type { DatabaseTableType } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import type { Filter } from '@lib/api/db/db-filter-interface';
import { DbRowViewContainer } from '@lib/api/db/db-row-container';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
import { type Unsubscriber } from 'svelte/store';
import type { GridContext } from './grid-context';
import { datasourceFilterWhere } from './grid-datasource-helpers';

interface CacheBlock {
    blockNumber: number;
    startRow: number;
    endRow: number;
    pageStatus: string;
}

export class GridDatasource<RowType extends Row> implements IDatasource {
    private _tableType: DatabaseTableType;
    private _context: GridContext;

    private _firstLoadHappened: boolean;
    private _offsetToRows: Map<number, DbRowViewContainer<RowType>>;
    private _tableView: IDbTableView<RowType>;
    private _tableViewUnsubscriber: Unsubscriber;

    constructor(tableType: DatabaseTableType) {
        this._tableType = tableType;
        this._offsetToRows = new Map();
        this._tableView = db.fetchTable(this._tableType, createFilter<RowType>().limit(0).build());
        this._tableViewUnsubscriber = this._tableView.subscribe(this.onTableUpdated);
    }

    private onTableUpdated: () => void = () => {
        if (!this._tableView.isInitialized) return;
        if (!this._firstLoadHappened) {
            this._firstLoadHappened = true;
            return;
        }
        this._context.getGridApi().refreshInfiniteCache();
    };

    private async getRowsAsync(params: IGetRowsParams): Promise<void> {
        // Build filter
        const filter: Filter<RowType> = this.buildFilter(params);

        // Purge dead rows
        this.purgeDeadCacheBlocks();

        // Create row container
        const newContainer: DbRowViewContainer<RowType> = new DbRowViewContainer<RowType>(
            this._tableType,
            filter,
        );
        this._offsetToRows.set(params.startRow, newContainer);

        try {
            // Load rows
            await newContainer.reload();
            params.successCallback(newContainer.rowViews, newContainer.totalRowCount);

            // Update column sizes
            this._context.getGridApi().autoSizeAllColumns();
        } catch (err) {
            // Dispose on failure
            params.failCallback();
            newContainer.dispose();
            throw err;
        }
    }

    /** Callback the grid calls that you implement to fetch rows from the server. */
    getRows(params: IGetRowsParams): void {
        // Set context
        if (!this._context) this._context = <GridContext>params.context;

        // Get rows
        this.getRowsAsync(params);
    }

    /** Optional destroy method, if your datasource has state it needs to clean up. */
    destroy(): void {
        this._context = undefined;
        for (const value of this._offsetToRows.values()) value.dispose();
        this._offsetToRows.clear();
        if (this._tableViewUnsubscriber) this._tableViewUnsubscriber();
        if (this._tableView) db.releaseTable(this._tableView);
    }

    private buildFilter(params: IGetRowsParams): Filter<RowType> {
        // Filter - limit / offset
        const filterBuilder = createFilter()
            .offset(params.startRow)
            .limit(params.endRow - params.startRow);

        // Filter - sort
        for (let i = 0; i < params.sortModel.length; i++) {
            const orderInfo: SortModelItem = params.sortModel[i];
            filterBuilder.orderBy(orderInfo.colId, orderInfo.sort);
        }

        // Filter - where clause
        return datasourceFilterWhere(filterBuilder, params.filterModel);
    }

    private purgeDeadCacheBlocks(): void {
        const cacheBlocks: unknown = this._context.getGridApi().getCacheBlockState();
        const oldMap: Map<number, DbRowViewContainer<RowType>> = this._offsetToRows;
        const newMap: Map<number, DbRowViewContainer<RowType>> = new Map();
        for (const property in <object>cacheBlocks) {
            const cacheBlock: CacheBlock = cacheBlocks[property];
            const container: DbRowViewContainer<RowType> = oldMap.get(cacheBlock.startRow);
            if (container) {
                oldMap.delete(cacheBlock.startRow);
                newMap.set(cacheBlock.startRow, container);
            }
        }
        // Anything left in the old map is no longer tracked by this table view
        for (const value of oldMap.values()) {
            value.dispose();
        }
        this._offsetToRows = newMap;
    }
}
