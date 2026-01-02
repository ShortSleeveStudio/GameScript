/**
 * Cell editor for tag columns.
 *
 * Displays a combobox (dropdown with filter input) for selecting tag values.
 * Features:
 * - Filter input at top to search tag values
 * - Fixed height scrollable list of values
 * - Click to select, Escape to cancel
 * - "(Clear)" option to remove the tag
 * - Keyboard navigation (arrow keys, Enter, Escape)
 *
 * Uses TagGridContext from tag-columns.ts for context interface.
 */

import type {
  AgPromise,
  ICellEditorComp,
  ICellEditorParams,
} from '@ag-grid-community/core';
import type { Row, BaseTagValue } from '@gamescript/shared';
import type { IDbRowView } from '$lib/db';
import type { TagGridContext } from './tag-columns.js';

// ============================================================================
// Types
// ============================================================================

/** Parameters passed via cellEditorParams */
export interface TagCellEditorParams {
  /** The category ID for this tag column */
  categoryId: number;
}

// ============================================================================
// Styles
// ============================================================================

const CONTAINER_STYLES = `
  position: absolute;
  z-index: 1000;
  background: var(--gs-bg-primary, #1e1e1e);
  border: 1px solid var(--gs-border-primary, #3c3c3c);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 180px;
  max-width: 280px;
  display: flex;
  flex-direction: column;
`;

const FILTER_INPUT_STYLES = `
  padding: 8px;
  border: none;
  border-bottom: 1px solid var(--gs-border-primary, #3c3c3c);
  background: transparent;
  color: var(--gs-fg-primary, #cccccc);
  font-size: 13px;
  outline: none;
`;

const LIST_STYLES = `
  max-height: 200px;
  overflow-y: auto;
  padding: 4px 0;
`;

