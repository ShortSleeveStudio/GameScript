/**
 * Save Trigger
 *
 * Provides a global function to trigger export/save that can be called from:
 * - IDE message handlers (Ctrl+S forwarded from extension)
 * - UI keydown handlers (direct Ctrl+S in webview)
 *
 * This centralizes the save logic so it can be invoked consistently
 * regardless of where the trigger originates.
 */

import { get } from 'svelte/store';
import { dbConnected } from '$lib/stores/connection.js';
import { snapshotOutputPathTableView, getSnapshotOutputPath } from '$lib/tables/snapshot-output-path.js';
import { exportController } from './export-controller.js';

/**
 * Trigger a save/export operation.
 *
 * Checks preconditions (connected, path configured, not already running)
 * and initiates the export if all conditions are met.
 *
 * @returns true if export was triggered, false if preconditions not met
 */
export function triggerSave(): boolean {
  // Check if connected
  if (!get(dbConnected)) {
    return false;
  }

  // Get snapshot output path from table view
  const snapshotOutputPathView = getSnapshotOutputPath(snapshotOutputPathTableView.rows);
  const snapshotOutputPathValue = snapshotOutputPathView?.data.value ?? null;

  // Check if path is configured
  if (snapshotOutputPathValue === null || snapshotOutputPathValue.trim() === '') {
    return false;
  }

  // Check if already running
  if (exportController.isRunning) {
    return false;
  }

  // Trigger export (fire and forget - progress is tracked via exportController.progress store)
  void exportController.exportAll(snapshotOutputPathValue);
  return true;
}
