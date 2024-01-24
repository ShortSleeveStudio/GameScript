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
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import RowNameInput from '../common/RowNameInput.svelte';
    import {
        FIELD_TYPE_ID_TEXT,
        TABLE_ID_CONVERSATIONS,
        TABLE_ID_FILTERS,
        TABLE_ID_LOCALES,
        type Filter,
    } from '@lib/api/db/db-schema';
    import type { FocusPayloadFilter } from '@lib/stores/app/focus';
    import type { DataTableHeader } from 'carbon-components-svelte/src/DataTable/DataTable.svelte';
    import { FOCUS_BUTTON_WIDTH } from '@lib/constants/app';
    import { LOCALE_PLACEHOLDER_NAME, LOCALE_UNDO_NAME } from '@lib/constants/settings';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { filters } from '@lib/tables/filters';
    import { db } from '@lib/api/db/db';
    import type { DbConnection } from 'preload/api-db';
    import { filterIdToColumn } from '@lib/utility/filters';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';

    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const focusPayload: FocusPayloadFilter = <FocusPayloadFilter>{
        uniqueNameTracker: uniqueNameTracker,
    };
    const headers: DataTableHeader[] = [
        { key: 'name', value: 'Name' },
        { key: 'focus', empty: true, minWidth: FOCUS_BUTTON_WIDTH, width: FOCUS_BUTTON_WIDTH },
    ];
    let selectedRowIds: number[] = [];
    let isLoading: IsLoadingStore = new IsLoadingStore();

    async function createFilter(toCreate: Filter, conn: DbConnection): Promise<Filter> {
        // Create Filter
        toCreate = await db.createRow(TABLE_ID_FILTERS, toCreate, conn);

        // Create Column
        await db.createColumn(
            TABLE_ID_CONVERSATIONS,
            filterIdToColumn(toCreate.id),
            FIELD_TYPE_ID_TEXT,
            conn,
        );
        return toCreate;
    }

    async function deleteFilter(toDelete: Filter, conn: DbConnection): Promise<void> {
        // Delete Column
        await db.deleteColumn(TABLE_ID_CONVERSATIONS, filterIdToColumn(toDelete.id), conn);

        // Delete Locale
        await db.deleteRow(TABLE_ID_FILTERS, toDelete, conn);
    }

    const addRow: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        let newFilter: Filter = <Filter>{
            name: 'New Filter',
        };

        // Create filter
        await db.executeTransaction(async (conn: DbConnection) => {
            await createFilter(newFilter, conn);
        });

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `filter creation`,
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await deleteFilter(newFilter, conn);
                    });
                }),
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        newFilter = await createFilter(newFilter, conn);
                    });
                }),
            ),
        );
    });

    const deleteRows: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        // Grab rows to delete
        let rowsToDelete: Filter[] = filters.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // Delete Rows
        await db.executeTransaction(async (conn: DbConnection) => {
            for (let i = 0; i < rowsToDelete.length; i++) {
                await deleteFilter(rowsToDelete[i], conn);
            }
        });

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'filter deletion',
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        for (let i = 0; i < rowsToDelete.length; i++) {
                            await createFilter(rowsToDelete[i], conn);
                        }
                    });
                }),
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        for (let i = 0; i < rowsToDelete.length; i++) {
                            await deleteFilter(rowsToDelete[i], conn);
                        }
                    });
                }),
            ),
        );
    });
</script>

<p>
    <DataTable
        size="medium"
        title="Filters"
        description="Here you can specify the list of columns that will appear at the top of the 
        conversation finder. You can tag conversations with a unique value per filter to make 
        searching for conversations easier. Please be careful. Deleting a filter is a destructive 
        operation that will wipe out all tags you've added to your conversations."
        batchSelection
        bind:selectedRowIds
        {headers}
        rows={$filters}
    >
        <svelte:fragment slot="cell-header" let:header>
            {header.value}
        </svelte:fragment>

        <svelte:fragment slot="cell" let:row let:cell>
            {#if cell.key === 'name'}
                <!-- TODO: https://svelte-5-preview.vercel.app/status -->
                <RowNameInput
                    rowView={row}
                    undoText={LOCALE_UNDO_NAME}
                    {uniqueNameTracker}
                    inputPlaceholder={LOCALE_PLACEHOLDER_NAME}
                    isInspectorField={false}
                />
            {:else if cell.key === 'focus'}
                <FocusButton rowType={TABLE_ID_LOCALES} rowView={row} payload={focusPayload} />
            {/if}
        </svelte:fragment>

        <Toolbar size="sm">
            <ToolbarBatchActions>
                <Button icon={TrashCan} disabled={$isLoading} on:click={deleteRows}>Delete</Button>
            </ToolbarBatchActions>
            <ToolbarContent>
                <Button
                    on:click={addRow}
                    disabled={$isLoading}
                    icon={$isLoading ? InlineLoading : undefined}>Add Filter</Button
                >
            </ToolbarContent>
        </Toolbar>
    </DataTable>
</p>
