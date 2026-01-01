<script lang="ts">
    /**
     * Multi-line text area for a row column.
     *
     * Features:
     * - Two-way binding with row view
     * - Undo/redo support
     * - Loading state handling
     * - Auto-resize option
     *
     * Ported from GameScriptElectron.
     */
    import { type IDbRowView } from '$lib/db';
    import type { Row } from '@gamescript/shared';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { wasSavePressed } from '$lib/utils/keybinding.js';
    import { common } from '$lib/crud';
    import TextArea from './TextArea.svelte';

    interface Props {
        rowView: IDbRowView<Row>;
        undoText: string;
        columnName: string;
        placeholder?: string;
        rows?: number;
        autoResize?: boolean;
        labelText?: string;
        disabled?: boolean;
    }

    let {
        rowView,
        undoText,
        columnName,
        placeholder = '',
        rows = 3,
        autoResize = false,
        labelText = '',
        disabled = false,
    }: Props = $props();

    const isLoading = new IsLoadingStore();
    // svelte-ignore state_referenced_locally
    let boundValue: string = $state(String(rowView.data[columnName] ?? ''));
    // svelte-ignore state_referenced_locally
    let currentValue: string = $state(String(rowView.data[columnName] ?? ''));
    let textareaEl: HTMLTextAreaElement | undefined = $state();

    // Sync when external changes occur
    $effect(() => {
        const row = rowView.data;
        if (row[columnName] !== currentValue) {
            boundValue = String(row[columnName] ?? '');
            currentValue = String(row[columnName] ?? '');
        }
    });

    function onKeyUp(e: CustomEvent<KeyboardEvent>): void {
        if (wasSavePressed(e.detail)) {
            textareaEl?.blur();
        }
    }

    async function syncOnBlur(): Promise<void> {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Update column
        const oldRow = { ...rowView.getValue() };
        const newRow = { ...oldRow, [columnName]: newValue || null };
        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, `${undoText} change`)
        );
        currentValue = newValue;
    }
</script>

<div class="row-column-textarea-wrapper">
    {#if labelText}
        <label class="row-column-textarea-label">{labelText}</label>
    {/if}
    <TextArea
        bind:textareaElement={textareaEl}
        bind:value={boundValue}
        disabled={disabled || $isLoading}
        {placeholder}
        {rows}
        {autoResize}
        on:blur={syncOnBlur}
        on:keyup={onKeyUp}
    />
</div>

<style>
    .row-column-textarea-wrapper {
        width: 100%;
    }

    .row-column-textarea-label {
        display: block;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--gs-fg-secondary);
        margin-bottom: 0.25rem;
    }
</style>
