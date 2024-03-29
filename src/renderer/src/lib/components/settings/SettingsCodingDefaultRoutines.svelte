<script lang="ts">
    import {
        Button,
        DataTable,
        InlineLoading,
        Modal,
        Toolbar,
        ToolbarBatchActions,
        ToolbarContent,
    } from 'carbon-components-svelte';
    import { TrashCan } from 'carbon-icons-svelte';
    import FocusButton from '../common/FocusButton.svelte';
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import RowNameInput from '../common/RowNameInput.svelte';
    import { defaultRoutines } from '@lib/tables/routines-defaults';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { type Routine, type Node } from '@common/common-schema';
    import type { FocusPayloadRoutine } from '@lib/stores/app/focus';
    import type { DataTableHeader } from 'carbon-components-svelte/src/DataTable/DataTable.svelte';
    import { FOCUS_BUTTON_WIDTH } from '@lib/constants/app';
    import {
        ROUTINES_PLACEHOLDER_NAME,
        ROUTINES_UNDO_DEFAULT,
        ROUTINES_UNDO_NAME,
    } from '@lib/constants/settings';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { db } from '@lib/api/db/db';
    import SettingsCodingDefaultRoutinesRadio from './SettingsCodingDefaultRoutinesRadio.svelte';
    import { ROUTINE_TYPE_DEFAULT, TABLE_NODES, TABLE_ROUTINES } from '@common/common-types';
    import type { DbConnection } from '@common/common-db-types';
    import { createFilter } from '@lib/api/db/db-filter';

    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const focusPayload: FocusPayloadRoutine = {
        uniqueNameTracker: uniqueNameTracker,
    };
    const headers: DataTableHeader[] = [
        { key: 'name', value: 'Name' },
        { key: 'isDefault', value: 'Default' },
        { key: 'focus', empty: true, minWidth: FOCUS_BUTTON_WIDTH, width: FOCUS_BUTTON_WIDTH },
    ];
    let isModalOpen: boolean = false;
    let selectedRowIds: number[] = [];
    let isLoading: IsLoadingStore = new IsLoadingStore();

    async function addRow(): Promise<void> {
        let newRoutine: Routine = <Routine>{
            name: 'New Routine',
            code: '',
            type: ROUTINE_TYPE_DEFAULT.id,
            is_system_created: false,
            is_condition: false,
        };
        let newRow: Routine = await isLoading.wrapPromise(db.createRow(TABLE_ROUTINES, newRoutine));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'routine creation',
                isLoading.wrapFunction(async () => {
                    await db.deleteRow(TABLE_ROUTINES, newRow);
                }),
                isLoading.wrapFunction(async () => {
                    newRow = await db.createRow(TABLE_ROUTINES, newRow);
                }),
            ),
        );
    }

    async function deleteRows(): Promise<void> {
        isModalOpen = false;

        // Grab rows to delete
        let rowsToDelete: Routine[] = defaultRoutines.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // Delete rows
        await isLoading.wrapPromise(
            db.executeTransaction(async (conn: DbConnection) => {
                for (let i = 0; i < rowsToDelete.length; i++) {
                    // Grab row to delete
                    const routineToDelete: Routine = rowsToDelete[i];

                    // Update users of routine
                    await db.bulkUpdate(
                        TABLE_NODES,
                        <Node>{ code_override: -1 },
                        createFilter()
                            .where()
                            .column('code_override')
                            .eq(routineToDelete.id)
                            .endWhere()
                            .build(),
                        conn,
                    );

                    // Delete routine
                    await db.deleteRow(TABLE_ROUTINES, routineToDelete, conn);
                }
            }),
        );

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'routine deletion',
                isLoading.wrapFunction(async () => {
                    rowsToDelete = await db.createRows(TABLE_ROUTINES, rowsToDelete);
                }),
                isLoading.wrapFunction(async () => {
                    await db.deleteRows(TABLE_ROUTINES, rowsToDelete);
                }),
            ),
        );
    }
</script>

<p>
    <DataTable
        size="medium"
        title="Default Routines"
        description="The routines listed in this table will be available to you in dropdown
        menus that allow you to fill in code blocks with pre-written code. Please be careful.
        Deleting a default routine is a destructive operation that cause all nodes using that
        routine to revert to using their own routines."
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
                <SettingsCodingDefaultRoutinesRadio
                    rowView={row}
                    undoText={ROUTINES_UNDO_DEFAULT}
                />
            {:else if cell.key === 'focus'}
                <FocusButton rowView={row} payload={focusPayload} />
            {/if}
        </svelte:fragment>

        <Toolbar size="sm">
            <ToolbarBatchActions>
                <Button icon={TrashCan} disabled={$isLoading} on:click={() => (isModalOpen = true)}
                    >Delete</Button
                >
            </ToolbarBatchActions>
            <ToolbarContent>
                <Button
                    on:click={addRow}
                    disabled={$isLoading}
                    icon={$isLoading ? InlineLoading : undefined}>Add Routine</Button
                >
            </ToolbarContent>
        </Toolbar>
    </DataTable>
</p>

<Modal
    size="sm"
    danger
    bind:open={isModalOpen}
    modalHeading="Are you sure?"
    primaryButtonText="Delete"
    secondaryButtonText="Cancel"
    on:click:button--secondary={() => (isModalOpen = false)}
    on:submit={deleteRows}
>
    <p>
        Deleting routines removes all references to them in your conversations which cannot be
        undone.
    </p>
</Modal>
