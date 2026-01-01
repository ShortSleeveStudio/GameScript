/**
 * AG-Grid IDatasource implementation with DbRowView integration.
 *
 * Features:
 * - Infinite scrolling with cache blocks
 * - Reactive cell updates via $effect.root
 * - Automatic cache block cleanup
 * - Filter/sort integration with query builder
 *
 * Ported from GameScriptElectron.
 */

import type { IDatasource, IGetRowsParams, SortModelItem } from '@ag-grid-community/core';
import type { Row, QueryFilter, QueryBuilder } from '@gamescript/shared';
import { query, type TableType, type IDbTableView } from '$lib/db';
import { common, DbRowContainer, getRowContainerFetcher } from '$lib/crud';
import type { GridContext } from './context.js';
import { datasourceFilterWhere } from './datasource-helpers.js';

// ============================================================================
// Types
// ============================================================================

interface CacheBlock {
    blockNumber: number;
    startRow: number;
    endRow: number;
    pageStatus: string;
}

// ============================================================================
// Implementation
// ============================================================================

export class GridDatasource<RowType extends Row> implements IDatasource {
    private _tableType: TableType;
    private _context: GridContext | undefined;
    private _firstLoadHappened: boolean = false;
    private _firstDataLoaded: boolean = false;
    private _offsetToRows: Map<number, DbRowContainer<RowType>>;
    private _tableView: IDbTableView<RowType>;
    private _effectCleanup: (() => void) | undefined;

    constructor(tableType: TableType) {
        this._tableType = tableType;
        this._offsetToRows = new Map();
        this._tableView = common.fetchTable(this._tableType, query<RowType>().limit(0).build());

        // Use $effect.root to react to table changes outside of component context
        this._effectCleanup = $effect.root(() => {
            $effect(() => {
                // Establish dependency on isInitialized and rows
                if (!this._tableView.isInitialized) return;
                void this._tableView.rows;

                // Skip the first load notification
                if (!this._firstLoadHappened) {
                    this._firstLoadHappened = true;
                    return;
                }

                // Refresh the grid's infinite cache when data changes
                this._context?.getGridApi().refreshInfiniteCache();
            });
        });
    }

    private async getRowsAsync(params: IGetRowsParams): Promise<void> {
        // Build filter
        const filter: QueryFilter<RowType> = this.buildFilter(params);

        // Purge dead rows
        this.purgeDeadCacheBlocks();

        // Create row container
        const newContainer = new DbRowContainer<RowType>(this._tableType, filter, getRowContainerFetcher<RowType>());
        this._offsetToRows.set(params.startRow, newContainer);

        try {
            // Load rows
            await newContainer.reload();
            params.successCallback(newContainer.rowViews, newContainer.totalRowCount);

            // Size columns to fit on first load only
            if (!this._firstDataLoaded) {
                this._firstDataLoaded = true;
                this._context?.getGridApi().sizeColumnsToFit();
            }
        } catch (err) {
            // Dispose on failure
            params.failCallback();
            newContainer.clear();
            throw err;
        }
    }

    /** Callback the grid calls that you implement to fetch rows from the server. */
    getRows(params: IGetRowsParams): void {
        // Set context
        if (!this._context) this._context = params.context as GridContext;

        // Get rows
        void this.getRowsAsync(params);
    }

    /** Optional destroy method, if your datasource has state it needs to clean up. */
    destroy(): void {
        this._context = undefined;
        for (const value of this._offsetToRows.values()) value.clear();
        this._offsetToRows.clear();
        if (this._effectCleanup) this._effectCleanup();
        if (this._tableView) common.releaseTable(this._tableView);
    }

    private buildFilter(params: IGetRowsParams): QueryFilter<RowType> {
        // Filter - limit / offset
        let filterBuilder: QueryBuilder<RowType> = query<RowType>()
            .offset(params.startRow)
            .limit(params.endRow - params.startRow);

        // Filter - sort
        for (let i = 0; i < params.sortModel.length; i++) {
            const orderInfo: SortModelItem = params.sortModel[i];
            filterBuilder = filterBuilder.orderBy(orderInfo.colId as keyof RowType, orderInfo.sort);
        }

        // Filter - where clause
        return datasourceFilterWhere(filterBuilder, params.filterModel);
    }

    private purgeDeadCacheBlocks(): void {
        const cacheBlocks = this._context?.getGridApi().getCacheBlockState() as
            | Record<string, CacheBlock>
            | undefined;

        if (!cacheBlocks) return;

        const oldMap = this._offsetToRows;
        const newMap = new Map<number, DbRowContainer<RowType>>();

        for (const property in cacheBlocks) {
            const cacheBlock: CacheBlock = cacheBlocks[property];
            const container = oldMap.get(cacheBlock.startRow);
            if (container) {
                oldMap.delete(cacheBlock.startRow);
                newMap.set(cacheBlock.startRow, container);
            }
        }

        // Anything left in the old map is no longer tracked by this table view
        for (const value of oldMap.values()) {
            value.clear();
        }

        this._offsetToRows = newMap;
    }
}
