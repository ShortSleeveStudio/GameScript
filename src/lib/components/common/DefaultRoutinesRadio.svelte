<script lang="ts">
    import type { Routine } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { defaultRoutine } from '@lib/stores/settings/settings';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { RadioButton, RadioButtonGroup } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';

    export let rowView: IDbRowView<Routine>;
    let checked: boolean = rowView.id === $defaultRoutine;

    function onRadioChanged(e: Event) {
        (<HTMLElement>e.target).blur(); // Allows us to undo/redo
        const previousIdSelected: number = $defaultRoutine;
        checked = true;
        $defaultRoutine = rowView.id;

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'default routine change',
                async () => {
                    $defaultRoutine = previousIdSelected;
                },
                async () => {
                    $defaultRoutine = rowView.id;
                },
            ),
        );
    }

    function onDefaultRoutineChanged(defaultRoutineId: number) {
        checked = rowView.id === defaultRoutineId;
    }

    const unsubscribeDefaultRoutineChanged = defaultRoutine.subscribe(onDefaultRoutineChanged);
    onDestroy(() => {
        unsubscribeDefaultRoutineChanged();
        if (checked) {
            $defaultRoutine = -1;
        }
    });
</script>

<RadioButtonGroup>
    <RadioButton value={rowView.id} bind:checked on:change={onRadioChanged} />
</RadioButtonGroup>
