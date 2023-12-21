<script lang="ts">
    import type { DefaultFieldRow } from '@lib/api/db/db-types';
    import type { DbRowView } from '@lib/api/db/db-view-row';
    import { type ActionUnsubscriber } from '@lib/utility/action';
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
    let currentValue: string = $rowView.name;

    function syncOnBlur() {
        if ($rowView.name !== currentValue) {
            $rowView.name = currentValue;
        }
    }

    function onKeyUp(e: KeyboardEvent) {
        if (e.key == 'Enter') {
            (<HTMLElement>e.target).blur();
        }
    }

    // Track row name
    let isUnique: boolean = true;
    let currentName = $rowView.name;
    let rowViewUnsubscriber: Unsubscriber;
    let uniqueNameTrackerUnsubscriber: ActionUnsubscriber;
    onMount(() => {
        // Subscribe to changes in unique name map
        uniqueNameTrackerUnsubscriber = uniqueNameTracker.subscribe(() => {
            isUnique = uniqueNameTracker.isNameUnique(currentName);
        });

        // Add name initially (NOTE: order here matters)
        uniqueNameTracker.addName(currentName);

        // Subscribe to changes in row view
        rowViewUnsubscriber = rowView.subscribe((row: DefaultFieldRow) => {
            // If the name of this row has changed, we remove it from the map and add the new name
            if (row.name !== currentName) {
                uniqueNameTracker.removeName(currentName);
                currentName = row.name;
                uniqueNameTracker.addName(currentName);
            }
        });
    });
    onDestroy(() => {
        // Remove deleted field
        uniqueNameTracker.removeName(currentName);

        // Unsubscribe to row view changes
        rowViewUnsubscriber();

        // Unsubscribe to changes in unique name map
        uniqueNameTrackerUnsubscriber();
    });
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
            bind:value={currentValue}
            on:blur={syncOnBlur}
            on:keyup={onKeyUp}
        />
    </span>
{/if}
