/**
 * Reactive cell renderer for radio button "Principal" column.
 *
 * Uses $effect.root to subscribe to both the row data and the principal store,
 * automatically updating the radio button when either changes.
 */

import type {
  AgPromise,
  ICellRendererComp,
  ICellRendererParams,
} from '@ag-grid-community/core';
import type { Row, Principaled } from '@gamescript/shared';
import type { IDbRowView } from '$lib/db';
import type { GridContext } from './context.js';

// ============================================================================
// Types
// ============================================================================

export interface RadioCellRendererContext extends GridContext {
  /** Returns the current principal row view */
  getPrincipalRowView: () => IDbRowView<Row & Principaled> | undefined;
  /** Called when the user changes the primary selection */
  onPrimaryChange: (rowId: number) => Promise<void>;
}

// ============================================================================
// Implementation
// ============================================================================

export class GridCellRendererRadio<RowType extends Row> implements ICellRendererComp {
  private element!: HTMLElement;
  private radio!: HTMLInputElement;
  private rowView: IDbRowView<RowType> | undefined;
  private context: RadioCellRendererContext | undefined;
  private effectCleanup: (() => void) | undefined;

  /**
   * Called when AG-Grid refreshes the cell (e.g., after scroll).
   */
  refresh(params: ICellRendererParams<IDbRowView<RowType>, unknown, RadioCellRendererContext>): boolean {
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
    params: ICellRendererParams<IDbRowView<RowType>, unknown, RadioCellRendererContext>
  ): void | AgPromise<void> {
    // Create container
    this.element = document.createElement('div');
    this.element.style.display = 'flex';
    this.element.style.alignItems = 'center';
    this.element.style.justifyContent = 'center';
    this.element.style.height = '100%';

    // Create radio button
    this.radio = document.createElement('input');
    this.radio.type = 'radio';
    this.radio.name = 'principal-radio';
    this.radio.style.width = '16px';
    this.radio.style.height = '16px';
    this.radio.style.cursor = 'pointer';

    this.element.appendChild(this.radio);

    // Store context
    this.context = params.context;

    // Set up change handler
    this.radio.addEventListener('change', this.handleChange);

    this.setupReactivity(params);
  }

  /**
   * Handle radio button change.
   */
  private handleChange = async (): Promise<void> => {
    if (!this.rowView || !this.context) return;

    try {
      const row = this.rowView.data;
      await this.context.onPrimaryChange(row.id);
    } catch {
      // Row view may be stale/invalidated
    }
  };

  /**
   * Set up reactive updates via $effect.root.
   */
  private setupReactivity(
    params: ICellRendererParams<IDbRowView<RowType>, unknown, RadioCellRendererContext>
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

          // Get the principal row view (establishes reactivity)
          const principalRowView = this.context.getPrincipalRowView();
          if (!principalRowView) {
            this.radio.checked = false;
            this.radio.title = 'Set as primary';
            return;
          }

          // Access .data to establish reactivity on the principal
          const principalId = principalRowView.data.principal;

          // Access row data to get the row ID
          let rowId: number;
          try {
            rowId = this.rowView.data.id;
          } catch {
            // Row view may be stale/invalidated
            return;
          }

          // Update radio state
          const isChecked = principalId === rowId;
          this.radio.checked = isChecked;
          this.radio.title = isChecked ? 'Primary' : 'Set as primary';
        });
      });
    }
  }
}
