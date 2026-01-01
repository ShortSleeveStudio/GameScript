/**
 * Number cell editor with undo/redo support.
 *
 * Handles integer and decimal input with validation.
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
// Types
// ============================================================================

export interface NumberEditorParams {
  /** Allow decimal values (default: false) */
  allowDecimals?: boolean;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class GridCellEditorNumber<RowType extends Row>
  implements ICellEditorComp<IDbRowView<RowType>, number, GridContext>
{
  // These are initialized in init() which AG Grid calls before any other method
  private rowView!: IDbRowView<RowType>;
  private columnName!: string;
  private element!: HTMLInputElement;
  private allowDecimals = false;
  private min?: number;
  private max?: number;

  getValue(): undefined {
    const inputValue = this.element.value.trim();
    const oldRow = { ...this.rowView.getValue() };
    const oldValue = oldRow[this.columnName as keyof RowType] as number | null;

    // Parse the input
    let newValue: number | null = null;
    if (inputValue !== '') {
      const parsed = this.allowDecimals ? parseFloat(inputValue) : parseInt(inputValue, 10);
      if (!isNaN(parsed)) {
        // Apply min/max constraints
        if (this.min !== undefined && parsed < this.min) {
          newValue = this.min;
        } else if (this.max !== undefined && parsed > this.max) {
          newValue = this.max;
        } else {
          newValue = parsed;
        }
      }
    }

    // Skip if value hasn't changed
    if (newValue === oldValue) {
      return undefined;
    }

    // Perform the update
    const newRow = { ...oldRow, [this.columnName]: newValue } as RowType;

    common.updateOne(this.rowView.tableType, oldRow, newRow, `${this.rowView.tableType.name} update`)
      .catch((error: Error) => {
        toastError('Failed to update', error);
      });

    return undefined;
  }

  afterGuiAttached(): void {
    this.element.focus();
    this.element.select();
  }

  isPopup(): boolean {
    return false;
  }

  getGui(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.element) {
      this.element.remove();
    }
  }

  init(
    params: ICellEditorParams<IDbRowView<RowType>, number, GridContext> & NumberEditorParams
  ): void | AgPromise<void> {
    this.rowView = params.data!;
    this.columnName = params.colDef?.colId ?? params.column?.getColId() ?? '';
    this.allowDecimals = params.allowDecimals ?? false;
    this.min = params.min;
    this.max = params.max;

    // Create input element
    this.element = document.createElement('input');
    this.element.type = 'number';
    this.element.className = 'ag-cell-editor-number';
    this.element.style.width = '100%';
    this.element.style.height = '100%';
    this.element.style.border = 'none';
    this.element.style.outline = 'none';
    this.element.style.padding = '0 4px';

    if (!this.allowDecimals) {
      this.element.step = '1';
    }
    if (this.min !== undefined) {
      this.element.min = String(this.min);
    }
    if (this.max !== undefined) {
      this.element.max = String(this.max);
    }

    // Set initial value
    const currentValue = this.rowView.getValue()[this.columnName as keyof RowType];
    this.element.value = currentValue != null ? String(currentValue) : '';
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createNumberCellEditor<RowType extends Row>(): new () => GridCellEditorNumber<RowType> {
  return GridCellEditorNumber as new () => GridCellEditorNumber<RowType>;
}
