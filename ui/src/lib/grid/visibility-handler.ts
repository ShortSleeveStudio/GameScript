/**
 * Grid visibility handler for Golden Layout integration.
 *
 * Handles column auto-sizing when a grid becomes visible after being loaded in a hidden tab.
 * This is necessary because AG-Grid cannot properly measure column widths when the grid element
 * is not visible in the DOM.
 */

import type { GridApi } from '@ag-grid-community/core';

/**
 * Handle returned by setupGridVisibilityHandler for controlling visibility-aware operations.
 */
export interface GridVisibilityHandle {
  /**
   * Check if the grid is currently visible.
   */
  isVisible(): boolean;

  /**
   * Request column auto-sizing. If the grid is visible, sizes immediately.
   * If not visible, defers until the grid becomes visible.
   */
  requestAutoSize(): void;

  /**
   * Cleanup function to disconnect the observer.
   */
  cleanup(): void;
}

/**
 * Setup visibility handler for an AG-Grid instance.
 * Call this after creating the grid.
 *
 * The handler:
 * 1. Uses IntersectionObserver to detect when grid becomes visible
 * 2. Auto-sizes columns on first visibility or when requested while hidden
 * 3. Provides methods to check visibility and request deferred auto-sizing
 *
 * @param gridElement - The grid container element
 * @param api - AG-Grid API instance
 * @returns Handle with visibility methods and cleanup function
 *
 * @example
 * ```ts
 * onMount(() => {
 *   api = createGrid(gridElement, gridOptions);
 *   visibilityHandle = setupGridVisibilityHandler(gridElement, api);
 *
 *   return () => {
 *     visibilityHandle.cleanup();
 *     api?.destroy();
 *   };
 * });
 *
 * // When columns change:
 * function onColumnsChanged() {
 *   api.setGridOption('columnDefs', newColumnDefs);
 *   visibilityHandle.requestAutoSize(); // Defers if not visible
 * }
 * ```
 */
export function setupGridVisibilityHandler(
  gridElement: HTMLElement,
  api: GridApi
): GridVisibilityHandle {
  let isCurrentlyVisible = false;
  let pendingAutoSize = true; // Start with pending to handle initial visibility

  // Create intersection observer to detect visibility changes
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        isCurrentlyVisible = entry.isIntersecting;

        // If grid is now visible and we have a pending auto-size
        if (isCurrentlyVisible && pendingAutoSize) {
          pendingAutoSize = false;

          // Give AG-Grid a moment to finish rendering
          requestAnimationFrame(() => {
            api.autoSizeAllColumns();
          });
        }
      }
    },
    {
      // Trigger as soon as any part becomes visible
      threshold: 0.01,
    }
  );

  // Start observing the grid element
  observer.observe(gridElement);

  return {
    isVisible(): boolean {
      return isCurrentlyVisible;
    },

    requestAutoSize(): void {
      if (isCurrentlyVisible) {
        // Visible - size immediately
        requestAnimationFrame(() => {
          api.autoSizeAllColumns();
        });
      } else {
        // Not visible - defer until visible
        pendingAutoSize = true;
      }
    },

    cleanup(): void {
      observer.disconnect();
    },
  };
}
