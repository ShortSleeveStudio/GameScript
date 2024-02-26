<script lang="ts">
    import {
        createGrid,
        type ColDef,
        type GridApi,
        type GridOptions,
        type IDatasource,
        type ManagedGridOptions,
        type RowClickedEvent,
        type TextFilterModel,
    } from '@ag-grid-community/core';
    import {
        TABLE_LOCALIZATIONS,
        TABLE_ROUTINES,
        type DatabaseTableType,
        TABLE_LOCALES,
    } from '@common/common-types';
    import { db } from '@lib/api/db/db';
    import { createFilter } from '@lib/api/db/db-filter';
    import { type Localization, type Locale, type Row, type Routine } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { LAYOUT_ID_SEARCH } from '@lib/constants/default-layout';
    import {
        EVENT_DOCK_SELECTION_CHANGED,
        type DockSelectionChanged,
        type DbColumnDeleting,
        EVENT_DB_COLUMN_DELETING,
    } from '@lib/constants/events';
    import {
        GRID_CACHE_BLOCK_SIZE,
        GRID_CACHE_MAX_BLOCKS,
        GRID_FILTER_PARAMS_NUMBER,
        GRID_FILTER_PARAMS_TEXT,
    } from '@lib/constants/grid';
    import { focusOnNodeOfLocalization, focusOnNodeOfRoutine } from '@lib/graph/graph-helpers';
    import { GridCellRenderer } from '@lib/grid/grid-cell-renderer';
    import type { GridContext } from '@lib/grid/grid-context';
    import { GridDatasource } from '@lib/grid/grid-datasource';
    import { datasourceFilterWhere } from '@lib/grid/grid-datasource-helpers';
    import { isDarkMode } from '@lib/stores/app/darkmode';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { TableWatcher } from '@lib/stores/utility/table-watcher';
    import { locales } from '@lib/tables/locales';
    import { wasEnterPressed } from '@lib/utility/keybinding';
    import { localeIdToColumn } from '@common/common-locale';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import {
        Button,
        ContentSwitcher,
        Switch,
        TextInput,
        Dropdown,
        Tile,
        Modal,
    } from 'carbon-components-svelte';
    import type { DropdownItem } from 'carbon-components-svelte/types/Dropdown/Dropdown.svelte';
    import { onDestroy, onMount, tick } from 'svelte';
    import { get } from 'svelte/store';

    const COLUMN_ID: string = 'id';
    const COLUMN_CONVERSATION_ID: string = 'parent';
    const COLUMN_CODE: string = 'code';

    const datasourceRoutines: IDatasource = new GridDatasource<Localization>(TABLE_ROUTINES);
    const datasourceLocalizations: IDatasource = new GridDatasource<Localization>(
        TABLE_LOCALIZATIONS,
    );

    const staticColumns: ColDef[] = [
        {
            pinned: 'left',
            headerName: 'ID',
            colId: COLUMN_ID,
            resizable: false,
            cellRenderer: GridCellRenderer,
            filter: 'agNumberColumnFilter',
            filterParams: GRID_FILTER_PARAMS_NUMBER,
            checkboxSelection: true,
        },
        {
            headerName: 'Conversation ID',
            colId: COLUMN_CONVERSATION_ID,
            resizable: false,
            cellRenderer: GridCellRenderer,
            filter: 'agNumberColumnFilter',
            filterParams: GRID_FILTER_PARAMS_NUMBER,
        },
    ];

    let api: GridApi;
    let gridElement: HTMLElement;
    let columnDefs: ColDef[] = [...staticColumns];
    let codeOrTextIndex: number = 0;
    let selectedLocale: number = 0;
    let localeDropdownOptions: DropdownItem[] = [];
    let tableWatcher: TableWatcher<Locale>;
    let isCode: boolean = false;
    let searchString: string = '';
    let replaceString: string = '';
    let currentSearchColumnId: string;
    let isLoading: IsLoadingStore = new IsLoadingStore();
    let isModalOpen: boolean = false;
    let selectedRows: IDbRowView<Localization | Routine>[] = [];

    function onContentChanged(): void {
        // Update isCode
        isCode = codeOrTextIndex === 1;

        // Update grid
        if (isCode) {
            columnDefs = [
                ...staticColumns,
                <ColDef>{
                    headerName: 'Code',
                    colId: COLUMN_CODE,
                    resizable: false,
                    cellRenderer: GridCellRenderer,
                    filter: 'agTextColumnFilter',
                    filterParams: GRID_FILTER_PARAMS_TEXT,
                },
            ];
            api.setFilterModel(null);
            api.applyColumnState({
                defaultState: { sort: null },
            });
            api.updateGridOptions(<ManagedGridOptions>{
                datasource: datasourceRoutines,
                columnDefs: columnDefs,
            });
            currentSearchColumnId = COLUMN_CODE;
        } else {
            api.setFilterModel(null);
            api.applyColumnState({
                defaultState: { sort: null },
            });
            api.updateGridOptions(<ManagedGridOptions>{
                datasource: datasourceLocalizations,
            });
            onLocaleSelected();
        }
    }

    async function onLocalesChanged(): Promise<void> {
        // Update dropdown options
        let selectedIdExists: boolean = false;
        localeDropdownOptions = get(locales).map((locale: IDbRowView<Locale>) => {
            if (locale.id === selectedLocale) selectedIdExists = true;
            return <DropdownItem>{
                id: locale.id,
                text: get(locale).name,
            };
        });
        if (!selectedIdExists && localeDropdownOptions.length > 0) {
            selectedLocale = localeDropdownOptions[0].id;
        }
        await tick();
        if (!isCode) onLocaleSelected();
    }

    function onLocaleSelected(): void {
        searchString = '';
        let localeRowView: IDbRowView<Locale> = undefined;
        const localeViews: IDbRowView<Locale>[] = get(locales);
        for (let i = 0; i < localeViews.length; i++) {
            const locale: IDbRowView<Locale> = localeViews[i];
            if (locale.id === selectedLocale) {
                localeRowView = locale;
                break;
            }
        }
        if (!localeRowView) return;

        // Purge old columns
        columnDefs.length = 0;

        // Add static columns
        for (let i = 0; i < staticColumns.length; i++) {
            const staticColumn: ColDef = staticColumns[i];
            columnDefs.push(staticColumn);
        }

        // Add locale column
        const locale: Locale = get(localeRowView);
        const localeColumnId: string = localeIdToColumn(locale.id);
        columnDefs.push({
            headerName: locale.name,
            colId: localeColumnId,
            cellRenderer: GridCellRenderer,
            filter: 'agTextColumnFilter',
            filterParams: GRID_FILTER_PARAMS_TEXT,
        });

        // Set new column defs
        api?.setGridOption('columnDefs', columnDefs);

        // Update column width
        api?.autoSizeAllColumns();

        // Set search column id
        currentSearchColumnId = localeColumnId;
    }

    function onSelectionChanged(): void {
        selectedRows = <IDbRowView<Localization | Routine>[]>api.getSelectedRows();
    }

    async function onRowClicked(
        event: RowClickedEvent<IDbRowView<Row>, GridContext>,
    ): Promise<void> {
        if (isCode) {
            await focusOnNodeOfRoutine(<Routine>get(event.data));
        } else {
            await focusOnNodeOfLocalization(<Localization>get(event.data));
        }
    }

    function onSearch(): void {
        const filterModel: TextFilterModel =
            api.getColumnFilterModel(currentSearchColumnId) ??
            <TextFilterModel>{ filterType: 'text' };
        filterModel.type = 'contains';
        filterModel.filter = searchString;
        api.setColumnFilterModel(currentSearchColumnId, filterModel);
        api.onFilterChanged();
    }

    function onSearchKeyUp(e: KeyboardEvent): void {
        if (wasEnterPressed(e)) {
            onSearch();
        }
    }

    function onReplaceKeyUp(e: KeyboardEvent): void {
        if (wasEnterPressed(e)) {
            onSearch();
        }
    }

    async function onReplace(): Promise<void> {
        if (!searchString) return;
        if (selectedRows.length > 0) {
            const oldRows = [];
            const newRows = [];
            for (let i = 0; i < selectedRows.length; i++) {
                const originalRow: Routine | Localization = get(selectedRows[i]);
                const oldRow: Routine | Localization = { ...originalRow };
                oldRows.push(oldRow);

                const newRow: Routine | Localization = { ...originalRow };
                newRow[currentSearchColumnId] = (<string>newRow[currentSearchColumnId])
                    .split(searchString)
                    .join(replaceString);
                newRows.push(newRow);
            }

            // Update rows
            const tableType: DatabaseTableType = isCode ? TABLE_ROUTINES : TABLE_LOCALIZATIONS;
            await isLoading.wrapPromise(db.updateRows(tableType, newRows));

            // Register undo/redo
            undoManager.register(
                new Undoable(
                    `${isCode ? 'routine' : 'localization'} change`,
                    isLoading.wrapFunction(async () => {
                        await db.updateRows(tableType, oldRows);
                    }),
                    isLoading.wrapFunction(async () => {
                        await db.updateRows(tableType, newRows);
                    }),
                ),
            );
        } else {
            isModalOpen = true;
        }
    }

    async function onConfirmReplaceAll(): Promise<void> {
        // Close modal
        isModalOpen = false;

        // Replace all
        let tableType: DatabaseTableType = isCode ? TABLE_ROUTINES : TABLE_LOCALIZATIONS;
        await isLoading.wrapPromise(
            db.searchAndReplace(
                tableType,
                datasourceFilterWhere(createFilter(), api.getFilterModel()),
                currentSearchColumnId,
                searchString,
                replaceString,
            ),
        );
    }

    function getGridApi(): GridApi {
        return api;
    }

    const onDockFocusChanged: (e: CustomEvent<DockSelectionChanged>) => void = (
        e: CustomEvent<DockSelectionChanged>,
    ) => {
        if (e.detail.layoutId === LAYOUT_ID_SEARCH) {
            api?.autoSizeAllColumns();
        }
    };

    const onLocaleDeleting: (e: CustomEvent<DbColumnDeleting>) => void = (
        e: CustomEvent<DbColumnDeleting>,
    ) => {
        const tableType: DatabaseTableType = (<CustomEvent<DbColumnDeleting>>e).detail.tableType;
        if (tableType.id === TABLE_LOCALES.id) {
            api.setFilterModel(null);
            api.applyColumnState({
                defaultState: { sort: null },
            });
        }
    };

    onMount(() => {
        // Create grid options
        const gridOptions: GridOptions = <GridOptions>{
            context: <GridContext>{ getGridApi: getGridApi },
            rowModelType: 'infinite',
            columnDefs: columnDefs,
            rowSelection: 'multiple',
            suppressRowClickSelection: true,
            onSelectionChanged: onSelectionChanged,
            onRowClicked: onRowClicked,
            defaultColDef: {
                suppressMovable: true,
                sortable: true,
                editable: false,
                enableValue: false,
                enableRowGroup: false,
                enablePivot: false,
                flex: 2,
            },
            cacheBlockSize: GRID_CACHE_BLOCK_SIZE,
            maxBlocksInCache: GRID_CACHE_MAX_BLOCKS,
            autoSizeStrategy: {
                type: 'fitCellContents',
            },
            stopEditingWhenCellsLoseFocus: true,
            datasource: isCode ? datasourceRoutines : datasourceLocalizations,
        };
        api = createGrid(gridElement, gridOptions);

        // Create table watcher
        tableWatcher = new TableWatcher(locales);
        tableWatcher.subscribe(onLocalesChanged);

        // Add event listeners
        addEventListener(EVENT_DOCK_SELECTION_CHANGED, onDockFocusChanged);
        addEventListener(EVENT_DB_COLUMN_DELETING, onLocaleDeleting);
    });
    onDestroy(() => {
        // Remove event listeners
        removeEventListener(EVENT_DOCK_SELECTION_CHANGED, onDockFocusChanged);
        removeEventListener(EVENT_DB_COLUMN_DELETING, onLocaleDeleting);

        // Dispose of table watcher
        tableWatcher?.dispose();

        // Destroy table
        api?.destroy();
    });
