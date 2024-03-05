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
    import { type LocalePrincipal, type Locale } from '@common/common-schema';
    import type { FocusPayloadLocale } from '@lib/stores/app/focus';
    import type { DataTableHeader } from 'carbon-components-svelte/src/DataTable/DataTable.svelte';
    import { FOCUS_BUTTON_WIDTH } from '@lib/constants/app';
    import {
        LOCALE_PLACEHOLDER_NAME,
        LOCALE_UNDO_NAME,
        LOCALE_UNDO_PRIMARY,
    } from '@lib/constants/settings';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { locales } from '@lib/tables/locales';
    import RowColumnRadio from '../common/RowColumnRadio.svelte';
    import { localePrincipalTableView } from '@lib/tables/locale-principal';
    import { get } from 'svelte/store';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { localeCreate, localesDelete } from '@lib/crud/locale-crud';
    import { db } from '@lib/api/db/db';

    const uniqueNameTracker: UniqueNameTracker = new UniqueNameTracker();
    const focusPayload: FocusPayloadLocale = <FocusPayloadLocale>{
        uniqueNameTracker: uniqueNameTracker,
    };
    const headers: DataTableHeader[] = [
        { key: 'name', value: 'Name' },
        { key: 'isPrimary', value: 'Primary' },
        { key: 'focus', empty: true, minWidth: FOCUS_BUTTON_WIDTH, width: FOCUS_BUTTON_WIDTH },
    ];
    let selectedRowIds: number[] = [];
    let isLoading: IsLoadingStore = new IsLoadingStore();

    async function addRow(): Promise<void> {
        await localeCreate(
            db,
            <Locale>{
                name: 'New Locale',
                isSystemCreated: false,
            },
            isLoading,
        );
    }

    async function deleteRows(): Promise<void> {
        let rowsToDelete: Locale[] = locales.getRowsById(selectedRowIds);
        selectedRowIds.length = 0;
        await localesDelete(db, rowsToDelete, isLoading);
    }

    // TODO
    // https://svelte-5-preview.vercel.app/status
    // These single row tables could be stateful variables of a class
    let localePrincipalRowView: IDbRowView<LocalePrincipal>;
    localePrincipalTableView.subscribe((rowViews: IDbRowView<LocalePrincipal>[]) => {
        if (rowViews.length === 1 && localePrincipalRowView !== rowViews[0]) {
            localePrincipalRowView = rowViews[0];
            focusPayload.localePrincipalRowView = localePrincipalRowView;
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
                    icon={$isLoading ? InlineLoading : undefined}>Add Locale</Button
                >
            </ToolbarContent>
        </Toolbar>
    </DataTable>
</p>
