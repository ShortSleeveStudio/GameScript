<script lang="ts">
    import {
        createGrid,
        type ColDef,
        type GridOptions,
        type IDatasource,
        GridApi,
        type ToolPanelDef,
        type ColumnState,
        type ITextFilterParams,
        type INumberFilterParams,
        type IRowNode,
        type FilterModel,
        type NumberFilterModel,
    } from '@ag-grid-community/core';
    import {
        TABLE_ID_CONVERSATIONS,
        type Conversation,
        type Filter,
        TABLE_ID_NODES,
        type Node,
        TABLE_ID_LOCALIZATIONS,
        type Localization,
    } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { GridCellRenderer } from '@lib/grid/grid-cell-renderer';
    import type { FinderContext } from '@lib/grid/finder-context';
    import { FinderDatasource } from '@lib/grid/finder-datasource';
    import { GridCellEditorText } from '@lib/grid/grid-cell-editor-text';
    import { isDarkMode } from '@lib/stores/app/darkmode';
    import { filters } from '@lib/tables/filters';
    import { filterIdToColumn } from '@lib/utility/filters';
    import { Button, InlineLoading, Tile, OverflowMenuItem, Modal } from 'carbon-components-svelte';
    import { onDestroy, onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { TableWatcher } from '@lib/stores/utility/table-watcher';
    import { EVENT_SHUTDOWN } from '@lib/constants/events';
    import { LS_KEY_FINDER_LAYOUT } from '@lib/constants/local-storage';
    import ConversationFinderToolbar from './ConversationFinderToolbar.svelte';
    import { db } from '@lib/api/db/db';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { Reset, TrashCan } from 'carbon-icons-svelte';
    import type { DbConnection } from 'preload/api-db';
    import { createFilter } from '@lib/api/db/db-filter';

    const IS_DELETED_COLUMN: string = 'isDeleted';
    const datasource: IDatasource = new FinderDatasource();
    const columnIdSet: Set<string> = new Set();

    let api: GridApi;
    let finderElement: HTMLElement;
    let tableWatcher: TableWatcher<Filter>;
    let loadLayoutRequested: boolean = false;
    let isDeletedVisible: boolean = false;
    let isModalOpen: boolean = false;

    let columnDefs: ColDef[] = [];
    let selectedRows: IDbRowView<Conversation>[] = [];
    let isLoading: IsLoadingStore = new IsLoadingStore();

    const numberFilterParams: INumberFilterParams = {
        filterOptions: [
            'equals',
            'notEqual',
            'lessThan',
            'lessThanOrEqual',
            'greaterThan',
            'greaterThanOrEqual',
        ],
        // maxNumConditions: 3,
    };

    const textFilterParams: ITextFilterParams = {
        filterOptions: ['equals', 'notEqual', 'contains', 'notContains', 'startsWith', 'endsWith'],
        // maxNumConditions: 4,
    };

    const staticColumns: ColDef[] = [
        {
            pinned: 'left',
            headerName: 'ID',
            colId: 'id',
            resizable: false,
            cellRenderer: GridCellRenderer,
            type: 'nonEditableColumn',
            // width: 72, // Min before the sort arrow overlaps
            filter: 'agNumberColumnFilter',
            filterParams: numberFilterParams,
            checkboxSelection: true,
        },
        {
            headerName: 'Name',
            colId: 'name',
            filter: 'agTextColumnFilter',
            cellEditor: GridCellEditorText,
            cellRenderer: GridCellRenderer,
            filterParams: textFilterParams,
        },
        {
            headerName: 'Is Deleted',
            colId: 'isDeleted',
            filter: 'agNumberColumnFilter',
            hide: true,
            lockVisible: true,
            suppressFiltersToolPanel: true,
            suppressColumnsToolPanel: true,
        },
    ];

    function loadLayout(): void {
        const savedStateString: string | null = localStorage.getItem(LS_KEY_FINDER_LAYOUT);
        if (savedStateString) {
            const savedState: ColumnState[] = JSON.parse(
                localStorage.getItem(LS_KEY_FINDER_LAYOUT),
            );
            // Remove any missing columns
            const sanitizedSavedState: ColumnState[] = [];
            for (let i = 0; i < savedState.length; i++) {
                const state: ColumnState = savedState[i];
                if (columnIdSet.has(state.colId)) {
                    sanitizedSavedState.push(state);
                }
            }
            api.applyColumnState({ state: sanitizedSavedState });
        }
    }

    function getGridApi(): GridApi {
        return api;
    }

    function getCopyOfSelectedAndDeselect(): Conversation[] {
        const selectedConversations: Conversation[] = selectedRows.map(
            (rowView) => <Conversation>{ ...get(rowView) },
        );
        api.deselectAll();
        return selectedConversations;
    }

    const onCreate: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        let newConversation: Conversation = <Conversation>{
            name: 'New Conversation',
            isSystemCreated: false,
            notes: '',
            isDeleted: false,
        };

        // Create converation
        let newRow: Conversation = await db.createRow(TABLE_ID_CONVERSATIONS, newConversation);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'conversation creation',
                isLoading.wrapOperationAsync(async () => {
                    await db.deleteRow(TABLE_ID_CONVERSATIONS, newRow);
                }),
                isLoading.wrapOperationAsync(async () => {
                    newRow = await db.createRow(TABLE_ID_CONVERSATIONS, newRow);
                }),
            ),
        );
    });

    const onDeleteForever: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        // Find conversations to delete
        const selectedConversations: Conversation[] = getCopyOfSelectedAndDeselect();

        // Delete all selected conversations and their associated localizations/nodes
        await db.executeTransaction(async (conn: DbConnection) => {
            for (let i = 0; i < selectedConversations.length; i++) {
                const conversationToDelete: Conversation = selectedConversations[i];

                // Delete conversations
                await db.deleteRow(TABLE_ID_CONVERSATIONS, conversationToDelete, conn);

                // Delete nodes
                const nodes: IDbRowView<Node>[] = await db.fetchRows<Node>(
                    TABLE_ID_NODES,
                    createFilter()
                        .where()
                        .column('parent')
                        .eq(conversationToDelete.id)
                        .endWhere()
                        .build(),
                    undefined,
                    conn,
                );
                if (nodes.length > 0) {
                    await db.deleteRows(
                        TABLE_ID_NODES,
                        nodes.map((node) => get(node)),
                        conn,
                    );
                }

                // Delete localizations
                const localizations: IDbRowView<Localization>[] = await db.fetchRows<Localization>(
                    TABLE_ID_LOCALIZATIONS,
                    createFilter()
                        .where()
                        .column('parent')
                        .eq(conversationToDelete.id)
                        .endWhere()
                        .build(),
                    undefined,
                    conn,
                );
                if (localizations.length > 0) {
                    await db.deleteRows(
                        TABLE_ID_LOCALIZATIONS,
                        localizations.map((localization) => get(localization)),
                        conn,
                    );
                }
            }
        });

        isModalOpen = false;
    });

    const onDeleteOrRestore: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        // Find conversations to delete
        const selectedConversations: Conversation[] = getCopyOfSelectedAndDeselect();

        // Capture whether this is a restore or a delete
        const isRestore: boolean = isDeletedVisible;

        // Delete conversations
        await markRowsDeleted(selectedConversations, !isRestore);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `conversation ${isRestore ? 'restoration' : 'deletion'}`,
                isLoading.wrapOperationAsync(async () => {
                    await markRowsDeleted(selectedConversations, isRestore);
                }),
                isLoading.wrapOperationAsync(async () => {
                    await markRowsDeleted(selectedConversations, !isRestore);
                }),
            ),
        );
    });

    async function markRowsDeleted(
        conversationsToDelete: Conversation[],
        shouldDelete: boolean,
    ): Promise<void> {
        await db.executeTransaction(async (conn: DbConnection) => {
            for (let i = 0; i < conversationsToDelete.length; i++) {
                const conversationToDelete = conversationsToDelete[i];
                conversationToDelete.isDeleted = shouldDelete;
                await db.updateRow(TABLE_ID_CONVERSATIONS, conversationToDelete, conn);
            }
        });
        api.refreshInfiniteCache();
    }

    function onCancelConversation(): void {
        api.deselectAll();
    }

    // function isDeletedVisible(): boolean {
    //     const model: FilterModel = api.getFilterModel();
    //     let currentValue: boolean;
    //     if (IS_DELETED_COLUMN in model) {
    //         currentValue =
    //             (<NumberFilterModel>model[IS_DELETED_COLUMN]).filter === 1 ? true : false;
    //     } else {
    //         // Assume we are showing deleted
    //         currentValue = true;
    //     }
    //     return currentValue;
    // }

    function showIsDeleted(shouldShow: boolean): void {
        const model: FilterModel = api.getFilterModel();
        model[IS_DELETED_COLUMN] = <NumberFilterModel>{
            filterType: 'number',
            filter: shouldShow ? 1 : 0,
            type: 'equals',
        };
        api.setFilterModel(model);
        isDeletedVisible = shouldShow;
    }

    function onSelectionChanged(): void {
        selectedRows = <IDbRowView<Conversation>[]>api.getSelectedRows();
    }

    function onFiltersChanged(): void {
        // Grab filters
        const filterRowViews: IDbRowView<Filter>[] = get(filters);

        // Purge old columns
        columnIdSet.clear();
        columnDefs.length = 0;

        // Add static columns
        for (let i = 0; i < staticColumns.length; i++) {
            const staticColumn: ColDef = staticColumns[i];
            columnIdSet.add(staticColumn.colId);
            columnDefs.push(staticColumn);
        }

        // Add filters
        for (let i = 0; i < filterRowViews.length; i++) {
            const filter: Filter = get(filterRowViews[i]);
            const colId: string = filterIdToColumn(filter.id);
            columnIdSet.add(colId);
            columnDefs.push({
                headerName: filter.name,
                colId: colId,
                cellEditor: GridCellEditorText,
                cellRenderer: GridCellRenderer,
                filter: 'agTextColumnFilter',
                filterParams: textFilterParams,
            });
        }

        // Set new column defs
        api?.setGridOption('columnDefs', columnDefs);

        // Check if we need to load layout
        if (loadLayoutRequested) {
            loadLayout();
            loadLayoutRequested = false;
        }

        // Update column width
        api?.autoSizeAllColumns();
    }

    onMount(() => {
        const gridOptions: GridOptions = <GridOptions>{
            context: <FinderContext>{ getGridApi: getGridApi },
            rowModelType: 'infinite',
            columnDefs: columnDefs,
            rowSelection: 'multiple',
            suppressRowClickSelection: true,
            onSelectionChanged: onSelectionChanged,
            isRowSelectable: (params: IRowNode<IDbRowView<Conversation>>) => {
                return !!params.data && !get(params.data).isSystemCreated;
            },
            defaultColDef: {
                // flex: 1,
                // resizable: false,
                suppressMovable: true,
                sortable: true,
                editable: true,
                enableValue: false,
                enableRowGroup: false,
                enablePivot: false,
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
            autoSizeStrategy: {
                type: 'fitCellContents',
            },
            stopEditingWhenCellsLoseFocus: true,
            datasource: datasource,
            columnTypes: {
                nonEditableColumn: {
                    editable: false,
                },
            },
        };
        api = createGrid(finderElement, gridOptions);

        // Create table watcher
        tableWatcher = new TableWatcher(filters);
        tableWatcher.subscribe(onFiltersChanged);

        // Load Layout
        loadLayoutRequested = true;

        // Set initial isDeleted value
        showIsDeleted(false);

        // Event Listeners
        addEventListener(EVENT_SHUTDOWN, () => {
            const savedState: ColumnState[] = api.getColumnState();
            localStorage.setItem(LS_KEY_FINDER_LAYOUT, JSON.stringify(savedState));
        });
    });
    onDestroy(() => {
        tableWatcher.dispose();
    });
</script>

<div class="container">
    <Tile style="margin-bottom: 0px;">
        <h4 class="table-title">Conversations</h4>
        <p class="table-header">
            Conversations are containers for localized text and conversation nodes.
        </p>
    </Tile>

    <div class="table-toolbar">
        <ConversationFinderToolbar
            elementsSelected={selectedRows.length}
            on:cancel={onCancelConversation}
        >
            <svelte:fragment slot="overflow">
                <OverflowMenuItem
                    text="{isDeletedVisible ? 'Hide' : 'Show'} Deleted"
                    on:click={() => showIsDeleted(!isDeletedVisible)}
                />
            </svelte:fragment>

            <span slot="create">
                <Button
                    size="small"
                    on:click={onCreate}
                    disabled={$isLoading || isDeletedVisible}
                    icon={$isLoading ? InlineLoading : undefined}>Add Conversation</Button
                >
            </span>
            <span slot="delete-restore">
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
        </ConversationFinderToolbar>
    </div>
    <span
        id="finder"
        class={$isDarkMode
            ? 'ag-theme-quartz-dark ag-theme-custom'
            : 'ag-theme-quartz ag-theme-custom'}
        bind:this={finderElement}
    ></span>
</div>

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
    <p>Deleting these conversations cannot be undone.</p>
</Modal>

<style>
    .container {
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: flex-start;
        align-items: stretch;
    }
    .container > * {
        flex-grow: 1;
    }
    .table-title {
        font-size: var(--cds-productive-heading-03-font-size, 1.25rem);
        font-weight: var(--cds-productive-heading-03-font-weight, 400);
        line-height: var(--cds-productive-heading-03-line-height, 1.4);
        letter-spacing: var(--cds-productive-heading-03-letter-spacing, 0);
        color: var(--cds-text-primary, #161616);
    }
    .table-header {
        font-size: var(--cds-body-short-01-font-size, 0.875rem);
        font-weight: var(--cds-body-short-01-font-weight, 400);
        line-height: var(--cds-body-short-01-line-height, 1.28572);
        letter-spacing: var(--cds-body-short-01-letter-spacing, 0.16px);
        color: var(--cds-text-secondary, #525252);
        margin-bottom: 0px;
    }
    .table-toolbar {
        display: flex;
        justify-content: flex-end;
        height: 2rem;
        flex-grow: 0;
        background-color: var(--cds-ui-01, #f4f4f4);
    }
</style>
