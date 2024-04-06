<script lang="ts">
    import type { Routine, Row } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import SelectItemCustom from '../carbon/SelectItemCustom.svelte';
    import SelectCustom from '../carbon/SelectCustom.svelte';
    import { defaultRoutines } from '@lib/tables/routines-defaults';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { db } from '@lib/api/db/db';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { get } from 'svelte/store';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import RoutineEditor from './RoutineEditor.svelte';
    import { CODE_OVERRIDE_DEFAULT } from '@common/common-db';

    export let rowView: IDbRowView<Row>;
    export let columnNameOverrideRoutine: string;
    export let defaultRoutine: IDbRowView<Routine>;

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let boundValue: number;
    let currentValue: number;
    let selectedRoutine: IDbRowView<Routine>;
    $: onRowViewChanged(defaultRoutines, rowView, defaultRoutine, $rowView);
    function onRowViewChanged(
        defaultRoutines: IDbTableView<Routine>,
        rowView: IDbRowView<Row>,
        defaultRoutine: IDbRowView<Routine>,
        row: Row,
    ): void {
        if (defaultRoutines && rowView && defaultRoutine) {
            let newSelectedId: number = defaultRoutine.id;
            let newSelectedRoutine: IDbRowView<Routine> = defaultRoutine;
            const overrideId: number | null = <number | null>row[columnNameOverrideRoutine];
            if (!isNaN(overrideId)) {
                const routines: IDbRowView<Routine>[] = get(defaultRoutines);
                for (let i = 0; i < routines.length; i++) {
                    const overrideRoutine: IDbRowView<Routine> = routines[i];
                    if (overrideRoutine.id === overrideId) {
                        newSelectedId = overrideId;
                        newSelectedRoutine = overrideRoutine;
                    }
                }
            }
            boundValue = newSelectedId;
            currentValue = newSelectedId;
            selectedRoutine = newSelectedRoutine;
        }
    }

    async function onRoutineSelected(): Promise<void> {
        const newValue: number = boundValue;
        const oldValue: number = currentValue;
        if (oldValue === newValue) return;

        // Make sure default routine will store a -1 value for code_override
        const overrideNewValue: number =
            newValue === defaultRoutine.id ? CODE_OVERRIDE_DEFAULT : newValue;
        const overrideOldValue: number =
            oldValue === defaultRoutine.id ? CODE_OVERRIDE_DEFAULT : oldValue;

        // Update row
        const newRow = <Row>{ id: rowView.id };
        const oldRow = <Row>{ id: rowView.id };
        newRow[columnNameOverrideRoutine] = overrideNewValue;
        oldRow[columnNameOverrideRoutine] = overrideOldValue;
        await isLoading.wrapPromise(db.updateRow(rowView.tableType, newRow));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `routine selection change`,
                isLoading.wrapFunction(async () => {
                    await db.updateRow(rowView.tableType, oldRow);
                }),
                isLoading.wrapFunction(async () => {
                    await db.updateRow(rowView.tableType, newRow);
                }),
            ),
        );
    }
</script>

{#if defaultRoutine && defaultRoutines && $defaultRoutines.length > 0}
    <SelectCustom
        size="sm"
        disabled={$isLoading}
        hideLabel={true}
        on:change={onRoutineSelected}
        bind:selected={boundValue}
    >
        <SelectItemCustom rowView={defaultRoutine} textOverride={''} columnNameValue={'id'} />
        {#each $defaultRoutines as routine (routine.id)}
            <SelectItemCustom rowView={routine} columnNameText={'name'} columnNameValue={'id'} />
        {/each}
    </SelectCustom>
{/if}
<RoutineEditor
    rowView={selectedRoutine}
    columnName={'code'}
    disabled={$isLoading ||
        !defaultRoutine ||
        !selectedRoutine ||
        defaultRoutine.id !== selectedRoutine.id}
/>
