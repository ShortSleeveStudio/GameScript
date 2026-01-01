/**
 * Conversation ID cell editor with foreign key validation.
 *
 * Extends GridCellEditorNumber to provide better error handling
 * for conversation ID foreign key constraints.
 */

import type { Row } from '@gamescript/shared';
import { type IDbRowView } from '$lib/db';
import { common } from '$lib/crud';
import { toastError } from '$lib/stores/notifications.js';
import type { GridContext } from './context.js';
import type {
  AgPromise,
  ICellEditorComp,
  ICellEditorParams,
} from '@ag-grid-community/core';

// ============================================================================
// Implementation
// ============================================================================

const NON_NUMBERS = /\D/g;

export class GridCellEditorConversationId<RowType extends Row>
  implements ICellEditorComp<IDbRowView<RowType>, number, GridContext>
{
  // These are initialized in init() which AG Grid calls before any other method
  private rowView!: IDbRowView<RowType>;
  private columnName!: string;
  private element!: HTMLInputElement;

  getValue(): undefined {
    const inputValue = this.element.value.trim();

    // Skip non-integers
    if (!this.isInteger(inputValue)) {
      return undefined;
    }

    const newValue = parseInt(inputValue, 10);
    const oldRow = { ...this.rowView.getValue() };
    const oldValue = oldRow[this.columnName as keyof RowType] as number | null;

    // Skip if value hasn't changed
    if (newValue === oldValue) {
      return undefined;
    }

    // Perform the update
    const newRow = { ...oldRow, [this.columnName]: newValue } as RowType;

    common.updateOne(this.rowView.tableType, oldRow, newRow, `${this.rowView.tableType.name} update`)
      .catch((e: unknown) => {
        this.handleError(e);
      });

    // The update happens asynchronously
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
    params: ICellEditorParams<IDbRowView<RowType>, number, GridContext>
  ): void | AgPromise<void> {
    this.rowView = params.data!;
    this.columnName = params.colDef?.colId ?? params.column?.getColId() ?? '';

    // Create input element
    this.element = document.createElement('input');
    this.element.type = 'text';
    this.element.className = 'ag-cell-editor-number';
    this.element.style.width = '100%';
    this.element.style.height = '100%';
    this.element.style.border = 'none';
    this.element.style.outline = 'none';
    this.element.style.padding = '0 4px';

    // Set initial value
    const currentValue = this.rowView.getValue()[this.columnName as keyof RowType];
    this.element.value = currentValue != null ? String(currentValue) : '';

    // Only allow numeric input
    this.element.oninput = this.onInput;
  }

  private onInput = (): void => {
    this.element.value = this.element.value.replace(NON_NUMBERS, '');
  };

  private isInteger(str: string): boolean {
    if (str === '') return false;
    return !isNaN(parseInt(str, 10));
  }

  private handleError(e: unknown): void {
    const error = e instanceof Error ? e : new Error(String(e));
    if (error.message && error.message.includes('constraint')) {
      toastError('Failed to update the conversation ID. Are you sure the ID is valid?');
    } else {
      toastError('Update failed', error.message);
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createConversationIdCellEditor<RowType extends Row>(): new () => GridCellEditorConversationId<RowType> {
  return GridCellEditorConversationId as new () => GridCellEditorConversationId<RowType>;
}
