/**
 * Tag column utilities for AG-Grid.
 *
 * Provides:
 * - Unified TagGridContext interface for tag cell components
 * - buildTagColumns() factory for creating tag column definitions
 * - createTagValueChangeHandler() for handling tag value changes
 *
 * These utilities eliminate duplication between ConversationFinder and LocalizationEditor.
 */

import type {
  ColDef,
  KeyCreatorParams,
  SetFilterValuesFuncParams,
  ValueFormatterParams,
  ValueGetterParams,
} from '@ag-grid-community/core';
import type { BaseTagCategory, BaseTagValue, Row } from '@gamescript/shared';
import { tagCategoryIdToColumn } from '@gamescript/shared';
import type { IDbRowView, IDbTableView } from '$lib/db';
import type { GridContext } from './context.js';
import { GridCellRendererTag } from './cell-renderer-tag.svelte.js';
import { GridCellEditorTag } from './cell-editor-tag.svelte.js';
import { toastError } from '$lib/stores/notifications.js';

// ============================================================================
// Unified Context Interface
// ============================================================================

/**
 * Context interface for grids with tag columns.
 *
 * Extends GridContext with tag-specific functionality used by both
 * cell renderers and cell editors.
 */
export interface TagGridContext extends GridContext {
  /**
   * Returns the tag values table view for looking up available values.
   * Used by both renderers (to display names) and editors (to show options).
   */
  getTagValuesTable: () => IDbTableView<BaseTagValue>;

  /**
   * Called when a tag value is selected in a cell editor.
   * @param rowId The entity row ID
   * @param columnName The column name (tag_category_X)
   * @param valueId The selected tag value ID (null to clear)
   */
  onTagValueChange: (rowId: number, columnName: string, valueId: number | null) => Promise<void>;
}

// ============================================================================
// Tag Value Change Handler Factory
// ============================================================================

/**
 * CRUD interface required for tag value change handling.
 */
export interface TagEntityCrud<T extends Row> {
  getById: (id: number) => Promise<T | null>;
  updateOne: (oldRow: T, newRow: T) => Promise<T>;
}

/**
 * Creates a handler function for tag value changes.
 *
 * This eliminates duplication between ConversationFinder and LocalizationEditor
 * which both have nearly identical handleTagValueChange functions.
 *
 * @param crud The CRUD operations for the entity type
 * @returns A handler function compatible with TagGridContext.onTagValueChange
 */
export function createTagValueChangeHandler<T extends Row>(
  crud: TagEntityCrud<T>
): (rowId: number, columnName: string, valueId: number | null) => Promise<void> {
  return async (rowId: number, columnName: string, valueId: number | null): Promise<void> => {
    try {
      const row = await crud.getById(rowId);
      if (!row) return;

      // Update the tag column
      const newRow = { ...row, [columnName]: valueId } as T;
      await crud.updateOne(row, newRow);
    } catch (err) {
      toastError('Failed to update tag', err);
    }
  };
}

// ============================================================================
// Tag Column Builder
// ============================================================================

/**
 * Configuration for building tag columns.
 */
export interface BuildTagColumnsConfig {
  /** Row views of tag categories */
  categoryRowViews: IDbRowView<BaseTagCategory>[];
  /** Row views of tag values */
  valueRowViews: IDbRowView<BaseTagValue>[];
  /** Set to track column IDs (will be mutated) */
  columnIdSet: Set<string>;
}

/**
 * Builds column definitions for tag columns.
 *
 * This function:
 * - Creates a column for each tag category
 * - Uses GridCellRendererTag and GridCellEditorTag for display/editing
 * - Configures AG-Grid Set Filter with dynamic value lookup (not stale closures)
 * - Uses Map for O(1) lookups in filterValueGetter
 *
 * Tag columns can be identified by their column ID pattern (tag_category_*) using
 * the isTagCategoryColumn helper from shared/constants.
 *
 * @param config Configuration containing category/value row views
 * @returns Array of column definitions, or empty array if no categories exist
 */
export function buildTagColumns(config: BuildTagColumnsConfig): ColDef[] {
  const { categoryRowViews, valueRowViews, columnIdSet } = config;

  if (categoryRowViews.length === 0) {
    return [];
  }

  // Build a Map of categoryId -> Map of valueId -> valueName for O(1) lookups
  // This is used by filterValueGetter which is called for every cell during filtering
  const categoryValueMaps = new Map<number, Map<number, string>>();
  for (const rv of valueRowViews) {
    const value = rv.data;
    let valueMap = categoryValueMaps.get(value.category_id);
    if (!valueMap) {
      valueMap = new Map();
      categoryValueMaps.set(value.category_id, valueMap);
    }
    valueMap.set(value.id, value.name);
  }

  const tagColumns: ColDef[] = [];

  for (const rowView of categoryRowViews) {
    const category = rowView.data;
    const colId = tagCategoryIdToColumn(category.id);
    const categoryId = category.id;

    columnIdSet.add(colId);

    // Get the value map for this category (for O(1) lookups)
    const valueMap = categoryValueMaps.get(categoryId) ?? new Map<number, string>();

    // Get value IDs as strings for Set Filter (AG-Grid requires string values)
    const valueIdStrings = Array.from(valueMap.keys()).map(id => String(id));

    tagColumns.push({
      headerName: category.name,
      colId,
      cellRenderer: GridCellRendererTag,
      cellEditor: GridCellEditorTag,
      cellEditorParams: { categoryId },
      // Extract value from IDbRowView wrapper for AG-Grid
      valueGetter: (params: ValueGetterParams<IDbRowView<Row>>) => {
        if (!params.data) return null;
        return params.data.data[colId] as number | null;
      },
      filter: 'agSetColumnFilter',
      filterParams: {
        // Provide tag value IDs (as strings) for the filter
        values: (params: SetFilterValuesFuncParams) => {
          // Note: This captures valueIdStrings at column definition time.
          // The $effect that rebuilds columns runs when values change,
          // so this gets rebuilt with fresh data.
          params.success(valueIdStrings);
        },
        // Display names in the filter dropdown instead of IDs
        valueFormatter: (params: ValueFormatterParams) => {
          if (params.value == null) return '(Empty)';
          const id = parseInt(params.value as string, 10);
          return valueMap.get(id) ?? '(Unknown)';
        },
        // Ensure the filter model stores the ID string, not the formatted name
        keyCreator: (params: KeyCreatorParams) => params.value,
      },
      flex: 1,
    });
  }

  return tagColumns;
}