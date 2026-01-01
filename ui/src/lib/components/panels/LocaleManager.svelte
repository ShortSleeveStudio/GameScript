<script lang="ts">
  /**
   * Locale Manager panel with AG-Grid.
   *
   * Displays a list of locales (languages) with CRUD operations using AG-Grid.
   * Features:
   * - Infinite scroll with virtual rows
   * - Column filtering and sorting
   * - Multi-row selection
   * - Inline editing of name
   * - Primary locale selection via locale_principal table
   * - Hard delete with cascade (drops locale column from localizations table)
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
  import type { Locale, LocalePrincipal } from '@gamescript/shared';
  import { TABLE_LOCALES, type IDbRowView } from '$lib/db';
  import {
    initializeGrid,
    GridDatasource,
    GridCellRenderer,
    GridCellRendererRadio,
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
    createMinWidthHandler,
    type GridContext,
    type GridVisibilityHandle,
    type RadioCellRendererContext,
  } from '$lib/grid';
  import { locales, common } from '$lib/crud';
  import { toastError, toastSuccess } from '$lib/stores/notifications.js';
  import { isDarkMode } from '$lib/stores/theme.js';
  import { IsLoadingStore } from '$lib/stores/is-loading.js';
  import { focusLocale, type FocusPayloadLocale } from '$lib/stores/focus.js';
  import { UniqueNameTracker } from '$lib/stores/unique-name-tracker.js';
  import NewRowNameInput from '$lib/components/common/NewRowNameInput.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { Button, FormField, GridToolbar, TableOptionsMenu } from '$lib/components/common';
  import { localePrincipalTableView, getLocalePrincipal } from '$lib/tables/locale-principal.js';

  // Constants
  const STORAGE_KEY = 'gs-locale-manager-layout';

  // State
  let gridElement: HTMLElement;
  let api: GridApi;
  let datasource: GridDatasource<Locale>;
  let selectedRows: IDbRowView<Locale>[] = $state([]);
  let isLoading = new IsLoadingStore();
  let isDeleteModalOpen = $state(false);
  let localesToDelete: Locale[] = $state([]);
  let visibilityHandle: GridVisibilityHandle | undefined;

  // Create locale modal state
  let isCreateModalOpen = $state(false);
  let newLocaleName = $state('');
  let nameError: string | null = $state(null);
  const createModalNameTracker = new UniqueNameTracker();

  // Focus payload for locale inspector
  const uniqueNameTracker = new UniqueNameTracker();

  // Derive the locale principal row view from the table
  let localePrincipalRowView = $derived(getLocalePrincipal(localePrincipalTableView.rows));

  function getGridApi(): GridApi {
    return api;
  }

  function getPrincipalRowView(): IDbRowView<LocalePrincipal> | undefined {
    return localePrincipalRowView;
  }

  async function onPrimaryChange(localeId: number): Promise<void> {
    if (!localePrincipalRowView) return;

    const currentPrincipalId = localePrincipalRowView.data.principal;
    if (currentPrincipalId === localeId) return;

    const oldRow = { ...localePrincipalRowView.getValue() };
    const newRow = { ...oldRow, principal: localeId };

    try {
      await isLoading.wrapPromise(
        common.updateOne(localePrincipalRowView.tableType, oldRow, newRow, 'Primary locale change')
      );
      toastSuccess('Primary locale changed');
    } catch (err) {
      toastError('Failed to set primary locale', err);
    }
  }

  // Column definitions
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
      headerName: 'Primary',
      colId: 'primary',
      cellRenderer: GridCellRendererRadio,
      editable: false,
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
  ];

  // Valid column IDs for layout persistence
  const validColumnIds = new Set(columnDefs.map((c) => c.colId!));

  // ============================================================================
  // Actions
  // ============================================================================

  async function handleCreateClick(): Promise<void> {
    // Load all current locale names for validation
    try {
      const allLocales = await locales.getAll();
      createModalNameTracker.loadNames(allLocales.map(l => ({ id: l.id, name: l.name })));

      // Generate a unique default name
      newLocaleName = createModalNameTracker.generateUniqueName('New Locale');
      nameError = null;
      isCreateModalOpen = true;
    } catch (err) {
      toastError('Failed to load locales', err);
    }
  }

  async function handleCreateConfirm(): Promise<void> {
    // Final validation
    if (nameError || !newLocaleName.trim()) return;

    isCreateModalOpen = false;

    try {
      await isLoading.wrapPromise(locales.create(newLocaleName));
      api?.refreshInfiniteCache();
      toastSuccess('Locale created');
    } catch (err) {
      toastError('Failed to create locale', err);
    }
  }

  function handleCreateCancel(): void {
    isCreateModalOpen = false;
    newLocaleName = '';
    nameError = null;
  }

  function handleDeleteClick(): void {
    const localesToDeleteList = getCopyOfSelectedAndDeselect();
    if (localesToDeleteList.length === 0) return;

    // Check if trying to delete the primary locale
    const currentPrincipalId = localePrincipalRowView?.data.principal ?? 0;
    const primaryLocale = localesToDeleteList.find((l) => l.id === currentPrincipalId);
    if (primaryLocale) {
      toastError('Cannot delete the primary locale. Set another locale as primary first.');
      return;
    }

    // Store locales and show confirmation modal
    localesToDelete = localesToDeleteList;
    isDeleteModalOpen = true;
  }

  async function handleConfirmDelete(): Promise<void> {
    isDeleteModalOpen = false;
    const toDelete = localesToDelete;
    localesToDelete = [];

    try {
      for (const locale of toDelete) {
        await isLoading.wrapPromise(locales.remove(locale.id));
      }
      api?.refreshInfiniteCache();
      toastSuccess(`Deleted ${toDelete.length} locale(s)`);
    } catch (err) {
      toastError('Failed to delete', err);
    }
  }

  function handleCancelDelete(): void {
    isDeleteModalOpen = false;
    localesToDelete = [];
  }

  function handleCancel(): void {
    api?.deselectAll();
  }

  function getCopyOfSelectedAndDeselect(): Locale[] {
    const selected: Locale[] = [];
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

  // ============================================================================
  // Grid Events
  // ============================================================================

  function onSelectionChanged(): void {
    selectedRows = api?.getSelectedRows() ?? [];
  }

  function onRowClicked(event: RowClickedEvent<IDbRowView<Locale>, GridContext>): void {
    if (event.data) {
      try {
        const row = event.data.data;
        // Create payload with locale principal for the inspector (if available)
        const payload: FocusPayloadLocale | undefined = localePrincipalRowView
          ? { uniqueNameTracker, localePrincipalRowView }
          : undefined;
        focusLocale(row.id, payload);
      } catch (err) {
        toastError('[LocaleManager] Error in onRowClicked:', err);
      }
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // Create min width handler
  const { handler: onFirstDataRendered, cleanup: cleanupMinWidthHandler } = createMinWidthHandler();

  onMount(() => {
    // Initialize AG-Grid modules
    initializeGrid();

    // Create datasource
    datasource = new GridDatasource<Locale>(TABLE_LOCALES);

    // Create grid
    const gridOptions: GridOptions = {
      context: { getGridApi, getPrincipalRowView, onPrimaryChange } as RadioCellRendererContext,
      rowModelType: 'infinite',
      columnDefs,
      headerHeight: GRID_HEADER_HEIGHT,
      rowHeight: GRID_ROW_HEIGHT,
      rowSelection: 'multiple',
      suppressRowClickSelection: true,
      onSelectionChanged,
      onRowClicked,
      onFirstDataRendered,
      isRowSelectable: (params: IRowNode<IDbRowView<Locale>>) => {
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
    cleanupMinWidthHandler();
    datasource?.destroy();
    api?.destroy();
  });
</script>

<div class="locale-manager gs-grid-panel">
  <GridToolbar>
    {#snippet left()}
      <Button
        variant="primary"
        onclick={handleCreateClick}
        disabled={$isLoading}
      >
        + New Locale
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

<!-- Create Locale Modal -->
<Modal
  bind:open={isCreateModalOpen}
  title="Create New Locale"
  confirmLabel="Create"
  confirmDisabled={!!nameError || !newLocaleName}
  size="small"
  onconfirm={handleCreateConfirm}
  oncancel={handleCreateCancel}
>
  <FormField label="Locale Name" error={nameError}>
    <NewRowNameInput
      bind:value={newLocaleName}
      bind:error={nameError}
      nameTracker={createModalNameTracker}
      placeholder="Enter locale name..."
      disabled={$isLoading}
      autofocus
      onsubmit={handleCreateConfirm}
    />
  </FormField>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal
  bind:open={isDeleteModalOpen}
  title="Are you sure?"
  confirmLabel="Delete"
  confirmVariant="danger"
  size="small"
  onconfirm={handleConfirmDelete}
  oncancel={handleCancelDelete}
>
  <p class="modal-text">
    Deleting {localesToDelete.length === 1 ? 'a locale' : `${localesToDelete.length} locales`} destroys all translations for {localesToDelete.length === 1 ? 'that locale' : 'those locales'}.
  </p>
</Modal>

<style>
  /* All common styles moved to theme.css under .gs-grid-panel */

  .modal-text {
    margin: 0;
    color: var(--gs-fg-secondary);
    line-height: 1.5;
  }
</style>
