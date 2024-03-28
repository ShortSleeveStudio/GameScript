<script lang="ts">
    import { CODE_OVERRIDE_DEFAULT } from '@common/common-db';
    import type { Routine } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { defaultRoutine } from '@lib/stores/settings/settings';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { RadioButton, RadioButtonGroup } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';

    export let rowView: IDbRowView<Routine>;
    export let undoText: string;
    let checked: boolean = rowView.id === $defaultRoutine;

    function onRadioClicked(e: Event): void {
        (<HTMLElement>e.target).blur(); // Allows us to undo/redo
        e.preventDefault();
        let previousIdSelected: number = $defaultRoutine;

        // Unselect
        if (previousIdSelected === rowView.id) {
            previousIdSelected = null;
            checked = false;
            $defaultRoutine = CODE_OVERRIDE_DEFAULT;

            // Register undo/redo
            undoManager.register(
                new Undoable(
                    `${undoText} change`,
                    async () => {
                        $defaultRoutine = rowView.id;
                    },
                    async () => {
                        $defaultRoutine = previousIdSelected;
                    },
                ),
            );
            return;
        }

        checked = true;
        $defaultRoutine = rowView.id;

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `${undoText} change`,
                async () => {
                    $defaultRoutine = previousIdSelected;
                },
                async () => {
                    $defaultRoutine = rowView.id;
                },
            ),
        );
    }

    function onDefaultRoutineChanged(defaultRoutineId: number): void {
        checked = rowView.id === defaultRoutineId;
    }
    $: onDefaultRoutineChanged($defaultRoutine);

    onDestroy(() => {
        if (checked) {
            $defaultRoutine = CODE_OVERRIDE_DEFAULT;
        }
    });
</script>

<RadioButtonGroup on:click={onRadioClicked}>
    <RadioButton value={rowView.id} bind:checked />
</RadioButtonGroup>
