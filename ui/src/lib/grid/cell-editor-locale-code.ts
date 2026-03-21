/**
 * Cell editor for locale code column.
 *
 * Displays a native <select> dropdown with all CLDR locale codes + autonyms.
 * For custom (non-CLDR) codes, use the locale inspector.
 *
 * Follows the GridCellEditorText pattern: getValue() performs the DB update
 * and returns undefined.
 */

import type {
  AgPromise,
  ICellEditorComp,
  ICellEditorParams,
} from '@ag-grid-community/core';
import type { Row } from '@gamescript/shared';
import { LOCALE_AUTONYMS } from '@gamescript/shared';
import { type IDbRowView } from '$lib/db';
import { common } from '$lib/crud';
import { toastError } from '$lib/stores/notifications.js';
import type { GridContext } from './context.js';

// Build options once at module level
const cldrEntries = [...LOCALE_AUTONYMS.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]));
const cldrCodeSet = new Set(cldrEntries.map(([code]) => code));

export class GridCellEditorLocaleCode<RowType extends Row>
  implements ICellEditorComp<IDbRowView<RowType>, string, GridContext>
{
  private rowView!: IDbRowView<RowType>;
  private columnName!: string;
  private select!: HTMLSelectElement;
  private initialSelectValue!: string;

  getGui(): HTMLElement {
    return this.select;
  }

  isCancelBeforeStart(): boolean {
    // System-created locales (x-source) are read-only — block editing entirely
    try {
      return Boolean((this.rowView.getValue() as Record<string, unknown>).is_system_created);
    } catch {
      return false;
    }
  }

  getValue(): undefined {
    const newValue = this.select.value;
    if (!newValue) return undefined;

    // Skip if the user didn't change the selection (handles subtag matching:
    // DB has "en_US", dropdown shows "en" — closing without changing shouldn't save)
    if (newValue === this.initialSelectValue) return undefined;

    const oldRow = { ...this.rowView.getValue() };
    const newRow = { ...oldRow, [this.columnName]: newValue } as RowType;
    common.updateOne(this.rowView.tableType, oldRow, newRow, `${this.rowView.tableType.name} update`)
      .catch((error: Error) => {
        toastError('Failed to update locale code', error);
      });

    return undefined;
  }

  afterGuiAttached(): void {
    this.select.focus();
  }

  isPopup(): boolean {
    return false;
  }

  destroy(): void {
    this.select?.remove();
  }

  init(
    params: ICellEditorParams<IDbRowView<RowType>, string, GridContext>
  ): void | AgPromise<void> {
    this.rowView = params.data!;
    this.columnName = params.colDef?.colId ?? params.column?.getColId() ?? '';

    const currentValue = String(this.rowView.getValue()[this.columnName as keyof RowType] ?? '');

    // Find best match: exact → normalized separator → subtag fallback
    const normalized = currentValue.includes('_')
      ? currentValue.replace(/_/g, '-')
      : currentValue.replace(/-/g, '_');
    const subtag = currentValue.split(/[-_]/)[0];
    const matchCode = cldrCodeSet.has(currentValue) ? currentValue
      : cldrCodeSet.has(normalized) ? normalized
      : cldrCodeSet.has(subtag) ? subtag
      : null;

    this.select = document.createElement('select');
    this.select.style.cssText = 'width: 100%; height: 100%; font-size: 13px; font-family: inherit; background: var(--gs-bg-primary); color: var(--gs-fg-primary); border: none; outline: none;';

    // If current value is a non-CLDR code, show it as the first option
    if (!matchCode && currentValue) {
      const currentOption = document.createElement('option');
      currentOption.value = currentValue;
      currentOption.textContent = `${currentValue} (custom)`;
      currentOption.selected = true;
      this.select.appendChild(currentOption);
    }

    for (const [code, autonym] of cldrEntries) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${code} — ${autonym}`;
      if (code === matchCode) option.selected = true;
      this.select.appendChild(option);
    }

    // Remember the initial selection so getValue() can detect actual changes
    this.initialSelectValue = this.select.value;
  }
}
