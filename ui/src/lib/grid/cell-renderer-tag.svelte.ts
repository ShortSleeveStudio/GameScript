/**
 * Reactive cell renderer for tag columns.
 *
 * Displays the tag value name (not the ID) by looking up the value
 * from the tag values table. Reactively updates when the tag assignment changes.
 *
 * Uses TagGridContext from tag-columns.ts for context interface.
 */

import type {
  AgPromise,
  ICellRendererComp,
  ICellRendererParams,
} from '@ag-grid-community/core';
import type { Row } from '@gamescript/shared';
import type { IDbRowView } from '$lib/db';
import type { TagGridContext } from './tag-columns.js';

// ============================================================================
// Implementation
// ============================================================================

export class GridCellRendererTag<RowType extends Row> implements ICellRendererComp {
  private textNode!: Text;
  private element!: HTMLElement;
  private columnName!: string;
  private rowView: IDbRowView<RowType> | undefined;
  private context: TagGridContext | undefined;
  private effectCleanup: (() => void) | undefined;

  /**
   * Called when AG-Grid refreshes the cell (e.g., after scroll).
   */
  refresh(params: ICellRendererParams<IDbRowView<RowType>, unknown, TagGridContext>): boolean {
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
    params: ICellRendererParams<IDbRowView<RowType>, unknown, TagGridContext>
  ): void | AgPromise<void> {
    this.columnName = params.colDef?.colId ?? params.column?.getColId() ?? '';
    this.textNode = document.createTextNode('');
    this.element = document.createElement('div');
    this.element.appendChild(this.textNode);
    this.context = params.context;
    this.setupReactivity(params);
  }

  /**
   * Set up reactive updates via $effect.root.
   */
  private setupReactivity(
    params: ICellRendererParams<IDbRowView<RowType>, unknown, TagGridContext>
  ): void {
    // Clean up previous effect
    if (this.effectCleanup) {
      this.effectCleanup();
      this.effectCleanup = undefined;
    }

    // Store row view reference
    this.rowView = params.data;
    this.context = params.context;

    // Set up new effect if we have data
    if (this.rowView && this.context) {
      this.effectCleanup = $effect.root(() => {
        $effect(() => {
          if (!this.rowView || !this.context) return;

          // Access row data to get the tag value ID (establishes reactivity)
          let tagValueId: number | null;
          try {
            const row = this.rowView.data;
            tagValueId = row[this.columnName as keyof RowType] as number | null;
          } catch {
            // Row view may be stale/invalidated
            return;
          }

          // If no tag assigned, show empty
          if (tagValueId == null) {
            this.updateText('');
            return;
          }

          // Look up the tag value name from the table
          const tagValuesTable = this.context.getTagValuesTable();
          // Access .rows to establish reactivity on the table
          const tagValueRowView = tagValuesTable.rows.find(
            (rv) => rv.id === tagValueId
          );

          if (tagValueRowView) {
            // Access .data to establish reactivity on the row
            this.updateText(tagValueRowView.data.name);
          } else {
            // Tag value not found (maybe deleted?)
            this.updateText('');
          }
        });
      });
    }
  }

  /**
   * Update the display text.
   */
  private updateText(value: string): void {
    const newTextNode = document.createTextNode(value);
    this.element.replaceChild(newTextNode, this.textNode);
    this.textNode = newTextNode;
  }
}