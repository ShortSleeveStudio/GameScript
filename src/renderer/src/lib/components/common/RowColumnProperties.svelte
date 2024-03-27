<script lang="ts">
    import type { NodeProperty, Row } from '@common/common-schema';
    import { TABLE_NODE_PROPERTIES } from '@common/common-types';
    import { db } from '@lib/api/db/db';
    import { createFilter } from '@lib/api/db/db-filter';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import {
        DataTable,
        InlineLoading,
        Toolbar,
        Button,
        ToolbarContent,
        ToolbarBatchActions,
    } from 'carbon-components-svelte';
    import type { DataTableHeader } from 'carbon-components-svelte/types/DataTable/DataTable.svelte';
    import { TrashCan } from 'carbon-icons-svelte';
    import { onDestroy, onMount } from 'svelte';
    import PropertyTemplateDropdown from './PropertyTemplateDropdown.svelte';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import NodePropertyName from './NodePropertyName.svelte';
    import NodePropertyValue from './NodePropertyValue.svelte';

    export let rowView: IDbRowView<Row>;

    let propertyTable: IDbTableView<NodeProperty>;
    let isLoading: IsLoadingStore = new IsLoadingStore();
    let selectedRowIds: number[] = [];
    let templateDropdownSelected: number;
    const headers: DataTableHeader[] = [
        { key: 'name', value: 'Name' },
        { key: 'value', value: 'Value' },
    ];

    async function deleteSelectedRows(): Promise<void> {
        // Grab rows to delete
        let rowsToDelete: NodeProperty[] = propertyTable.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // Delete rows
        await isLoading.wrapPromise(db.deleteRows(TABLE_NODE_PROPERTIES, rowsToDelete));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'node property deletion',
                isLoading.wrapFunction(async () => {
                    await db.createRows(TABLE_NODE_PROPERTIES, rowsToDelete);
                }),
                isLoading.wrapFunction(async () => {
                    await db.deleteRows(TABLE_NODE_PROPERTIES, rowsToDelete);
                }),
            ),
        );
    }

    async function addProperty(): Promise<void> {
        let newProperty: NodeProperty = <NodeProperty>{
            parent: rowView.id, // FK Node
            template: templateDropdownSelected,
        };

        newProperty = await isLoading.wrapPromise(db.createRow(TABLE_NODE_PROPERTIES, newProperty));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'node property creation',
                isLoading.wrapFunction(async () => {
                    await db.deleteRow(TABLE_NODE_PROPERTIES, newProperty);
                }),
                isLoading.wrapFunction(async () => {
                    await db.createRow(TABLE_NODE_PROPERTIES, newProperty);
                }),
            ),
        );
    }

    onMount(() => {
        propertyTable = db.fetchTable<NodeProperty>(
            TABLE_NODE_PROPERTIES,
            createFilter().where().column('parent').eq(rowView.id).endWhere().build(),
        );
    });
    onDestroy(() => {
        if (propertyTable) db.releaseTable(propertyTable);
    });
</script>

<DataTable size="medium" batchSelection bind:selectedRowIds {headers} rows={$propertyTable}>
    <svelte:fragment slot="cell-header" let:header>
        {header.value}
    </svelte:fragment>

    <svelte:fragment slot="cell" let:row let:cell>
        {#if cell.key === 'name'}
            <NodePropertyName rowView={row} />
        {:else if cell.key === 'value'}
            <NodePropertyValue rowView={row} />
        {/if}
    </svelte:fragment>

    <Toolbar size="sm">
        <ToolbarBatchActions>
            <Button icon={TrashCan} disabled={$isLoading} on:click={deleteSelectedRows}
                >Delete</Button
            >
        </ToolbarBatchActions>
        <ToolbarContent>
            <PropertyTemplateDropdown bind:boundValue={templateDropdownSelected} />
            <Button
                on:click={addProperty}
                disabled={$isLoading}
                icon={$isLoading ? InlineLoading : undefined}>Add Property</Button
            >
        </ToolbarContent>
    </Toolbar>
</DataTable>
