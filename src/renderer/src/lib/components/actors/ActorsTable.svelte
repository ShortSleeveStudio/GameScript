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
    import { APP_NAME, FOCUS_BUTTON_WIDTH } from '@lib/constants/app';
    import { get, type Readable, type Unsubscriber } from 'svelte/store';
    import { TABLE_ID_ACTORS, type Actor, type Localization } from '@lib/api/db/db-schema';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import FocusButton from '../common/FocusButton.svelte';
    import type { FocusPayloadActor } from '@lib/stores/app/focus';
    import type { DataTableHeader } from 'carbon-components-svelte/src/DataTable/DataTable.svelte';
    import RowColumnInput from '../common/RowColumnInput.svelte';
    import {
        ACTORS_DEFAULT_COLOR,
        ACTORS_DEFAULT_NAME,
        ACTORS_PLACEHOLDER_NAME,
        ACTORS_UNDO_NAME,
    } from '@lib/constants/actors';
    import { actorsTable } from '@lib/tables/actors';
    import {
        actorLocalizationTableRowView,
        actorLocalizations,
    } from '@lib/tables/actor-localization';
    import { db } from '@lib/api/db/db';
    import { defaultLocaleRowView } from '@lib/tables/default-locale';
    import { localeIdToColumn } from '@lib/utility/locale';

    const headers: DataTableHeader[] = [
        { key: 'name', value: 'Name' },
        { key: 'focus', empty: true, minWidth: FOCUS_BUTTON_WIDTH, width: FOCUS_BUTTON_WIDTH },
    ];
    const focusPayload: FocusPayloadActor = {};
    let selectedRowIds: number[] = [];
    // TODO: https://svelte-5-preview.vercel.app/status
    let isLoading: Readable<boolean> = actorsTable.isLoading;

    async function addRow(): Promise<void> {
        let newActor: Actor;
        let localizedName: Localization;
        await db.executeTransaction(async () => {
            // Ensure localization table row view exists
            if (!actorLocalizationTableRowView || !actorLocalizations || !defaultLocaleRowView) {
                throw new Error('No database connection');
            }

            // Create localized name
            const localizationArg = <Localization>{
                parent: actorLocalizationTableRowView.id,
                isSystemCreated: true,
            };
            localizationArg[localeIdToColumn(defaultLocaleRowView.id)] = ACTORS_DEFAULT_NAME;
            localizedName = await actorLocalizations.createRow(localizationArg);
            throw new Error('TESTING');

            // Create Actor
            newActor = await actorsTable.createRow(<Actor>{
                name: ACTORS_DEFAULT_NAME,
                color: ACTORS_DEFAULT_COLOR,
                localizedName: localizedName.id,
                isSystemCreated: false,
            });
        });

        // let newRow: AutoComplete = await autoCompleteTable.createRow(newAutoComplete);
        // // Register undo/redo
        // undoManager.register(
        //     new Undoable(
        //         'auto-complete creation',
        //         async () => {
        //             await autoCompleteTable.deleteRow(newRow);
        //         },
        //         async () => {
        //             newRow = await autoCompleteTable.createRow(newRow);
        //         },
        //     ),
        // );
    }

    async function deleteRows(): Promise<void> {
        return;
        // Grab rows to delete
        let rowsToDelete: Actor[] = actorsTable.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // must delete localization too, see list above

        // Delete rows
        await actorsTable.deleteRows(rowsToDelete);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'actor deletion',
                async () => {
                    rowsToDelete = await actorsTable.createRows(rowsToDelete);
                },
                async () => {
                    await actorsTable.deleteRows(rowsToDelete);
                },
            ),
        );
    }
</script>

<p>
    <DataTable
        size="medium"
        title="Actors"
        description="Actors are the entities that participate in conversations. The initial actor 
        can be renamed, but not deleted. {APP_NAME} requires at least one actor."
        batchSelection
        bind:selectedRowIds
        nonSelectableRowIds={$actorsTable
            .filter((rowView) => get(rowView).isSystemCreated)
            .map((row) => row.id)}
        {headers}
        rows={$actorsTable}
    >
        <svelte:fragment slot="cell-header" let:header>
            {header.value}
        </svelte:fragment>

        <svelte:fragment slot="cell" let:row let:cell>
            {#if cell.key === 'name'}
                <!-- TODO: https://svelte-5-preview.vercel.app/status -->
                <RowColumnInput
                    rowView={row}
                    undoText={ACTORS_UNDO_NAME}
                    columnName={'name'}
                    inputPlaceholder={ACTORS_PLACEHOLDER_NAME}
                />
            {:else if cell.key === 'focus'}
                <FocusButton rowType={TABLE_ID_ACTORS} rowView={row} payload={focusPayload} />
            {:else if cell.key === 'isSystemCreated'}
                yes
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
                    icon={$isLoading ? InlineLoading : undefined}>Add Actor</Button
                >
            </ToolbarContent>
        </Toolbar>
    </DataTable>
</p>
