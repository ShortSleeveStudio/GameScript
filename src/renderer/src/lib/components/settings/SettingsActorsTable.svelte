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
    import { get } from 'svelte/store';
    import {
        TABLE_ID_ACTORS,
        type Actor,
        type Localization,
        TABLE_ID_LOCALIZATIONS,
    } from '@lib/api/db/db-schema';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import FocusButton from '../common/FocusButton.svelte';
    import type { FocusPayloadActor } from '@lib/stores/app/focus';
    import type { DataTableHeader } from 'carbon-components-svelte/src/DataTable/DataTable.svelte';
    import {
        ACTORS_DEFAULT_COLOR,
        ACTORS_DEFAULT_NAME,
        ACTORS_PLACEHOLDER_NAME,
        ACTORS_UNDO_NAME,
    } from '@lib/constants/settings';
    import { actorsTable } from '@lib/tables/actors';
    import { db } from '@lib/api/db/db';
    import type { DbConnection } from 'preload/api-db';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import RowNameInput from '../common/RowNameInput.svelte';
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
    import { createFilter } from '@lib/api/db/db-filter';
    import { APP_NAME } from '@common/constants';

    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const headers: DataTableHeader[] = [
        { key: 'name', value: 'Name' },
        { key: 'focus', empty: true, minWidth: FOCUS_BUTTON_WIDTH, width: FOCUS_BUTTON_WIDTH },
    ];
    const focusPayload: FocusPayloadActor = {
        uniqueNameTracker: uniqueNameTracker,
    };
    let selectedRowIds: number[] = [];
    let isLoading: IsLoadingStore = new IsLoadingStore();

    async function addRow(): Promise<void> {
        let newActor: Actor;
        let localizedName: Localization;
        await isLoading.wrapPromise(
            db.executeTransaction(async (conn: DbConnection) => {
                // Create localized name
                const localizationArg = <Localization>{
                    parent: null,
                    isSystemCreated: true,
                };
                localizedName = await db.createRow(TABLE_ID_LOCALIZATIONS, localizationArg, conn);

                // Create Actor
                newActor = await db.createRow(
                    TABLE_ID_ACTORS,
                    <Actor>{
                        name: ACTORS_DEFAULT_NAME,
                        color: ACTORS_DEFAULT_COLOR,
                        localizedName: localizedName.id,
                        isSystemCreated: false,
                    },
                    conn,
                );
            }),
        );

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'actor creation',
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await db.deleteRow(TABLE_ID_ACTORS, newActor, conn);
                        await db.deleteRow(TABLE_ID_LOCALIZATIONS, localizedName, conn);
                    });
                }),
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        localizedName = await db.createRow(
                            TABLE_ID_LOCALIZATIONS,
                            localizedName,
                            conn,
                        );
                        newActor = await db.createRow(TABLE_ID_ACTORS, newActor, conn);
                    });
                }),
            ),
        );
    }

    async function deleteRows(): Promise<void> {
        // Grab actor rows to delete
        let actorsToDelete: Actor[] = actorsTable.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // Grab localized names
        const localizationIdsToDelete: number[] = actorsToDelete.map(
            (actor) => actor.localizedName,
        );

        // Delete
        let localizationsToDelete: Localization[];
        await isLoading.wrapPromise(
            db.executeTransaction(async (conn: DbConnection) => {
                await db.deleteRows(TABLE_ID_ACTORS, actorsToDelete, conn);
                localizationsToDelete = await db.fetchRowsRaw<Localization>(
                    TABLE_ID_LOCALIZATIONS,
                    createFilter()
                        .where()
                        .column('id')
                        .in(localizationIdsToDelete)
                        .endWhere()
                        .build(),
                    conn,
                );
                await db.deleteRows(TABLE_ID_LOCALIZATIONS, localizationsToDelete, conn);
            }),
        );

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'actor deletion',
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await db.createRows(TABLE_ID_LOCALIZATIONS, localizationsToDelete, conn);
                        await db.createRows(TABLE_ID_ACTORS, actorsToDelete, conn);
                    });
                }),
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await db.deleteRows(TABLE_ID_ACTORS, actorsToDelete, conn);
                        await db.deleteRows(TABLE_ID_LOCALIZATIONS, localizationsToDelete, conn);
                    });
                }),
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
                <RowNameInput
                    rowView={row}
                    undoText={ACTORS_UNDO_NAME}
                    inputPlaceholder={ACTORS_PLACEHOLDER_NAME}
                    {uniqueNameTracker}
                    isInspectorField={false}
                />
            {:else if cell.key === 'focus'}
                <FocusButton rowView={row} payload={focusPayload} />
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
                    icon={$isLoading ? InlineLoading : undefined}>Add Actor</Button
                >
            </ToolbarContent>
        </Toolbar>
    </DataTable>
</p>
