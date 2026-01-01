/**
 * Text cell editor with undo/redo support.
 *
 * Integrates with:
 * - DbRowView for reactive data binding
 * - UndoManager for undo/redo functionality
 * - Database updates via CRUD layer
 */

import type {
  AgPromise,
  ICellEditorComp,
  ICellEditorParams,
} from '@ag-grid-community/core';
import type { Row } from '@gamescript/shared';
import { type IDbRowView } from '$lib/db';
import { common } from '$lib/crud';
import { toastError } from '$lib/stores/notifications.js';
import type { GridContext } from './context.js';

// ============================================================================
// Implementation
// ============================================================================

export class GridCellEditorText<RowType extends Row>
  implements ICellEditorComp<IDbRowView<RowType>, string, GridContext>
{
  // These are initialized in init() which AG Grid calls before any other method
  private rowView!: IDbRowView<RowType>;
  private columnName!: string;
  private element!: HTMLInputElement;

  /**
   * Get the new value after editing.
   * Returns undefined because updates happen asynchronously.
   */
  getValue(): undefined {
    const newValue = this.element.value || null;
    const oldRow = { ...this.rowView.getValue() };
    const oldValue = oldRow[this.columnName as keyof RowType] as string | null;

    // Skip if value hasn't changed
    if (newValue === (oldValue ?? '')) {
      return undefined;
    }

    // Perform the update
    const newRow = { ...oldRow, [this.columnName]: newValue } as RowType;

    common.updateOne(this.rowView.tableType, oldRow, newRow, `${this.rowView.tableType.name} update`)
      .catch((error: Error) => {
        toastError('Failed to update', error);
      });

    // Return undefined - updates happen async
    return undefined;
  }

  /**
   * Focus the input after the editor is attached.
   */
  afterGuiAttached(): void {
    this.element.focus();
    this.element.select();
  }

  /**
   * Whether the editor is a popup (we use inline editing).
   */
  isPopup(): boolean {
    return false;
  }

  /**
   * Get the DOM element for the editor.
   */
  getGui(): HTMLElement {
    return this.element;
  }

  /**
   * Clean up the editor.
   */
  destroy(): void {
    if (this.element) {
      this.element.remove();
    }
  }

  /**
   * Initialize the cell editor.
   */
  init(
    params: ICellEditorParams<IDbRowView<RowType>, string, GridContext>
  ): void | AgPromise<void> {
    this.rowView = params.data!;
    this.columnName = params.colDef?.colId ?? params.column?.getColId() ?? '';

    // Create input element
    this.element = document.createElement('input');
    this.element.type = 'text';
    this.element.className = 'ag-cell-editor-text';
    this.element.style.width = '100%';
    this.element.style.height = '100%';
    this.element.style.border = 'none';
    this.element.style.outline = 'none';
    this.element.style.padding = '0 4px';

    // Set initial value
    const currentValue = this.rowView.getValue()[this.columnName as keyof RowType];
    this.element.value = currentValue != null ? String(currentValue) : '';
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createTextCellEditor<RowType extends Row>(): new () => GridCellEditorText<RowType> {
  return GridCellEditorText as new () => GridCellEditorText<RowType>;
}
