<script lang="ts">
    import type { DefaultFieldRow } from '@lib/api/db/db-types';
    import type { DbRowView } from '@lib/api/db/db-view-row';
    import { type ActionUnsubscriber } from '@lib/utility/action';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import type { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import { SkeletonPlaceholder, TextInput } from 'carbon-components-svelte';
    import { onDestroy, onMount } from 'svelte';
    import type { Readable, Unsubscriber } from 'svelte/motion';

    export let rowView: DbRowView<DefaultFieldRow>;
    export let inputPlaceholder: string;
    export let uniqueNameTracker: UniqueNameTracker;
    export let isApplyingDefaultFields: boolean;

    // TODO: https://svelte-5-preview.vercel.app/status
    const isLoading: Readable<boolean> = rowView.isLoading;
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
        uniqueNameTracker.addName($rowView.name);

        // Subscribe to changes in row view
        rowViewUnsubscriber = rowView.subscribe((row: DefaultFieldRow) => {
            // If the name of this row has changed, we remove it from the map and add the new name
            if (row.name !== currentValue) {
                uniqueNameTracker.removeName(currentValue);
                boundValue = row.name;
                currentValue = row.name;
                uniqueNameTracker.addName(currentValue);
            }
        });
    });
    onDestroy(() => {
        // Remove deleted field
        uniqueNameTracker.removeName(currentValue);

        // Unsubscribe to row view changes
        rowViewUnsubscriber();

        // Unsubscribe to changes in unique name map
        uniqueNameTrackerUnsubscriber();
    });

    function syncOnBlur() {
        const newName = boundValue;
        const previousName = $rowView.name;
        if (previousName !== newName) {
            undoManager.register(
                new Undoable(
                    'Default field type selection',
                    () => {
                        $rowView.name = previousName;
                    },
                    () => {
                        $rowView.name = newName;
                    },
                ),
            );
            $rowView.name = newName;
        }
    }

    function onKeyUp(e: KeyboardEvent) {
        if (e.key == 'Enter') {
            (<HTMLElement>e.target).blur();
        }
    }
</script>

{#if $isLoading}
    <SkeletonPlaceholder style="height: 2rem; max-height: 2rem; width: 100%;" />
{:else}
    <span class="defeat-form-requirement">
        <TextInput
            size="sm"
            invalid={!isUnique}
            hideLabel
            disabled={$rowView.required || isApplyingDefaultFields}
            placeholder={inputPlaceholder}
            bind:value={boundValue}
            on:blur={syncOnBlur}
            on:keyup={onKeyUp}
        />
    </span>
{/if}
