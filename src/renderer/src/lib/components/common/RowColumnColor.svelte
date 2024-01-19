<script lang="ts">
    import { db } from '@lib/api/db/db';
    import type { Row } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { get } from 'svelte/store';

    export let rowView: IDbRowView<Row>;
    export let columnName: string = 'color';
    export let undoText: string;

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let boundValue: string = <string>$rowView[columnName];
    let currentValue: string = <string>$rowView[columnName];

    const onColorChanged: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
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
</script>

<input class="color-picker" on:change={onColorChanged} bind:value={boundValue} type="color" />

<style>
    .color-picker {
        height: calc(8 * 4px);
        width: 100%;
    }
</style>
