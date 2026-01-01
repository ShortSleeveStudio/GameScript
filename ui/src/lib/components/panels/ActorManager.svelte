<script lang="ts">
  /**
   * Actor Manager panel with AG-Grid.
   *
   * Displays a list of actors with CRUD operations using AG-Grid.
   * Features:
   * - Infinite scroll with virtual rows
   * - Column filtering and sorting
   * - Multi-row selection
   * - Inline editing of name and color
   * - Hard delete with confirmation modal (nodes reassigned to default actor)
   * - Layout persistence
   */
  import { onMount, onDestroy } from 'svelte';
  import {
    createGrid,
    type ColDef,
    type GridOptions,
    type GridApi,
    type IRowNode,
    type RowClickedEvent,
  } from '@ag-grid-community/core';
  import type { Actor, Row } from '@gamescript/shared';
  import { TABLE_ACTORS, type IDbRowView } from '$lib/db';
  import {
    initializeGrid,
    GridDatasource,
    GridCellRenderer,
    GridCellRendererColor,
    GridCellEditorText,
    GRID_CACHE_BLOCK_SIZE,
    GRID_CACHE_MAX_BLOCKS,
    GRID_ROW_HEIGHT,
    GRID_HEADER_HEIGHT,
    GRID_FILTER_PARAMS_TEXT,
    GRID_FILTER_PARAMS_NUMBER,
    loadGridLayout,
    saveGridLayout,
    setupGridVisibilityHandler,
    type GridContext,
    type GridVisibilityHandle,
    type ColorCellRendererContext,
  } from '$lib/grid';
  import { actors } from '$lib/crud';
  import { toastError, toastSuccess } from '$lib/stores/notifications.js';
  import { isDarkMode } from '$lib/stores/theme.js';
  import { IsLoadingStore } from '$lib/stores/is-loading.js';
  import { focusActor } from '$lib/stores/focus.js';
  import { Button, DeleteConfirmationModal, GridToolbar, TableOptionsMenu } from '$lib/components/common';

  // Constants
  const STORAGE_KEY = 'gs-actor-manager-layout';

  // State
  let gridElement: HTMLElement;
  let api: GridApi;
  let datasource: GridDatasource<Actor>;
  let selectedRows: IDbRowView<Actor>[] = [];
  let isLoading = new IsLoadingStore();
  let isDeleteModalOpen = false;
  let actorsToDelete: Actor[] = [];
  let visibilityHandle: GridVisibilityHandle | undefined;

  function getGridApi(): GridApi {
    return api;
  }

  async function onColorChange(rowView: IDbRowView<Row>, newColor: string): Promise<void> {
    try {
      const oldActor = { ...rowView.data } as Actor;
      const newActor = { ...oldActor, color: newColor };
      await actors.updateOne(oldActor, newActor);
    } catch (err) {
      toastError('Failed to update color', err);
    }
  }

  // Column definitions (no soft delete - actors are hard deleted)
  const columnDefs: ColDef[] = [
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
      width: 80,
    },
    {
      headerName: 'Color',
      colId: 'color',
      cellRenderer: GridCellRendererColor,
      editable: false, // Color editing via cell renderer
      filter: false,
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
      headerName: 'Notes',
      colId: 'notes',
      filter: 'agTextColumnFilter',
      cellEditor: GridCellEditorText,
      cellRenderer: GridCellRenderer,
      filterParams: GRID_FILTER_PARAMS_TEXT,
      flex: 1,
    },
  ];

  // Valid column IDs for layout persistence
  const validColumnIds = new Set(columnDefs.map((c) => c.colId!));

  // ============================================================================
  // Actions
  // ============================================================================

  async function handleCreate(): Promise<void> {
    try {
      const colors = [
        '#e06c75', '#98c379', '#e5c07b', '#61afef',
        '#c678dd', '#56b6c2', '#d19a66', '#abb2bf',
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];

      await isLoading.wrapPromise(actors.create({ name: 'New Actor', color }));
      api?.refreshInfiniteCache();
      toastSuccess('Actor created');
    } catch (err) {
      toastError('Failed to create actor', err);
    }
  }

  function handleDeleteClick(): void {
    const selectedActors = getCopyOfSelectedAndDeselect();
    if (selectedActors.length === 0) return;

    // Store actors and show confirmation modal
    actorsToDelete = selectedActors;
    isDeleteModalOpen = true;
  }

  async function handleConfirmDelete(): Promise<void> {
    isDeleteModalOpen = false;
    const toDelete = actorsToDelete;
    actorsToDelete = [];

    try {
      for (const actor of toDelete) {
        await isLoading.wrapPromise(actors.remove(actor.id));
      }
      api?.refreshInfiniteCache();
      toastSuccess(`Deleted ${toDelete.length} actor(s)`);
    } catch (err) {
      toastError('Failed to delete', err);
    }
  }

  function handleCancelDelete(): void {
    isDeleteModalOpen = false;
    actorsToDelete = [];
  }

  function handleCancel(): void {
    api?.deselectAll();
  }

  function getCopyOfSelectedAndDeselect(): Actor[] {
    const selected: Actor[] = [];
    for (const row of selectedRows) {
      try {
        selected.push(row.data);
      } catch {
        // Row view may be stale/invalidated, skip it
      }
    }
    api?.deselectAll();
    return selected;
  }

  // Grid Events
  // ============================================================================

  function onSelectionChanged(): void {
    selectedRows = api?.getSelectedRows() ?? [];
  }

  function onRowClicked(event: RowClickedEvent<IDbRowView<Actor>, GridContext>): void {
    if (event.data) {
      try {
        const actor = event.data.data;
        focusActor(actor.id);
      } catch {
        // Row view may be stale/invalidated
      }
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onMount(() => {
    // Initialize AG-Grid modules
    initializeGrid();

    // Create datasource
    datasource = new GridDatasource<Actor>(TABLE_ACTORS);

    // Create grid
    const gridOptions: GridOptions = {
      context: { getGridApi, onColorChange } as ColorCellRendererContext,
      rowModelType: 'infinite',
      columnDefs,
      headerHeight: GRID_HEADER_HEIGHT,
      rowHeight: GRID_ROW_HEIGHT,
      rowSelection: 'multiple',
      suppressRowClickSelection: true,
      onSelectionChanged,
      onRowClicked,
      isRowSelectable: (params: IRowNode<IDbRowView<Actor>>) => {
        if (!params.data) return false;
        try {
          const row = params.data.data;
          return !row.is_system_created;
        } catch {
          return false;
        }
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
      stopEditingWhenCellsLoseFocus: true,
      datasource,
    };

    api = createGrid(gridElement, gridOptions);

    // Setup visibility handler for proper column sizing
    visibilityHandle = setupGridVisibilityHandler(gridElement, api);

    // Load saved layout
    loadGridLayout(api, STORAGE_KEY, validColumnIds);
  });

  onDestroy(() => {
    // Save layout
    if (api) {
      saveGridLayout(api, STORAGE_KEY);
    }

    // Cleanup
    visibilityHandle?.cleanup();
    datasource?.destroy();
    api?.destroy();
  });
</script>

<div class="actor-manager gs-grid-panel">
  <GridToolbar>
    {#snippet left()}
      <Button
        variant="primary"
        onclick={handleCreate}
        disabled={$isLoading}
      >
        + New Actor
      </Button>

      {#if selectedRows.length > 0}
        <span class="selection-info">{selectedRows.length} selected</span>
        <Button variant="secondary" onclick={handleCancel}>Cancel</Button>
        <Button variant="danger" onclick={handleDeleteClick} disabled={$isLoading}>
          Delete
        </Button>
      {/if}
    {/snippet}

    {#snippet right()}
      <TableOptionsMenu {api} />
    {/snippet}
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
  bind:open={isDeleteModalOpen}
  itemCount={actorsToDelete.length}
  itemName="actor"
  itemNamePlural="actors"
  onconfirm={handleConfirmDelete}
  oncancel={handleCancelDelete}
>
  If you delete {actorsToDelete.length === 1 ? 'an actor' : `${actorsToDelete.length} actors`},
  all nodes that use {actorsToDelete.length === 1 ? 'it' : 'them'} will return to using the default actor.
</DeleteConfirmationModal>

<style>
  /* All common styles moved to theme.css under .gs-grid-panel */
</style>
