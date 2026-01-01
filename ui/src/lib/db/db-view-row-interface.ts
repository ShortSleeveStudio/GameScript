/**
 * Interface for row views using Svelte 5 runes.
 *
 * Usage:
 * ```svelte
 * <script lang="ts">
 *   let { rowView }: { rowView: IDbRowView<Node> } = $props();
 *   let name = $derived(rowView.data.name);
 * </script>
 * <span>{rowView.data.name}</span>
 * ```
 */

import type { Row } from '@gamescript/shared';
import type { TableType } from '$lib/db';

/** Interface for row views */
export interface IDbRowView<RowType extends Row> {
    /** Row ID */
    readonly id: number;
    /** Table ID (numeric identifier for quick lookups) */
    readonly tableId: number;
    /** Table name */
    readonly tableName: string;
    /** Table definition */
    readonly tableType: TableType;
    /** Whether this row view has been disposed */
    readonly isDisposed: boolean;

    /**
     * Reactive row data.
     * Read this property in $derived() or template to establish reactivity.
     */
    readonly data: RowType;

    /**
     * Get the current row value without establishing reactivity.
     * Use this for one-time reads or when you need a snapshot.
     */
    getValue(): RowType;
}
