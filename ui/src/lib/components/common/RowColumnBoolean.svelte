<script lang="ts">
    /**
     * Checkbox for a boolean row column.
     *
     * Features:
     * - Two-way binding with row view
     * - Undo/redo support
     * - Loading state handling
     *
     * Ported from GameScriptElectron.
     */
    import { type IDbRowView } from '$lib/db';
    import type { Row } from '@gamescript/shared';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { common } from '$lib/crud';
    import Checkbox from './Checkbox.svelte';

    interface Props {
        rowView: IDbRowView<Row>;
        columnName: string;
        undoText: string;
        label?: string;
    }

    let { rowView, columnName, undoText, label = '' }: Props = $props();

    const isLoading = new IsLoadingStore();
    let checked = $derived(Boolean(rowView.data[columnName]));

    async function onCheck(newValue: boolean): Promise<void> {
        const oldValue = Boolean(rowView.data[columnName]);
        if (oldValue === newValue) return;

        // Update row
        const oldRow = { ...rowView.getValue() };
        const newRow = { ...oldRow, [columnName]: newValue };
        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, `${undoText} change`)
        );
    }
</script>

<Checkbox
    {checked}
    {label}
    disabled={$isLoading}
    onchange={onCheck}
/>