</script>

<span class="container">
    <span class="top">
        <Tile>
            <div class="control-container">
                <div class="control-item with-gap"><sup>Content</sup></div>
                <div class="control-item with-gap">
                    <ContentSwitcher
                        size="sm"
                        on:change={onContentChanged}
                        bind:selectedIndex={codeOrTextIndex}
                    >
                        <Switch disabled={api === undefined || $isLoading} text="Localized Text" />
                        <Switch disabled={api === undefined || $isLoading} text="Code" />
                    </ContentSwitcher>
                </div>
                {#if !isCode}
                    <div class="control-item"><sup>Locale</sup></div>
                    <div class="control-item">
                        <Dropdown
                            id="locale-dropdown"
                            style="width: 100%;"
                            size="sm"
                            disabled={localeDropdownOptions.length === 0 || $isLoading}
                            bind:selectedId={selectedLocale}
                            items={localeDropdownOptions}
                            on:select={onLocaleSelected}
                        />
                    </div>
                {/if}
                <div class="control-item"><sup>Search</sup></div>
                <div class="control-item">
                    <span class="defeat-form-requirement">
                        <TextInput
                            size="sm"
                            placeholder="Search"
                            style="width: 100%;"
                            disabled={$isLoading}
                            bind:value={searchString}
                            on:keyup={onSearchKeyUp}
                            on:blur={onSearch}
                        />
                    </span>
                </div>
                <div class="control-item"><sup>Replace</sup></div>
                <div class="control-item">
                    <span class="defeat-form-requirement">
                        <TextInput
                            size="sm"
                            disabled={$isLoading}
                            placeholder="Replace"
                            bind:value={replaceString}
                            on:keyup={onReplaceKeyUp}
                        />
                    </span>
                </div>
                <div class="control-item"></div>
                <div class="control-item">
                    <span class="button-set">
                        <Button
                            disabled={$isLoading || !searchString}
                            size="small"
                            kind="danger"
                            style="flex-grow: 1;"
                            on:click={onReplace}
                            >Replace {selectedRows.length > 0 ? 'Selected' : 'All'}</Button
                        >
                        <Button
                            disabled={$isLoading}
                            size="small"
                            style="flex-grow: 1;"
                            on:click={onSearch}>Search</Button
                        >
                    </span>
                </div>
            </div>
        </Tile>
    </span>
    <span class="bottom">
        <span
            style="height: 100%;"
            class={$isDarkMode
                ? 'ag-theme-quartz-dark ag-theme-custom'
                : 'ag-theme-quartz ag-theme-custom'}
            bind:this={gridElement}
        ></span>
    </span>
</span>

<Modal
    size="sm"
    danger
    bind:open={isModalOpen}
    modalHeading="Are you sure?"
    primaryButtonText="Replace All"
    secondaryButtonText="Cancel"
    on:click:button--secondary={() => (isModalOpen = false)}
    on:submit={onConfirmReplaceAll}
>
    <p>Replacing text like this cannot be undone.</p>
</Modal>

<style>
    .container {
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: flex-start;
        align-items: stretch;
    }
    .bottom {
        flex-grow: 1;
    }
    .button-set {
        width: 100%;
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
    }

    .control-container {
        display: grid;
        grid-template-columns: 1fr 5fr;
        justify-items: stretch;
        align-items: center;
    }

    .control-item > sup {
        margin-bottom: 0;
    }

    .with-gap {
        margin-bottom: 0px;
        /* var(--cds-layout-02); */
    }
</style>
