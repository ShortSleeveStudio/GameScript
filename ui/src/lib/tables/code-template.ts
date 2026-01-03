/**
 * Shared view of the code template setting.
 *
 * The code_template table has a single row that stores the selected
 * code template type: 'unity' | 'godot' | 'unreal'.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { codeTemplateTableView, getCodeTemplate } from '$lib/tables/code-template';
 *
 *   let templateView = $derived(getCodeTemplate(codeTemplateTableView.rows));
 *   let templateValue = $derived(templateView?.data.value ?? 'unity');
 * </script>
 * ```
 */

import type { CodeTemplate } from '@gamescript/shared';
import { all, TABLE_CODE_TEMPLATE, type IDbTableView, type IDbRowView } from '$lib/db';
import { common } from '$lib/crud';

/** Shared view of the code template table. */
export const codeTemplateTableView: IDbTableView<CodeTemplate> = common.fetchTable(
    TABLE_CODE_TEMPLATE,
    all(),
);

/**
 * Get the code template row view from the table view.
 * Returns undefined if the table is empty.
 */
export function getCodeTemplate(
    rows: IDbRowView<CodeTemplate>[],
): IDbRowView<CodeTemplate> | undefined {
    if (!rows || rows.length === 0) return undefined;
    return rows[0];
}
