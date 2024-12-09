<script lang="ts">
    import {
        createGrid,
        type ColDef,
        type GridOptions,
        type IDatasource,
        GridApi,
        type ToolPanelDef,
        type ColumnState,
        type IRowNode,
        type FilterModel,
        type NumberFilterModel,
        type RowClickedEvent,
    } from '@ag-grid-community/core';
    import {
        type Conversation,
        type Filter,
        type Node,
        type Localization,
        type Table,
    } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { GridCellRenderer } from '@lib/grid/grid-cell-renderer';
    import { GridDatasource } from '@lib/grid/grid-datasource';
    import { GridCellEditorText } from '@lib/grid/grid-cell-editor-text';
    import { filters } from '@lib/tables/filters';
    import { Button, InlineLoading, OverflowMenuItem, Modal } from 'carbon-components-svelte';
    import { onDestroy, onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { TableWatcher } from '@lib/stores/utility/table-watcher';
    import {
        EVENT_SHUTDOWN,
        type DockSelectionChanged,
        EVENT_DOCK_SELECTION_CHANGED,
        EVENT_CF_FILTER_BY_PARENT,
        isCustomEvent,
        type GridFilterByParentRequest,
        EVENT_DB_COLUMN_DELETING,
        type DbColumnDeleting,
    } from '@lib/constants/events';
    import { LS_KEY_FINDER_LAYOUT } from '@lib/constants/local-storage';
    import { db } from '@lib/api/db/db';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { Reset, TrashCan } from 'carbon-icons-svelte';
    import { createFilter } from '@lib/api/db/db-filter';
    import {
        GRID_CACHE_BLOCK_SIZE,
        GRID_CACHE_MAX_BLOCKS,
        GRID_FILTER_PARAMS_TEXT,
        GRID_FILTER_PARAMS_NUMBER,
        loadGridLayout,
        getCopyOfSelectedAndDeselect,
    } from '@lib/constants/grid';
    import { type GridContext } from '@lib/grid/grid-context';
    import {
        FOCUS_MODE_REPLACE,
        FOCUS_REPLACE,
        focusManager,
        type FocusRequest,
        type FocusRequests,
    } from '@lib/stores/app/focus';
    import GridToolbar from '../common/GridToolbar.svelte';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import { LAYOUT_ID_CONVERSATION_FINDER } from '@lib/constants/default-layout';
    import WidgetContainer from '../common/WidgetContainer.svelte';
    import { isDarkMode } from '@lib/stores/app/darkmode';
    import { nodesDelete } from '@lib/crud/node-d';
    import { conversationCreate } from '@lib/crud/conversation-c';
    import {
        graphLayoutAutoLayoutDefault,
        graphLayoutVerticalDefault,
    } from '@lib/stores/graph/graph-layout';
    import {
        TABLE_CONVERSATIONS,
        TABLE_FILTERS,
        TABLE_LOCALIZATIONS,
        TABLE_NODES,
    } from '@common/common-types';
    import type { DbConnection } from '@common/common-db-types';
    import { filterIdToColumn } from '@common/common-filter';
    import { BooleanFilter, type BooleanFilterModel } from '@lib/grid/grid-filter-boolean';

    const CONVERSATION_ID_COLUMN: string = 'id';
    const IS_DELETED_COLUMN: string = 'is_deleted';
    const FOCUS_REQUEST: FocusRequest = <FocusRequest>{
        tableType: TABLE_CONVERSATIONS,
        type: FOCUS_REPLACE,
    };
    const columnIdSet: Set<string> = new Set();
    const datasource: IDatasource = new GridDatasource<Conversation>(TABLE_CONVERSATIONS);

    const staticColumns: ColDef[] = [
        {
            pinned: 'left',
            headerName: 'ID',
            colId: CONVERSATION_ID_COLUMN,
            resizable: false,
            cellRenderer: GridCellRenderer,
            editable: false,
            filter: 'agNumberColumnFilter',
            filterParams: GRID_FILTER_PARAMS_NUMBER,
            checkboxSelection: true,
        },
        {
            headerName: 'Name',
            colId: 'name',
            filter: 'agTextColumnFilter',
            cellEditor: GridCellEditorText,
            cellRenderer: GridCellRenderer,
            filterParams: GRID_FILTER_PARAMS_TEXT,
        },
        {
            headerName: 'Is Deleted',
            colId: 'is_deleted',
            // filter: 'agNumberColumnFilter',
            filter: BooleanFilter,
            hide: true,
            lockVisible: true,
            suppressFiltersToolPanel: true,
            suppressColumnsToolPanel: true,
        },
    ];

    let api: GridApi;
    let gridElement: HTMLElement;
    let tableWatcher: TableWatcher<Filter>;
    let loadLayoutRequested: boolean = false;
    let isDeletedVisible: boolean = false;
    let isModalOpen: boolean = false;
    let columnDefs: ColDef[] = [...staticColumns];
    let selectedRows: IDbRowView<Conversation>[] = [];
    let isLoading: IsLoadingStore = new IsLoadingStore();

    function getGridApi(): GridApi {
        return api;
    }

    async function onCreate(): Promise<void> {
        const conversation: Conversation = <Conversation>{
            name: 'New Conversation',
            is_system_created: false,
            notes: '',
            is_deleted: false,
            is_layout_auto: get(graphLayoutAutoLayoutDefault),
            is_layout_vertical: get(graphLayoutVerticalDefault),
        };
        await conversationCreate(conversation, isLoading);
    }

    async function onDeleteForever(): Promise<void> {
        // Find conversations to delete
        const selectedConversations: Conversation[] = getCopyOfSelectedAndDeselect(
            api,
            selectedRows,
        );

        // Delete all selected conversations and their associated localizations/nodes
        await isLoading.wrapPromise(
            db.executeTransaction(async (conn: DbConnection) => {
                for (let i = 0; i < selectedConversations.length; i++) {
                    const conversationToDelete: Conversation = selectedConversations[i];

                    // Delete nodes
                    const nodes: Node[] = await db.fetchRowsRaw<Node>(
                        TABLE_NODES,
                        createFilter()
                            .where()
                            .column('parent')
                            .eq(conversationToDelete.id)
                            .endWhere()
                            .build(),
                        conn,
                    );
                    await nodesDelete(nodes, [], undefined, conn);

                    // Delete localizations
                    const localizations: Localization[] = await db.fetchRowsRaw<Localization>(
                        TABLE_LOCALIZATIONS,
                        createFilter()
                            .where()
                            .column('parent')
                            .eq(conversationToDelete.id)
                            .endWhere()
                            .build(),
                        conn,
                    );
                    await db.deleteRows(TABLE_LOCALIZATIONS, localizations, conn);

                    // Delete conversations
                    await db.deleteRow(TABLE_CONVERSATIONS, conversationToDelete, conn);
                }
            }),
        );

        isModalOpen = false;
    }

    async function onDeleteOrRestore(): Promise<void> {
        // Find conversations to delete
        const selectedConversations: Conversation[] = getCopyOfSelectedAndDeselect(
            api,
            selectedRows,
        );

        // Capture whether this is a restore or a delete
        const isRestore: boolean = isDeletedVisible;

        // Delete conversations
        await isLoading.wrapPromise(markRowsDeleted(selectedConversations, !isRestore));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `conversation ${isRestore ? 'restoration' : 'deletion'}`,
                isLoading.wrapFunction(async () => {
                    await markRowsDeleted(selectedConversations, isRestore);
                }),
                isLoading.wrapFunction(async () => {
                    await markRowsDeleted(selectedConversations, !isRestore);
                }),
            ),
        );
    }

    async function markRowsDeleted(
        conversationsToDelete: Conversation[],
        shouldDelete: boolean,
    ): Promise<void> {
        await db.executeTransaction(async (conn: DbConnection) => {
            // We have to do this here because the database only knows about REAL deletions
            for (let i = 0; i < conversationsToDelete.length; i++) {
                const conversationToDelete = conversationsToDelete[i];
                conversationToDelete.is_deleted = shouldDelete;
                await db.updateRow(TABLE_CONVERSATIONS, conversationToDelete, conn);
            }
        });
        api.refreshInfiniteCache();
    }

    function onCancel(): void {
        api.deselectAll();
    }

    function showIsDeleted(shouldShow: boolean): void {
        const model: FilterModel = api.getFilterModel();
        model[IS_DELETED_COLUMN] = <BooleanFilterModel>{
            filterType: 'boolean',
            filter: shouldShow,
            type: 'equals',
        };
        api.setFilterModel(model);
        isDeletedVisible = shouldShow;
    }

    function clearSort(): void {
        api?.applyColumnState({
            defaultState: { sort: null },
        });
    }

    function clearFilters(): void {
        if (!api) return;
        const newFilterModel: FilterModel = <FilterModel>{};
        newFilterModel[IS_DELETED_COLUMN] = <BooleanFilterModel>{
            filterType: 'boolean',
            filter: false,
            type: 'equals',
        };
        api.setFilterModel(newFilterModel);
    }

    function onSelectionChanged(): void {
        selectedRows = <IDbRowView<Conversation>[]>api.getSelectedRows();
    }

    function onRowClicked(event: RowClickedEvent<IDbRowView<Conversation>, GridContext>): void {
        focusOnConversation(event.data);
    }

    function focusOnConversation(rowView: IDbRowView<Conversation>): void {
        // Focus
        FOCUS_REQUEST.focus = new Map();
        FOCUS_REQUEST.focus.set(rowView.id, { rowId: rowView.id });
        focusManager.focus(<FocusRequests>{
            type: FOCUS_MODE_REPLACE,
            requests: [FOCUS_REQUEST],
        });
    }

    function onFiltersChanged(tableView: IDbTableView<Filter>): void {
        // Grab row views
        const rowViews: IDbRowView<Filter>[] = get(tableView);
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
            const row: Filter = get(rowViews[i]);
            const colId: string = filterIdToColumn(row.id);
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
            loadGridLayout(api, LS_KEY_FINDER_LAYOUT, columnIdSet);
            loadLayoutRequested = false;
        }

        // Update column width
        api?.autoSizeAllColumns();
    }

    const onDockFocusChanged: (e: CustomEvent<DockSelectionChanged>) => void = (
        e: CustomEvent<DockSelectionChanged>,
    ) => {
        if (e.detail.layoutId === LAYOUT_ID_CONVERSATION_FINDER) {
            api?.autoSizeAllColumns();
        }
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

    const onShutdown: () => void = () => {
        if (!api) return;
        const savedState: ColumnState[] = api.getColumnState();
        localStorage.setItem(LS_KEY_FINDER_LAYOUT, JSON.stringify(savedState));
    };

    const onFilterDeleting: (e: CustomEvent<DbColumnDeleting>) => void = (
        e: CustomEvent<DbColumnDeleting>,
    ) => {
        const tableType: Table = (<CustomEvent<DbColumnDeleting>>e).detail.tableType;
        if (tableType.id === TABLE_FILTERS.id) {
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
            isRowSelectable: (params: IRowNode<IDbRowView<Conversation>>) => {
                return !!params.data && !get(params.data).is_system_created;
            },
            defaultColDef: {
                suppressMovable: true,
                sortable: true,
                editable: true,
                enableValue: false,
                enableRowGroup: false,
                enablePivot: false,
                flex: 2,
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
        tableWatcher = new TableWatcher(filters);
        tableWatcher.subscribe(onFiltersChanged);

        // Load Layout
        loadLayoutRequested = true;

        // Set initial isDeleted value
        showIsDeleted(false);

        // Event Listeners
        addEventListener(EVENT_SHUTDOWN, onShutdown);
        addEventListener(EVENT_DOCK_SELECTION_CHANGED, onDockFocusChanged);
        addEventListener(EVENT_CF_FILTER_BY_PARENT, onFilterByParent);
        addEventListener(EVENT_DB_COLUMN_DELETING, onFilterDeleting);
    });
    onDestroy(() => {
        // Remove event listener
        removeEventListener(EVENT_SHUTDOWN, onShutdown);
        removeEventListener(EVENT_DOCK_SELECTION_CHANGED, onDockFocusChanged);
        removeEventListener(EVENT_CF_FILTER_BY_PARENT, onFilterByParent);
        removeEventListener(EVENT_DB_COLUMN_DELETING, onFilterDeleting);

        // Dispose of table watcher
        tableWatcher?.dispose();
        tableWatcher = undefined;

        // Clear state
        columnIdSet.clear();

        // Destroy table
        api?.destroy();
    });
</script>

<WidgetContainer
    title="Conversations"
    header="Conversations are containers for conversation nodes.
        Conversation IDs are also used to group localized text."
>
    <svelte:fragment slot="toolbar">
        <GridToolbar elementsSelected={selectedRows.length} on:cancel={onCancel}>
            <svelte:fragment slot="overflow">
                <OverflowMenuItem
                    text="{isDeletedVisible ? 'Hide' : 'Show'} Deleted"
                    on:click={() => showIsDeleted(!isDeletedVisible)}
                />
                <OverflowMenuItem text="Clear Sort" on:click={() => clearSort()} />
                <OverflowMenuItem text="Clear Filters" on:click={() => clearFilters()} />
            </svelte:fragment>

            <span slot="create">
                <Button
                    size="small"
                    on:click={onCreate}
                    disabled={$isLoading || isDeletedVisible}
                    icon={$isLoading ? InlineLoading : undefined}>Add Conversation</Button
                >
            </span>
            <span slot="delete">
                {#if isDeletedVisible}
                    <Button icon={Reset} disabled={$isLoading} on:click={onDeleteOrRestore}
                        >Restore</Button
                    >
                    <Button
                        icon={TrashCan}
                        disabled={$isLoading}
                        on:click={() => (isModalOpen = true)}>Delete</Button
                    >
                {:else}
                    <Button icon={TrashCan} disabled={$isLoading} on:click={onDeleteOrRestore}
                        >Delete</Button
                    >
                {/if}
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

<Modal
    size="sm"
    danger
    bind:open={isModalOpen}
    modalHeading="Are you sure?"
    primaryButtonText="Delete Forever"
    secondaryButtonText="Cancel"
    on:click:button--secondary={() => (isModalOpen = false)}
    on:submit={onDeleteForever}
>
    <p>
        Deleting these conversations cannot be undone and you will lose all associated nodes and
        localizations.
    </p>
</Modal>
