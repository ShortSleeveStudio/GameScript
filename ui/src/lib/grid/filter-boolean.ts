/**
 * Custom boolean filter for AG-Grid.
 *
 * Provides a simple three-state filter: Unset / True / False
 */

import type {
  AgPromise,
  IDoesFilterPassParams,
  IFilterComp,
  IFilterParams,
  ISimpleFilterModel,
} from '@ag-grid-community/core';

// ============================================================================
// Types
// ============================================================================

export interface BooleanFilterModel extends ISimpleFilterModel {
  filterType?: 'boolean';
  filter?: boolean | null;
}

// ============================================================================
// Filter Component
// ============================================================================

export class BooleanFilter implements IFilterComp {
  private gui!: HTMLDivElement;
  private filterParams!: IFilterParams;
  private unsetElement!: HTMLInputElement;
  private trueElement!: HTMLInputElement;
  private falseElement!: HTMLInputElement;
  private filterActive = false;
  private filterChangedCallback!: (additionalEventAttributes?: unknown) => void;

  getGui(): HTMLElement {
    return this.gui;
  }

  init(params: IFilterParams): void | AgPromise<void> {
    this.filterParams = params;
    this.filterChangedCallback = params.filterChangedCallback;

    // Create GUI
    this.gui = document.createElement('div');
    this.gui.className = 'ag-filter-body-wrapper';
    this.gui.innerHTML = `
      <div class="grid-boolean-filter" style="padding: 8px;">
        <label style="display: block; margin-bottom: 4px; cursor: pointer;">
          <input type="radio" name="boolean-filter-${params.column.getColId()}" checked />
          <span style="margin-left: 4px;">Any</span>
        </label>
        <label style="display: block; margin-bottom: 4px; cursor: pointer;">
          <input type="radio" name="boolean-filter-${params.column.getColId()}" />
          <span style="margin-left: 4px;">True</span>
        </label>
        <label style="display: block; cursor: pointer;">
          <input type="radio" name="boolean-filter-${params.column.getColId()}" />
          <span style="margin-left: 4px;">False</span>
        </label>
      </div>
    `;

    // Get input elements
    const inputs = this.gui.querySelectorAll('input[type="radio"]');
    this.unsetElement = inputs[0] as HTMLInputElement;
    this.trueElement = inputs[1] as HTMLInputElement;
    this.falseElement = inputs[2] as HTMLInputElement;

    // Add event listeners
    this.unsetElement.addEventListener('change', this.onRadioChanged.bind(this));
    this.trueElement.addEventListener('change', this.onRadioChanged.bind(this));
    this.falseElement.addEventListener('change', this.onRadioChanged.bind(this));
  }

  isFilterActive(): boolean {
    return this.filterActive;
  }

  getModel(): BooleanFilterModel | null {
    if (!this.filterActive) return null;

    return {
      filterType: 'boolean',
      type: 'equals',
      filter: this.trueElement.checked,
    };
  }

  setModel(model: BooleanFilterModel | null): void | AgPromise<void> {
    if (model == null || model.filter === null || model.filter === undefined) {
      this.unsetElement.checked = true;
      this.filterActive = false;
    } else if (model.filter === true) {
      this.trueElement.checked = true;
      this.filterActive = true;
    } else {
      this.falseElement.checked = true;
      this.filterActive = true;
    }
  }

  doesFilterPass(params: IDoesFilterPassParams): boolean {
    if (!this.isFilterActive()) return true;

    const value = this.filterParams.getValue(params.node) as boolean | undefined;
    const filterValue = this.trueElement.checked;

    return value === filterValue;
  }

  private onRadioChanged(): void {
    this.filterActive = !this.unsetElement.checked;
    this.filterChangedCallback();
  }
}
