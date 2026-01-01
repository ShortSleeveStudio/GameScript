<script lang="ts">
  /**
   * Conversation Finder panel with AG-Grid.
   *
   * Displays a searchable, filterable list of conversations using AG-Grid Enterprise
   * with infinite row model for virtualized scrolling.
   *
   * Features:
   * - Infinite scroll with virtual rows
   * - Column filtering and sorting
   * - Multi-row selection
   * - Inline editing of conversation names
   * - Soft delete with restore capability
   * - Layout persistence
   * - Dynamic filter columns from filters table
   */
  import { onMount, onDestroy } from 'svelte';
  import {
    createGrid,
    type ColDef,
    type GridOptions,
    type GridApi,
    type IRowNode,
    type FilterModel,
    type NumberFilterModel,
    type RowClickedEvent,
  } from '@ag-grid-community/core';
  import type { Conversation } from '@gamescript/shared';
  import { TABLE_CONVERSATIONS, TABLE_FILTERS, type IDbRowView } from '$lib/db';
  import {
    initializeGrid,
    GridDatasource,
    GridCellRenderer,
    GridCellEditorText,
    GRID_CACHE_BLOCK_SIZE,
    GRID_CACHE_MAX_BLOCKS,
    GRID_FILTER_PARAMS_TEXT,
    GRID_FILTER_PARAMS_NUMBER,
    loadGridLayout,
    saveGridLayout,
    BooleanFilter,
    setupGridVisibilityHandler,
    type BooleanFilterModel,
    type GridContext,
    type GridVisibilityHandle,
  } from '$lib/grid';
  import { registerUndoable, Undoable } from '$lib/undo';
  import { conversations, filters } from '$lib/crud';
  import { focusConversation } from '$lib/stores/focus.js';
  import { toastError, toastSuccess } from '$lib/stores/notifications.js';
  import { isDarkMode } from '$lib/stores/theme.js';
  import { IsLoadingStore } from '$lib/stores/is-loading.js';
  import { filtersTable } from '$lib/tables';
  import {
    graphLayoutAutoLayoutDefault,
    graphLayoutVerticalDefault,
  } from '$lib/stores/layout-defaults.js';
  import {
    EVENT_CF_FILTER_BY_PARENT,
    EVENT_DB_COLUMN_DELETING,
    isCustomEvent,
    type GridFilterByParentRequest,
    type DbColumnDeleting,
  } from '$lib/constants/events.js';
  import { get } from 'svelte/store';  // Keep for graphLayoutAutoLayoutDefault and graphLayoutVerticalDefault
  import { Button, ToggleButton, DeleteConfirmationModal, GridToolbar, TableOptionsMenu } from '$lib/components/common';
  import ConversationFinderSettingsModal from './ConversationFinderSettingsModal.svelte';
  import IconSettings from '$lib/components/icons/IconSettings.svelte';

  // Constants
  const CONVERSATION_ID_COLUMN = 'id';
  const IS_DELETED_COLUMN = 'is_deleted';
  const STORAGE_KEY = 'gs-conversation-finder-layout';

  // Static column definitions (non-filter columns)
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
      width: 80,
    },
    {
      headerName: 'Name',
      colId: 'name',
      filter: 'agTextColumnFilter',
      cellEditor: GridCellEditorText,
      cellRenderer: GridCellRenderer,
      filterParams: GRID_FILTER_PARAMS_TEXT,
      flex: 2,
    },
    {
      headerName: 'Is Deleted',
      colId: IS_DELETED_COLUMN,
      filter: BooleanFilter,
      hide: true,
      lockVisible: true,
      suppressFiltersToolPanel: true,
      suppressColumnsToolPanel: true,
    },
  ];

  // State
  let gridElement: HTMLElement;
  let api: GridApi;
  let datasource: GridDatasource<Conversation>;
  let selectedRows: IDbRowView<Conversation>[] = $state([]);
  let isDeletedVisible = $state(false);
  let isLoading = new IsLoadingStore();
  let showDeleteConfirm = $state(false);
  let showSettingsModal = $state(false);
  let loadLayoutRequested = $state(false);
  let columnDefs: ColDef[] = [...staticColumns];
  let columnIdSet: Set<string> = new Set();
  let visibilityHandle: GridVisibilityHandle | undefined;

  function getGridApi(): GridApi {
    return api;
  }

  // ============================================================================
  // Actions
  // ============================================================================

  async function handleCreate(): Promise<void> {
    if (isDeletedVisible) return;

    await isLoading.wrapPromise(
      (async () => {
        try {
          const conversation = await conversations.create({
            name: 'New Conversation',
            is_layout_auto: get(graphLayoutAutoLayoutDefault),
            is_layout_vertical: get(graphLayoutVerticalDefault),
          });
          focusConversation(conversation.id);
          toastSuccess('Conversation created');
        } catch (err) {
          toastError('Failed to create conversation', err);
        }
      })()
    );
  }

  async function handleDeleteOrRestore(): Promise<void> {
    const selectedConversations = getCopyOfSelectedAndDeselect();
    if (selectedConversations.length === 0) return;

    // Capture whether this is a restore or a delete
    const isRestore = isDeletedVisible;

    await isLoading.wrapPromise(markRowsDeleted(selectedConversations, !isRestore));

    // Register undo/redo
    registerUndoable(
      new Undoable(
        `conversation ${isRestore ? 'restoration' : 'deletion'}`,
        isLoading.wrapFunction(async () => {
          await markRowsDeleted(selectedConversations, isRestore);
        }),
        isLoading.wrapFunction(async () => {
          await markRowsDeleted(selectedConversations, !isRestore);
        })
      )
    );
  }

  async function markRowsDeleted(
    conversationsToDelete: Conversation[],
    shouldDelete: boolean
  ): Promise<void> {
    const oldRows = conversationsToDelete;
    const newRows = conversationsToDelete.map(c => ({ ...c, is_deleted: shouldDelete }));
    await conversations.updateMany(oldRows, newRows);
    api?.refreshInfiniteCache();
  }

  async function handleDeleteForever(): Promise<void> {
    const selectedConversations = getCopyOfSelectedAndDeselect();
    if (selectedConversations.length === 0) return;

    showDeleteConfirm = false;

    await isLoading.wrapPromise(
      (async () => {
        try {
          for (const conv of selectedConversations) {
            await conversations.permanentlyDelete(conv.id);
          }

          api?.refreshInfiniteCache();
          toastSuccess(`Permanently deleted ${selectedConversations.length} conversation(s)`);
        } catch (err) {
          toastError('Failed to delete permanently', err);
        }
      })()
    );
  }

  function handleCancel(): void {
    api?.deselectAll();
  }

  function getCopyOfSelectedAndDeselect(): Conversation[] {
    const selected = selectedRows.map((row) => row.data);
    api?.deselectAll();
    return selected;
  }

  // ============================================================================
  // Filter/Sort Controls
  // ============================================================================

  function toggleShowDeleted(): void {
    isDeletedVisible = !isDeletedVisible;
    const model: FilterModel = api?.getFilterModel() ?? {};
    model[IS_DELETED_COLUMN] = {
      filterType: 'boolean',
      filter: isDeletedVisible,
      type: 'equals',
    } as BooleanFilterModel;
    api?.setFilterModel(model);
  }

  // ============================================================================
  // Grid Events
  // ============================================================================

  function onSelectionChanged(): void {
    selectedRows = api?.getSelectedRows() ?? [];
  }

  function onRowClicked(event: RowClickedEvent<IDbRowView<Conversation>, GridContext>): void {
    if (event.data) {
      const row = event.data.data;
      focusConversation(row.id);
    }
  }

  // ============================================================================
  // Dynamic Filter Columns - React to filters table changes
  // ============================================================================

  $effect(() => {
    // Track the filters table rows and their data
    const rowViews = filtersTable.rows;
    rowViews.forEach(r => r.data); // Establish dependency on each row's data

    // Skip if grid not initialized yet
    if (!api) return;

    // Skip if no filters and no dynamic columns
    if (rowViews.length === 0 && staticColumns.length === columnDefs.length) {
      return;
    }

    // Rebuild column definitions
    columnIdSet.clear();
    const newColumnDefs: ColDef[] = [];

    // Add static columns
    for (const staticColumn of staticColumns) {
      columnIdSet.add(staticColumn.colId!);
      newColumnDefs.push(staticColumn);
    }

    // Add dynamic filter columns
    for (const rowView of rowViews) {
      const row = rowView.data;
      const colId: string = filters.filterIdToColumn(row.id);
      columnIdSet.add(colId);
      newColumnDefs.push({
        headerName: row.name,
        colId: colId,
        cellEditor: GridCellEditorText,
        cellRenderer: GridCellRenderer,
        filter: 'agTextColumnFilter',
        filterParams: GRID_FILTER_PARAMS_TEXT,
        flex: 1,
      });
    }

    // Update grid
    columnDefs = newColumnDefs;
    api.setGridOption('columnDefs', columnDefs);

    // Check if we need to load layout
    if (loadLayoutRequested) {
      loadGridLayout(api, STORAGE_KEY, columnIdSet);
      loadLayoutRequested = false;
    }

    // Update column width (deferred if not visible)
    visibilityHandle?.requestAutoSize();
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const onFilterByParent = (e: Event): void => {
    if (!isCustomEvent(e)) return;
    const filterRequest = e as CustomEvent<GridFilterByParentRequest>;
    const parentId: number = filterRequest.detail.parent;

    // Check if filter is required
    const currentModel = api?.getFilterModel()[CONVERSATION_ID_COLUMN] as
      | NumberFilterModel
      | undefined;
    if (currentModel && currentModel.filter === parentId) return;

    // Filter
    const model: FilterModel = {};
    model[CONVERSATION_ID_COLUMN] = {
      filterType: 'number',
      filter: parentId,
      type: 'equals',
    } as NumberFilterModel;
    api?.setFilterModel(model);
  };

  const onFilterDeleting = (e: Event): void => {
    if (!isCustomEvent(e)) return;
    const event = e as CustomEvent<DbColumnDeleting>;
    if (event.detail.tableType.id === TABLE_FILTERS.id) {
      api?.setFilterModel(null);
      api?.applyColumnState({
        defaultState: { sort: null },
      });
    }
  };

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onMount(() => {
    // Initialize AG-Grid modules
    initializeGrid();

    // Create datasource with filter for non-deleted by default
    datasource = new GridDatasource<Conversation>(TABLE_CONVERSATIONS);

    // Create grid
    const gridOptions: GridOptions = {
      context: { getGridApi } as GridContext,
      rowModelType: 'infinite',
      columnDefs,
      rowSelection: 'multiple',
      suppressRowClickSelection: true,
      onSelectionChanged,
      onRowClicked,
      isRowSelectable: (params: IRowNode<IDbRowView<Conversation>>) => {
        if (!params.data) return false;
        const row = params.data.data;
        return !row.is_system_created;
      },
      defaultColDef: {
        suppressMovable: true,
        sortable: true,
        editable: true,
        enableValue: false,
        enableRowGroup: false,
        enablePivot: false,
        flex: 1,
        floatingFilter: false,
        menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab'],
      },
      sideBar: false,
      suppressMenuHide: true,
      cacheBlockSize: GRID_CACHE_BLOCK_SIZE,
      maxBlocksInCache: GRID_CACHE_MAX_BLOCKS,
      autoSizeStrategy: {
        type: 'fitCellContents',
      },
      stopEditingWhenCellsLoseFocus: true,
      datasource,
    };

    api = createGrid(gridElement, gridOptions);

    // Setup visibility handler for proper column sizing
    visibilityHandle = setupGridVisibilityHandler(gridElement, api);

    // Request layout load after filters are loaded (effect will handle columns)
    loadLayoutRequested = true;

    // Set initial filter to hide deleted
    const initialFilter: FilterModel = {};
    initialFilter[IS_DELETED_COLUMN] = {
      filterType: 'boolean',
      filter: false,
      type: 'equals',
    } as BooleanFilterModel;
    api.setFilterModel(initialFilter);

    // Event listeners
    addEventListener(EVENT_CF_FILTER_BY_PARENT, onFilterByParent);
    addEventListener(EVENT_DB_COLUMN_DELETING, onFilterDeleting);
  });

  onDestroy(() => {
    // Save layout
    if (api) {
      saveGridLayout(api, STORAGE_KEY);
    }

    // Remove event listeners
    removeEventListener(EVENT_CF_FILTER_BY_PARENT, onFilterByParent);
    removeEventListener(EVENT_DB_COLUMN_DELETING, onFilterDeleting);

    // Cleanup
    visibilityHandle?.cleanup();
    datasource?.destroy();
    api?.destroy();

    // Clear state
    columnIdSet.clear();
  });
</script>

<div class="conversation-finder gs-grid-panel">
  <GridToolbar>
    <svelte:fragment slot="left">
      <Button
        variant="primary"
        onclick={handleCreate}
        disabled={$isLoading || isDeletedVisible}
      >
        + New
      </Button>

      {#if selectedRows.length > 0}
        <span class="selection-info">{selectedRows.length} selected</span>
        <Button variant="secondary" onclick={handleCancel}>Cancel</Button>
        {#if isDeletedVisible}
          <Button variant="primary" onclick={handleDeleteOrRestore} disabled={$isLoading}>
            Restore
          </Button>
          <Button
            variant="danger"
            onclick={() => (showDeleteConfirm = true)}
            disabled={$isLoading}
          >
            Delete Forever
          </Button>
        {:else}
          <Button variant="danger" onclick={handleDeleteOrRestore} disabled={$isLoading}>
            Delete
          </Button>
        {/if}
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="right">
      <ToggleButton active={isDeletedVisible} onClick={toggleShowDeleted}>
        {isDeletedVisible ? 'Hide' : 'Show'} Deleted
      </ToggleButton>
      <TableOptionsMenu {api} />
      <Button
        variant="ghost"
        iconOnly
        onclick={() => showSettingsModal = true}
        title="Conversation Finder Settings"
      >
        <IconSettings size={16} />
      </Button>
    </svelte:fragment>
  </GridToolbar>

  <!-- Grid -->
  <div
    class="grid-container"
    class:ag-theme-quartz-dark={$isDarkMode}
    class:ag-theme-quartz={!$isDarkMode}
    bind:this={gridElement}
  ></div>
</div>

<!-- Delete Confirmation Modal -->
<DeleteConfirmationModal
  bind:open={showDeleteConfirm}
  itemCount={selectedRows.length}
  itemName="conversation"
  itemNamePlural="conversations"
  title="Delete Forever?"
  on:confirm={handleDeleteForever}
  on:cancel={() => (showDeleteConfirm = false)}
>
  This will permanently delete {selectedRows.length} conversation(s) and all associated nodes
  and localizations. This cannot be undone.
</DeleteConfirmationModal>

<!-- Settings Modal -->
<ConversationFinderSettingsModal bind:open={showSettingsModal} />

<style>
  /* All common styles moved to theme.css under .gs-grid-panel */
</style>
