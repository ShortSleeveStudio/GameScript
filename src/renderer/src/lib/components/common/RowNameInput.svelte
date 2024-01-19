<script lang="ts">
    import { db } from '@lib/api/db/db';
    import type { Row } from '@lib/api/db/db-schema';
    import { type IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { type ActionUnsubscriber } from '@lib/utility/action';
    import { wasEnterPressed, wasSavePressed } from '@lib/utility/keybinding';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import type { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import { TextInput } from 'carbon-components-svelte';
    import { onDestroy, onMount } from 'svelte';
    import type { Unsubscriber } from 'svelte/motion';
    import { get, type Writable } from 'svelte/store';

    export let rowView: IDbRowView<Row>;
    export let undoText: string;
    export let inputPlaceholder: string;
    export let isInspectorField: boolean;
    export let uniqueNameTracker: UniqueNameTracker;
    export let isNameLocked: Writable<boolean> | undefined = undefined;

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let boundValue: string = $rowView.name;
    let currentValue: string = $rowView.name;
    let isUnique: boolean = true;
    let rowViewUnsubscriber: Unsubscriber;
    let uniqueNameTrackerUnsubscriber: ActionUnsubscriber;
    onMount(() => {
        // Subscribe to changes in unique name map
        uniqueNameTrackerUnsubscriber = uniqueNameTracker.subscribe(() => {
            isUnique = uniqueNameTracker.isNameUnique($rowView.name);
        });

        // Add name initially (NOTE: order here matters)
        if (!isInspectorField) uniqueNameTracker.addName($rowView.name);

        // Subscribe to changes in row view
        rowViewUnsubscriber = rowView.subscribe((row: Row) => {
            // If the name of this row has changed, we remove it from the map and add the new name
            if (row.name !== currentValue) {
                if (!isInspectorField) {
                    uniqueNameTracker.removeName(currentValue);
                    uniqueNameTracker.addName(row.name);
                }
                boundValue = row.name;
                currentValue = row.name;
            }
        });
    });
    onDestroy(() => {
        if (!isInspectorField) {
            // Unsubscribe to changes in unique name map
            uniqueNameTrackerUnsubscriber();

            // Remove deleted field
            uniqueNameTracker.removeName(currentValue);
        }

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
        newRow.name = newValue;
        await db.updateRow(rowView.tableId, newRow);

        undoManager.register(
            new Undoable(
                `${undoText} change`,
                isLoading.wrapOperationAsync(async () => {
                    newRow.name = oldValue;
                    await db.updateRow(rowView.tableId, newRow);
                }),
                isLoading.wrapOperationAsync(async () => {
                    newRow.name = newValue;
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
        invalid={!isUnique}
        hideLabel
        disabled={(isNameLocked ? $isNameLocked : false) || $isLoading}
        placeholder={inputPlaceholder}
        bind:value={boundValue}
        on:blur={syncOnBlur}
        on:keyup={onKeyUp}
    />
</span>
