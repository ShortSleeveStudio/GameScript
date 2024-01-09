<script lang="ts">
    import type { Row } from '@lib/api/db/db-schema';
    import { type IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { wasEnterPressed, wasSavePressed } from '@lib/utility/keybinding';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { TextInput } from 'carbon-components-svelte';
    import { onDestroy, onMount } from 'svelte';
    import type { Readable, Unsubscriber } from 'svelte/motion';

    export let rowView: IDbRowView<Row>;
    export let undoText: string;
    export let columnName: string;
    export let inputPlaceholder: string;

    // TODO: https://svelte-5-preview.vercel.app/status
    const isLoading: Readable<boolean> = rowView.isColumnLoading(columnName);
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

    async function syncOnBlur() {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        await rowView.updateColumn(columnName, newValue);
        undoManager.register(
            new Undoable(
                `${undoText} change`,
                async () => {
                    await rowView.updateColumn(columnName, oldValue);
                },
                async () => {
                    await rowView.updateColumn(columnName, newValue);
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
        hideLabel
        disabled={$isLoading}
        placeholder={inputPlaceholder}
        bind:value={boundValue}
        on:blur={syncOnBlur}
        on:keyup={onKeyUp}
    />
</span>
