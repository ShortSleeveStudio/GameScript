/**
 * CRUD operations for code methods (conditions and actions).
 *
 * Handles both database flag updates and code file operations with proper undo support.
 * When a method is enabled/disabled, both the DB flag and the code file are updated atomically.
 */

import { db } from '$lib/db';
import { bridge } from '$lib/api/bridge';
import { registerUndoable, Undoable } from '$lib/undo';
import type { Node, CodeTemplateType } from '@gamescript/shared';
import { TABLE_NODES, type MethodType, METHOD_TYPE_CONDITION } from '@gamescript/shared';

export type { MethodType };

export interface EnableMethodParams {
    /** The node to update */
    node: Node;
    /** The conversation ID (for file operations) */
    conversationId: number;
    /** The method name (e.g., "Node_123_Condition") */
    methodName: string;
    /** The type of method */
    methodType: MethodType;
    /** The code template to use */
    codeTemplate: CodeTemplateType;
    /** Description for undo */
    undoDescription: string;
}

export interface DisableMethodParams {
    /** The node to update */
    node: Node;
    /** The conversation ID (for file operations) */
    conversationId: number;
    /** The method name (e.g., "Node_123_Condition") */
    methodName: string;
    /** The type of method */
    methodType: MethodType;
    /** The code template to use */
    codeTemplate: CodeTemplateType;
    /** The captured code (for undo restoration) */
    capturedCode: string;
    /** Description for undo */
    undoDescription: string;
}

// ============================================================================
// Enable Method
// ============================================================================

/**
 * Enable a method (condition or action) on a node.
 * Creates the method stub in the code file and sets the DB flag.
 * Registers undo that deletes the method and reverts the flag.
 */
export async function enableMethod(params: EnableMethodParams): Promise<void> {
    const { node, conversationId, methodName, methodType, codeTemplate, undoDescription } = params;
    const columnName = methodType === METHOD_TYPE_CONDITION ? 'has_condition' : 'has_action';

    // Capture state for undo/redo
    const oldNode = { ...node };
    const newNode = { ...node, [columnName]: true };

    // Create the method stub
    await bridge.createMethod(conversationId, methodName, methodType, codeTemplate);

    // Update database
    await db.updateRows<Node>(TABLE_NODES, [newNode]);

    // Register undo
    registerUndoable(
        new Undoable(
            undoDescription,
            async () => {
                // Undo: delete the created method and revert DB
                await bridge.deleteMethodsSilent(conversationId, [methodName], codeTemplate);
                await db.updateRows<Node>(TABLE_NODES, [oldNode]);
            },
            async () => {
                // Redo: recreate the method and update DB
                await bridge.createMethod(conversationId, methodName, methodType, codeTemplate);
                await db.updateRows<Node>(TABLE_NODES, [newNode]);
            }
        )
    );
}

// ============================================================================
// Disable Method
// ============================================================================

/**
 * Disable a method (condition or action) on a node.
 * The code should already be deleted by the caller (after user confirmation).
 * Updates the DB flag and registers undo that restores the method.
 *
 * @param params.capturedCode - The code that was deleted (captured before deletion for undo)
 */
export async function disableMethod(params: DisableMethodParams): Promise<void> {
    const { node, conversationId, methodName, methodType, codeTemplate, capturedCode, undoDescription } = params;
    const columnName = methodType === METHOD_TYPE_CONDITION ? 'has_condition' : 'has_action';

    // Capture state for undo/redo
    const oldNode = { ...node };
    const newNode = { ...node, [columnName]: false };

    // Update database
    await db.updateRows<Node>(TABLE_NODES, [newNode]);

    // Register undo
    registerUndoable(
        new Undoable(
            undoDescription,
            async () => {
                // Undo: restore the deleted method and revert DB
                if (capturedCode) {
                    await bridge.restoreMethod(conversationId, methodName, capturedCode, codeTemplate);
                }
                await db.updateRows<Node>(TABLE_NODES, [oldNode]);
            },
            async () => {
                // Redo: delete the method again and update DB
                await bridge.deleteMethodsSilent(conversationId, [methodName], codeTemplate);
                await db.updateRows<Node>(TABLE_NODES, [newNode]);
            }
        )
    );
}
