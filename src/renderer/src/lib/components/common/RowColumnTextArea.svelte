<script lang="ts" generics="RowType extends Row">
    import { db } from '@lib/api/db/db';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { get } from 'svelte/store';
    import { onDestroy } from 'svelte';
    import { wasSavePressed } from '@lib/utility/keybinding';
    import { type Row } from '@lib/api/db/db-schema';
    import { TextArea } from 'carbon-components-svelte';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';

    export let rowView: IDbRowView<RowType>;
    export let undoText: string;
    export let columnName: string;
    export let placeholder: string;

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let boundValue: string = <string>$rowView[columnName];
    let currentValue: string = <string>$rowView[columnName];

    function onKeyUp(e: KeyboardEvent) {
        if (wasSavePressed(e)) {
            (<HTMLElement>e.target).blur();
        }
    }

    const syncOnBlur: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Update column
        const originalRow = get(rowView);
        const newRow = <Row>{ id: originalRow.id };
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
        rowView.subscribe((row: RowType) => {
            // If the name of this row has changed, we remove it from the map and add the new name
            if (row[columnName] !== currentValue) {
                boundValue = <string>row[columnName];
                currentValue = <string>row[columnName];
            }
        }),
    );
</script>

<TextArea
    disabled={$isLoading}
    {placeholder}
    bind:value={boundValue}
    on:blur={syncOnBlur}
    on:keyup={onKeyUp}
/>
