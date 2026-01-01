/**
 * Shared view of the filters table.
 *
 * This singleton provides a reactive view of all filters, ordered by ID.
 * Used by ConversationFinder to dynamically add filter columns.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { filtersTable } from '$lib/tables/filters';
 *
 *   // Subscribe to filters
 *   $: filters = $filtersTable;
 * </script>
 *
 * {#each $filtersTable as filterRowView (filterRowView.id)}
 *   <span>{$filterRowView.name}</span>
 * {/each}
 * ```
 */

import type { Filter } from '@gamescript/shared';
import { query, TABLE_FILTERS, type IDbTableView } from '$lib/db';
import { common } from '$lib/crud';

/** Shared view of the filters table, ordered by ID ascending. */
export const filtersTable: IDbTableView<Filter> = common.fetchTable(
    TABLE_FILTERS,
    query<Filter>().orderBy('id', 'ASC').build(),
);
