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
import { TABLE_ID_CONVERSATIONS, type Conversation } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
import { type Unsubscriber } from 'svelte/store';
import type { FinderContext } from './finder-context';

export class FinderDatasource implements IDatasource {
    private _firstLoad: boolean;
    private _context: FinderContext;
    private _tableView: IDbTableView<Conversation> | undefined;
    private _unsubscriber: Unsubscriber;
    private _loadedCallback: (rowsThisBlock: unknown[], lastRow?: number) => void;
    private _failCallback: () => void;

    /** If you know up front how many rows are in the dataset, set it here. Otherwise leave blank. */
    // get rowCount(): number {
    //     if (!this._tableView) return 0;
    //     const length: number = get(this._tableView).length;
    //     console.log(length);
    //     return length;
    // }

    /** Callback the grid calls that you implement to fetch rows from the server. */
    getRows(params: IGetRowsParams): void {
        // Filter - limit / offset
        let filter: Filter<Conversation>;
        const offset: number = params.startRow;
        const limit: number = params.endRow - offset;
        const filterBuilder = createFilter().offset(offset).limit(limit);

        // Filter - sort
        for (let i = 0; i < params.sortModel.length; i++) {
            const orderInfo: SortModelItem = params.sortModel[i];
            filterBuilder.orderBy(orderInfo.colId, orderInfo.sort);
        }

        // Filter - where clause
        const filterColumns: string[] = Object.keys(params.filterModel);
        if (filterColumns.length > 0) {
            let whereBuilder: WhereColumnOrOpenScope<Conversation> = filterBuilder.where();
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
                let whereAndOrClose: WhereAndOrCloseScopeEnd<Conversation>;
                for (let j = 0; j < filters.length; j++) {
                    const wherePredicate: WherePredicate<Conversation> =
                        whereBuilder.column(column);
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
        console.log(filter.toString());

        // Set context
        if (!this._context) this._context = <FinderContext>params.context;

        // Set callback
        if (this._loadedCallback !== undefined) this._failCallback();
        this._loadedCallback = params.successCallback;
        this._failCallback = params.failCallback;

        // Create or update table view
        if (!this._tableView) {
            console.log('SETTING TABLE');
            this._firstLoad = true; // order matters, this must come before the table set
            this._tableView = db.fetchTable<Conversation>(TABLE_ID_CONVERSATIONS, filter);
            this._unsubscriber = this._tableView.subscribe(this.onTableChanged);
        } else {
            console.log('SETTING FILTER');
            // Update the filter
            this._tableView.filter = filter;
        }
    }

    private handleTextFilter(
        whereBuilder: WherePredicate<Conversation>,
        textFilterModel: TextFilterModel,
    ): WhereAndOrCloseScopeEnd<Conversation> {
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
        whereBuilder: WherePredicate<Conversation>,
        numberFilterModel: NumberFilterModel,
    ): WhereAndOrCloseScopeEnd<Conversation> {
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

    /** Optional destroy method, if your datasource has state it needs to clean up. */
    destroy(): void {
        this.cleanup();
    }

    private onTableChanged: (rowViews: IDbRowView<Conversation>[]) => void = (
        rowViews: IDbRowView<Conversation>[],
    ) => {
        // Ignore the first call, always in response to subscription, unless there's data
        if (this._firstLoad) {
            console.log('FIRST LOAD');
            this._firstLoad = false;
            if (rowViews.length === 0) {
                console.log('SKIPPING FIRST CALLBACK');
                return;
            }
        }

        // Second call will almost always represent the data loading in, so we call the callback
        // Subsequent calls will be updates and require the cache to be refreshed
        if (this._loadedCallback) {
            console.log('CALLING CALLBACK');
            // This is the initial response from table creation
            const limit: number = this._tableView.filter.getLimit();
            const offset: number = this._tableView.filter.getOffset();
            const rowCount: number = rowViews.length;
            // We've reached the end of the table
            if (limit !== rowCount) {
                const lastRow: number = offset + (limit - (limit - rowCount));
                this._loadedCallback(rowViews, lastRow);
            } else {
                this._loadedCallback(rowViews);
            }
            this._loadedCallback = undefined;
        } else {
            // This is not the initial response from table creation,
            // dump the cache and reload the table
            console.log('CALLING REFRESH');
            this._context.getGridApi().refreshInfiniteCache();
        }
        this._context.getGridApi().autoSizeAllColumns();
    };

    private cleanup(): void {
        this._context = undefined;
        if (this._unsubscriber) this._unsubscriber();
        if (this._tableView) db.releaseTable(this._tableView);
    }
}
