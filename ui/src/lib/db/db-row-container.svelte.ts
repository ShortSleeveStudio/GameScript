/**
 * DbRowContainer - Container for managing row views.
 *
 * This container loads and unloads row views, updating their ownership
 * as appropriate. It maintains a mapping from row IDs to row views
 * and handles the lifecycle of row views.
 */

import type { Row, QueryFilter } from '@gamescript/shared';
import type { TableType } from '$lib/db';
import type { DbRowView } from './db-view-row.svelte.js';
import type { IDbRowView } from './db-view-row-interface.js';

/**
 * Interface for the database operations needed by DbRowContainer.
 * This avoids a circular import with db.ts.
 */
export interface DbRowContainerFetcher<RowType extends Row> {
    count(tableType: TableType, filter: QueryFilter<RowType>): Promise<number>;
    fetchRows(tableType: TableType, filter: QueryFilter<RowType>): Promise<IDbRowView<RowType>[]>;
}

/**
 * Result of a reload operation
 */
export interface ReloadResult<RowType extends Row> {
    rowViews: IDbRowView<RowType>[];
    totalCount: number;
}

/**
 * A container for row views. It loads them and unloads them,
 * updating their ownership as appropriate.
 */
export class DbRowContainer<RowType extends Row> {
    private static nextId = 0;

    readonly containerId: number;
    readonly tableType: TableType;
    readonly tableName: string;
    readonly filter: QueryFilter<RowType>;

    #idToRowMap: Map<number, DbRowView<RowType>>;
    #rowViews: DbRowView<RowType>[];
    #totalRowCount: number;
    #fetcher: DbRowContainerFetcher<RowType>;

    constructor(
        tableType: TableType,
        filter: QueryFilter<RowType>,
        fetcher: DbRowContainerFetcher<RowType>
    ) {
        this.containerId = DbRowContainer.nextId++;
        this.tableType = tableType;
        this.tableName = tableType.name;
        this.filter = filter;
        this.#idToRowMap = new Map();
        this.#totalRowCount = 0;
        this.#rowViews = [];
        this.#fetcher = fetcher;
    }

    get totalRowCount(): number {
        return this.#totalRowCount;
    }

    get rowViews(): IDbRowView<RowType>[] {
        return this.#rowViews;
    }

    getRowViewById(id: number): IDbRowView<RowType> | undefined {
        return this.#idToRowMap.get(id);
    }

    getRowViewsById(ids: number[]): IDbRowView<RowType>[] {
        const rows: IDbRowView<RowType>[] = [];
        for (const id of ids) {
            const rowView = this.#idToRowMap.get(id);
            if (rowView) rows.push(rowView);
        }
        return rows;
    }

    getRowById(id: number): RowType | undefined {
        const rowView = this.#idToRowMap.get(id);
        return rowView?.getValue();
    }

    getRowsById(ids: number[]): RowType[] {
        const rows: RowType[] = [];
        for (const id of ids) {
            const rowView = this.#idToRowMap.get(id);
            if (rowView) rows.push(rowView.getValue());
        }
        return rows;
    }

    /**
     * Reload all rows from the database matching the filter.
     * Returns the new row views and total count.
     */
    async reload(): Promise<ReloadResult<RowType>> {
        const newRowCount = await this.#fetcher.count(this.tableType, this.filter);
        const newRowViews = await this.#fetcher.fetchRows(this.tableType, this.filter);

        this.#totalRowCount = newRowCount;
        this.#rowViews = newRowViews as DbRowView<RowType>[];
        this.#updateInternalState();

        return {
            rowViews: this.#rowViews,
            totalCount: newRowCount,
        };
    }

    /**
     * Clear all row views from this container.
     */
    clear(): ReloadResult<RowType> {
        this.#totalRowCount = 0;
        this.#rowViews = [];
        this.#updateInternalState();

        return {
            rowViews: [],
            totalCount: 0,
        };
    }

    /**
     * Update the internal mapping and ownership tracking.
     */
    #updateInternalState(): void {
        const oldMap = this.#idToRowMap;
        const newMap = new Map<number, DbRowView<RowType>>();

        // Add ownership for new rows
        for (const newRowView of this.#rowViews) {
            newRowView.ownerAdd(this.containerId);
            newMap.set(newRowView.id, newRowView);
            oldMap.delete(newRowView.id);
        }

        // Remove ownership from rows no longer in this container
        for (const oldRowView of oldMap.values()) {
            oldRowView.ownerRemove(this.containerId);
        }

        this.#idToRowMap = newMap;
    }
}