const ITEM_STYLES = `
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--gs-fg-primary, #cccccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ITEM_HOVER_STYLES = `
  background: var(--gs-list-hover-bg, #2a2d2e);
`;

const ITEM_SELECTED_STYLES = `
  background: var(--gs-list-selected-bg, #094771);
`;

const CLEAR_ITEM_STYLES = `
  color: var(--gs-fg-secondary, #888888);
  font-style: italic;
`;

// ============================================================================
// Implementation
// ============================================================================

export class GridCellEditorTag<RowType extends Row> implements ICellEditorComp {
  private container!: HTMLDivElement;
  private filterInput!: HTMLInputElement;
  private listContainer!: HTMLDivElement;
  private rowView: IDbRowView<RowType> | undefined;
  private context: TagGridContext | undefined;
  private columnName!: string;
  private categoryId!: number;
  private currentValue: number | null = null;
  private selectedIndex: number = -1;
  private filteredValues: BaseTagValue[] = [];
  private effectCleanup: (() => void) | undefined;

  /**
   * Return the DOM element for this editor.
   */
  getGui(): HTMLElement {
    return this.container;
  }

  /**
   * Return the current value.
   */
  getValue(): number | null {
    return this.currentValue;
  }

  /**
   * Called after the editor is attached to the DOM.
   */
  afterGuiAttached(): void {
    // Focus the filter input
    this.filterInput.focus();
  }

  /**
   * Check if the editor should be cancelled.
   */
  isCancelAfterEnd(): boolean {
    return false;
  }

  /**
   * Check if the editor should be cancelled before start.
   */
  isCancelBeforeStart(): boolean {
    return false;
  }

  /**
   * Whether this editor is a popup.
   * Returns true so the dropdown appears as an overlay.
   */
  isPopup(): boolean {
    return true;
  }

  /**
   * Clean up when editor is destroyed.
   */
  destroy(): void {
    if (this.effectCleanup) {
      this.effectCleanup();
      this.effectCleanup = undefined;
    }
    if (this.container) {
      this.container.remove();
    }
  }

  /**
   * Initialize the cell editor.
   */
  init(
    params: ICellEditorParams<IDbRowView<RowType>, number | null, TagGridContext> & TagCellEditorParams
  ): void | AgPromise<void> {
    this.rowView = params.data;
    this.context = params.context;
    this.columnName = params.colDef?.colId ?? params.column?.getColId() ?? '';
    this.categoryId = params.categoryId;
    this.currentValue = params.value ?? null;

    // Create container
    this.container = document.createElement('div');
    this.container.style.cssText = CONTAINER_STYLES;

    // Create filter input
    this.filterInput = document.createElement('input');
    this.filterInput.type = 'text';
    this.filterInput.placeholder = 'Filter...';
    this.filterInput.style.cssText = FILTER_INPUT_STYLES;
    this.filterInput.addEventListener('input', this.handleFilterInput);
    this.filterInput.addEventListener('keydown', this.handleKeyDown);
    this.container.appendChild(this.filterInput);

    // Create list container
    this.listContainer = document.createElement('div');
    this.listContainer.style.cssText = LIST_STYLES;
    this.container.appendChild(this.listContainer);

    // Set up reactivity for the tag values table
    this.setupReactivity();
  }

  /**
   * Set up reactive updates for the tag values list.
   */
  private setupReactivity(): void {
    if (!this.context) return;

    this.effectCleanup = $effect.root(() => {
      $effect(() => {
        if (!this.context) return;

        const tagValuesTable = this.context.getTagValuesTable();

        // Filter to values for this category
        const allValues = tagValuesTable.rows
          .map((rv) => rv.data)
          .filter((v) => v.category_id === this.categoryId);

        // Apply text filter
        this.updateFilteredList(allValues);
      });
    });
  }

  /**
   * Handle filter input changes.
   */
  private handleFilterInput = (): void => {
    if (!this.context) return;

    const tagValuesTable = this.context.getTagValuesTable();

    const allValues = tagValuesTable.rows
      .map((rv) => rv.data)
      .filter((v) => v.category_id === this.categoryId);

    this.updateFilteredList(allValues);
  };

  /**
   * Update the filtered list based on current filter text.
   */
  private updateFilteredList(allValues: BaseTagValue[]): void {
    const filterText = this.filterInput.value.toLowerCase().trim();

    // Filter values by name
    if (filterText) {
      this.filteredValues = allValues.filter((v) =>
        v.name.toLowerCase().includes(filterText)
      );
    } else {
      this.filteredValues = allValues;
    }

    // Reset selection
    this.selectedIndex = -1;

    // Render list
    this.renderList();
  }

  /**
   * Render the list of options.
   */
  private renderList(): void {
    this.listContainer.innerHTML = '';

    // Add "(Clear)" option first
    const clearItem = document.createElement('div');
    clearItem.style.cssText = ITEM_STYLES + CLEAR_ITEM_STYLES;
    clearItem.textContent = '(Clear)';
    clearItem.dataset.index = '-1';
    clearItem.addEventListener('click', () => this.selectValue(null));
    clearItem.addEventListener('mouseenter', () => this.highlightItem(-1));
    this.listContainer.appendChild(clearItem);

    // Add filtered values
    this.filteredValues.forEach((value, index) => {
      const item = document.createElement('div');
      item.style.cssText = ITEM_STYLES;
      item.textContent = value.name;
      item.dataset.index = String(index);
      item.dataset.valueId = String(value.id);

      // Highlight if currently selected
      if (value.id === this.currentValue) {
        item.style.cssText = ITEM_STYLES + ITEM_SELECTED_STYLES;
      }

      item.addEventListener('click', () => this.selectValue(value.id));
      item.addEventListener('mouseenter', () => this.highlightItem(index));
      this.listContainer.appendChild(item);
    });
  }

  /**
   * Highlight an item by index.
   */
  private highlightItem(index: number): void {
    // Remove highlight from all items
    const items = this.listContainer.children;
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as HTMLElement;
      const itemIndex = parseInt(item.dataset.index ?? '-2', 10);
      const valueId = item.dataset.valueId ? parseInt(item.dataset.valueId, 10) : null;

      if (itemIndex === index) {
        item.style.cssText = ITEM_STYLES + ITEM_HOVER_STYLES + (itemIndex === -1 ? CLEAR_ITEM_STYLES : '');
      } else if (valueId === this.currentValue) {
        item.style.cssText = ITEM_STYLES + ITEM_SELECTED_STYLES;
      } else {
        item.style.cssText = ITEM_STYLES + (itemIndex === -1 ? CLEAR_ITEM_STYLES : '');
      }
    }

    this.selectedIndex = index;
  }

  /**
   * Select a value and close the editor.
   */
  private selectValue(valueId: number | null): void {
    this.currentValue = valueId;

    // Call the context handler to update the database
    if (this.rowView && this.context) {
      try {
        const rowId = this.rowView.data.id;
        this.context.onTagValueChange(rowId, this.columnName, valueId);
      } catch {
        // Row view may be stale
      }
    }

    // Stop editing
    const api = this.context?.getGridApi();
    api?.stopEditing();
  }

  /**
   * Handle keyboard navigation.
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.highlightItem(Math.min(this.selectedIndex + 1, this.filteredValues.length - 1));
        this.scrollToSelected();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.highlightItem(Math.max(this.selectedIndex - 1, -1));
        this.scrollToSelected();
        break;

      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex === -1) {
          this.selectValue(null);
        } else if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredValues.length) {
          this.selectValue(this.filteredValues[this.selectedIndex].id);
        }
        break;

      case 'Escape':
        e.preventDefault();
        const api = this.context?.getGridApi();
        api?.stopEditing(true); // Cancel editing
        break;

      case 'Tab':
        // Allow tab to move to next cell
        const api2 = this.context?.getGridApi();
        api2?.stopEditing();
        break;
    }
  };

  /**
   * Scroll the list to show the selected item.
   */
  private scrollToSelected(): void {
    const items = this.listContainer.children;
    const targetIndex = this.selectedIndex + 1; // +1 because clear is first
    if (targetIndex >= 0 && targetIndex < items.length) {
      const item = items[targetIndex] as HTMLElement;
      item.scrollIntoView({ block: 'nearest' });
    }
  }
}