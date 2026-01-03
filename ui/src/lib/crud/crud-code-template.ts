/**
 * CRUD operations for the code_template table.
 *
 * This is a singleton table with a single row (id = 1) that stores the
 * selected code template type: 'unity' | 'godot' | 'unreal'.
 * The row is created during schema initialization with default value 'unity'.
 */

import { db, TABLE_CODE_TEMPLATE } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import type { CodeTemplate } from '@gamescript/shared';

/** The singleton row ID (always 1, created during schema initialization) */
const SINGLETON_ID = 1;

/** Valid code template values */
export type CodeTemplateValue = 'unity' | 'godot' | 'unreal';

// ============================================================================
// Write
// ============================================================================

/**
 * Set the code template value with undo support.
 * The row always exists (created during schema initialization).
 *
 * @param template - The code template type: 'unity' | 'godot' | 'unreal'
 */
export async function setCodeTemplate(template: CodeTemplateValue): Promise<void> {
    // Get the current value for undo
    const currentRow = await db.selectById<CodeTemplate>(TABLE_CODE_TEMPLATE, SINGLETON_ID);
    const oldValue = (currentRow?.value as CodeTemplateValue | null) ?? 'unity';

    // Update the singleton row
    await db.updatePartial<CodeTemplate>(TABLE_CODE_TEMPLATE, SINGLETON_ID, {
        value: template,
    });

    registerUndoable(
        new Undoable(
            'Set code template',
            async () => {
                // Undo: restore old value
                await db.updatePartial<CodeTemplate>(TABLE_CODE_TEMPLATE, SINGLETON_ID, {
                    value: oldValue,
                });
            },
            async () => {
                // Redo: set new value again
                await db.updatePartial<CodeTemplate>(TABLE_CODE_TEMPLATE, SINGLETON_ID, {
                    value: template,
                });
            }
        )
    );
}
