<script lang="ts">
    import {
        GRID_CACHE_BLOCK_SIZE,
        GRID_CACHE_MAX_BLOCKS,
        GRID_FILTER_PARAMS_NUMBER,
        GRID_FILTER_PARAMS_TEXT,
        getCopyOfSelectedAndDeselect,
        loadGridLayout,
    } from '@lib/constants/grid';
    import { GridCellRenderer } from '@lib/grid/grid-cell-renderer';
    import { GridCellEditorText } from '@lib/grid/grid-cell-editor-text';
    import { type Locale, type Localization, type Row } from '@common/common-schema';
    import { GridDatasource } from '@lib/grid/grid-datasource';
    import {
        type ColDef,
        GridApi,
        type IDatasource,
        type ColumnState,
        type IRowNode,
        type ToolPanelDef,
        createGrid,
        type GridOptions,
        type NumberFilterModel,
        type FilterModel,
        type EditableCallbackParams,
        type RowClickedEvent,
    } from '@ag-grid-community/core';
    import { TableWatcher } from '@lib/stores/utility/table-watcher';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { get } from 'svelte/store';
    import { LS_KEY_LOCALIZATION } from '@lib/constants/local-storage';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { localeIdToColumn } from '@common/common-locale';
    import { onDestroy, onMount } from 'svelte';
    import type { GridContext } from '@lib/grid/grid-context';
    import {
        FOCUS_MODE_REPLACE,
        FOCUS_REPLACE,
        focusManager,
        type FocusRequest,
        type FocusRequests,
    } from '@lib/stores/app/focus';
    import { locales } from '@lib/tables/locales';
    import {
        EVENT_LOCALIZATIONS_FILTER_BY_PARENT,
        EVENT_SHUTDOWN,
        isCustomEvent,
        type DockSelectionChanged,
        EVENT_DOCK_SELECTION_CHANGED,
        type GridFilterByParentRequest,
        type DbColumnDeleting,
        EVENT_DB_COLUMN_DELETING,
    } from '@lib/constants/events';
    import GridToolbar from '../common/GridToolbar.svelte';
    import { Button, InlineLoading } from 'carbon-components-svelte';
    import { TrashCan } from 'carbon-icons-svelte';
    import { db } from '@lib/api/db/db';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { GridCellEditorConversationId } from '@lib/grid/grid-cell-editor-conversation-id';
    import { LAYOUT_ID_LOCALIZATION_EDITOR } from '@lib/constants/default-layout';
    import WidgetContainer from '../common/WidgetContainer.svelte';
    import { isDarkMode } from '@lib/stores/app/darkmode';
    import {
        TABLE_LOCALES,
        TABLE_LOCALIZATIONS,
        type DatabaseTableType,
    } from '@common/common-types';
    const CONVERSATION_ID_COLUMN: string = 'parent';
    const FOCUS_REQUEST: FocusRequest = <FocusRequest>{
        tableType: TABLE_LOCALIZATIONS,
        type: FOCUS_REPLACE,
    };
    const columnIdSet: Set<string> = new Set();
    const datasource: IDatasource = new GridDatasource<Localization>(TABLE_LOCALIZATIONS);
    const staticColumns: ColDef[] = [
        {
            pinned: 'left',
            headerName: 'ID',
            colId: 'id',
            resizable: false,
            cellRenderer: GridCellRenderer,
            editable: false,
            filter: 'agNumberColumnFilter',
            filterParams: GRID_FILTER_PARAMS_NUMBER,
            checkboxSelection: true,
        },
        {
            headerName: 'Conversation ID',
            colId: CONVERSATION_ID_COLUMN,
            resizable: false,
            cellRenderer: GridCellRenderer,
            cellEditor: GridCellEditorConversationId,
            // cellStyle: (params: CellClassParams<IDbRowView<Localization>>) => {
            //     if (params.data && get(params.data).is_system_created) {
            //         return { cursor: 'not-allowed' };
            //     }
            //     return null;
            // },
            editable: isCellEditable,
            filter: 'agNumberColumnFilter',
            filterParams: GRID_FILTER_PARAMS_NUMBER,
        },
        {
            headerName: 'Name',
            colId: 'name',
            filter: 'agTextColumnFilter',
            cellEditor: GridCellEditorText,
            cellRenderer: GridCellRenderer,
            filterParams: GRID_FILTER_PARAMS_TEXT,
        },
    ];

    let api: GridApi;
    let gridElement: HTMLElement;
    let tableWatcher: TableWatcher<Locale>;
    let loadLayoutRequested: boolean = false;
    let columnDefs: ColDef[] = [...staticColumns];
    let selectedRows: IDbRowView<Localization>[] = [];
    let isLoading: IsLoadingStore = new IsLoadingStore();

    function getGridApi(): GridApi {
        return api;
    }

    function isCellEditable(params: EditableCallbackParams<IDbRowView<Localization>>): boolean {
        return !!params.data && !get(params.data).is_system_created;
    }

    function isRowSelectable(params: IRowNode<IDbRowView<Localization>>): boolean {
        return !!params.data && !get(params.data).is_system_created;
    }

    function onSelectionChanged(): void {
        selectedRows = <IDbRowView<Localization>[]>api.getSelectedRows();
    }

    function onRowClicked(event: RowClickedEvent<IDbRowView<Localization>, GridContext>): void {
        const rowView: IDbRowView<Localization> = event.data;
        FOCUS_REQUEST.focus = new Map();
        FOCUS_REQUEST.focus.set(rowView.id, { rowId: rowView.id });
        focusManager.focus(<FocusRequests>{
            type: FOCUS_MODE_REPLACE,
            requests: [FOCUS_REQUEST],
        });
    }

    function onCancel(): void {
        api.deselectAll();
    }

    async function onCreate(): Promise<void> {
        // If a single conversation is selected, add to that
        let conversationId: number | null = null;
        const filterModel: FilterModel = api.getFilterModel();
        if ('parent' in filterModel) {
            const filter: NumberFilterModel = <NumberFilterModel>filterModel['parent'];
            if (filter.type === 'equals' && filter.filter) {
                conversationId = filter.filter;
            }
        }

        let newLocalization: Localization = <Localization>{
            name: '',
            is_system_created: false,
            parent: conversationId,
        };

        // Create localization
        let newRow: Localization = await isLoading.wrapPromise(
            db.createRow(TABLE_LOCALIZATIONS, newLocalization),
        );

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'localization creation',
                isLoading.wrapFunction(async () => {
                    await db.deleteRow(TABLE_LOCALIZATIONS, newRow);
                }),
                isLoading.wrapFunction(async () => {
                    newRow = await db.createRow(TABLE_LOCALIZATIONS, newRow);
                }),
            ),
        );
    }

    async function onDelete(): Promise<void> {
        // Find localizations to delete
        const selected: Localization[] = getCopyOfSelectedAndDeselect(api, selectedRows);

        // Delete localizations
        await isLoading.wrapPromise(db.deleteRows(TABLE_LOCALIZATIONS, selected));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'conversation deletion',
                isLoading.wrapFunction(async () => {
                    await db.createRows(TABLE_LOCALIZATIONS, selected);
                }),
                isLoading.wrapFunction(async () => {
                    await db.deleteRows(TABLE_LOCALIZATIONS, selected);
                }),
            ),
        );
    }

    function onFiltersChanged<RowType extends Row>(tableView: IDbTableView<RowType>): void {
        // Grab row views
        const rowViews: IDbRowView<RowType>[] = get(tableView);
        if (rowViews.length === 0) return;

        // Purge old columns
        columnIdSet.clear();
        columnDefs.length = 0;

        // Add static columns
        for (let i = 0; i < staticColumns.length; i++) {
            const staticColumn: ColDef = staticColumns[i];
            columnIdSet.add(staticColumn.colId);
            columnDefs.push(staticColumn);
        }

        // Add dynamic columns
        for (let i = 0; i < rowViews.length; i++) {
            const row: RowType = get(rowViews[i]);
            const colId: string = localeIdToColumn(row.id);
            columnIdSet.add(colId);
            columnDefs.push({
                headerName: row.name,
                colId: colId,
                cellEditor: GridCellEditorText,
                cellRenderer: GridCellRenderer,
                filter: 'agTextColumnFilter',
                filterParams: GRID_FILTER_PARAMS_TEXT,
            });
        }

        // Set new column defs
        api?.setGridOption('columnDefs', columnDefs);

        // Check if we need to load layout
        if (loadLayoutRequested) {
            loadGridLayout(api, LS_KEY_LOCALIZATION, columnIdSet);
            loadLayoutRequested = false;
        }

        // Update column width
        api?.autoSizeAllColumns();
    }

    const onShutdown: () => void = () => {
        if (!api) return;
        const savedState: ColumnState[] = api.getColumnState();
        localStorage.setItem(LS_KEY_LOCALIZATION, JSON.stringify(savedState));
    };

    const onFilterByParent: (e: Event) => void = (e: Event) => {
        if (!isCustomEvent(e)) throw new Error('Selection request was missing payload');
        const filterRequest = e as CustomEvent<GridFilterByParentRequest>;
        const parentId: number = filterRequest.detail.parent;

        // Check if filter is required
        const currentModel: NumberFilterModel = <NumberFilterModel>(
            api.getFilterModel()[CONVERSATION_ID_COLUMN]
        );
        if (currentModel && currentModel.filter === parentId) return;

        // Filter
        const model: FilterModel = {};
        model[CONVERSATION_ID_COLUMN] = <NumberFilterModel>{
            filterType: 'number',
            filter: parentId,
            type: 'equals',
        };
        api.setFilterModel(model);
    };

    const onDockFocusChanged: (e: CustomEvent<DockSelectionChanged>) => void = (
        e: CustomEvent<DockSelectionChanged>,
    ) => {
        if (e.detail.layoutId === LAYOUT_ID_LOCALIZATION_EDITOR) {
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
            isRowSelectable: isRowSelectable,
            defaultColDef: {
                suppressMovable: true,
                sortable: true,
                editable: true,
                enableValue: false,
                enableRowGroup: false,
                enablePivot: false,
                flex: 2,
                maxWidth: 300,
            },
            sideBar: {
                toolPanels: [
                    'filters',
                    <ToolPanelDef>{
                        id: 'columns',
                        labelDefault: 'Columns',
                        labelKey: 'columns',
                        iconKey: 'columns',
                        toolPanel: 'agColumnsToolPanel',
                        toolPanelParams: {
                            suppressRowGroups: true,
                            suppressValues: true,
                            suppressPivots: true,
                            suppressPivotMode: true,
                        },
                    },
                ],
            },
            cacheBlockSize: GRID_CACHE_BLOCK_SIZE,
            maxBlocksInCache: GRID_CACHE_MAX_BLOCKS,
            autoSizeStrategy: {
                type: 'fitCellContents',
            },
            stopEditingWhenCellsLoseFocus: true,
            datasource: datasource,
        };
        api = createGrid(gridElement, gridOptions);

        // Create table watcher
        tableWatcher = new TableWatcher(locales);
        tableWatcher.subscribe(onFiltersChanged);

        // Load Layout
        loadLayoutRequested = true;

        // Event Listeners
        addEventListener(EVENT_SHUTDOWN, onShutdown);
        addEventListener(EVENT_LOCALIZATIONS_FILTER_BY_PARENT, onFilterByParent);
        addEventListener(EVENT_DOCK_SELECTION_CHANGED, onDockFocusChanged);
        addEventListener(EVENT_DB_COLUMN_DELETING, onLocaleDeleting);
    });
    onDestroy(() => {
        // Remove event listeners
        removeEventListener(EVENT_SHUTDOWN, onShutdown);
        removeEventListener(EVENT_LOCALIZATIONS_FILTER_BY_PARENT, onFilterByParent);
        removeEventListener(EVENT_DOCK_SELECTION_CHANGED, onDockFocusChanged);
        removeEventListener(EVENT_DB_COLUMN_DELETING, onLocaleDeleting);

        // Dispose of table watcher
        tableWatcher?.dispose();

        // Destroy table
        api?.destroy();
    });
</script>

<WidgetContainer
    title="Localizations"
    header="For organization, you can associate localizations with arbitrary 
            conversations by changing the conversation ID, or creating a new localization while you 
            have an 'equals' table filter in place for the conversation ID column."
>
    <svelte:fragment slot="toolbar">
        <GridToolbar elementsSelected={selectedRows.length} on:cancel={onCancel}>
            <span slot="create">
                <Button
                    size="small"
                    on:click={onCreate}
                    disabled={$isLoading}
                    icon={$isLoading ? InlineLoading : undefined}>Add Localization</Button
                >
            </span>
            <span slot="delete">
                <Button icon={TrashCan} disabled={$isLoading} on:click={onDelete}>Delete</Button>
            </span>
        </GridToolbar>
    </svelte:fragment>
    <svelte:fragment slot="widget">
        <span
            class={$isDarkMode
                ? 'ag-theme-quartz-dark ag-theme-custom'
                : 'ag-theme-quartz ag-theme-custom'}
            bind:this={gridElement}
        ></span>
    </svelte:fragment>
</WidgetContainer>
