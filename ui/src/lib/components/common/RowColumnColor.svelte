<script lang="ts">
    /**
     * Color picker for a row column.
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

    interface Props {
        rowView: IDbRowView<Row>;
        columnName: string;
        undoText: string;
    }

    let { rowView, columnName, undoText }: Props = $props();

    const isLoading = new IsLoadingStore();
    // svelte-ignore state_referenced_locally
    let boundValue: string = $state(String(rowView.data[columnName] ?? '#808080'));
    // svelte-ignore state_referenced_locally
    let currentValue: string = $state(String(rowView.data[columnName] ?? '#808080'));

    // Sync when external changes occur
    $effect(() => {
        const row = rowView.data;
        if (row[columnName] !== currentValue) {
            boundValue = String(row[columnName] ?? '#808080');
            currentValue = String(row[columnName] ?? '#808080');
        }
    });

    async function onChange(): Promise<void> {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Update column
        const oldRow = { ...rowView.getValue() };
        const newRow = { ...oldRow, [columnName]: newValue };
        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, `${undoText} change`)
        );
        currentValue = newValue;
    }
</script>

<div class="row-column-color">
    <input
        type="color"
        disabled={$isLoading}
        bind:value={boundValue}
        onchange={onChange}
    />
    <span class="color-value">{boundValue}</span>
</div>

<style>
    .row-column-color {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    input[type='color'] {
        width: 32px;
        height: 24px;
        padding: 0;
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
        cursor: pointer;
        background: none;
    }

    input[type='color']::-webkit-color-swatch-wrapper {
        padding: 2px;
    }

    input[type='color']::-webkit-color-swatch {
        border: none;
        border-radius: 2px;
    }

    input[type='color']:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .color-value {
        font-size: 0.75rem;
        font-family: monospace;
        color: var(--gs-fg-secondary);
    }
</style>
