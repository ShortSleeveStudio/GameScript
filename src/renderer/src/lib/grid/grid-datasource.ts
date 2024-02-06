import type {
    ICombinedSimpleModel,
    IDatasource,
    IGetRowsParams,
    ISimpleFilterModel,
    JoinOperator,
    NumberFilterModel,
    ProvidedFilterModel,
    SortModelItem,
    TextFilterModel,
} from '@ag-grid-community/core';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import type {
    Filter,
    WhereAndOrCloseScopeEnd,
    WhereColumnOrOpenScope,
    WherePredicate,
} from '@lib/api/db/db-filter-interface';
import { type DatabaseTableId, type Row } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
import { get, type Unsubscriber } from 'svelte/store';
import type { GridContext } from './grid-context';

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
        // console.log('FILTER: ' + filter.toString());

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

        // Create update handler
        const updateHandler = (rowViews: IDbRowView<RowType>[], argumentRequestIndex?: number) => {
            const currentIndex: number =
                argumentRequestIndex === undefined ? capturedRequestIndex : argumentRequestIndex;
            const request: RowsRequest = this._requests[currentIndex];

            // Update from backend
            if (request === undefined) {
                // Backend update
                // console.log('BACKEND UPDATE');
                this._refreshRequested = true;
                this._context.getGridApi().refreshInfiniteCache();
            }
            // Skip subscription update
            else if (!request.isSubscribeUpdateCalled && rowViews.length === 0) {
                request.isSubscribeUpdateCalled = true;
                return;
            }
            // Update from frontend
            else {
                const sliceStart: number = request.startRow - this._currentOffset;
                const sliceEnd: number = request.endRow - this._currentOffset;
                // console.log(
                //     `FRONTEND UPDATE START[${request.startRow}] END[${request.endRow}] ROWCOUNT[${this._tableView.rowCount}]`,
                // );
                request.successCallback(
                    rowViews.slice(sliceStart, sliceEnd),
                    this._tableView.rowCount,
                );
                // Destroy old table now that the new one exists (any sooner and rows are destroyed)
                if (request.oldTable) db.releaseTable(request.oldTable);
                this._context.getGridApi().autoSizeAllColumns();
                this._requests[currentIndex] = undefined;
                this.attemptPurgeRequests();
            }
        };

        // Recreate table
        if (this._tableView) {
            if (this._refreshRequested) {
                // console.log('REFRESH');
                this._refreshRequested = false;
                updateHandler(get(this._tableView), capturedRequestIndex);
                return;
            } else {
                // Store old table to destroy
                this._tableViewUnsubscriber();
                currentRequest.oldTable = this._tableView;
            }
        }
        // console.log('CREATE TABLE');
        currentRequest.isSubscribeUpdateCalled = false;
        this._tableView = db.fetchTable<RowType>(this._tableId, filter);
        this._tableViewUnsubscriber = this._tableView.subscribe(updateHandler);
    }

    /** Optional destroy method, if your datasource has state it needs to clean up. */
    destroy(): void {
        this._context = undefined;
        if (this._tableViewUnsubscriber) this._tableViewUnsubscriber();
        if (this._tableView) db.releaseTable(this._tableView);
    }

    private buildFilter(params: IGetRowsParams): Filter<RowType> {
        let filter: Filter<RowType>;
        // Filter - limit / offset
        const filterBuilder = createFilter().offset(this._currentOffset).limit(this._currentLimit);

        // Filter - sort
        for (let i = 0; i < params.sortModel.length; i++) {
            const orderInfo: SortModelItem = params.sortModel[i];
            filterBuilder.orderBy(orderInfo.colId, orderInfo.sort);
        }

        // Filter - where clause
        const filterColumns: string[] = Object.keys(params.filterModel);
        if (filterColumns.length > 0) {
            let whereBuilder: WhereColumnOrOpenScope<RowType> = filterBuilder.where();
            for (let i = 0; i < filterColumns.length; i++) {
                const column: string = filterColumns[i];
                const filterModel: ProvidedFilterModel = params.filterModel[column];

                // Check if this requires a join
                let filters: ISimpleFilterModel[];
                let joinOperator: JoinOperator;
                if ('conditions' in filterModel) {
                    const combinedModel = filterModel as ICombinedSimpleModel<
                        TextFilterModel | NumberFilterModel
                    >;
                    joinOperator = combinedModel.operator;
                    filters = combinedModel.conditions;
                } else {
                    filters = [filterModel];
                }

                // Iterate over all filters for this column
                let whereAndOrClose: WhereAndOrCloseScopeEnd<RowType>;
                for (let j = 0; j < filters.length; j++) {
                    const wherePredicate: WherePredicate<RowType> = whereBuilder.column(column);
                    switch (filterModel.filterType) {
                        case 'text': {
                            whereAndOrClose = this.handleTextFilter(
                                wherePredicate,
                                <TextFilterModel>filters[j],
                            );
                            break;
                        }
                        case 'number': {
                            whereAndOrClose = this.handleNumberFilter(
                                wherePredicate,
                                <NumberFilterModel>filters[j],
                            );
                            break;
                        }
                        default:
                            throw new Error(`Unknown filter type: ${filterModel.filterType}`);
                    }
                    if (j !== filters.length - 1) {
                        switch (joinOperator) {
                            case 'AND':
                                whereBuilder = whereAndOrClose.and();
                                break;
                            case 'OR':
                                whereBuilder = whereAndOrClose.or();
                                break;
                        }
                    }
                }

                // If this isn't the last column, add an 'AND'
                // If this is the last column, end the where clause
                if (i !== filterColumns.length - 1) {
                    whereBuilder = whereAndOrClose.and();
                } else {
                    filter = whereAndOrClose.endWhere().build();
                }
            }
        } else {
            filter = filterBuilder.build();
        }
        return filter;
    }

    private handleTextFilter(
        whereBuilder: WherePredicate<RowType>,
        textFilterModel: TextFilterModel,
    ): WhereAndOrCloseScopeEnd<RowType> {
        switch (textFilterModel.type) {
            case 'equals':
                return whereBuilder.eq(textFilterModel.filter);
            case 'notEqual':
                return whereBuilder.ne(textFilterModel.filter);
            case 'contains':
                return whereBuilder.like(`%${textFilterModel.filter}%`);
            case 'notContains':
                return whereBuilder.notLike(`%${textFilterModel.filter}%`);
            case 'startsWith':
                return whereBuilder.like(`${textFilterModel.filter}%`);
            case 'endsWith':
                return whereBuilder.like(`%${textFilterModel.filter}`);
            default:
                throw new Error(`Unknown filter operation: ${textFilterModel.type}`);
        }
    }

    private handleNumberFilter(
        whereBuilder: WherePredicate<RowType>,
        numberFilterModel: NumberFilterModel,
    ): WhereAndOrCloseScopeEnd<RowType> {
        switch (numberFilterModel.type) {
            case 'equals':
                return whereBuilder.eq(numberFilterModel.filter);
            case 'notEqual':
                return whereBuilder.ne(numberFilterModel.filter);
            case 'lessThan':
                return whereBuilder.lt(numberFilterModel.filter);
            case 'lessThanOrEqual':
                return whereBuilder.lte(numberFilterModel.filter);
            case 'greaterThan':
                return whereBuilder.gt(numberFilterModel.filter);
            case 'greaterThanOrEqual':
                return whereBuilder.gte(numberFilterModel.filter);
            default:
                throw new Error(`Unknown filter operation: ${numberFilterModel.type}`);
        }
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
