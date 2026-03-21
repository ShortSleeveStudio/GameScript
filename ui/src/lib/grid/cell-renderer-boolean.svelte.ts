/**
 * Reactive read-only cell renderer for boolean columns.
 *
 * Displays a centered checkbox that reflects the current boolean value.
 * Read-only — editing is handled by the inline editor or inspector.
 * Uses $effect.root for reactivity so the checkbox updates when the row changes.
 */

import type {
  AgPromise,
  ICellRendererComp,
  ICellRendererParams,
} from '@ag-grid-community/core';
import type { Row } from '@gamescript/shared';
import type { IDbRowView } from '$lib/db';

export class GridCellRendererBoolean<RowType extends Row> implements ICellRendererComp {
  private element!: HTMLElement;
  private checkbox!: HTMLInputElement;
  private columnName: string = '';
  private effectCleanup: (() => void) | undefined;

  refresh(params: ICellRendererParams<IDbRowView<RowType>>): boolean {
    this.setupReactivity(params);
    return true;
  }

  getGui(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.effectCleanup) {
      this.effectCleanup();
      this.effectCleanup = undefined;
    }
    if (this.element) {
      this.element.remove();
    }
  }

  init(params: ICellRendererParams<IDbRowView<RowType>>): void | AgPromise<void> {
    this.element = document.createElement('div');
    this.element.style.display = 'flex';
    this.element.style.alignItems = 'center';
    this.element.style.justifyContent = 'center';
    this.element.style.height = '100%';

    this.checkbox = document.createElement('input');
    this.checkbox.type = 'checkbox';
    this.checkbox.disabled = true; // read-only indicator
    this.checkbox.style.width = '14px';
    this.checkbox.style.height = '14px';
    this.checkbox.style.cursor = 'default';
    this.checkbox.style.accentColor = 'var(--gs-fg-link, #60a5fa)';

    this.element.appendChild(this.checkbox);

    // Column ID is used as the key into the row data
    this.columnName = params.colDef?.colId ?? '';

    this.setupReactivity(params);
  }

  private setupReactivity(params: ICellRendererParams<IDbRowView<RowType>>): void {
    if (this.effectCleanup) {
      this.effectCleanup();
      this.effectCleanup = undefined;
    }

    const rowView = params.data;
    if (!rowView) return;

    this.columnName = params.colDef?.colId ?? this.columnName;

    this.effectCleanup = $effect.root(() => {
      $effect(() => {
        try {
          const value = rowView.data[this.columnName as keyof RowType];
          this.checkbox.checked = Boolean(value);
        } catch {
          // Row view may be stale/invalidated
        }
      });
    });
  }
}
