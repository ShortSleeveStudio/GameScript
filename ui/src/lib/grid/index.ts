/**
 * AG-Grid integration module.
 *
 * Provides:
 * - Grid initialization with Enterprise modules
 * - Infinite scrolling datasource with DbRowView integration
 * - Reactive cell renderers and editors
 * - Filter helpers for query building
 * - Column layout persistence
 *
 * @example
 * ```ts
 * import {
 *   initializeGrid,
 *   GridDatasource,
 *   GridCellRenderer,
 *   GridCellEditorText,
 *   GRID_CACHE_BLOCK_SIZE,
 * } from '$lib/grid';
 *
 * // Initialize once at app startup
 * initializeGrid(licenseKey);
 *
 * // Create datasource for a table
 * const datasource = new GridDatasource<Conversation>(TABLE_CONVERSATIONS);
 *
 * // Configure grid
 * const gridOptions = {
 *   rowModelType: 'infinite',
 *   datasource,
 *   cacheBlockSize: GRID_CACHE_BLOCK_SIZE,
 *   defaultColDef: {
 *     cellRenderer: GridCellRenderer,
 *     cellEditor: GridCellEditorText,
 *   },
 * };
 * ```
 */

// Initialization
export { initializeGrid, isGridInitialized } from './initialization.js';

// Constants and configuration
export {
  GRID_CACHE_BLOCK_SIZE,
  GRID_CACHE_MAX_BLOCKS,
  GRID_ROW_HEIGHT,
  GRID_HEADER_HEIGHT,
  GRID_FILTER_PARAMS_TEXT,
  GRID_FILTER_PARAMS_NUMBER,
  loadGridLayout,
  saveGridLayout,
  getCopyOfSelectedAndDeselect,
  applyMinWidthsFromCurrentState,
  createMinWidthHandler,
} from './constants.js';

// Context
export { type GridContext, createGridContext } from './context.js';

// Datasource
export { GridDatasource } from './datasource.svelte.js';

// Cell components
export { GridCellRenderer, createCellRenderer } from './cell-renderer.svelte.js';
export { GridCellRendererRadio, type RadioCellRendererContext } from './cell-renderer-radio.svelte.js';
export { GridCellRendererColor, type ColorCellRendererContext } from './cell-renderer-color.svelte.js';
export { GridCellRendererTag } from './cell-renderer-tag.svelte.js';
export { GridCellEditorText, createTextCellEditor } from './cell-editor-text.js';
export {
  GridCellEditorNumber,
  createNumberCellEditor,
  type NumberEditorParams,
} from './cell-editor-number.js';
export {
  GridCellEditorConversationId,
  createConversationIdCellEditor,
} from './cell-editor-conversation-id.js';
export { GridCellEditorTag, type TagCellEditorParams } from './cell-editor-tag.svelte.js';

// Tag column utilities
export {
  type TagGridContext,
  type TagEntityCrud,
  type BuildTagColumnsConfig,
  createTagValueChangeHandler,
  buildTagColumns,
} from './tag-columns.js';

// Filters
export { BooleanFilter, type BooleanFilterModel } from './filter-boolean.js';
export { datasourceFilterWhere } from './datasource-helpers.js';

// Visibility handler
export { setupGridVisibilityHandler, type GridVisibilityHandle } from './visibility-handler.js';
