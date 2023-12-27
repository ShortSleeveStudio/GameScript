<script lang="ts">
    import { db } from '@lib/api/db/db';
    import {
        ACTOR_FIELD_TYPE_ID,
        CONVERSATION_NODE_TYPE_ID,
        type DefaultFieldRow,
    } from '@lib/api/db/db-types';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
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
    import { onDestroy } from 'svelte';
    import { get, type Readable } from 'svelte/store';
    import DefaultFieldTypeDropdown from './DefaultFieldTypeDropdown.svelte';
    import DefaultFieldTypeNameInput from './DefaultFieldTypeNameInput.svelte';
    import { Async, TrashCan } from 'carbon-icons-svelte';
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import { wait } from '@lib/utility/test';
    import { fade } from 'svelte/transition';
    import { durationFast02 } from '@lib/motion/motion';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { isApplyingDefaultFields } from '@lib/stores/app/applying-default-fields';

    const TEXT_INPUT_PROMPT = 'Enter a unique field name';
    const headers = [
        { key: 'name', value: 'Name' },
        { key: 'type', value: 'Type' },
    ];

    let nonSelectableRowIds: number[] = [];
    let selectedRowIds: number[] = [];
    let defaultFieldTableView: IDbTableView<DefaultFieldRow> = db.fetchTable('default_fields');
    let isModalOpen: boolean = false;
    let applyFieldsProgress: number = 0;
    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    // TODO: https://svelte-5-preview.vercel.app/status
    const isLoading: Readable<boolean> = defaultFieldTableView.isLoading;
    onDestroy(defaultFieldTableView.subscribe(onTableViewChange));

    function onTableViewChange(newRows: IDbRowView<DefaultFieldRow>[]) {
        nonSelectableRowIds.length = 0;
        for (let i = 0; i < newRows.length; i++) {
            // Grab row
            let row: DefaultFieldRow = get(newRows[i]);

            // Non-selectable rows
            if (row.required) {
                nonSelectableRowIds.push(row.id);
            }
        }
    }

    async function applyDefaultFields(): Promise<void> {
        // TODO: implement me
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
        let newRow: DefaultFieldRow = <DefaultFieldRow>{
            name: 'New Field',
            fieldType: ACTOR_FIELD_TYPE_ID,
            nodeType: CONVERSATION_NODE_TYPE_ID,
            required: false,
        };
        newRow = await defaultFieldTableView.createRow(newRow);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'Default field creation',
                async () => {
                    await defaultFieldTableView.deleteRow(newRow);
                },
                async () => {
                    newRow = await defaultFieldTableView.createRow(newRow);
                },
            ),
        );
    }

    async function deleteRows(): Promise<void> {
        let rowsToDelete: DefaultFieldRow[] = [];
        $defaultFieldTableView.forEach((rowView) => {
            const row: DefaultFieldRow = get(rowView);
            if (selectedRowIds.includes(row.id)) {
                rowsToDelete.push(row);
            }
        });
        selectedRowIds = [];

        // Delete rows
        await defaultFieldTableView.deleteRows(rowsToDelete);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'Default field deletion',
                async () => {
                    rowsToDelete = await defaultFieldTableView.createRows(rowsToDelete);
                },
                async () => {
                    await defaultFieldTableView.deleteRows(rowsToDelete);
                },
            ),
        );
    }
</script>

<DataTable
    size="medium"
    title="Default Fields"
    description="These fields will appear in all new conversation nodes.
    You can also apply these fields across existing nodes in the options menu."
    batchSelection
    {nonSelectableRowIds}
    bind:selectedRowIds
    {headers}
    rows={$defaultFieldTableView}
>
    <svelte:fragment slot="cell-header" let:header>
        {header.value}
    </svelte:fragment>

    <svelte:fragment slot="cell" let:row let:cell>
        {#if cell.key === 'name'}
            <!-- TODO: https://svelte-5-preview.vercel.app/status -->
            <DefaultFieldTypeNameInput
                rowView={row}
                {uniqueNameTracker}
                inputPlaceholder={TEXT_INPUT_PROMPT}
            />
        {:else if cell.key === 'type'}
            <!-- TODO: https://svelte-5-preview.vercel.app/status -->
            <DefaultFieldTypeDropdown rowView={row} />
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
            <!-- <ToolbarMenu disabled={$isLoading || $isApplyingDefaultFields}>
                <ToolbarMenuItem danger on:click={() => (isModalOpen = true)}
                    >Apply to All</ToolbarMenuItem
                >
            </ToolbarMenu> -->
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
    <p>
        This will go through every conversation node and ensure every default fields exists. Any
        previous default fields that no longer exist will be removed. It's best to do this when no
        one else is actively editing dialogue.
    </p>
    <br />
    <p>This cannot be undone.</p>
</Modal>
