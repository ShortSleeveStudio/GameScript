/**
 * Cell renderer for locale code column.
 *
 * Displays the locale code with its CLDR autonym: "en — English", "fr — français".
 * For non-CLDR codes, shows just the code.
 */

import type {
  ICellRendererComp,
  ICellRendererParams,
} from '@ag-grid-community/core';
import type { Row } from '@gamescript/shared';
import { getLocaleAutonym, isKnownLocale } from '@gamescript/shared';
import type { IDbRowView } from '$lib/db';
import type { GridContext } from './context.js';

export class GridCellRendererLocaleCode<RowType extends Row> implements ICellRendererComp {
  private element!: HTMLSpanElement;
  private rowView: IDbRowView<RowType> | undefined;
  private columnName!: string;
  private effectCleanup: (() => void) | undefined;

  getGui(): HTMLElement {
    return this.element;
  }

  refresh(params: ICellRendererParams<IDbRowView<RowType>, string, GridContext>): boolean {
    this.setupReactivity(params);
    return true;
  }

  init(params: ICellRendererParams<IDbRowView<RowType>, string, GridContext>): void {
    this.element = document.createElement('span');
    this.element.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    this.setupReactivity(params);
  }

  private setupReactivity(params: ICellRendererParams<IDbRowView<RowType>, string, GridContext>): void {
    // Clean up previous effect
    if (this.effectCleanup) {
      this.effectCleanup();
      this.effectCleanup = undefined;
    }

    this.rowView = params.data;
    this.columnName = params.colDef?.colId ?? params.column?.getColId() ?? '';

    if (!this.rowView) {
      this.element.textContent = '';
      return;
    }

    this.effectCleanup = $effect.root(() => {
      $effect(() => {
        if (!this.rowView) return;
        const row = this.rowView.data as Record<string, unknown>;
        const code = String(row[this.columnName] ?? '');
        const isSystem = Boolean(row.is_system_created);

        if (isSystem) {
          // x-source: lock icon + label, styled as read-only
          this.element.textContent = `🔒 ${code}`;
          this.element.title = 'Source locale — used for in-editor authoring and testing. Not shipped to players. Cannot be renamed or deleted.';
          this.element.style.opacity = '0.65';
          this.element.style.fontStyle = 'italic';
        } else {
          this.element.title = '';
          this.element.style.opacity = '';
          this.element.style.fontStyle = '';
          if (isKnownLocale(code)) {
            this.element.textContent = `${code} — ${getLocaleAutonym(code)}`;
          } else {
            this.element.textContent = code;
          }
        }
      });
    });
  }

  destroy(): void {
    if (this.effectCleanup) {
      this.effectCleanup();
      this.effectCleanup = undefined;
    }
  }
}
