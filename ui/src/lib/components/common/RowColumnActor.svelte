<script lang="ts">
    /**
     * Actor selection dropdown for a row column.
     *
     * Features:
     * - Two-way binding with row view
     * - Undo/redo support
     * - Loading state handling
     * - Uses shared actorsTable for actor list
     *
     * Ported from GameScriptElectron.
     */
    import { type IDbRowView } from '$lib/db';
    import type { Row } from '@gamescript/shared';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { actorsTable } from '$lib/tables/actors.js';
    import { common } from '$lib/crud';
    import Dropdown from './Dropdown.svelte';

    interface Props {
        rowView: IDbRowView<Row>;
        columnName: string;
    }

    let { rowView, columnName }: Props = $props();

    const isLoading = new IsLoadingStore();
    // svelte-ignore state_referenced_locally
    let boundValue: number = $state(rowView.data[columnName] as number);
    // svelte-ignore state_referenced_locally
    let currentValue: number = $state(rowView.data[columnName] as number);

    // Sync when external changes occur
    $effect(() => {
        const row = rowView.data;
        if (row[columnName] !== currentValue) {
            boundValue = row[columnName] as number;
            currentValue = row[columnName] as number;
        }
    });

    async function onActorSelected(value: string | number): Promise<void> {
        const newValue = typeof value === 'string' ? parseInt(value, 10) : value;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        boundValue = newValue;

        // Update row
        const oldRow = { ...rowView.getValue() };
        const newRow = { ...oldRow, [columnName]: newValue };
        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, 'actor selection change')
        );
        currentValue = newValue;
    }

    // Convert actors to Dropdown options format
    let actorOptions = $derived(actorsTable.rows.map(actorRowView => {
        return { value: actorRowView.id, label: actorRowView.data?.name ?? '' };
    }));
</script>

<Dropdown
    options={actorOptions}
    value={boundValue}
    disabled={$isLoading}
    onchange={onActorSelected}
/>
