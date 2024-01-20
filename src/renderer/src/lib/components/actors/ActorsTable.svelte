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
    import {
        actorLocalizationTableRowView,
        actorLocalizations,
    } from '@lib/tables/actor-localization';
    import { db } from '@lib/api/db/db';
    import { systemCreatedRoutineRowView } from '@lib/tables/locale-system-created';
    import type { DbConnection } from 'preload/api-db';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import RowNameInput from '../common/RowNameInput.svelte';
    import { UniqueNameTracker } from '@lib/utility/unique-name-tracker';

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

    const addRow: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        let newActor: Actor;
        let localizedName: Localization;
        await db.executeTransaction(async (conn: DbConnection) => {
            // Ensure localization table row view exists
            if (
                !actorLocalizationTableRowView ||
                !actorLocalizations ||
                !systemCreatedRoutineRowView
            ) {
                throw new Error('No database connection');
            }

            // Create localized name
            const localizationArg = <Localization>{
                parent: actorLocalizationTableRowView.id,
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
        });

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'actor creation',
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await db.deleteRow(TABLE_ID_ACTORS, newActor, conn);
                        await db.deleteRow(TABLE_ID_LOCALIZATIONS, localizedName, conn);
                    });
                }),
                isLoading.wrapOperationAsync(async () => {
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
    });

    const deleteRows: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        // Grab actor rows to delete
        let actorsToDelete: Actor[] = actorsTable.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // Grab localized names
        let localizationsToDelete: Localization[] = [];
        for (let i = 0; i < actorsToDelete.length; i++) {
            const localization = actorLocalizations.getRowById(actorsToDelete[i].localizedName);
            localizationsToDelete.push(localization);
        }

        // Delete
        await db.executeTransaction(async (conn: DbConnection) => {
            await db.deleteRows(TABLE_ID_ACTORS, actorsToDelete, conn);
            await db.deleteRows(TABLE_ID_LOCALIZATIONS, localizationsToDelete, conn);
        });

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'actor deletion',
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        localizationsToDelete = await db.createRows(
                            TABLE_ID_LOCALIZATIONS,
                            localizationsToDelete,
                            conn,
                        );
                        actorsToDelete = await db.createRows(TABLE_ID_ACTORS, actorsToDelete, conn);
                    });
                }),
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await db.deleteRows(TABLE_ID_ACTORS, actorsToDelete, conn);
                        await db.deleteRows(TABLE_ID_LOCALIZATIONS, localizationsToDelete, conn);
                    });
                }),
            ),
        );
    });
</script>

<p>
    <DataTable
        size="medium"
        title="Actors"
        description="Actors are the entities that participate in conversations. The initial actor 
        can be renamed, but not deleted. {window.api.constants.APP_NAME} requires at least one 
        actor."
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
                <FocusButton rowType={TABLE_ID_ACTORS} rowView={row} payload={focusPayload} />
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
