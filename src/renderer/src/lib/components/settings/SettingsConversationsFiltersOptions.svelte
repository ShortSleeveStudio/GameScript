<script lang="ts">
    import { TABLE_ID_FILTERS, type Filter } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import {
        Button,
        DataTable,
        InlineLoading,
        Toolbar,
        ToolbarBatchActions,
        ToolbarContent,
    } from 'carbon-components-svelte';
    import SettingsConversationsFiltersOptionsInput from './SettingsConversationsFiltersOptionsInput.svelte';
    import type { DataTableHeader } from 'carbon-components-svelte/types/DataTable/DataTable.svelte';
    import { TrashCan } from 'carbon-icons-svelte';
    import { FILTER_PLACEHOLDER_OPTION, FILTER_UNDO_OPTION } from '@lib/constants/settings';
    import { db } from '@lib/api/db/db';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';

    export let rowView: IDbRowView<Filter>;

    interface FilterOption {
        id: number;
        option: string;
    }

    const uniqueNameTracker: Set<string> = new Set();
    const headers: DataTableHeader[] = [{ key: 'option', value: 'Name' }];
    let selectedRowIds: string[] = [];
    let isLoading: IsLoadingStore = new IsLoadingStore();
    let rows: FilterOption[] = [];
    $: rows = onRowUpdated($rowView.options);

    function onRowUpdated(options: string): FilterOption[] {
        uniqueNameTracker.clear();
        return options
            ? JSON.parse(options).map((option: string) => {
                  uniqueNameTracker.add(option);
                  return { id: option, option: option };
              })
            : [];
    }

    async function updateRow(): Promise<void> {
        const names = Array.from(uniqueNameTracker);
        names.sort();
        const filter: Filter = <Filter>{
            id: rowView.id,
            options: JSON.stringify(names),
        };
        await db.updateRow(TABLE_ID_FILTERS, filter);
    }

    function removeAll(options: string[]): void {
        for (let i = 0; i < options.length; i++) {
            uniqueNameTracker.delete(options[i]);
        }
    }

    function addAll(options: string[]): void {
        for (let i = 0; i < options.length; i++) {
            uniqueNameTracker.add(options[i]);
        }
    }

    async function replaceRow(from: string | undefined, to: string | undefined): Promise<void> {
        // Generate new list
        if (from !== undefined) uniqueNameTracker.delete(from);
        if (to !== undefined) uniqueNameTracker.add(to);
        await updateRow();
    }

    const addRow: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        let newOption: string = '';

        // Update option
        console.log(uniqueNameTracker);
        await replaceRow(undefined, newOption);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'filter option creation',
                isLoading.wrapOperationAsync(async () => {
                    await replaceRow(newOption, undefined);
                }),
                isLoading.wrapOperationAsync(async () => {
                    await replaceRow(undefined, newOption);
                }),
            ),
        );
    });

    const deleteRows: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        // Grab filter options to delete
        const toDelete: string[] = [...selectedRowIds];
        selectedRowIds.length = 0;

        // Update
        removeAll(toDelete);
        await updateRow();

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'filter option deletion',
                isLoading.wrapOperationAsync(async () => {
                    addAll(toDelete);
                    await updateRow();
                }),
                isLoading.wrapOperationAsync(async () => {
                    removeAll(toDelete);
                    await updateRow();
                }),
            ),
        );
    });
</script>

<DataTable size="medium" batchSelection bind:selectedRowIds {headers} {rows}>
    <svelte:fragment slot="cell-header" let:header>
        {header.value}
    </svelte:fragment>

    <svelte:fragment slot="cell" let:cell>
        {#if cell.key === 'option'}
            <!-- TODO: https://svelte-5-preview.vercel.app/status -->
            <SettingsConversationsFiltersOptionsInput
                undoText={FILTER_UNDO_OPTION}
                inputPlaceholder={FILTER_PLACEHOLDER_OPTION}
                boundValue={cell.value}
                {replaceRow}
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
                icon={$isLoading ? InlineLoading : undefined}>Add Option</Button
            >
        </ToolbarContent>
    </Toolbar>
</DataTable>
