/**
 * Shared view of the code output folder setting.
 *
 * The code_output_folder table has a single row that stores the path
 * where generated code files should be placed.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { codeOutputFolderTableView, getCodeOutputFolder } from '$lib/tables/code-output-folder';
 *
 *   let folderView = $derived(getCodeOutputFolder(codeOutputFolderTableView.rows));
 *   let folderPath = $derived(folderView?.data.value ?? null);
 * </script>
 * ```
 */

import type { CodeOutputFolder } from '@gamescript/shared';
import { all, TABLE_CODE_OUTPUT_FOLDER, type IDbTableView, type IDbRowView } from '$lib/db';
import { common } from '$lib/crud';

/** Shared view of the code output folder table. */
export const codeOutputFolderTableView: IDbTableView<CodeOutputFolder> = common.fetchTable(
    TABLE_CODE_OUTPUT_FOLDER,
    all(),
);

/**
 * Get the code output folder row view from the table view.
 * Returns undefined if the table is empty.
 */
export function getCodeOutputFolder(
    rows: IDbRowView<CodeOutputFolder>[],
): IDbRowView<CodeOutputFolder> | undefined {
    if (!rows || rows.length === 0) return undefined;
    return rows[0];
}
