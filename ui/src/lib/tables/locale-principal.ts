/**
 * Shared view of the locale principal (selected/current locale).
 *
 * The locale_principal table has a single row that tracks which locale
 * is currently selected as the "principal" (primary) locale for editing.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { localePrincipalTableView, getLocalePrincipal } from '$lib/tables/locale-principal';
 *
 *   $: localePrincipalView = getLocalePrincipal($localePrincipalTableView);
 *   $: principalLocaleId = $localePrincipalView?.principal;
 * </script>
 * ```
 */

import type { LocalePrincipal } from '@gamescript/shared';
import { all, TABLE_LOCALE_PRINCIPAL, type IDbTableView, type IDbRowView } from '$lib/db';
import { common } from '$lib/crud';

/** Shared view of the principal locale table. */
export const localePrincipalTableView: IDbTableView<LocalePrincipal> = common.fetchTable(
    TABLE_LOCALE_PRINCIPAL,
    all(),
);

/**
 * Get the locale principal row view from the table view.
 * Returns undefined if the table is empty or has more than one row.
 */
export function getLocalePrincipal(
    localePrincipals: IDbRowView<LocalePrincipal>[],
): IDbRowView<LocalePrincipal> | undefined {
    if (!localePrincipals || localePrincipals.length !== 1) return undefined;
    return localePrincipals[0];
}
