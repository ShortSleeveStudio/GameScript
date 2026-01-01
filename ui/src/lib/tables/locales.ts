/**
 * Shared view of the locales table.
 *
 * This singleton provides a reactive view of all locales, ordered by ID.
 * Used by localization-related components.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { localesTable } from '$lib/tables/locales';
 *
 *   // Subscribe to locales
 *   $: locales = $localesTable;
 * </script>
 *
 * {#each $localesTable as localeRowView (localeRowView.id)}
 *   <option value={localeRowView.id}>{$localeRowView.name}</option>
 * {/each}
 * ```
 */

import type { Locale } from '@gamescript/shared';
import { query, TABLE_LOCALES, type IDbTableView } from '$lib/db';
import { common } from '$lib/crud';

/** Shared view of all locales, ordered by ID ascending. */
export const localesTable: IDbTableView<Locale> = common.fetchTable(
    TABLE_LOCALES,
    query<Locale>().orderBy('id', 'ASC').build(),
);
