<script lang="ts">
    import { db } from '@lib/api/db/db';
    import type { Row } from '@common/common-schema';
    import { type IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { wasEnterPressed, wasSavePressed } from '@lib/utility/keybinding';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { TextInput } from 'carbon-components-svelte';
    import { onDestroy, onMount } from 'svelte';
    import type { Unsubscriber } from 'svelte/motion';
    import { get } from 'svelte/store';

    export let rowView: IDbRowView<Row>;
    export let undoText: string;
    export let columnName: string;
    export let inputPlaceholder: string;
    export let isNumber: boolean = false;
    export let numberMin: number = Number.NEGATIVE_INFINITY;
    export let numberMax: number = Number.POSITIVE_INFINITY;

    const NON_NUMBERS = /\D/g;
    const isLoading: IsLoadingStore = new IsLoadingStore();
    let boundValue: string = <string>$rowView[columnName];
    let currentValue: string = <string>$rowView[columnName];
    let rowViewUnsubscriber: Unsubscriber;
    onMount(() => {
        // Subscribe to changes in row view
        rowViewUnsubscriber = rowView.subscribe((row: Row) => {
            // If the name of this row has changed, we remove it from the map and add the new name
            if (row[columnName] !== currentValue) {
                boundValue = <string>row[columnName];
                currentValue = <string>row[columnName];
            }
        });
    });
    onDestroy(() => {
        // Unsubscribe to row view changes
        rowViewUnsubscriber();
    });

    async function syncOnBlur(): Promise<void> {
        sanitizeBoundValue();
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Update column
        const newRow = <Row>{ ...get(rowView) };
        newRow[columnName] = newValue;
        await isLoading.wrapPromise(db.updateRow(rowView.tableType, newRow));

        undoManager.register(
            new Undoable(
                `${undoText} change`,
                isLoading.wrapFunction(async () => {
                    newRow[columnName] = oldValue;
                    await db.updateRow(rowView.tableType, newRow);
                }),
                isLoading.wrapFunction(async () => {
                    newRow[columnName] = newValue;
                    await db.updateRow(rowView.tableType, newRow);
                }),
            ),
        );
    }

    function onKeyUp(e: KeyboardEvent): void {
        if (wasSavePressed(e) || wasEnterPressed(e)) {
            (<HTMLElement>e.target).blur();
        }
    }

    function onInput(): void {
        if (!isNumber) return;
        if (boundValue === '' || boundValue === '-') return;
        sanitizeBoundValue();
    }

    function sanitizeBoundValue(): void {
        let num: number = parseInt(boundValue);
        if (isNaN(num)) {
            num = 0;
        }
        const newNum = num > 0 ? Math.min(numberMax, num) : Math.max(numberMin, num);
        boundValue = newNum.toString();
    }
</script>

<span class="defeat-form-requirement">
    <TextInput
        size="sm"
        hideLabel
        disabled={$isLoading}
        placeholder={inputPlaceholder}
        bind:value={boundValue}
        on:blur={syncOnBlur}
        on:keyup={onKeyUp}
        on:input={onInput}
    />
</span>
