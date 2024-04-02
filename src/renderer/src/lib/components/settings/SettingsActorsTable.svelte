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
    import { FOCUS_BUTTON_WIDTH } from '@lib/constants/app';
    import { get } from 'svelte/store';
    import { type Actor } from '@common/common-schema';
    import FocusButton from '../common/FocusButton.svelte';
    import type { FocusPayloadActor } from '@lib/stores/app/focus';
    import type { DataTableHeader } from 'carbon-components-svelte/src/DataTable/DataTable.svelte';
    import {
        ACTORS_DEFAULT_NAME,
        ACTORS_PLACEHOLDER_NAME,
        ACTORS_UNDO_NAME,
    } from '@lib/constants/settings';
    import { actorsTable } from '@lib/tables/actors';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import RowNameInput from '../common/RowNameInput.svelte';
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import { ACTORS_DEFAULT_COLOR, APP_NAME } from '@common/constants';
    import { actorCreate, actorsDelete } from '@lib/crud/actor-crud';
    import { db } from '@lib/api/db/db';

    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const headers: DataTableHeader[] = [
        { key: 'name', value: 'Name' },
        { key: 'focus', empty: true, minWidth: FOCUS_BUTTON_WIDTH, width: FOCUS_BUTTON_WIDTH },
    ];
    const focusPayload: FocusPayloadActor = {
        uniqueNameTracker: uniqueNameTracker,
    };
    let isModalOpen: boolean = false;
    let selectedRowIds: number[] = [];
    let isLoading: IsLoadingStore = new IsLoadingStore();

    async function addRow(): Promise<void> {
        await actorCreate(
            db,
            <Actor>{
                name: ACTORS_DEFAULT_NAME,
                color: ACTORS_DEFAULT_COLOR,
                is_system_created: false,
            },
            isLoading,
            true,
        );
    }

    async function deleteRows(): Promise<void> {
        isModalOpen = false;
        let actorsToDelete: Actor[] = actorsTable.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;
        await actorsDelete(db, actorsToDelete, isLoading);
    }
</script>

<p>
    <DataTable
        size="medium"
        title="Actors"
        description="Actors are the entities that participate in conversations. The initial actor 
        can be renamed, but not deleted. {APP_NAME} requires at least one actor."
        batchSelection
        bind:selectedRowIds
        nonSelectableRowIds={$actorsTable
            .filter((rowView) => get(rowView).is_system_created)
            .map((row) => row.id)}
        {headers}
        rows={$actorsTable}
    >
        <svelte:fragment slot="cell-header" let:header>
            {header.value}
        </svelte:fragment>

        <svelte:fragment slot="cell" let:row let:cell>
            {#if cell.key === 'name'}
                <RowNameInput
                    rowView={row}
                    undoText={ACTORS_UNDO_NAME}
                    inputPlaceholder={ACTORS_PLACEHOLDER_NAME}
                    {uniqueNameTracker}
                    isInspectorField={false}
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
                    icon={$isLoading ? InlineLoading : undefined}>Add Actor</Button
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
    <p>If you delete an actor, all nodes that use it will return to using the default actor.</p>
</Modal>
