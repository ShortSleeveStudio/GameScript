/**
 * CRUD operations for the code_output_folder table.
 *
 * This is a singleton table with a single row (id = 1) that stores the
 * relative path to the code output folder within the workspace.
 * The row is created during schema initialization.
 */

import { db, TABLE_CODE_OUTPUT_FOLDER } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import type { CodeOutputFolder } from '@gamescript/shared';

/** The singleton row ID (always 1, created during schema initialization) */
const SINGLETON_ID = 1;

// ============================================================================
// Write
// ============================================================================

/**
 * Set the code output folder value with undo support.
 * The row always exists (created during schema initialization).
 *
 * @param folderPath - The relative path to the code output folder
 */
export async function setCodeOutputFolder(folderPath: string): Promise<void> {
    // Get the current value for undo
    const currentRow = await db.selectById<CodeOutputFolder>(TABLE_CODE_OUTPUT_FOLDER, SINGLETON_ID);
    const oldValue = currentRow?.value ?? null;

    // Update the singleton row
    await db.updatePartial<CodeOutputFolder>(TABLE_CODE_OUTPUT_FOLDER, SINGLETON_ID, {
        value: folderPath,
    });

    registerUndoable(
        new Undoable(
            'Set code output folder',
            async () => {
                // Undo: restore old value
                await db.updatePartial<CodeOutputFolder>(TABLE_CODE_OUTPUT_FOLDER, SINGLETON_ID, {
                    value: oldValue,
                });
            },
            async () => {
                // Redo: set new value again
                await db.updatePartial<CodeOutputFolder>(TABLE_CODE_OUTPUT_FOLDER, SINGLETON_ID, {
                    value: folderPath,
                });
            }
        )
    );
}
