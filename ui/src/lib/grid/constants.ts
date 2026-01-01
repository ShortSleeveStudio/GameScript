/**
 * AG-Grid constants and configuration.
 */

import type {
  ColumnState,
  GridApi,
  INumberFilterParams,
  ITextFilterParams,
} from '@ag-grid-community/core';

// ============================================================================
// Grid Configuration
// ============================================================================

/** Number of rows to load per cache block */
export const GRID_CACHE_BLOCK_SIZE = 100;

/** Maximum number of cache blocks to keep in memory */
export const GRID_CACHE_MAX_BLOCKS = 3;

/** Standard row height in pixels */
export const GRID_ROW_HEIGHT = 32;

/** Standard header height in pixels */
export const GRID_HEADER_HEIGHT = 32;

/** Column group header height (0 to hide) */
export const GRID_GROUP_HEADER_HEIGHT = 10;

// ============================================================================
// Filter Parameter Presets
// ============================================================================

/** Standard text filter options */
export const GRID_FILTER_PARAMS_TEXT: ITextFilterParams = {
  filterOptions: ['equals', 'notEqual', 'contains', 'notContains', 'startsWith', 'endsWith'],
};

/** Standard number filter options */
export const GRID_FILTER_PARAMS_NUMBER: INumberFilterParams = {
  filterOptions: [
    'equals',
    'notEqual',
    'lessThan',
    'lessThanOrEqual',
    'greaterThan',
    'greaterThanOrEqual',
  ],
};

// ============================================================================
// Column Layout Persistence
// ============================================================================

/**
 * Load a saved column layout from localStorage.
 * Removes any columns that no longer exist in the grid.
 *
 * @param api - The grid API
 * @param storageKey - localStorage key for this grid's layout
 * @param validColumnIds - Set of column IDs that currently exist
 */
export function loadGridLayout(
  api: GridApi,
  storageKey: string,
  validColumnIds: Set<string>
): void {
  const savedStateString = localStorage.getItem(storageKey);
  if (!savedStateString) return;

  try {
    const savedState: ColumnState[] = JSON.parse(savedStateString);

    // Filter out columns that no longer exist
    const sanitizedState = savedState.filter((state) => validColumnIds.has(state.colId));

    if (sanitizedState.length > 0) {
      api.applyColumnState({ state: sanitizedState });
    }
  } catch (error) {
    toastWarning(`[Grid] Failed to load layout from ${storageKey}:`, error);
    localStorage.removeItem(storageKey);
  }
}

/**
 * Save the current column layout to localStorage.
 *
 * @param api - The grid API
 * @param storageKey - localStorage key for this grid's layout
 */
export function saveGridLayout(api: GridApi, storageKey: string): void {
  try {
    const columnState = api.getColumnState();
    localStorage.setItem(storageKey, JSON.stringify(columnState));
  } catch (error) {
    toastWarning(`[Grid] Failed to save layout to ${storageKey}:`, error);
  }
}

// ============================================================================
// Selection Utilities
// ============================================================================

// Import types for getCopyOfSelectedAndDeselect
import type { Row } from '@gamescript/shared';
import type { IDbRowView } from '$lib/db';
import { toastWarning } from '$lib/stores';

/**
 * Copy selected rows and deselect them.
 * Useful for copy/paste and bulk operations.
 *
 * @param api - The grid API
 * @param selectedRows - Array of IDbRowView for selected rows
 * @returns Array of plain row objects (copies, not references)
 */
export function getCopyOfSelectedAndDeselect<RowType extends Row>(
  api: GridApi,
  selectedRows: IDbRowView<RowType>[]
): RowType[] {
  const selected: RowType[] = selectedRows.map((rowView) => ({ ...rowView.getValue() }) as RowType);
  api.deselectAll();
  return selected;
}

// ============================================================================
// Column Width Utilities
// ============================================================================

/**
 * Set minimum widths on all columns based on their current width.
 * Call this after the first auto-size to prevent columns from becoming too narrow.
 *
 * This ensures column headers remain readable even when users manually resize columns.
 *
 * @param api - The grid API
 * @param minWidthPadding - Additional padding to add to current width (default: 20px)
 */
export function applyMinWidthsFromCurrentState(api: GridApi, minWidthPadding: number = 20): void {
  const columnState = api.getColumnState();

  // Set minWidth for each column based on its current width
  const updates = columnState.map((state) => ({
    colId: state.colId,
    minWidth: (state.width ?? 100) + minWidthPadding,
  }));

  api.applyColumnState({ state: updates });
}

/**
 * Create a reusable onFirstDataRendered handler that applies minimum column widths once.
 * Returns a handler function and a cleanup function.
 *
 * @example
 * ```ts
 * const { handler: onFirstDataRendered, cleanup } = createMinWidthHandler();
 *
 * const gridOptions = {
 *   onFirstDataRendered,
 *   // ... other options
 * };
 *
 * // In onDestroy:
 * cleanup();
 * ```
 */
export function createMinWidthHandler(): {
  handler: (params: { api: GridApi }) => void;
  cleanup: () => void;
} {
  let hasApplied = false;

  return {
    handler: (params: { api: GridApi }) => {
      if (!hasApplied) {
        applyMinWidthsFromCurrentState(params.api);
        hasApplied = true;
      }
    },
    cleanup: () => {
      hasApplied = false;
    },
  };
}
