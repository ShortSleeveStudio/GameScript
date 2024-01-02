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
        Column,
        Row,
    } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';
    import { get, type Readable } from 'svelte/store';
    import DefaultFieldTypeDropdown from './DefaultFieldTypeDropdown.svelte';
    import DefaultFieldTypeNameInput from './DefaultFieldTypeNameInput.svelte';
    import { Async, TrashCan } from 'carbon-icons-svelte';
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import { fade } from 'svelte/transition';
    import { durationFast02 } from '@lib/constants/motion';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { isApplyingDefaultFields } from '@lib/stores/app/applying-default-fields';
    import {
        FIELD_TYPE_ID_ACTOR,
        TABLE_NAME_FIELDS,
        type FieldRow,
        type NodeRow,
        type Field,
        type DefaultField,
        TABLE_ID_CONVERSATIONS,
    } from '@lib/api/db/db-schema';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import { createFilter } from '@lib/api/db/db-filter';
    import { db } from '@lib/api/db/db';
    import { wait } from '@lib/utility/wait';
    import { conversationDefaultFields } from '@lib/tables/default-fields';

    // export let defaultFieldsNode: IDbRowView<NodeRow>;

    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const TEXT_INPUT_PROMPT = 'Enter a unique field name';
    const headers = [
        { key: 'name', value: 'Name' },
        { key: 'type', value: 'Type' },
    ];
    let selectedRowIds: number[] = [];
    let isModalOpen: boolean = false;
    let applyFieldsProgress: number = 0;
    // TODO: https://svelte-5-preview.vercel.app/status
    let isLoading: Readable<boolean> = conversationDefaultFields.isLoading;

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
        console.log('FIX ME TO BE UNIQUE');
        let newDefaultField: DefaultField = <DefaultField>{
            name: 'New Field',
            type: FIELD_TYPE_ID_ACTOR,
            parentType: TABLE_ID_CONVERSATIONS,
        };
        let newRow: DefaultField = await conversationDefaultFields.createRow(newDefaultField);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'Default field creation',
                async () => {
                    await conversationDefaultFields.deleteRow(newRow);
                },
                async () => {
                    newRow = await conversationDefaultFields.createRow(newRow);
                },
            ),
        );
    }

    async function deleteRows(): Promise<void> {
        let rowsToDelete: DefaultField[] = [];
        get(conversationDefaultFields).forEach((defaultFieldRowView: IDbRowView<DefaultField>) => {
            const defaultField: DefaultField = get(defaultFieldRowView);
            if (selectedRowIds.includes(defaultField.id)) {
                rowsToDelete.push(defaultField);
            }
        });
        selectedRowIds = [];

        // Delete rows
        await conversationDefaultFields.deleteRows(rowsToDelete);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'Default field deletion',
                async () => {
                    rowsToDelete = await conversationDefaultFields.createRows(rowsToDelete);
                },
                async () => {
                    await conversationDefaultFields.deleteRows(rowsToDelete);
                },
            ),
        );
    }
</script>

<Row>
    <Column>
        <h2>Conversation Editor</h2>
        <DataTable
            size="medium"
            title="Default Fields"
            description="These fields will appear in all new conversation nodes.
            You can also apply these fields across existing nodes in the options menu."
            batchSelection
            bind:selectedRowIds
            {headers}
            rows={$conversationDefaultFields}
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
                                labelText={applyFieldsProgress < 100
                                    ? 'Applying to All...'
                                    : 'Done!'}
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
    </Column>
</Row>

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
