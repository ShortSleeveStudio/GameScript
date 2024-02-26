<script lang="ts">
    import type { Routine, Row } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { Select } from 'carbon-components-svelte';
    import SelectItemCustom from '../carbon/SelectItemCustom.svelte';
    import { defaultRoutines } from '@lib/tables/routines-defaults';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { db } from '@lib/api/db/db';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { get } from 'svelte/store';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import RoutineEditor from './RoutineEditor.svelte';

    export let rowView: IDbRowView<Row>;
    export let columnNameOverrideRoutine: string;
    export let defaultRoutine: IDbRowView<Routine>;

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let boundValue: string;
    let currentValue: string;
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
            boundValue = newSelectedId.toString();
            currentValue = newSelectedId.toString();
            selectedRoutine = newSelectedRoutine;
        }
    }

    async function onRoutineSelected(): Promise<void> {
        const newValue: number = parseInt(boundValue);
        const oldValue: number = parseInt(currentValue);
        if (oldValue === newValue) return;

        // Make sure default routine will store a null value
        const nullableNewValue: number | null = newValue === defaultRoutine.id ? null : newValue;
        const nullableOldValue: number | null = oldValue === defaultRoutine.id ? null : oldValue;

        // Update row
        const newRow = <Row>{ id: rowView.id };
        const oldRow = <Row>{ id: rowView.id };
        newRow[columnNameOverrideRoutine] = nullableNewValue;
        oldRow[columnNameOverrideRoutine] = nullableOldValue;
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
    <Select
        size="sm"
        disabled={$isLoading}
        on:change={onRoutineSelected}
        bind:selected={boundValue}
    >
        <SelectItemCustom rowView={defaultRoutine} textOverride={''} columnNameValue={'id'} />
        {#each $defaultRoutines as routine (routine.id)}
            <SelectItemCustom rowView={routine} columnNameText={'name'} columnNameValue={'id'} />
        {/each}
    </Select>
{/if}
<RoutineEditor
    rowView={selectedRoutine}
    columnName={'code'}
    disabled={$isLoading ||
        !defaultRoutine ||
        !selectedRoutine ||
        defaultRoutine.id !== selectedRoutine.id}
/>
