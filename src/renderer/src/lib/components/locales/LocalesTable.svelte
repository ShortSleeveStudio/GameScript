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
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import {
        type LocalePrincipal,
        TABLE_ID_LOCALES,
        type Locale,
        TABLE_ID_LOCALIZATIONS,
        FIELD_TYPE_ID_TEXT,
        TABLE_ID_LOCALE_PRINCIPAL,
    } from '@lib/api/db/db-schema';
    import type { FocusPayloadLocale } from '@lib/stores/app/focus';
    import type { DataTableHeader } from 'carbon-components-svelte/src/DataTable/DataTable.svelte';
    import { FOCUS_BUTTON_WIDTH } from '@lib/constants/app';
    import {
        LOCALE_PLACEHOLDER_NAME,
        LOCALE_UNDO_NAME,
        LOCALE_UNDO_PRIMARY,
    } from '@lib/constants/settings';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { db } from '@lib/api/db/db';
    import { locales } from '@lib/tables/locales';
    import RowColumnRadio from '../common/RowColumnRadio.svelte';
    import { localePrincipalTableView } from '@lib/tables/locale-principal';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { get } from 'svelte/store';
    import type { DbConnection } from 'preload/api-db';
    import { localeIdToColumn } from '@lib/utility/locale';
    import { systemCreatedLocaleRowView } from '@lib/tables/locale-system-created';

    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const focusPayload: FocusPayloadLocale = {
        uniqueNameTracker: uniqueNameTracker,
    };
    const headers: DataTableHeader[] = [
        { key: 'name', value: 'Name' },
        { key: 'isPrimary', value: 'Primary' },
        { key: 'focus', empty: true, minWidth: FOCUS_BUTTON_WIDTH, width: FOCUS_BUTTON_WIDTH },
    ];
    let selectedRowIds: number[] = [];
    let isLoading: IsLoadingStore = new IsLoadingStore();

    async function createLocale(toCreate: Locale, conn: DbConnection): Promise<Locale> {
        // Create Locale
        toCreate = await db.createRow(TABLE_ID_LOCALES, toCreate, conn);

        // Create Column
        await db.createColumn(
            TABLE_ID_LOCALIZATIONS,
            localeIdToColumn(toCreate.id),
            FIELD_TYPE_ID_TEXT,
            conn,
        );
        return toCreate;
    }

    async function deleteLocale(toDelete: Locale, conn: DbConnection): Promise<void> {
        // If this is primary, switch to another
        if (get(localePrincipalRowView).principal === toDelete.id) {
            db.updateRow(
                TABLE_ID_LOCALE_PRINCIPAL,
                <LocalePrincipal>{ id: 0, principal: get(systemCreatedLocaleRowView).id },
                conn,
            );
        }

        // Delete Column
        await db.deleteColumn(TABLE_ID_LOCALIZATIONS, localeIdToColumn(toDelete.id), conn);

        // Delete Locale
        await db.deleteRow(TABLE_ID_LOCALES, toDelete, conn);
    }

    const addRow: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        let newLocale: Locale = <Locale>{
            name: 'New Locale',
            isSystemCreated: false,
        };

        await db.executeTransaction(async (conn: DbConnection) => {
            newLocale = await createLocale(newLocale, conn);
        });

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `locale creation`,
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await deleteLocale(newLocale, conn);
                    });
                }),
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        newLocale = await createLocale(newLocale, conn);
                    });
                }),
            ),
        );
    });

    const deleteRows: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        // Grab rows to delete
        let rowsToDelete: Locale[] = locales.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;

        // Delete Rows
        await db.executeTransaction(async (conn: DbConnection) => {
            for (let i = 0; i < rowsToDelete.length; i++) {
                await deleteLocale(rowsToDelete[i], conn);
            }
        });

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'locale deletion',
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        for (let i = 0; i < rowsToDelete.length; i++) {
                            await createLocale(rowsToDelete[i], conn);
                        }
                    });
                }),
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        for (let i = 0; i < rowsToDelete.length; i++) {
                            await deleteLocale(rowsToDelete[i], conn);
                        }
                    });
                }),
            ),
        );
    });

    // TODO
    // https://svelte-5-preview.vercel.app/status
    // These single row tables could be stateful variables of a class
    let localePrincipalRowView: IDbRowView<LocalePrincipal>;
    localePrincipalTableView.subscribe((rowViews: IDbRowView<LocalePrincipal>[]) => {
        if (rowViews.length === 1) {
            localePrincipalRowView = rowViews[0];
        }
    });
</script>

<p>
    <DataTable
        size="medium"
        title="Locales"
        description="This is where you list the locales you intend to use for localization.
        Each locale you create will have a corresponding text field in your localization tables.
        Please be careful. Deleting a locale is a destructive operation that will wipe out all
        translations for that locale."
        batchSelection
        bind:selectedRowIds
        nonSelectableRowIds={$locales
            .filter((rowView) => get(rowView).isSystemCreated)
            .map((row) => row.id)}
        {headers}
        rows={$locales}
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
            {:else if cell.key === 'isPrimary'}
                <!-- TODO: https://svelte-5-preview.vercel.app/status -->
                <RowColumnRadio
                    rowView={row}
                    undoText={LOCALE_UNDO_PRIMARY}
                    principalStore={localePrincipalRowView}
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
                    icon={$isLoading ? InlineLoading : undefined}>Add Locale</Button
                >
            </ToolbarContent>
        </Toolbar>
    </DataTable>
</p>
