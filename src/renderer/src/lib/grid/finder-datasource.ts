import type { IDatasource, IGetRowsParams, SortModelItem } from '@ag-grid-community/core';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
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
        console.log('add filters');
        // Create filter
        const offset: number = params.startRow;
        const limit: number = params.endRow - offset;
        const filterBuilder = createFilter().offset(offset).limit(limit);
        for (let i = 0; i < params.sortModel.length; i++) {
            const orderInfo: SortModelItem = params.sortModel[i];
            filterBuilder.orderBy(orderInfo.colId, orderInfo.sort);
        }
        const filter = filterBuilder.build();

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
