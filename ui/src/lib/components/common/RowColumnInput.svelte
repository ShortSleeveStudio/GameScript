<script lang="ts">
    /**
     * Editable text input for a row column.
     *
     * Features:
     * - Two-way binding with row view
     * - Undo/redo support
     * - Loading state handling
     * - Support for number input (optional)
     *
     * Ported from GameScriptElectron.
     */
    import { type IDbRowView } from '$lib/db';
    import type { Row } from '@gamescript/shared';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { wasSavePressed, wasEnterPressed } from '$lib/utils/keybinding.js';
    import { common } from '$lib/crud';
    import Input from './Input.svelte';

    interface Props {
        rowView: IDbRowView<Row>;
        undoText: string;
        columnName: string;
        inputPlaceholder?: string;
        isNumber?: boolean;
        isDecimal?: boolean;
        numberMin?: number;
        numberMax?: number;
    }

    let {
        rowView,
        undoText,
        columnName,
        inputPlaceholder = '',
        isNumber = false,
        isDecimal = false,
        numberMin = Number.NEGATIVE_INFINITY,
        numberMax = Number.POSITIVE_INFINITY,
    }: Props = $props();

    const isLoading = new IsLoadingStore();

    // Get initial value from rowView
    function getValueFromRow(row: Row): string | number {
        return isNumber ? Number(row[columnName] ?? 0) : String(row[columnName] ?? '');
    }

    // svelte-ignore state_referenced_locally
    let boundValue: string | number = $state(getValueFromRow(rowView.data));
    // svelte-ignore state_referenced_locally
    let currentValue: string | number = $state(boundValue);

    // Sync when external changes occur
    $effect(() => {
        const row = rowView.data;
        const newVal = getValueFromRow(row);
        if (row[columnName] !== currentValue) {
            boundValue = newVal;
            currentValue = newVal;
        }
    });

    async function syncOnBlur(): Promise<void> {
        if (isNumber) sanitizeBoundValue();
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Update column
        const oldRow = { ...rowView.getValue() };
        const newRow = { ...oldRow, [columnName]: isNumber ? Number(newValue) : newValue };
        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, `${undoText} change`)
        );
        currentValue = newValue;
    }

    function onKeyUp(event: KeyboardEvent): void {
        if (wasSavePressed(event) || wasEnterPressed(event)) {
            (event.target as HTMLElement).blur();
        }
    }

    function sanitizeBoundValue(): void {
        let num: number = isDecimal ? parseFloat(String(boundValue)) : parseInt(String(boundValue));
        if (isNaN(num)) {
            num = 0;
        }
        const newNum = num > 0 ? Math.min(numberMax, num) : Math.max(numberMin, num);
        boundValue = newNum;
    }
</script>

<Input
    type={isNumber ? 'number' : 'text'}
    bind:value={boundValue}
    placeholder={inputPlaceholder}
    disabled={$isLoading}
    min={isNumber ? numberMin : undefined}
    max={isNumber ? numberMax : undefined}
    step={isNumber && isDecimal ? 'any' : undefined}
    onblur={syncOnBlur}
    onkeyup={onKeyUp}
/>
