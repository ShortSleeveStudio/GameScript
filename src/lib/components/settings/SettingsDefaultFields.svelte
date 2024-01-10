<script lang="ts">
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import {
        DataTable,
        Toolbar,
        ToolbarContent,
        ToolbarBatchActions,
        Button,
        InlineLoading,
        Modal,
        ProgressBar,
    } from 'carbon-components-svelte';
    import { get, type Readable, type Writable } from 'svelte/store';
    import RowColumnDropdown from '../common/RowColumnDropdown.svelte';
    import { Async, TrashCan } from 'carbon-icons-svelte';
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import { fade } from 'svelte/transition';
    import { durationFast02 } from '@lib/constants/motion';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import {
        FIELD_TYPE_ID_ACTOR,
        type DefaultField,
        FIELD_TYPE_DROP_DOWN_ITEMS,
        type DatabaseTableId,
    } from '@lib/api/db/db-schema';
    import { wait } from '@lib/utility/wait';
    import RowNameInput from '../common/RowNameInput.svelte';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

    export let defaultFields: IDbTableView<DefaultField>;
    export let isApplyingDefaultFields: Writable<boolean>;
    export let parentType: DatabaseTableId;
    export let tableTitle: string;
    export let tableDescription: string;
    export let nameUndoText: string;
    export let typeUndoText: string;
    export let namePlaceholderText: string;
    export let modalText: string;

    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const headers = [
        { key: 'name', value: 'Name', minWidth: '50%' },
        { key: 'type', value: 'Type', minWidth: '50%' },
    ];
    let selectedRowIds: number[] = [];
    let isModalOpen: boolean = false;
    let applyFieldsProgress: number = 0;
    // TODO: https://svelte-5-preview.vercel.app/status
    let isLoading: Readable<boolean> = defaultFields.isLoading;

    async function applyDefaultFields(): Promise<void> {
        // TODO: implement me
        console.log('implement me');
        if ($isApplyingDefaultFields) return;
        applyFieldsProgress = 0;
        $isApplyingDefaultFields = true;
        isModalOpen = false;
        for (; applyFieldsProgress < 100; applyFieldsProgress += 10) {
            await wait(300);
        }
        await wait(600);
        $isApplyingDefaultFields = false;
    }

    async function addRow(): Promise<void> {
        let newDefaultField: DefaultField = <DefaultField>{
            name: 'New Field',
            type: FIELD_TYPE_ID_ACTOR,
            parentType: parentType,
        };
        let newRow: DefaultField = await defaultFields.createRow(newDefaultField);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'default field creation',
                async () => {
                    await defaultFields.deleteRow(newRow);
                },
                async () => {
                    newRow = await defaultFields.createRow(newRow);
                },
            ),
        );
    }

    async function deleteRows(): Promise<void> {
        // Grab rows to delete
        let rowsToDelete: DefaultField[] = defaultFields.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // Delete rows
        await defaultFields.deleteRows(rowsToDelete);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'default field deletion',
                async () => {
                    rowsToDelete = await defaultFields.createRows(rowsToDelete);
                },
                async () => {
                    await defaultFields.deleteRows(rowsToDelete);
                },
            ),
        );
    }
</script>

<DataTable
    size="medium"
    title={tableTitle}
    description={tableDescription}
    batchSelection
    bind:selectedRowIds
    {headers}
    rows={$defaultFields}
>
    <svelte:fragment slot="cell-header" let:header>
        {header.value}
    </svelte:fragment>

    <svelte:fragment slot="cell" let:row let:cell>
        {#if cell.key === 'name'}
            <!-- TODO: https://svelte-5-preview.vercel.app/status -->
            <RowNameInput
                rowView={row}
                isNameLocked={isApplyingDefaultFields}
                undoText={nameUndoText}
                {uniqueNameTracker}
                inputPlaceholder={namePlaceholderText}
                isInspectorField={false}
            />
        {:else if cell.key === 'type'}
            <!-- TODO: https://svelte-5-preview.vercel.app/status - also nameof<DefaultField>('type') -->
            <RowColumnDropdown
                rowView={row}
                dropdownItems={FIELD_TYPE_DROP_DOWN_ITEMS}
                isDisabled={$isApplyingDefaultFields}
                undoText={typeUndoText}
                columnName={'type'}
            />
        {/if}
    </svelte:fragment>

    <Toolbar size="sm">
        {#if !$isApplyingDefaultFields}
            <ToolbarBatchActions>
                <Button icon={TrashCan} on:click={deleteRows}>Delete</Button>
            </ToolbarBatchActions>
        {/if}
        <ToolbarContent>
            {#if $isApplyingDefaultFields}
                <span style="width: 100%;" transition:fade={{ duration: durationFast02 }}>
                    <ProgressBar
                        kind="indented"
                        value={applyFieldsProgress}
                        max={100}
                        labelText={applyFieldsProgress < 100 ? 'Applying to All...' : 'Done!'}
                    />
                </span>
            {/if}
            <Button
                size="small"
                disabled={$isLoading || $isApplyingDefaultFields}
                kind="danger-tertiary"
                iconDescription="Apply to All"
                tooltipPosition="left"
                icon={Async}
                on:click={() => (isModalOpen = true)}
            />
            <Button
                on:click={addRow}
                disabled={$isLoading || $isApplyingDefaultFields}
                icon={$isLoading ? InlineLoading : undefined}>Add Field</Button
            >
        </ToolbarContent>
    </Toolbar>
</DataTable>

<Modal
    size="sm"
    danger
    bind:open={isModalOpen}
    modalHeading="Are you sure?"
    primaryButtonText="Apply"
    secondaryButtonText="Cancel"
    on:click:button--secondary={() => (isModalOpen = false)}
    on:submit={applyDefaultFields}
>
    <p>{modalText}</p>
    <br />
    <p>This cannot be undone.</p>
</Modal>
