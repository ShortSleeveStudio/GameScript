/**
 * Grid context interface for sharing grid API with cell components.
 */

import type { GridApi } from '@ag-grid-community/core';

/**
 * Context object passed to all grid cell renderers and editors.
 */
export interface GridContext {
  /**
   * Get the grid API instance.
   */
  getGridApi(): GridApi;
}

/**
 * Create a grid context object.
 */
export function createGridContext(getGridApi: () => GridApi): GridContext {
  return { getGridApi };
}
