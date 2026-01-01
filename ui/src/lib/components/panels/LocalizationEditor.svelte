<script lang="ts">
  /**
   * Localization Editor panel with AG-Grid.
   *
   * Displays a table of localizations with dynamic columns for each locale.
   * Features:
   * - Infinite scroll with virtual rows
   * - Dynamic locale columns (auto-update when locales change)
   * - Column filtering and sorting
   * - Multi-row selection
   * - Inline editing of localization text
   * - Filter by conversation (via event)
   * - Layout persistence
   * - Search and replace functionality across localizations
   *
   * Ported from GameScriptElectron/src/renderer/src/lib/components/localization-editor/LocalizationEditorGrid.svelte
   */
  import { onMount, onDestroy } from 'svelte';
  import {
    createGrid,
    type ColDef,
    type ColGroupDef,
    type GridOptions,
    type GridApi,
    type IRowNode,
    type FilterModel,
    type NumberFilterModel,
    type TextFilterModel,
    type RowClickedEvent,
    type EditableCallbackParams,
  } from '@ag-grid-community/core';
  import type { Localization, Locale, CsvColumnDescriptor, ImportBatchResult } from '@gamescript/shared';
  import { localeIdToColumn, toCsvHeader, toCsvBatch, parseCsv, validateCsvHeaders, buildLocalizationColumns, csvRowToLocalizationUpdate } from '@gamescript/shared';
  import { TABLE_LOCALIZATIONS, TABLE_LOCALES, type IDbRowView } from '$lib/db';
  import {
    initializeGrid,
    GridDatasource,
    GridCellRenderer,
    GridCellEditorText,
    GridCellEditorConversationId,
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
    buildTagColumns,
    createTagValueChangeHandler,
    type GridContext,
    type GridVisibilityHandle,
    type TagGridContext,
  } from '$lib/grid';
  import {
    focusManager,
    FOCUS_MODE_REPLACE,
    FOCUS_REPLACE,
    type FocusRequest,
    type FocusRequests,
  } from '$lib/stores/focus.js';
  import { isDarkMode } from '$lib/stores/theme.js';
  import { IsLoadingStore } from '$lib/stores/is-loading.js';
  import { localesTable, localizationTagCategoriesTable, localizationTagValuesTable } from '$lib/tables';
  import {
    EVENT_LF_FILTER_BY_PARENT,
    EVENT_LF_FILTER_BY_ID,
    EVENT_DB_COLUMN_DELETING,
    isCustomEvent,
    type GridFilterByParentRequest,
    type GridFilterByIdRequest,
    type DbColumnDeleting,
  } from '$lib/constants/events.js';
  import { localizations, localizationTagCategories } from '$lib/crud';
  import { toastError, toastSuccess } from '$lib/stores/notifications.js';
  import { Button, ToggleButton, Checkbox, Input, Modal, TableOptionsMenu, ProgressModal, TagCategorySettingsPanel, GridToolbar } from '$lib/components/common';
  import { bridge } from '$lib/api/bridge.js';
  import { focusLocalizationTagCategory, focusedLocalizationTagCategory } from '$lib/stores/focus.js';
  import IconSettings from '$lib/components/icons/IconSettings.svelte';

  // Constants
  const ID_COLUMN = 'id';
  const CONVERSATION_ID_COLUMN = 'parent';
  const STORAGE_KEY = 'gs-localization-editor-layout';
  const IMPORT_BATCH_SIZE = 500;
  const EXPORT_BATCH_SIZE = 5000;

  // Focus request template (reused to avoid allocations)
  const FOCUS_REQUEST: FocusRequest = {
    tableType: TABLE_LOCALIZATIONS,
    focus: new Map(),
    type: FOCUS_REPLACE,
  };

  // Column ID set (for layout persistence)
  const columnIdSet: Set<string> = new Set();

  // Static column definitions (locale columns added dynamically)
  const staticColumns: ColDef[] = [
    {
      pinned: 'left',
      headerName: 'ID',
      colId: ID_COLUMN,
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

  // State
  let gridElement: HTMLElement;
  let api: GridApi;
  let datasource: GridDatasource<Localization>;
  let selectedRows: IDbRowView<Localization>[] = $state([]);
  let isLoading = new IsLoadingStore();
  let columnDefs: (ColDef | ColGroupDef)[] = [...staticColumns];
  let loadLayoutRequested = $state(true);
  let visibilityHandle: GridVisibilityHandle | undefined;

  // Search & Replace state
  let searchReplaceVisible = $state(false);
  let localeList: Locale[] = $state([]);
  let selectedLocaleIds: Set<number> = $state(new Set());
  let searchString = $state('');
  let replaceString = $state('');
  let showReplaceConfirm = $state(false);

  // Settings panel state
  let settingsExpanded = $state(false);

  // CSV Import state - grouped as single object, null when no import pending
  type ImportMode = 'update' | 'upsert';
  interface PendingImport {
    mode: ImportMode;
    warnings: string[];
  }
  let pendingImport: PendingImport | null = $state(null);

  // Module-level storage for CSV content (not reactive to avoid memory issues)
  let pendingCsvContent: string | null = null;

  // Progress state for import/export operations
  interface OperationProgress {
    type: 'import' | 'export';
    phase: 'preparing' | 'validating' | 'processing' | 'complete' | 'failed' | 'cancelled';
    current: number;
    total: number;
    stats: {
      updated?: number;
      inserted?: number;
      exported?: number;
      skipped?: number;
      errors?: number;
    };
    errorMessages: string[];
  }
  let operationProgress: OperationProgress | null = $state(null);
  let operationAbortController: AbortController | null = null;

  // Parsed row for import processing
  interface ParsedImportRow {
    id: number;
    data: Partial<Localization>;
    lineNumber: number;
  }

  function getGridApi(): GridApi {
    return api;
  }

  function isCellEditable(params: EditableCallbackParams<IDbRowView<Localization>>): boolean {
    return !!params.data && !params.data.data.is_system_created;
  }

  function isRowSelectable(params: IRowNode<IDbRowView<Localization>>): boolean {
    return !!params.data && !params.data.data.is_system_created;
  }

  // ============================================================================
  // Grid Events
  // ============================================================================

  function onSelectionChanged(): void {
    selectedRows = api?.getSelectedRows() ?? [];
  }

  function onRowClicked(event: RowClickedEvent<IDbRowView<Localization>, GridContext>): void {
    if (!event.data) return;
    const rowView: IDbRowView<Localization> = event.data;
    FOCUS_REQUEST.focus = new Map();
    FOCUS_REQUEST.focus.set(rowView.id, { rowId: rowView.id });
    focusManager.focus({
      type: FOCUS_MODE_REPLACE,
      requests: [FOCUS_REQUEST],
    } as FocusRequests);
  }

  // ============================================================================
  // Actions
  // ============================================================================

  function handleCancel(): void {
    api?.deselectAll();
  }

  async function handleCreate(): Promise<void> {
    // If a single conversation is filtered, add to that
    let conversationId: number = 0;
    const filterModel: FilterModel = api?.getFilterModel() ?? {};
    if (CONVERSATION_ID_COLUMN in filterModel) {
      const filter = filterModel[CONVERSATION_ID_COLUMN] as NumberFilterModel;
      if (filter.type === 'equals' && filter.filter != null) {
        conversationId = filter.filter;
      }
    }

    // Create localization (undo is handled by crud layer)
    await isLoading.wrapPromise(
      localizations.create({
        parent: conversationId,
        name: '',
        is_system_created: false,
      })
    );
  }

  async function handleDelete(): Promise<void> {
    const selected = getCopyOfSelectedAndDeselect();
    if (selected.length === 0) return;

    // Delete localizations (undo is handled by crud layer)
    for (const loc of selected) {
      await isLoading.wrapPromise(localizations.remove(loc.id));
    }
  }

  function getCopyOfSelectedAndDeselect(): Localization[] {
    const selected = selectedRows.map((row) => row.data);
    api?.deselectAll();
    return selected;
  }

  // ============================================================================
  // Tag Value Change Handler (uses shared utility)
  // ============================================================================

  const handleTagValueChange = createTagValueChangeHandler(localizations);

  // ============================================================================
  // Search & Replace
  // ============================================================================

  function toggleSearchReplace(): void {
    searchReplaceVisible = !searchReplaceVisible;
  }

  function toggleLocale(localeId: number): void {
    if (selectedLocaleIds.has(localeId)) {
      selectedLocaleIds.delete(localeId);
    } else {
      selectedLocaleIds.add(localeId);
    }
    selectedLocaleIds = selectedLocaleIds; // Trigger reactivity
  }

  function handleSearch(): void {
    if (!api || !searchString) return;

    // Build filter model for all selected locale columns
    const filterModel: FilterModel = {};

    for (const localeId of selectedLocaleIds) {
      const columnId = localeIdToColumn(localeId);
      filterModel[columnId] = {
        filterType: 'text',
        type: 'contains',
        filter: searchString,
      } as TextFilterModel;
    }

    // Apply filter or clear if no locales selected
    if (selectedLocaleIds.size > 0) {
      api.setFilterModel(filterModel);
    } else {
      toastError('Please select at least one locale to search');
    }
  }

  function handleSearchKeyUp(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  /**
   * Execute search/replace.
   * @param locs - Localizations to search within
   * @param deselectAfter - Whether to deselect rows after replacing
   */
  async function executeReplace(
    locs: Localization[],
    deselectAfter: boolean
  ): Promise<void> {
    // Build list of changes across all selected locales
    const changes: Array<{
      id: number;
      columnId: string;
      oldValue: string;
      newValue: string;
    }> = [];

    for (const loc of locs) {
      for (const localeId of selectedLocaleIds) {
        const columnId = localeIdToColumn(localeId);
        const currentValue = loc[columnId as keyof Localization];
        if (typeof currentValue === 'string' && currentValue.includes(searchString)) {
          const newValue = currentValue.split(searchString).join(replaceString);
          changes.push({ id: loc.id, columnId, oldValue: currentValue, newValue });
        }
      }
    }

    if (changes.length === 0) {
      toastSuccess('No matches found');
      return;
    }

    // Apply changes
    for (const change of changes) {
      await localizations.updatePartial(change.id, {
        [change.columnId]: change.newValue,
      } as Partial<Localization>);
    }

    api?.refreshInfiniteCache();
    if (deselectAfter) api?.deselectAll();
    toastSuccess(`Replaced in ${changes.length} localization(s)`);
  }

  async function handleReplace(): Promise<void> {
    if (!searchString) {
      toastError('Enter a search string first');
      return;
    }

    if (selectedLocaleIds.size === 0) {
      toastError('Select at least one locale to search and replace in');
      return;
    }

    const selected = selectedRows.map((row) => row.data);

    if (selected.length === 0) {
      showReplaceConfirm = true;
      return;
    }

    await isLoading.wrapPromise(
      (async () => {
        try {
          await executeReplace(selected, true);
        } catch (err) {
          toastError('Replace failed', err);
        }
      })()
    );
  }

  async function handleReplaceAll(): Promise<void> {
    showReplaceConfirm = false;
    if (!searchString) return;

    await isLoading.wrapPromise(
      (async () => {
        try {
          const allLocs = await localizations.getAll();
          await executeReplace(allLocs, false);
        } catch (err) {
          toastError('Replace all failed', err);
        }
      })()
    );
  }

  // ============================================================================
  // CSV Export/Import
  // ============================================================================

  /**
   * Build column descriptors for CSV export/import based on current locales.
   */
  function buildCsvColumns(): CsvColumnDescriptor[] {
    const activeLocales = localeList.filter(l => !l.is_deleted);
    const localeIds = activeLocales.map(l => l.id);
    const localeNames = new Map(activeLocales.map(l => [l.id, l.name]));
    return buildLocalizationColumns(localeIds, localeNames);
  }

  /**
   * Export all localizations to CSV with streaming writes.
   * Processes rows in batches to avoid memory issues with large datasets.
   */
  async function handleExportCsv(): Promise<void> {
    try {
      // Show save dialog
      const result = await bridge.saveCsvDialog('localizations.csv');
      if (result.cancelled || !result.filePath) return;

      const filePath = result.filePath;

      // Initialize progress
      operationAbortController = new AbortController();
      operationProgress = {
        type: 'export',
        phase: 'preparing',
        current: 0,
        total: 0,
        stats: { exported: 0 },
        errorMessages: [],
      };

      // Get total count
      const totalCount = await localizations.getCount();
      if (totalCount === 0) {
        toastError('No localizations to export');
        operationProgress = null;
        return;
      }

      operationProgress = { ...operationProgress, total: totalCount, phase: 'processing' };

      // Build columns
      const columns = buildCsvColumns();

      // Write header (truncates file if it exists)
      const header = toCsvHeader(columns);
      await bridge.writeFile(filePath, header);

      // Export in batches
      let offset = 0;
      while (offset < totalCount) {
        if (operationAbortController.signal.aborted) {
          operationProgress = { ...operationProgress, phase: 'cancelled' };
          break;
        }

        // Fetch batch
        const batch = await localizations.getBatch(offset, EXPORT_BATCH_SIZE);
        if (batch.length === 0) break;

        // Generate and write CSV for batch
        const csvBatch = toCsvBatch(batch, columns);
        await bridge.appendFile(filePath, csvBatch);

        // Update progress
        offset += batch.length;
        operationProgress = {
          ...operationProgress,
          current: offset,
          stats: { exported: offset },
        };
      }

      // Done
      if (operationProgress.phase !== 'cancelled') {
        operationProgress = { ...operationProgress, phase: 'complete' };
        toastSuccess(`Exported ${operationProgress.stats.exported?.toLocaleString()} localization(s) to CSV`);
      }
    } catch (err) {
      if (operationProgress) {
        operationProgress = {
          ...operationProgress,
          phase: 'failed',
          errorMessages: [`Export failed: ${err}`],
        };
      }
      toastError('Export failed', err);
    }
  }

  // Module-level cache for parsed rows (avoid re-parsing after validation)
  let pendingParsedRows: ParsedImportRow[] | null = null;

  /**
   * Validate and parse CSV content before import.
   * Caches parsed rows to avoid re-parsing during import.
   * Returns validation result with row count and any errors.
   */
  function validateAndParseCsv(csvContent: string): {
    valid: boolean;
    rowCount: number;
    warnings: string[];
    errors: string[];
    parsedRows: ParsedImportRow[];
  } {
    const columns = buildCsvColumns();
    const errors: string[] = [];
    const warnings: string[] = [];
    const parsedRows: ParsedImportRow[] = [];
    const seenIds = new Set<number>();

    // Validate headers
    const lines = csvContent.split(/\r?\n/);
    if (lines.length === 0 || !lines[0].trim()) {
      return { valid: false, rowCount: 0, warnings: [], errors: ['CSV file is empty'], parsedRows: [] };
    }

    const headerValidation = validateCsvHeaders(lines[0], columns);
    if (headerValidation.missing.length > 0) {
      warnings.push(`Missing columns: ${headerValidation.missing.join(', ')}`);
    }
    if (headerValidation.extra.length > 0) {
      warnings.push(`Extra columns (ignored): ${headerValidation.extra.join(', ')}`);
    }

    // Parse and validate each row
    for (const result of parseCsv<Localization>(csvContent, columns)) {
      if (result.errors && result.errors.length > 0) {
        if (errors.length < 100) {
          errors.push(`Line ${result.lineNumber}: ${result.errors.join(', ')}`);
        }
        continue;
      }

      if (!result.row.id) {
        if (errors.length < 100) {
          errors.push(`Line ${result.lineNumber}: Missing ID`);
        }
        continue;
      }

      if (seenIds.has(result.row.id)) {
        if (errors.length < 100) {
          errors.push(`Line ${result.lineNumber}: Duplicate ID ${result.row.id}`);
        }
        continue;
      }
      seenIds.add(result.row.id);

      // Store parsed row for import phase
      parsedRows.push({
        id: result.row.id,
        data: csvRowToLocalizationUpdate(result.row, columns),
        lineNumber: result.lineNumber,
      });
    }

    if (errors.length >= 100) {
      errors.push(`... stopped at 100 errors`);
    }

    return {
      valid: errors.length === 0,
      rowCount: parsedRows.length,
      warnings,
      errors,
      parsedRows,
    };
  }

  /**
   * Start the import process - show file dialog, validate, show confirmation.
   */
  async function handleImportCsv(): Promise<void> {
    try {
      const result = await bridge.openCsvDialog();
      if (result.cancelled || !result.filePath) return;

      // Read file into module-level variable (not reactive)
      pendingCsvContent = await bridge.readFile(result.filePath);

      // Validate and parse (caches parsed rows for import)
      const validation = validateAndParseCsv(pendingCsvContent);

      if (!validation.valid) {
        toastError(`CSV has ${validation.errors.length} error(s): ${validation.errors[0]}`);
        pendingCsvContent = null;
        pendingParsedRows = null;
        return;
      }

      // Cache parsed rows for import phase
      pendingParsedRows = validation.parsedRows;

      // Show confirmation modal
      pendingImport = {
        mode: 'update',
        warnings: validation.warnings,
      };
    } catch (err) {
      toastError('Failed to read CSV file', err);
      pendingCsvContent = null;
      pendingParsedRows = null;
    }
  }

  /**
   * Process a single batch of import rows.
   * Returns stats that should be applied after the transaction commits successfully.
   */
  async function processImportBatch(
    batch: ParsedImportRow[],
    mode: ImportMode
  ): Promise<ImportBatchResult> {
    const batchIds = batch.map((r) => r.id);
    const existing = await localizations.getByIdsChunked(batchIds);

    const rowsToUpdate: Array<{ id: number; data: Partial<Localization> }> = [];
    const rowsToInsert: Localization[] = [];
    let skipped = 0;

    for (const parsed of batch) {
      if (existing.has(parsed.id)) {
        rowsToUpdate.push({ id: parsed.id, data: parsed.data });
      } else if (mode === 'upsert') {
        rowsToInsert.push({
          id: parsed.id,
          is_system_created: false,
          name: '',
          parent: 0,
          ...parsed.data,
        } as Localization);
      } else {
        skipped++;
      }
    }

    // Execute in transaction
    await bridge.transaction(async (tx) => {
      if (rowsToUpdate.length > 0) {
        await localizations.updatePartialBatch(rowsToUpdate, tx);
      }
      if (rowsToInsert.length > 0) {
        await localizations.createBatchWithIds(rowsToInsert, tx);
      }
    });

    // Return stats after successful commit
    return {
      updated: rowsToUpdate.length,
      inserted: rowsToInsert.length,
      skipped,
    };
  }

  /**
   * Execute the CSV import after user confirmation.
   * Uses pre-parsed rows from validation phase.
   * Processes rows in batches with progress reporting.
   */
  async function handleConfirmImport(): Promise<void> {
    if (!pendingImport || !pendingParsedRows) return;

    const parsedRows = pendingParsedRows;
    const mode = pendingImport.mode;

    // Clear modal state
    pendingImport = null;
    pendingCsvContent = null;
    pendingParsedRows = null;

    // Initialize progress
    operationAbortController = new AbortController();
    operationProgress = {
      type: 'import',
      phase: 'processing',
      current: 0,
      total: parsedRows.length,
      stats: { updated: 0, inserted: 0, skipped: 0, errors: 0 },
      errorMessages: [],
    };

    try {
      // Process in batches
      for (let i = 0; i < parsedRows.length; i += IMPORT_BATCH_SIZE) {
        if (operationAbortController.signal.aborted) {
          operationProgress = { ...operationProgress, phase: 'cancelled' };
          break;
        }

        const batch = parsedRows.slice(i, i + IMPORT_BATCH_SIZE);

        try {
          const result = await processImportBatch(batch, mode);
          // Update stats after successful transaction commit
          operationProgress.stats.updated = (operationProgress.stats.updated ?? 0) + result.updated;
          operationProgress.stats.inserted = (operationProgress.stats.inserted ?? 0) + result.inserted;
          operationProgress.stats.skipped = (operationProgress.stats.skipped ?? 0) + result.skipped;
        } catch (err) {
          operationProgress.stats.errors = (operationProgress.stats.errors ?? 0) + 1;
          const errMsg = err instanceof Error ? err.message : String(err);
          if (operationProgress.errorMessages.length < 100) {
            operationProgress.errorMessages.push(
              `Batch ${Math.floor(i / IMPORT_BATCH_SIZE) + 1}: ${errMsg}`
            );
          }
        }

        operationProgress = {
          ...operationProgress,
          current: Math.min(i + IMPORT_BATCH_SIZE, parsedRows.length),
        };
      }

      // Done
      if (operationProgress.phase !== 'cancelled') {
        const hasErrors = (operationProgress.stats.errors ?? 0) > 0;
        operationProgress = {
          ...operationProgress,
          phase: hasErrors ? 'failed' : 'complete',
        };
      }

      // Refresh grid
      api?.refreshInfiniteCache();
    } catch (err) {
      operationProgress = {
        ...operationProgress!,
        phase: 'failed',
        errorMessages: [...(operationProgress?.errorMessages ?? []), `Unexpected error: ${err}`],
      };
    }
  }

  /**
   * Cancel current operation.
   */
  function handleCancelOperation(): void {
    operationAbortController?.abort();
  }

  /**
   * Close progress modal and clean up.
   */
  function handleCloseProgress(): void {
    operationProgress = null;
    operationAbortController = null;
  }

  /**
   * Clean up all pending import state.
   */
  function clearPendingImport(): void {
    pendingImport = null;
    pendingCsvContent = null;
    pendingParsedRows = null;
  }

  // ============================================================================
  // Dynamic Columns - React to locales and tag categories table changes
  // ============================================================================

  $effect(() => {
    // Track the locales table rows and their data
    const localeRowViews = localesTable.rows;
    localeRowViews.forEach(r => r.data); // Establish dependency on each row's data

    // Track the tag categories table rows and their data
    const tagCategoryRowViews = localizationTagCategoriesTable.rows;
    tagCategoryRowViews.forEach((r: typeof tagCategoryRowViews[number]) => r.data);

    // Also track tag values for Set Filter
    const tagValueRowViews = localizationTagValuesTable.rows;
    tagValueRowViews.forEach((r: typeof tagValueRowViews[number]) => r.data);

    // Skip if no locales yet
    if (localeRowViews.length === 0) return;

    // Update locale list for search & replace
    localeList = localeRowViews.map((rowView) => rowView.data);

    // Skip column update if grid not initialized yet
    if (!api) return;

    // Rebuild column definitions
    columnIdSet.clear();
    const newColumnDefs: (ColDef | ColGroupDef)[] = [];

    // Add static columns
    for (const staticColumn of staticColumns) {
      columnIdSet.add(staticColumn.colId!);
      newColumnDefs.push(staticColumn);
    }

    // Build tag columns first (before locale columns)
    const tagColumns = buildTagColumns({
      categoryRowViews: tagCategoryRowViews,
      valueRowViews: tagValueRowViews,
      columnIdSet,
    });
    newColumnDefs.push(...tagColumns);

    // Add dynamic locale columns
    for (const rowView of localeRowViews) {
      const row = rowView.data;
      const colId: string = localeIdToColumn(row.id);
      columnIdSet.add(colId);
      newColumnDefs.push({
        headerName: row.name,
        colId: colId,
        cellEditor: GridCellEditorText,
        cellRenderer: GridCellRenderer,
        filter: 'agTextColumnFilter',
        filterParams: GRID_FILTER_PARAMS_TEXT,
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
  // Event Handlers (matching Electron app pattern)
  // ============================================================================

  const onFilterByParent = (e: Event): void => {
    if (!isCustomEvent(e)) throw new Error('Selection request was missing payload');
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

  const onFilterById = (e: Event): void => {
    if (!isCustomEvent(e)) throw new Error('Selection request was missing payload');
    const filterRequest = e as CustomEvent<GridFilterByIdRequest>;
    const id: number = filterRequest.detail.id;

    // Check if filter is required
    const currentModel = api?.getFilterModel()[ID_COLUMN] as NumberFilterModel | undefined;
    if (currentModel && currentModel.filter === id) return;

    // Filter
    const model: FilterModel = {};
    model[ID_COLUMN] = {
      filterType: 'number',
      filter: id,
      type: 'equals',
    } as NumberFilterModel;
    api?.setFilterModel(model);
  };

  const onLocaleDeleting = (e: Event): void => {
    if (!isCustomEvent(e)) return;
    const event = e as CustomEvent<DbColumnDeleting>;
    if (event.detail.tableType.id === TABLE_LOCALES.id) {
      api?.setFilterModel(null);
      api?.applyColumnState({
        defaultState: { sort: null },
      });
    }
  };

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // Create min width handler
  const { handler: onFirstDataRendered, cleanup: cleanupMinWidthHandler } = createMinWidthHandler();

  onMount(() => {
    // Initialize AG-Grid modules
    initializeGrid();

    // Create datasource
    datasource = new GridDatasource<Localization>(TABLE_LOCALIZATIONS);

    // Create grid context with tag support
    const gridContext: TagGridContext = {
      getGridApi,
      getTagValuesTable: () => localizationTagValuesTable,
      onTagValueChange: handleTagValueChange,
    };

    // Create grid
    const gridOptions: GridOptions = {
      context: gridContext,
      rowModelType: 'infinite',
      columnDefs,
      headerHeight: GRID_HEADER_HEIGHT,
      rowHeight: GRID_ROW_HEIGHT,
      rowSelection: 'multiple',
      suppressRowClickSelection: true,
      onSelectionChanged,
      onRowClicked,
      onFirstDataRendered,
      isRowSelectable,
      getRowStyle: (params) => {
        if (params.data) {
          try {
            const localization: Localization = params.data.data;
            if (localization.is_system_created) {
              return { fontStyle: 'italic', opacity: '0.7' };
            }
          } catch {
            // Row view may be stale/invalidated
          }
        }
        return undefined;
      },
      defaultColDef: {
        suppressMovable: true,
        sortable: true,
        editable: true,
        enableValue: false,
        enableRowGroup: false,
        enablePivot: false,
        flex: 2,
        maxWidth: 300,
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

    // Load layout after initial columns are set (effect will handle columns)
    loadLayoutRequested = true;

    // Event listeners
    addEventListener(EVENT_LF_FILTER_BY_PARENT, onFilterByParent);
    addEventListener(EVENT_LF_FILTER_BY_ID, onFilterById);
    addEventListener(EVENT_DB_COLUMN_DELETING, onLocaleDeleting);
  });

  onDestroy(() => {
    // Save layout
    if (api) {
      saveGridLayout(api, STORAGE_KEY);
    }

    // Remove event listeners
    removeEventListener(EVENT_LF_FILTER_BY_PARENT, onFilterByParent);
    removeEventListener(EVENT_LF_FILTER_BY_ID, onFilterById);
    removeEventListener(EVENT_DB_COLUMN_DELETING, onLocaleDeleting);

    // Cleanup
    visibilityHandle?.cleanup();
    cleanupMinWidthHandler();
    api?.destroy();
  });
</script>

<div class="localization-editor gs-grid-panel">
  <GridToolbar expanded={settingsExpanded}>
    {#snippet left()}
      <Button variant="primary" onclick={handleCreate} disabled={$isLoading}>
        + New
      </Button>

      {#if selectedRows.length > 0}
        <span class="selection-info">{selectedRows.length} selected</span>
        <Button variant="secondary" onclick={handleCancel}>Cancel</Button>
        <Button variant="danger" onclick={handleDelete} disabled={$isLoading}>
          Delete
        </Button>
      {/if}
    {/snippet}

    {#snippet right()}
      <ToggleButton active={searchReplaceVisible} onclick={toggleSearchReplace}>
        Search & Replace
      </ToggleButton>
      <TableOptionsMenu {api} hasTagColumns={true} onExportCsv={handleExportCsv} onImportCsv={handleImportCsv} />
      <ToggleButton
        active={settingsExpanded}
        onclick={() => settingsExpanded = !settingsExpanded}
        title="Tag Category Settings"
      >
        <IconSettings size={16} />
      </ToggleButton>
    {/snippet}

    {#snippet expandedHeader()}
      <span class="settings-header">Tag Category Settings</span>
    {/snippet}

    {#snippet expandedToggle()}
      <ToggleButton
        active={settingsExpanded}
        onclick={() => settingsExpanded = !settingsExpanded}
        title="Close Settings"
      >
        <IconSettings size={16} />
      </ToggleButton>
    {/snippet}

    {#snippet expandedContent()}
      <TagCategorySettingsPanel
        description="Tag categories allow you to create custom columns in the Localization Editor for organizing localizations. Each category becomes a column where you can assign tag values to localizations. Click a category to manage its values in the Inspector."
        entityName="localizations"
        categoriesTable={localizationTagCategoriesTable}
        crud={localizationTagCategories}
        focusCategory={focusLocalizationTagCategory}
        focusedCategoryId={$focusedLocalizationTagCategory}
      />
    {/snippet}
  </GridToolbar>

  <!-- Search & Replace Panel (Collapsible) -->
  {#if searchReplaceVisible}
    <div class="search-replace-panel">
      <div class="search-replace-content">
        <!-- Locale Selection -->
        <div class="locale-selection">
          <label class="control-label">Search in locales:</label>
          <div class="locale-checkboxes">
            {#each localeList.filter((l) => !l.is_deleted) as locale}
              <Checkbox
                checked={selectedLocaleIds.has(locale.id)}
                label={locale.name}
                disabled={$isLoading}
                onchange={() => toggleLocale(locale.id)}
              />
            {/each}
          </div>
        </div>

        <!-- Search Input -->
        <div class="control-row">
          <label class="control-label">Search:</label>
          <Input
            type="text"
            placeholder="Search text..."
            bind:value={searchString}
            onkeyup={handleSearchKeyUp}
            disabled={$isLoading}
          />
        </div>

        <!-- Replace Input -->
        <div class="control-row">
          <label class="control-label">Replace:</label>
          <Input
            type="text"
            placeholder="Replace with..."
            bind:value={replaceString}
            disabled={$isLoading}
          />
        </div>

        <!-- Action Buttons -->
        <div class="control-row">
          <span class="control-label"></span>
          <div class="button-group">
            <Button variant="primary" onclick={handleSearch} disabled={$isLoading}>
              Search
            </Button>
            <Button
              variant="danger"
              onclick={handleReplace}
              disabled={$isLoading || !searchString}
            >
              Replace {selectedRows.length > 0 ? 'Selected' : 'All'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Grid -->
  <div
    class="grid-container"
    class:ag-theme-quartz-dark={$isDarkMode}
    class:ag-theme-quartz={!$isDarkMode}
    bind:this={gridElement}
  ></div>
</div>

<!-- Replace All Confirmation Modal -->
<Modal
  open={showReplaceConfirm}
  title="Replace All?"
  confirmLabel="Replace All"
  confirmVariant="danger"
  size="small"
  onconfirm={handleReplaceAll}
  onclose={() => (showReplaceConfirm = false)}
>
  <p>
    This will replace all occurrences of "<strong>{searchString}</strong>" with "<strong>{replaceString}</strong>" across all localizations in the selected locales.
  </p>
  <p class="warning">This action cannot be undone.</p>
</Modal>

<!-- Import CSV Confirmation Modal -->
<Modal
  open={pendingImport !== null}
  title="Import Localizations?"
  confirmLabel="Import"
  confirmVariant="danger"
  size="small"
  onconfirm={handleConfirmImport}
  onclose={clearPendingImport}
>
  {#if pendingImport}
    <!-- Import Mode Selection -->
    <div class="import-mode-section">
      <label class="import-mode-label">Import mode:</label>
      <div class="import-mode-options">
        <label class="import-mode-option">
          <input
            type="radio"
            name="importMode"
            value="update"
            checked={pendingImport.mode === 'update'}
            onchange={() => pendingImport && (pendingImport.mode = 'update')}
          />
          <span class="import-mode-text">
            <strong>Update only</strong>
            <span class="import-mode-desc">Only update rows that exist in the database</span>
          </span>
        </label>
        <label class="import-mode-option">
          <input
            type="radio"
            name="importMode"
            value="upsert"
            checked={pendingImport.mode === 'upsert'}
            onchange={() => pendingImport && (pendingImport.mode = 'upsert')}
          />
          <span class="import-mode-text">
            <strong>Upsert</strong>
            <span class="import-mode-desc">Update existing rows, insert new ones</span>
          </span>
        </label>
      </div>
    </div>

    <!-- Column Warnings -->
    {#if pendingImport.warnings.length > 0}
      <div class="import-warnings">
        <strong>Warnings:</strong>
        <ul>
          {#each pendingImport.warnings as warning}
            <li>{warning}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <p class="warning">This action cannot be undone. Consider exporting a backup first.</p>
  {/if}
</Modal>

<!-- Progress Modal (shared for import/export) -->
{#if operationProgress}
  <ProgressModal
    open={true}
    title={operationProgress.type === 'import' ? 'Importing Localizations' : 'Exporting Localizations'}
    phase={operationProgress.phase}
    current={operationProgress.current}
    total={operationProgress.total}
    stats={operationProgress.stats}
    errorMessages={operationProgress.errorMessages}
    canCancel={operationProgress.phase === 'processing' || operationProgress.phase === 'validating'}
    oncancel={handleCancelOperation}
    onclose={handleCloseProgress}
  />
{/if}

<style>
  .settings-header {
    font-weight: 600;
    font-size: 13px;
  }

  /* Search & Replace Panel Styles */
  .search-replace-panel {
    background: var(--gs-bg-secondary);
    border-bottom: 1px solid var(--gs-border-primary);
    padding: 12px;
  }

  .search-replace-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .locale-selection {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .locale-checkboxes {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  /* Import Modal Styles */
  .import-mode-section {
    margin-bottom: 16px;
  }

  .import-mode-label {
    display: block;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .import-mode-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .import-mode-option {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    cursor: pointer;
  }

  .import-mode-option input[type='radio'] {
    margin-top: 3px;
  }

  .import-mode-text {
    display: flex;
    flex-direction: column;
  }

  .import-mode-desc {
    font-size: 0.85em;
    color: var(--gs-text-secondary);
  }

  .import-warnings {
    background: var(--gs-bg-warning, #fffbe6);
    border: 1px solid var(--gs-border-warning, #ffe58f);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 16px;
  }

  .import-warnings ul {
    margin: 8px 0 0 0;
    padding-left: 20px;
  }

  .import-warnings li {
    margin: 4px 0;
    font-size: 0.9em;
  }
</style>
