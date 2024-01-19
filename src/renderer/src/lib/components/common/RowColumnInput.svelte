<script lang="ts">
    import { db } from '@lib/api/db/db';
    import type { Row } from '@lib/api/db/db-schema';
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

    const syncOnBlur: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Update column
        const originalRow = get(rowView);
        const newRow = <Row>{ id: originalRow.id };
        newRow[columnName] = newValue;
        await db.updateRow(rowView.tableId, newRow);

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

    function onKeyUp(e: KeyboardEvent) {
        if (wasSavePressed(e) || wasEnterPressed(e)) {
            (<HTMLElement>e.target).blur();
        }
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
    />
</span>
