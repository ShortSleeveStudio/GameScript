/**
 * Shared view of the snapshot output path setting.
 *
 * The snapshot_output_path table has a single row that stores the path
 * where exported snapshot files (.gsb) should be placed.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { snapshotOutputPathTableView, getSnapshotOutputPath } from '$lib/tables/snapshot-output-path';
 *
 *   let pathView = $derived(getSnapshotOutputPath(snapshotOutputPathTableView.rows));
 *   let snapshotPath = $derived(pathView?.data.value ?? null);
 * </script>
 * ```
 */

import type { SnapshotOutputPath } from '@gamescript/shared';
import { all, TABLE_SNAPSHOT_OUTPUT_PATH, type IDbTableView, type IDbRowView } from '$lib/db';
import { common } from '$lib/crud';

/** Shared view of the snapshot output path table. */
export const snapshotOutputPathTableView: IDbTableView<SnapshotOutputPath> = common.fetchTable(
    TABLE_SNAPSHOT_OUTPUT_PATH,
    all(),
);

/**
 * Get the snapshot output path row view from the table view.
 * Returns undefined if the table is empty.
 */
export function getSnapshotOutputPath(
    rows: IDbRowView<SnapshotOutputPath>[],
): IDbRowView<SnapshotOutputPath> | undefined {
    if (!rows || rows.length === 0) return undefined;
    return rows[0];
}
