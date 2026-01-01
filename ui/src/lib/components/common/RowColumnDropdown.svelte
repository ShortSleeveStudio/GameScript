<script lang="ts">
    /**
     * Dropdown select for a row column.
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
    import Dropdown from './Dropdown.svelte';

    interface Props {
        rowView: IDbRowView<Row>;
        columnName: string;
        undoText: string;
        isDisabled?: boolean;
        items: { id: number | string; text: string }[];
    }

    let { rowView, columnName, undoText, isDisabled = false, items }: Props = $props();

    const isLoading = new IsLoadingStore();
    // svelte-ignore state_referenced_locally
    let boundValue: number | string = $state(rowView.data[columnName] as number | string);
    // svelte-ignore state_referenced_locally
    let currentValue: number | string = $state(rowView.data[columnName] as number | string);

    // Sync when external changes occur
    $effect(() => {
        const row = rowView.data;
        if (row[columnName] !== currentValue) {
            boundValue = row[columnName] as number | string;
            currentValue = row[columnName] as number | string;
        }
    });

    async function onSelect(newValue: string | number): Promise<void> {
        const oldValue = currentValue;

        if (oldValue === newValue) return;

        boundValue = newValue;

        // Update column
        const oldRow = { ...rowView.getValue() };
        const newRow = { ...oldRow, [columnName]: newValue };
        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, `${undoText} changed`)
        );
        currentValue = newValue;
    }

    // Convert items to Dropdown options format
    let dropdownOptions = $derived(items.map(item => ({ value: item.id, label: item.text })));
</script>

<Dropdown
    options={dropdownOptions}
    value={boundValue}
    disabled={isDisabled || $isLoading}
    onchange={onSelect}
/>
