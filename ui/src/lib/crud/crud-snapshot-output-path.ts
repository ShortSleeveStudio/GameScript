/**
 * CRUD operations for the snapshot_output_path table.
 *
 * This is a singleton table with a single row (id = 1) that stores the
 * path where exported snapshot files (.gsb) should be placed.
 * The row is created during schema initialization.
 */

import { db, TABLE_SNAPSHOT_OUTPUT_PATH } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import type { SnapshotOutputPath } from '@gamescript/shared';

/** The singleton row ID (always 1, created during schema initialization) */
const SINGLETON_ID = 1;

// ============================================================================
// Write
// ============================================================================

/**
 * Set the snapshot output path value with undo support.
 * The row always exists (created during schema initialization).
 *
 * @param outputPath - The path where snapshot files should be exported
 */
export async function setSnapshotOutputPath(outputPath: string): Promise<void> {
    // Get the current value for undo
    const currentRow = await db.selectById<SnapshotOutputPath>(TABLE_SNAPSHOT_OUTPUT_PATH, SINGLETON_ID);
    const oldValue = currentRow?.value ?? null;

    // Update the singleton row
    await db.updatePartial<SnapshotOutputPath>(TABLE_SNAPSHOT_OUTPUT_PATH, SINGLETON_ID, {
        value: outputPath,
    });

    registerUndoable(
        new Undoable(
            'Set snapshot output path',
            async () => {
                // Undo: restore old value
                await db.updatePartial<SnapshotOutputPath>(TABLE_SNAPSHOT_OUTPUT_PATH, SINGLETON_ID, {
                    value: oldValue,
                });
            },
            async () => {
                // Redo: set new value again
                await db.updatePartial<SnapshotOutputPath>(TABLE_SNAPSHOT_OUTPUT_PATH, SINGLETON_ID, {
                    value: outputPath,
                });
            }
        )
    );
}
