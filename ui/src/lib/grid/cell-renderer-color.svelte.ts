/**
 * Reactive cell renderer for color picker column.
 *
 * Uses $effect.root to subscribe to row data changes and automatically
 * update the color input when the row data changes.
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
// Types
// ============================================================================

export interface ColorCellRendererContext extends GridContext {
  /** Called when the user changes the color */
  onColorChange: (rowView: IDbRowView<Row>, newColor: string) => Promise<void>;
}

// ============================================================================
// Implementation
// ============================================================================

export class GridCellRendererColor<RowType extends Row> implements ICellRendererComp {
  private element!: HTMLElement;
  private colorInput!: HTMLInputElement;
  private rowView: IDbRowView<RowType> | undefined;
  private context: ColorCellRendererContext | undefined;
  private effectCleanup: (() => void) | undefined;
  private columnName: string = 'color';

  /**
   * Called when AG-Grid refreshes the cell (e.g., after scroll).
   */
  refresh(params: ICellRendererParams<IDbRowView<RowType>, unknown, ColorCellRendererContext>): boolean {
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
    params: ICellRendererParams<IDbRowView<RowType>, unknown, ColorCellRendererContext>
  ): void | AgPromise<void> {
    // Get column name from params
    this.columnName = params.colDef?.colId ?? params.column?.getColId() ?? 'color';

    // Create container
    this.element = document.createElement('div');
    this.element.style.display = 'flex';
    this.element.style.alignItems = 'center';
    this.element.style.justifyContent = 'center';
    this.element.style.height = '100%';

    // Create color input
    this.colorInput = document.createElement('input');
    this.colorInput.type = 'color';
    this.colorInput.value = '#808080';
    this.colorInput.style.width = '32px';
    this.colorInput.style.height = '24px';
    this.colorInput.style.border = '1px solid var(--gs-input-border, #3c3c3c)';
    this.colorInput.style.borderRadius = '2px';
    this.colorInput.style.cursor = 'pointer';

    this.element.appendChild(this.colorInput);

    // Store context
    this.context = params.context;

    // Set up change handler
    this.colorInput.addEventListener('change', this.handleChange);

    this.setupReactivity(params);
  }

  /**
   * Handle color input change.
   */
  private handleChange = async (e: Event): Promise<void> => {
    if (!this.rowView || !this.context) return;

    const newColor = (e.target as HTMLInputElement).value;
    await this.context.onColorChange(this.rowView as IDbRowView<Row>, newColor);
  };

  /**
   * Set up reactive updates via $effect.root.
   */
  private setupReactivity(
    params: ICellRendererParams<IDbRowView<RowType>, unknown, ColorCellRendererContext>
  ): void {
    // Clean up previous effect
    if (this.effectCleanup) {
      this.effectCleanup();
      this.effectCleanup = undefined;
    }

    // Store references
    this.rowView = params.data;
    this.context = params.context;

    // Set up new effect if we have data
    if (this.rowView) {
      this.effectCleanup = $effect.root(() => {
        $effect(() => {
          if (!this.rowView) return;

          // Access .data to establish reactivity
          let color: string;
          try {
            const row = this.rowView.data;
            color = (row as Record<string, unknown>)[this.columnName] as string || '#808080';
          } catch {
            // Row view may be stale/invalidated
            return;
          }

          // Update the color input
          this.colorInput.value = color;
        });
      });
    }
  }
}
