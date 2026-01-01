<script lang="ts">
    /**
     * Number input for a row column.
     *
     * Features:
     * - Two-way binding with row view
     * - Undo/redo support
     * - Loading state handling
     * - Integer/decimal support
     *
     * Ported from GameScriptElectron.
     */
    import { type IDbRowView } from '$lib/db';
    import type { Row } from '@gamescript/shared';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { wasSavePressed } from '$lib/utils/keybinding.js';
    import { common } from '$lib/crud';

    interface Props {
        rowView: IDbRowView<Row>;
        undoText: string;
        columnName: string;
        isInteger?: boolean;
        min?: number | undefined;
        max?: number | undefined;
        step?: number | undefined;
    }

    let {
        rowView,
        undoText,
        columnName,
        isInteger = false,
        min = undefined,
        max = undefined,
        step = undefined,
    }: Props = $props();

    const isLoading = new IsLoadingStore();
    // svelte-ignore state_referenced_locally
    let boundValue: number = $state(Number(rowView.data[columnName]) || 0);
    // svelte-ignore state_referenced_locally
    let currentValue: number = $state(Number(rowView.data[columnName]) || 0);

    // Sync when external changes occur
    $effect(() => {
        const row = rowView.data;
        if (row[columnName] !== currentValue) {
            boundValue = Number(row[columnName]) || 0;
            currentValue = Number(row[columnName]) || 0;
        }
    });

    function onKeyUp(e: KeyboardEvent): void {
        if (wasSavePressed(e)) {
            (e.target as HTMLElement).blur();
        }
    }

    async function syncOnBlur(): Promise<void> {
        if (isInteger) boundValue = Math.round(boundValue);
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

<input
    class="row-column-number"
    type="number"
    disabled={$isLoading}
    onblur={syncOnBlur}
    onkeyup={onKeyUp}
    bind:value={boundValue}
    {min}
    {max}
    step={step ?? (isInteger ? 1 : 'any')}
/>

<style>
    .row-column-number {
        width: 100%;
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
        line-height: 1.25rem;
        background: var(--gs-bg-primary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
        color: var(--gs-fg-primary);
    }

    .row-column-number:focus {
        outline: none;
        border-color: var(--gs-fg-link);
    }

    .row-column-number:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Hide spinners in Firefox */
    .row-column-number {
        appearance: textfield;
        -moz-appearance: textfield;
    }

    /* Hide spinners in Chrome, Safari, Edge, Opera */
    .row-column-number::-webkit-outer-spin-button,
    .row-column-number::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
</style>
