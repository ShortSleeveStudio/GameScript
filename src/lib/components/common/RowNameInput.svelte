<script lang="ts">
    import type { Row } from '@lib/api/db/db-schema';
    import { type IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { isApplyingDefaultFields } from '@lib/stores/app/applying-default-fields';
    import { type ActionUnsubscriber } from '@lib/utility/action';
    import { wasEnterPressed, wasSavePressed } from '@lib/utility/keybinding';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import type { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import { TextInput } from 'carbon-components-svelte';
    import { onDestroy, onMount } from 'svelte';
    import type { Readable, Unsubscriber } from 'svelte/motion';

    export let rowView: IDbRowView<Row>;
    export let inputPlaceholder: string;
    export let uniqueNameTracker: UniqueNameTracker;
    export let isInspectorField: boolean;

    // TODO: https://svelte-5-preview.vercel.app/status
    const isLoading: Readable<boolean> = rowView.isColumnLoading('name');
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

    async function syncOnBlur() {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        await rowView.updateColumn('name', newValue);
        undoManager.register(
            new Undoable(
                'Default field type selection',
                async () => {
                    await rowView.updateColumn('name', oldValue);
                },
                async () => {
                    await rowView.updateColumn('name', newValue);
                },
            ),
        );
    }

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
        disabled={$isApplyingDefaultFields || $isLoading}
        placeholder={inputPlaceholder}
        bind:value={boundValue}
        on:blur={syncOnBlur}
        on:keyup={onKeyUp}
    />
</span>
