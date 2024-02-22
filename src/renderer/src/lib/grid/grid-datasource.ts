import type { IDatasource, IGetRowsParams, SortModelItem } from '@ag-grid-community/core';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import type { Filter } from '@lib/api/db/db-filter-interface';
import { type DatabaseTableId, type Row } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
import { get, type Unsubscriber } from 'svelte/store';
import type { GridContext } from './grid-context';
import { datasourceFilterWhere } from './grid-datasource-helpers';

interface CacheBlock {
    blockNumber: number;
    startRow: number;
    endRow: number;
    pageStatus: string;
}

interface RowsRequest {
    failureCallback: () => void;
    successCallback: (rowsThisBlock: unknown[], lastRow?: number) => void;
    startRow: number;
    endRow: number;
    isSubscribeUpdateCalled: boolean;
    oldTable: IDbTableView<Row>;
    oldUnsubscriber: Unsubscriber;
}

// TODO: remove logging
export class GridDatasource<RowType extends Row> implements IDatasource {
    private _tableId: DatabaseTableId;
    private _context: GridContext;
    private _tableView: IDbTableView<RowType> | undefined;
    private _tableViewUnsubscriber: Unsubscriber;
    private _refreshRequested: boolean;
    private _currentLimit: number;
    private _currentOffset: number;
    private _requests: RowsRequest[];
    private _previousFilter: Filter<RowType>;

    constructor(tableId: DatabaseTableId) {
        this._tableId = tableId;
        this._refreshRequested = false;
        this._requests = [];
    }

    /** Callback the grid calls that you implement to fetch rows from the server. */
    getRows(params: IGetRowsParams): void {
        // Set context
        if (!this._context) this._context = <GridContext>params.context;

        // Update range
        this.updateRange(this._context.getGridApi().getCacheBlockState());

        // Build filter
        const filter: Filter<RowType> = this.buildFilter(params);

        // Store callback
        const capturedRequestIndex: number = this._requests.length;
        const currentRequest: RowsRequest = <RowsRequest>{
            startRow: params.startRow,
            endRow: params.endRow,
            failureCallback: params.failCallback,
            successCallback: params.successCallback,
            isSubscribeUpdateCalled: true,
        };
        this._requests.push(currentRequest);

        // Check if this is a refresh request
        // console.log(
        //     `${filter.toString()} ======== ${
        //         this._previousFilter ? this._previousFilter.toString() : 'null'
        //     }`,
        // );
        if (
            this._refreshRequested &&
            this._previousFilter &&
            filter.toString() === this._previousFilter.toString()
        ) {
            // console.log('REFRESH');
            this._refreshRequested = false;
            this.handleSuccess(get(this._tableView), capturedRequestIndex);
            return;
        }
        this._previousFilter = filter;

        // Create update handler
        const updateHandler: (rowViews: IDbRowView<RowType>[]) => void = (
            rowViews: IDbRowView<RowType>[],
        ) => {
            const currentIndex: number = capturedRequestIndex;
            const request: RowsRequest = this._requests[currentIndex];
            // console.log(`CALLBACK - current index ${currentIndex}`);

            // Update from backend
            if (request === undefined) {
                // Backend update
                // console.log(`BACKEND UPDATE for table ${this._tableView.viewId}`);
                this._refreshRequested = true;
                this._context.getGridApi().refreshInfiniteCache();
            }
            // Skip subscription update
            else if (!request.isSubscribeUpdateCalled) {
                // console.log('SUBSCRIPTION CALLBACK');
                if (rowViews.length !== 0) throw new Error('Subscription request was non-empty');
                request.isSubscribeUpdateCalled = true;
                return;
            }
            // Update from frontend
            else {
                // console.log('FRONTEND CALLBACK');
                this.handleSuccess(rowViews, currentIndex);
            }
        };

        if (this._tableView) {
            currentRequest.oldTable = this._tableView;
            currentRequest.oldUnsubscriber = this._tableViewUnsubscriber;
        }
        currentRequest.isSubscribeUpdateCalled = false;
        this._tableView = db.fetchTable<RowType>(this._tableId, filter);
        // console.log('CREATE TABLE: ' + filter.toString());
        // console.log(this._tableView);
        this._tableViewUnsubscriber = this._tableView.subscribe(updateHandler);
    }

    /** Optional destroy method, if your datasource has state it needs to clean up. */
    destroy(): void {
        this._context = undefined;
        if (this._tableViewUnsubscriber) this._tableViewUnsubscriber();
        if (this._tableView) db.releaseTable(this._tableView);
    }

    private handleSuccess(rowViews: IDbRowView<RowType>[], currentIndex: number): void {
        // Send back successful results
        const request: RowsRequest = this._requests[currentIndex];
        const sliceStart: number = request.startRow - this._currentOffset;
        const sliceEnd: number = request.endRow - this._currentOffset;
        request.successCallback(rowViews.slice(sliceStart, sliceEnd), this._tableView.rowCount);

        // Destroy old table now that the new one exists (any sooner and rows are destroyed)
        if (request.oldUnsubscriber) request.oldUnsubscriber();
        if (request.oldTable) {
            // console.log('DELETE TABLE: ');
            // console.log(request.oldTable);
            db.releaseTable(request.oldTable);
        }

        // Update column sizes
        this._context.getGridApi().autoSizeAllColumns();

        this._requests[currentIndex] = undefined;
        this.attemptPurgeRequests();
    }

    private buildFilter(params: IGetRowsParams): Filter<RowType> {
        // Filter - limit / offset
        const filterBuilder = createFilter().offset(this._currentOffset).limit(this._currentLimit);

        // Filter - sort
        for (let i = 0; i < params.sortModel.length; i++) {
            const orderInfo: SortModelItem = params.sortModel[i];
            filterBuilder.orderBy(orderInfo.colId, orderInfo.sort);
        }

        // Filter - where clause
        return datasourceFilterWhere(filterBuilder, params.filterModel);
    }

    private updateRange(cacheBlocks: unknown): void {
        let minRow: number = -1;
        let maxRow: number = -1;
        for (const property in <object>cacheBlocks) {
            const cacheBlock: CacheBlock = cacheBlocks[property];
            if (minRow === -1 || maxRow === -1) {
                minRow = cacheBlock.startRow;
                maxRow = cacheBlock.endRow;
                continue;
            }
            minRow = Math.min(minRow, cacheBlock.startRow);
            maxRow = Math.max(maxRow, cacheBlock.endRow);
        }
        this._currentOffset = minRow;
        this._currentLimit = maxRow - minRow;
    }

    private attemptPurgeRequests: () => void = () => {
        let allRequestsFinished: boolean = true;
        for (let i = 0; i < this._requests.length; i++) {
            if (this._requests[i] !== undefined) {
                allRequestsFinished = false;
                break;
            }
        }
        if (allRequestsFinished) this._requests.length = 0;
    };
}
