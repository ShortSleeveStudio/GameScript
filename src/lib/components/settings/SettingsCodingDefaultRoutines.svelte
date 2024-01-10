<script lang="ts">
    import {
        Button,
        DataTable,
        InlineLoading,
        Toolbar,
        ToolbarBatchActions,
        ToolbarContent,
    } from 'carbon-components-svelte';
    import { TrashCan } from 'carbon-icons-svelte';
    import FocusButton from '../common/FocusButton.svelte';
    import DefaultRoutinesRadio from '../common/DefaultRoutinesRadio.svelte';
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import RowNameInput from '../common/RowNameInput.svelte';
    import { defaultRoutines } from '@lib/tables/default-routines';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import {
        TABLE_ID_ROUTINES,
        type Routine,
        ROUTINE_TYPE_ID_DEFAULT,
    } from '@lib/api/db/db-schema';
    import { get } from 'svelte/store';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { FocusPayloadRoutine } from '@lib/stores/app/focus';
    import type { DataTableHeader } from 'carbon-components-svelte/src/DataTable/DataTable.svelte';
    import { FOCUS_BUTTON_WIDTH } from '@lib/constants/app';
    import { ROUTINES_PLACEHOLDER_NAME, ROUTINES_UNDO_NAME } from '@lib/constants/settings';

    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const focusPayload: FocusPayloadRoutine = {
        uniqueNameTracker: uniqueNameTracker,
    };
    const headers: DataTableHeader[] = [
        { key: 'name', value: 'Name' },
        { key: 'isDefault', value: 'Default' },
        { key: 'focus', empty: true, minWidth: FOCUS_BUTTON_WIDTH, width: FOCUS_BUTTON_WIDTH },
    ];
    let selectedRowIds: number[] = [];
    // TODO: https://svelte-5-preview.vercel.app/status
    let isLoading: boolean = false;

    async function addRow(): Promise<void> {
        let newRoutine: Routine = <Routine>{
            name: 'New Routine',
            code: '',
            type: ROUTINE_TYPE_ID_DEFAULT,
        };
        let newRow: Routine = await defaultRoutines.createRow(newRoutine);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'routine creation',
                async () => {
                    await defaultRoutines.deleteRow(newRow);
                },
                async () => {
                    newRow = await defaultRoutines.createRow(newRow);
                },
            ),
        );
    }

    async function deleteRows(): Promise<void> {
        // Grab rows to delete
        let rowsToDelete: Routine[] = defaultRoutines.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // Delete rows
        await defaultRoutines.deleteRows(rowsToDelete);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'routine deletion',
                async () => {
                    rowsToDelete = await defaultRoutines.createRows(rowsToDelete);
                },
                async () => {
                    await defaultRoutines.deleteRows(rowsToDelete);
                },
            ),
        );
    }
</script>

<p>
    <DataTable
        size="medium"
        title="Default Routines"
        description="The routines listed in this table will be available to you in dropdown 
        menus that allow you to fill in code blocks with pre-written code. If you delete these, 
        places where they were used will no longer execute any code."
        batchSelection
        bind:selectedRowIds
        {headers}
        rows={$defaultRoutines}
    >
        <svelte:fragment slot="cell-header" let:header>
            {header.value}
        </svelte:fragment>

        <svelte:fragment slot="cell" let:row let:cell>
            {#if cell.key === 'name'}
                <!-- TODO: https://svelte-5-preview.vercel.app/status -->
                <RowNameInput
                    rowView={row}
                    undoText={ROUTINES_UNDO_NAME}
                    {uniqueNameTracker}
                    inputPlaceholder={ROUTINES_PLACEHOLDER_NAME}
                    isInspectorField={false}
                />
            {:else if cell.key === 'isDefault'}
                <DefaultRoutinesRadio rowView={row} />
            {:else if cell.key === 'focus'}
                <FocusButton rowType={TABLE_ID_ROUTINES} rowView={row} payload={focusPayload} />
            {/if}
        </svelte:fragment>

        <Toolbar size="sm">
            <ToolbarBatchActions>
                <Button icon={TrashCan} on:click={deleteRows}>Delete</Button>
            </ToolbarBatchActions>
            <ToolbarContent>
                <Button
                    on:click={addRow}
                    disabled={isLoading}
                    icon={isLoading ? InlineLoading : undefined}>Add Routine</Button
                >
            </ToolbarContent>
        </Toolbar>
    </DataTable>
</p>
