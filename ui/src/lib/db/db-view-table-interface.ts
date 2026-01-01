/**
 * Interface for table views using Svelte 5 runes.
 *
 * Usage:
 * ```svelte
 * <script lang="ts">
 *   let { tableView }: { tableView: IDbTableView<Actor> } = $props();
 * </script>
 * {#each tableView.rows as actorView (actorView.id)}
 *   <div>{actorView.data.name}</div>
 * {/each}
 * ```
 */

import type { Row, QueryFilter } from '@gamescript/shared';
import type { TableType } from '$lib/db';
import type { IDbRowView } from './db-view-row-interface.js';

/** Interface for table views */
export interface IDbTableView<RowType extends Row> {
    /** Unique view ID for this table view instance */
    readonly viewId: number;
    /** Table definition */
    readonly tableType: TableType;
    /** Table name */
    readonly tableName: string;
    /** The filter applied to this table view */
    readonly filter: QueryFilter<RowType>;
    /** Total count of rows matching the filter (may exceed rows.length if paginated) */
    readonly totalRowCount: number;
    /** Whether the initial load has completed */
    readonly isInitialized: boolean;

    /**
     * Reactive array of row views.
     * Read this property in $derived(), $effect(), or template to establish reactivity.
     */
    readonly rows: IDbRowView<RowType>[];

    /** Get a row view by ID, or undefined if not in this view */
    getRowViewById(id: number): IDbRowView<RowType> | undefined;
    /** Get multiple row views by ID (only returns those found in this view) */
    getRowViewsById(ids: number[]): IDbRowView<RowType>[];
    /** Get raw row data by ID, or undefined if not in this view */
    getRowById(id: number): RowType | undefined;
    /** Get multiple raw rows by ID (only returns those found in this view) */
    getRowsById(ids: number[]): RowType[];
}
