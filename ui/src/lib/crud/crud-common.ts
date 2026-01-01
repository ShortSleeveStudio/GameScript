/**
 * Generic CRUD operations for any table type.
 *
 * These functions provide common database operations for generic components
 * that work with any table type.
 *
 * Use these when:
 * - You need to fetch or update a row from a generic component that works with any table
 * - You want undo/redo support without duplicating the logic
 *
 * For entity-specific operations (create, delete, complex updates),
 * use the dedicated CRUD modules (crud-nodes.ts, crud-actors.ts, etc.)
 */

import { db, DbRowContainer, type IDbTableView, type DbRowContainerFetcher } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import type { Row, TableRef, QueryFilter } from '@gamescript/shared';

// ============================================================================
// Re-exports
// ============================================================================

/**
 * Re-export DbRowContainer for use by grid datasources.
 * This container manages row views for infinite scrolling grids.
 */
export { DbRowContainer, type DbRowContainerFetcher };

/**
 * The fetcher interface for DbRowContainer.
 * This is the db instance cast to the appropriate interface.
 */
export function getRowContainerFetcher<T extends Row>(): DbRowContainerFetcher<T> {
  return db as DbRowContainerFetcher<T>;
}

// ============================================================================
// Read
// ============================================================================

/**
 * Fetch a table view with the given filter.
 * Creates a new IDbTableView that will load rows matching the filter.
 *
 * @param tableType - The table type constant (e.g., TABLE_NODES)
 * @param filter - Query filter for rows to fetch
 * @returns A reactive table view
 */
export function fetchTable<T extends Row>(
  tableType: TableRef,
  filter: QueryFilter<T>
): IDbTableView<T> {
  return db.fetchTable(tableType, filter);
}

/**
 * Release a table view, disposing of its resources.
 * Call this when the component unmounts to prevent memory leaks.
 *
 * @param tableView - The table view to release
 */
export function releaseTable<T extends Row>(tableView: IDbTableView<T>): void {
  db.releaseTable(tableView);
}

/**
 * Fetch raw rows from the database (without wrapping in row views).
 * Use this for read-only queries where you don't need reactive updates.
 *
 * @param tableType - The table type constant (e.g., TABLE_NODES)
 * @param filter - Query filter for rows to fetch
 * @returns Array of raw row data
 */
export async function fetchRowsRaw<T extends Row>(
  tableType: TableRef,
  filter: QueryFilter<T>
): Promise<T[]> {
  return db.select(tableType, filter);
}

// ============================================================================
// Update
// ============================================================================

/**
 * Update a single row with undo support.
 *
 * @param tableType - The table type constant (e.g., TABLE_NODES)
 * @param oldRow - The row before changes (for undo)
 * @param newRow - The row with changes applied
 * @param undoDescription - Description shown in undo/redo UI (e.g., "Update node name")
 * @returns The updated row
 */
export async function updateOne<T extends Row>(
  tableType: TableRef,
  oldRow: T,
  newRow: T,
  undoDescription: string
): Promise<T> {
  const results = await updateMany(tableType, [oldRow], [newRow], undoDescription);
  return results[0];
}

/**
 * Update multiple rows with undo support.
 *
 * @param tableType - The table type constant (e.g., TABLE_NODES)
 * @param oldRows - The rows before changes (for undo)
 * @param newRows - The rows with changes applied
 * @param undoDescription - Description shown in undo/redo UI
 * @returns The updated rows
 */
export async function updateMany<T extends Row>(
  tableType: TableRef,
  oldRows: T[],
  newRows: T[],
  undoDescription: string
): Promise<T[]> {
  const results = await db.updateRows<T>(tableType, newRows);

  registerUndoable(
    new Undoable(
      undoDescription,
      async () => {
        await db.updateRows(tableType, oldRows);
      },
      async () => {
        await db.updateRows(tableType, newRows);
      }
    )
  );

  return results;
}
