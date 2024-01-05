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
    import { APP_NAME } from '@lib/constants/app';
    import { get, type Readable } from 'svelte/store';
    import { autoCompleteTable } from '@lib/tables/auto-complete';
    import { TABLE_ID_AUTO_COMPLETES, type AutoComplete } from '@lib/api/db/db-schema';
    import { languages } from 'monaco-editor';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import RowNameInput from '../common/RowNameInput.svelte';
    import FocusButton from '../common/FocusButton.svelte';
    import type { FocusPayloadAutoComplete } from '@lib/stores/app/focus';
    import type { DataTableHeader } from 'carbon-components-svelte/src/DataTable/DataTable.svelte';

    const TEXT_INPUT_PROMPT = 'Enter a auto-complete label';
    const headers: DataTableHeader[] = [
        { key: 'label', value: 'Label' },
        { key: 'focus', empty: true },
    ];
    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const focusPayload: FocusPayloadAutoComplete = {
        uniqueNameTracker: uniqueNameTracker,
        namePlaceholder: TEXT_INPUT_PROMPT,
    };
    let selectedRowIds: number[] = [];
    // TODO: https://svelte-5-preview.vercel.app/status
    let isLoading: Readable<boolean> = autoCompleteTable.isLoading;

    async function addRow(): Promise<void> {
        let newAutoComplete: AutoComplete = <AutoComplete>{
            name: 'NewLabel',
            kind: languages.CompletionItemKind.Function,
            insertion: 'NewTextToInsert',
        };
        let newRow: AutoComplete = await autoCompleteTable.createRow(newAutoComplete);
        // Register undo/redo
        undoManager.register(
            new Undoable(
                'Auto-Complete creation',
                async () => {
                    await autoCompleteTable.deleteRow(newRow);
                },
                async () => {
                    newRow = await autoCompleteTable.createRow(newRow);
                },
            ),
        );
    }

    async function deleteRows(): Promise<void> {
        let rowsToDelete: AutoComplete[] = [];
        get(autoCompleteTable).forEach((defaultFieldRowView: IDbRowView<AutoComplete>) => {
            const autoComplete: AutoComplete = get(defaultFieldRowView);
            if (selectedRowIds.includes(autoComplete.id)) {
                rowsToDelete.push(autoComplete);
            }
        });
        selectedRowIds = [];
        // Delete rows
        await autoCompleteTable.deleteRows(rowsToDelete);
        // Register undo/redo
        undoManager.register(
            new Undoable(
                'Auto-complete deletion',
                async () => {
                    rowsToDelete = await autoCompleteTable.createRows(rowsToDelete);
                },
                async () => {
                    await autoCompleteTable.deleteRows(rowsToDelete);
                },
            ),
        );
    }
</script>

<p>
    <DataTable
        size="medium"
        title="Auto-Complete Strings"
        description="This table is populated with auto-complete strings that are made available 
        anywhere you write code within {APP_NAME}."
        batchSelection
        bind:selectedRowIds
        {headers}
        rows={$autoCompleteTable}
    >
        <svelte:fragment slot="cell-header" let:header>
            {header.value}
        </svelte:fragment>

        <svelte:fragment slot="cell" let:row let:cell>
            {#if cell.key === 'label'}
                <!-- TODO: https://svelte-5-preview.vercel.app/status -->
                <RowNameInput
                    rowView={row}
                    {uniqueNameTracker}
                    inputPlaceholder={TEXT_INPUT_PROMPT}
                    isInspectorField={false}
                />
            {:else if cell.key === 'focus'}
                <FocusButton
                    rowType={TABLE_ID_AUTO_COMPLETES}
                    rowView={row}
                    payload={focusPayload}
                />
            {/if}
        </svelte:fragment>

        <Toolbar size="sm">
            <ToolbarBatchActions>
                <Button icon={TrashCan} on:click={deleteRows}>Delete</Button>
            </ToolbarBatchActions>
            <ToolbarContent>
                <Button
                    on:click={addRow}
                    disabled={$isLoading}
                    icon={$isLoading ? InlineLoading : undefined}>Add Auto-Complete</Button
                >
            </ToolbarContent>
        </Toolbar>
    </DataTable>
</p>
