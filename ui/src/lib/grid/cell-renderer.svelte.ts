/**
 * Reactive cell renderer for AG-Grid.
 *
 * Uses $effect.root to subscribe to DbRowView changes and automatically
 * update the cell when the row data changes (from local edits or remote updates).
 */

import type {
  AgPromise,
  ICellRendererComp,
  ICellRendererParams,
} from '@ag-grid-community/core';
import type { Row } from '@gamescript/shared';
import type { IDbRowView } from '$lib/db';
import type { GridContext } from './context.js';

// ============================================================================
// Implementation
// ============================================================================

export class GridCellRenderer<RowType extends Row> implements ICellRendererComp {
  // These are initialized in init() which AG Grid calls before any other method
  private textNode!: Text;
  private element!: HTMLElement;
  private columnName!: string;
  private rowView: IDbRowView<RowType> | undefined;
  private effectCleanup: (() => void) | undefined;

  /**
   * Called when AG-Grid refreshes the cell (e.g., after scroll).
   */
  refresh(params: ICellRendererParams<IDbRowView<RowType>, string, GridContext>): boolean {
    this.setupReactivity(params);
    return true;
  }

  /**
   * Return the DOM element for this cell.
   */
  getGui(): HTMLElement {
    return this.element;
  }

  /**
   * Clean up subscriptions when cell is destroyed.
   */
  destroy(): void {
    if (this.effectCleanup) {
      this.effectCleanup();
      this.effectCleanup = undefined;
    }
    if (this.element) {
      this.element.remove();
    }
  }

  /**
   * Initialize the cell renderer.
   */
  init(
    params: ICellRendererParams<IDbRowView<RowType>, string, GridContext>
  ): void | AgPromise<void> {
    this.columnName = params.colDef?.colId ?? params.column?.getColId() ?? '';
    this.textNode = document.createTextNode('');
    this.element = document.createElement('div');
    this.element.appendChild(this.textNode);
    this.setupReactivity(params);
  }

  /**
   * Set up reactive updates via $effect.root.
   */
  private setupReactivity(
    params: ICellRendererParams<IDbRowView<RowType>, string, GridContext>
  ): void {
    // Clean up previous effect
    if (this.effectCleanup) {
      this.effectCleanup();
      this.effectCleanup = undefined;
    }

    // Store row view reference
    this.rowView = params.data;

    // Set up new effect if we have data
    if (this.rowView) {
      this.effectCleanup = $effect.root(() => {
        $effect(() => {
          if (!this.rowView) return;

          // Access .data to establish reactivity
          const row = this.rowView.data;
          const value = row[this.columnName as keyof RowType];
          const displayValue = value != null ? String(value) : '';

          // Update the text node
          const newTextNode = document.createTextNode(displayValue);
          this.element.replaceChild(newTextNode, this.textNode);
          this.textNode = newTextNode;
        });
      });
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a cell renderer class for a specific row type.
 * Use this when you need to specify the row type explicitly.
 */
export function createCellRenderer<RowType extends Row>(): new () => GridCellRenderer<RowType> {
  return GridCellRenderer as new () => GridCellRenderer<RowType>;
}
