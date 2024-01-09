<script lang="ts" generics="RowType extends Annotated, Row">
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import type { Readable } from 'svelte/store';
    import { onDestroy } from 'svelte';
    import { wasSavePressed } from '@lib/utility/keybinding';
    import { type Annotated } from '@lib/api/db/db-schema';
    import { TextArea } from 'carbon-components-svelte';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';

    // https://svelte-5-preview.vercel.app/status
    export let rowView: IDbRowView<RowType>;
    export let placeholder: string;

    // TODO: https://svelte-5-preview.vercel.app/status
    const isLoading: Readable<boolean> = rowView.isColumnLoading('notes');
    let boundValue: string = $rowView.notes;
    let currentValue: string = $rowView.notes;

    function onKeyUp(e: KeyboardEvent) {
        if (wasSavePressed(e)) {
            (<HTMLElement>e.target).blur();
        }
    }

    async function syncOnBlur() {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        await rowView.updateColumn('notes', newValue);
        undoManager.register(
            new Undoable(
                'notes field change',
                async () => {
                    await rowView.updateColumn('notes', oldValue);
                },
                async () => {
                    await rowView.updateColumn('notes', newValue);
                },
            ),
        );
    }

    onDestroy(
        rowView.subscribe((row: RowType) => {
            // If the name of this row has changed, we remove it from the map and add the new name
            if (row.notes !== currentValue) {
                boundValue = row.notes;
                currentValue = row.notes;
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
