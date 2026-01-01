/**
 * DbTableView - Reactive view of a filtered set of database rows.
 *
 * Provides a reactive .rows property that contains an array of IDbRowView objects.
 * When the underlying data changes, the reactive state is updated and all
 * components reading tableView.rows automatically re-render.
 *
 * Usage:
 * - Access rows via .rows property
 * - Works naturally with $derived and $effect
 * - No manual subscription management needed
 */

import type { Row, QueryFilter } from '@gamescript/shared';
import type { Readable } from 'svelte/store';
import { get } from 'svelte/store';
import type { TableType } from '$lib/db';
import { DbRowContainer, type DbRowContainerFetcher } from './db-row-container.svelte.js';
import type { IDbRowView } from './db-view-row-interface.js';
import type { IDbTableView } from './db-view-table-interface.js';

export class DbTableView<RowType extends Row> implements IDbTableView<RowType> {
    readonly tableType: TableType;
    readonly tableName: string;
    readonly filter: QueryFilter<RowType>;

    // Reactive state using $state rune
    #rows: IDbRowView<RowType>[] = $state([]);
    #totalRowCount: number = $state(0);
    #isInitialized: boolean = $state(false);
    #isDisposed: boolean = $state(false);

    // Non-reactive internal state
    #container: DbRowContainer<RowType>;
    #isConnected: Readable<boolean>;

    constructor(
        tableType: TableType,
        filter: QueryFilter<RowType>,
        isConnected: Readable<boolean>,
        fetcher: DbRowContainerFetcher<RowType>,
    ) {
        this.tableType = tableType;
        this.tableName = tableType.name;
        this.filter = filter;
        this.#isConnected = isConnected;
        this.#container = new DbRowContainer(tableType, filter, fetcher);

        // Trigger initial load
        void this._onReloadRequired();
    }

    /** Unique view ID for this table view instance */
    get viewId(): number {
        return this.#container.containerId;
    }

    /** Whether the initial load has completed */
    get isInitialized(): boolean {
        return this.#isInitialized;
    }

    /** Total count of rows matching the filter */
    get totalRowCount(): number {
        return this.#totalRowCount;
    }

    /**
     * Reactive array of row views.
     * Reading this in a $derived, $effect, or template establishes reactivity.
     */
    get rows(): IDbRowView<RowType>[] {
        return this.#rows;
    }

    /** Get a row view by ID */
    getRowViewById(id: number): IDbRowView<RowType> | undefined {
        return this.#container.getRowViewById(id);
    }

    /** Get multiple row views by ID */
    getRowViewsById(ids: number[]): IDbRowView<RowType>[] {
        return this.#container.getRowViewsById(ids);
    }

    /** Get raw row data by ID */
    getRowById(id: number): RowType | undefined {
        return this.#container.getRowById(id);
    }

    /** Get multiple raw rows by ID */
    getRowsById(ids: number[]): RowType[] {
        return this.#container.getRowsById(ids);
    }

    /**
     * Dispose of this table view, releasing all row views.
     * @internal
     */
    dispose(): void {
        this.#container.clear();
        this.#isDisposed = true;
        this.#isInitialized = false;
        this.#rows = [];
        this.#totalRowCount = 0;
    }

    /**
     * Reload all rows from the database.
     * Called when the database connection changes or data is modified.
     * @internal
     */
    async _onReloadRequired(): Promise<void> {
        if (this.#isDisposed) return;

        if (!get(this.#isConnected)) {
            // Clear if we're not connected
            const result = this.#container.clear();
            this.#rows = result.rowViews;
            this.#totalRowCount = result.totalCount;
            return;
        }

        const result = await this.#container.reload();
        this.#rows = result.rowViews;
        this.#totalRowCount = result.totalCount;
        this.#isInitialized = true;
    }
}
