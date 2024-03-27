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
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import RowNameInput from '../common/RowNameInput.svelte';
    import type { DataTableHeader } from 'carbon-components-svelte/src/DataTable/DataTable.svelte';
    import {
        NODE_PROPERTY_TEMPLATE_PLACEHOLDER_NAME,
        NODE_PROPERTY_TEMPLATE_UNDO_NAME,
    } from '@lib/constants/settings';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { nodePropertyTemplates } from '@lib/tables/node-property-templates';
    import RowColumnDropdown from '../common/RowColumnDropdown.svelte';
    import {
        PROPERTY_TYPE_DROPDOWN_ITEMS,
        PROPERTY_TYPE_STRING,
        TABLE_NODE_PROPERTIES,
        TABLE_NODE_PROPERTY_TEMPLATES,
    } from '@common/common-types';
    import type { NodeProperty, NodePropertyTemplate } from '@common/common-schema';
    import { db } from '@lib/api/db/db';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import type { DbConnection } from '@common/common-db-types';
    import { createFilter } from '@lib/api/db/db-filter';
    import { SQL_BATCH_SIZE } from '@common/common-db';

    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const headers: DataTableHeader[] = [
        { key: 'name', value: 'Name' },
        { key: 'type', value: 'Type', minWidth: '220px', width: '220px' },
    ];
    let selectedRowIds: number[] = [];
    let isLoading: IsLoadingStore = new IsLoadingStore();

    // async function createFilter(toCreate: Filter, conn: DbConnection): Promise<Filter> {
    //     // Create Filter
    //     toCreate = await db.createRow(TABLE_FILTERS, toCreate, conn);

    //     // Create Column
    //     await db.createColumn(
    //         TABLE_CONVERSATIONS,
    //         filterIdToColumn(toCreate.id),
    //         FIELD_TYPE_TEXT.id,
    //         conn,
    //     );
    //     return toCreate;
    // }

    // async function deleteFilter(toDelete: Filter, conn: DbConnection): Promise<void> {
    //     // Delete Column
    //     await db.deleteColumn(TABLE_CONVERSATIONS, filterIdToColumn(toDelete.id), conn);

    //     // Delete Locale
    //     await db.deleteRow(TABLE_FILTERS, toDelete, conn);
    // }

    async function addRow(): Promise<void> {
        let newTemplate: NodePropertyTemplate = <NodePropertyTemplate>{
            name: 'New Property',
            type: PROPERTY_TYPE_STRING.id,
        };

        // Create template
        newTemplate = await isLoading.wrapPromise(
            db.createRow(TABLE_NODE_PROPERTY_TEMPLATES, newTemplate),
        );

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'property creation',
                isLoading.wrapFunction(async () => {
                    await db.deleteRow(TABLE_NODE_PROPERTY_TEMPLATES, newTemplate);
                }),
                isLoading.wrapFunction(async () => {
                    await db.createRow(TABLE_NODE_PROPERTY_TEMPLATES, newTemplate);
                }),
            ),
        );
    }

    async function deleteRows(): Promise<void> {
        // Grab rows to delete
        let rowsToDelete: NodePropertyTemplate[] =
            nodePropertyTemplates.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // Delete Rows
        await isLoading.wrapPromise(
            db.executeTransaction(async (conn: DbConnection) => {
                for (let i = 0; i < rowsToDelete.length; i++) {
                    // Grab row to delete
                    const templateToDelete: NodePropertyTemplate = rowsToDelete[i];

                    // Fetch all properties using this template in batches and destroy
                    const propCount = await db.fetchRowCount(
                        TABLE_NODE_PROPERTIES,
                        createFilter()
                            .where()
                            .column('template')
                            .eq(templateToDelete.id)
                            .endWhere()
                            .build(),
                        conn,
                    );
                    for (let j = 0; j < propCount; j += SQL_BATCH_SIZE) {
                        const limit: number = SQL_BATCH_SIZE;
                        const offset: number = j;
                        const propsToDelete: NodeProperty[] = await db.fetchRowsRaw<NodeProperty>(
                            TABLE_NODE_PROPERTIES,
                            createFilter()
                                .where()
                                .column('template')
                                .eq(templateToDelete.id)
                                .endWhere()
                                .limit(limit)
                                .offset(offset)
                                .build(),
                            conn,
                        );
                        await db.deleteRows(TABLE_NODE_PROPERTIES, propsToDelete, conn);
                    }

                    // Delete the template
                    await db.deleteRow(TABLE_NODE_PROPERTY_TEMPLATES, templateToDelete, conn);
                }
            }),
        );

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'property deletion',
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await db.createRows(TABLE_NODE_PROPERTY_TEMPLATES, rowsToDelete, conn);
                    });
                }),
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await db.deleteRows(TABLE_NODE_PROPERTY_TEMPLATES, rowsToDelete, conn);
                    });
                }),
            ),
        );
    }
</script>

<p>
    <DataTable
        size="medium"
        title="Custom Node Properties"
        description="Custom node properties allow you to associate arbitrary primitive values with
        nodes in your conversation graphs. When you inspect a node, you can add as few or as many of
        these properties as you see fit. Please be careful. Deleting a custom property is a
        destructive operation that will wipe out all properties of that type that you've added to
        your nodes."
        batchSelection
        bind:selectedRowIds
        {headers}
        rows={$nodePropertyTemplates}
    >
        <svelte:fragment slot="cell-header" let:header>
            {header.value}
        </svelte:fragment>

        <svelte:fragment slot="cell" let:row let:cell>
            {#if cell.key === 'name'}
                <RowNameInput
                    rowView={row}
                    undoText={NODE_PROPERTY_TEMPLATE_UNDO_NAME}
                    {uniqueNameTracker}
                    inputPlaceholder={NODE_PROPERTY_TEMPLATE_PLACEHOLDER_NAME}
                    isInspectorField={false}
                />
            {:else if cell.key === 'type'}
                <RowColumnDropdown
                    rowView={row}
                    columnName={'type'}
                    undoText={NODE_PROPERTY_TEMPLATE_UNDO_NAME}
                    dropdownItems={PROPERTY_TYPE_DROPDOWN_ITEMS}
                />
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
                    icon={$isLoading ? InlineLoading : undefined}>Add Property</Button
                >
            </ToolbarContent>
        </Toolbar>
    </DataTable>
</p>
