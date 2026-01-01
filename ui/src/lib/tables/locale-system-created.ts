/**
 * Shared view of the system-created locale (English).
 *
 * This singleton provides reactive access to the default locale,
 * which is created during database initialization and marked as system-created.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { systemCreatedLocaleTableView, getSystemCreatedLocale } from '$lib/tables/locale-system-created';
 *
 *   // Access the default locale reactively
 *   $: systemCreatedLocale = getSystemCreatedLocale($systemCreatedLocaleTableView);
 *   $: defaultLocaleName = $systemCreatedLocale?.name;
 * </script>
 * ```
 */

import type { Locale } from '@gamescript/shared';
import { query, TABLE_LOCALES, type IDbTableView, type IDbRowView } from '$lib/db';
import { common } from '$lib/crud';

/** Table view filtered to system-created locales (should be exactly one). */
export const systemCreatedLocaleTableView: IDbTableView<Locale> = common.fetchTable(
    TABLE_LOCALES,
    query<Locale>().where('is_system_created').eq(true).build(),
);

/**
 * Get the system-created locale row view from the table view.
 * Returns undefined if the table is empty or has more than one row.
 */
export function getSystemCreatedLocale(
    locales: IDbRowView<Locale>[],
): IDbRowView<Locale> | undefined {
    if (!locales || locales.length !== 1) return undefined;
    return locales[0];
}
