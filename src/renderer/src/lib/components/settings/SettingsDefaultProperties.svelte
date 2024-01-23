<script lang="ts">
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
    import { type Writable } from 'svelte/store';
    import RowColumnDropdown from '../common/RowColumnDropdown.svelte';
    import { Async, TrashCan } from 'carbon-icons-svelte';
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import { fade } from 'svelte/transition';
    import { durationFast02 } from '@lib/constants/motion';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import {
        PROPERTY_TYPE_DROP_DOWN_ITEMS,
        type DatabaseTableId,
        PROPERTY_TYPE_IDS,
        type DefaultProperty,
        TABLE_ID_DEFAULT_PROPERTIES,
    } from '@lib/api/db/db-schema';
    import { wait } from '@lib/utility/wait';
    import RowNameInput from '../common/RowNameInput.svelte';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { db } from '@lib/api/db/db';

    export let defaultProperties: IDbTableView<DefaultProperty>;
    export let isApplyingDefaultProperties: Writable<boolean>;
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
    let applyPropertiesProgress: number = 0;
    let isLoading: IsLoadingStore = new IsLoadingStore();

    async function applyDefaultProperties(): Promise<void> {
        // TODO: implement me
        console.log('implement me');
        if ($isApplyingDefaultProperties) return;
        applyPropertiesProgress = 0;
        $isApplyingDefaultProperties = true;
        isModalOpen = false;
        for (; applyPropertiesProgress < 100; applyPropertiesProgress += 10) {
            await wait(300);
        }
        await wait(600);
        $isApplyingDefaultProperties = false;
    }

    const addRow: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        // Create Default Property
        let newDefaultProperty: DefaultProperty = <DefaultProperty>{
            name: 'New Property',
            type: PROPERTY_TYPE_IDS[0],
            parentType: parentType,
        };
        let newRow: DefaultProperty = await db.createRow(
            TABLE_ID_DEFAULT_PROPERTIES,
            newDefaultProperty,
        );

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'default property creation',
                isLoading.wrapOperationAsync(async () => {
                    await db.deleteRow(TABLE_ID_DEFAULT_PROPERTIES, newRow);
                }),
                isLoading.wrapOperationAsync(async () => {
                    newRow = await db.createRow(TABLE_ID_DEFAULT_PROPERTIES, newRow);
                }),
            ),
        );
    });

    const deleteRows: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        // Grab rows to delete
        let rowsToDelete: DefaultProperty[] = defaultProperties.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // Delete rows
        await db.deleteRows(TABLE_ID_DEFAULT_PROPERTIES, rowsToDelete);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'default property deletion',
                isLoading.wrapOperationAsync(async () => {
                    rowsToDelete = await db.createRows(TABLE_ID_DEFAULT_PROPERTIES, rowsToDelete);
                }),
                isLoading.wrapOperationAsync(async () => {
                    await db.deleteRows(TABLE_ID_DEFAULT_PROPERTIES, rowsToDelete);
                }),
            ),
        );
    });
</script>

<DataTable
    size="medium"
    title={tableTitle}
    description={tableDescription}
    batchSelection
    bind:selectedRowIds
    {headers}
    rows={$defaultProperties}
>
    <svelte:fragment slot="cell-header" let:header>
        {header.value}
    </svelte:fragment>

    <svelte:fragment slot="cell" let:row let:cell>
        {#if cell.key === 'name'}
            <!-- TODO: https://svelte-5-preview.vercel.app/status -->
            <RowNameInput
                rowView={row}
                isNameLocked={isApplyingDefaultProperties}
                undoText={nameUndoText}
                {uniqueNameTracker}
                inputPlaceholder={namePlaceholderText}
                isInspectorField={false}
            />
        {:else if cell.key === 'type'}
            <!-- TODO: https://svelte-5-preview.vercel.app/status - also nameof<DefaultProperty>('type') -->
            <RowColumnDropdown
                rowView={row}
                dropdownItems={PROPERTY_TYPE_DROP_DOWN_ITEMS}
                isDisabled={$isApplyingDefaultProperties}
                undoText={typeUndoText}
                columnName={'type'}
            />
        {/if}
    </svelte:fragment>

    <Toolbar size="sm">
        {#if !$isApplyingDefaultProperties}
            <ToolbarBatchActions>
                <Button
                    icon={TrashCan}
                    disabled={$isLoading || $isApplyingDefaultProperties}
                    on:click={deleteRows}>Delete</Button
                >
            </ToolbarBatchActions>
        {/if}
        <ToolbarContent>
            {#if $isApplyingDefaultProperties}
                <span style="width: 100%;" transition:fade={{ duration: durationFast02 }}>
                    <ProgressBar
                        kind="indented"
                        value={applyPropertiesProgress}
                        max={100}
                        labelText={applyPropertiesProgress < 100 ? 'Applying to All...' : 'Done!'}
                    />
                </span>
            {/if}
            <Button
                size="small"
                disabled={$isLoading || $isApplyingDefaultProperties}
                kind="danger-tertiary"
                iconDescription="Apply to All"
                tooltipPosition="left"
                icon={Async}
                on:click={() => (isModalOpen = true)}
            />
            <Button
                on:click={addRow}
                disabled={$isLoading || $isApplyingDefaultProperties}
                icon={$isLoading ? InlineLoading : undefined}>Add Property</Button
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
    on:submit={applyDefaultProperties}
>
    <p>{modalText}</p>
    <br />
    <p>This cannot be undone.</p>
</Modal>
