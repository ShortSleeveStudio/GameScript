<script lang="ts">
    import { db } from '@lib/api/db/db';
    import { type Row } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { wasSavePressed } from '@lib/utility/keybinding';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { NumberInput } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';
    import { get } from 'svelte/store';

    export let rowView: IDbRowView<Row>;
    export let undoText: string;
    export let columnName: string;
    export let isInteger: boolean = false;

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let boundValue: number = <number>$rowView[columnName];
    let currentValue: number = <number>$rowView[columnName];

    function onKeyUp(e: KeyboardEvent): void {
        if (wasSavePressed(e)) {
            (<HTMLElement>e.target).blur();
        }
    }

    const syncOnBlur: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        if (isInteger) boundValue = Math.round(boundValue);
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Update column
        const newRow = <Row>{ ...get(rowView) };
        newRow[columnName] = newValue;
        await db.updateRow(rowView.tableId, newRow);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `${undoText} change`,
                isLoading.wrapOperationAsync(async () => {
                    newRow[columnName] = oldValue;
                    await db.updateRow(rowView.tableId, newRow);
                }),
                isLoading.wrapOperationAsync(async () => {
                    newRow[columnName] = newValue;
                    await db.updateRow(rowView.tableId, newRow);
                }),
            ),
        );
    });

    onDestroy(
        rowView.subscribe((row: Row) => {
            // If the name of this row has changed, we remove it from the map and add the new name
            if (row[columnName] !== currentValue) {
                boundValue = <number>row[columnName];
                currentValue = <number>row[columnName];
            }
        }),
    );
</script>

<NumberInput
    hideSteppers
    disabled={$isLoading}
    on:blur={syncOnBlur}
    on:keyup={onKeyUp}
    bind:value={boundValue}
/>
