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
    import { FOCUS_BUTTON_WIDTH } from '@lib/constants/app';
    import { type Readable } from 'svelte/store';
    import { autoCompleteTable } from '@lib/tables/auto-complete';
    import { TABLE_ID_AUTO_COMPLETES, type AutoComplete } from '@lib/api/db/db-schema';
    import { languages } from 'monaco-editor';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import RowNameInput from '../common/RowNameInput.svelte';
    import FocusButton from '../common/FocusButton.svelte';
    import type { FocusPayloadAutoComplete } from '@lib/stores/app/focus';
    import type { DataTableHeader } from 'carbon-components-svelte/src/DataTable/DataTable.svelte';
    import RowColumnText from '../common/RowColumnText.svelte';
    import {
        AUTO_COMPLETE_PLACEHOLDER_LABEL,
        AUTO_COMPLETE_UNDO_LABEL,
    } from '@lib/constants/settings';

    const headers: DataTableHeader[] = [
        { key: 'label', value: 'Label' },
        { key: 'insertion', value: 'Text to Insert' },
        { key: 'focus', empty: true, minWidth: FOCUS_BUTTON_WIDTH, width: FOCUS_BUTTON_WIDTH },
    ];
    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const focusPayload: FocusPayloadAutoComplete = {
        uniqueNameTracker: uniqueNameTracker,
    };
    let selectedRowIds: number[] = [];
    // TODO: https://svelte-5-preview.vercel.app/status
    let isLoading: Readable<boolean> = autoCompleteTable.isLoading;

    async function addRow(): Promise<void> {
        let newAutoComplete: AutoComplete = <AutoComplete>{
            name: 'WalkTo',
            icon: languages.CompletionItemKind.Function,
            rule: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            insertion: 'WalkTo(${1:actor}, ${2:location});',
            documentation: '',
        };
        let newRow: AutoComplete = await autoCompleteTable.createRow(newAutoComplete);
        // Register undo/redo
        undoManager.register(
            new Undoable(
                'auto-complete creation',
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
        // Grab rows to delete
        let rowsToDelete: AutoComplete[] = autoCompleteTable.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // Delete rows
        await autoCompleteTable.deleteRows(rowsToDelete);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'auto-complete deletion',
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
        anywhere you write code within {window.api.constants.APP_NAME}."
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
                    undoText={AUTO_COMPLETE_UNDO_LABEL}
                    {uniqueNameTracker}
                    inputPlaceholder={AUTO_COMPLETE_PLACEHOLDER_LABEL}
                    isInspectorField={false}
                />
            {:else if cell.key === 'insertion'}
                <RowColumnText rowView={row} columnName={'insertion'} />
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
