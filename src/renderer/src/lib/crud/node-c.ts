import { CODE_OVERRIDE_DEFAULT } from '@common/common-db';
import { DB_DEFAULT_ACTOR_ID } from '@common/common-db-initialization';
import type { DbConnection } from '@common/common-db-types';
import { type Localization, type Node, type Routine } from '@common/common-schema';
import {
    NODE_TYPE_ROOT,
    ROUTINE_TYPE_USER_CREATED,
    TABLE_LOCALIZATIONS,
    TABLE_NODES,
    TABLE_ROUTINES,
} from '@common/common-types';
import { db } from '@lib/api/db/db';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';

export async function nodeCreate(
    newNode: Node,
    isLoading?: IsLoadingStore,
    connection?: DbConnection,
): Promise<Node> {
    let newUiResponseText: Localization;
    let newVoiceText: Localization;
    let newCondition: Routine;
    let newCode: Routine;

    const createOperation: (conn: DbConnection) => Promise<void> = async (conn: DbConnection) => {
        // Don't bother creating routines/localizations for the root node
        if (newNode.type !== NODE_TYPE_ROOT.name) {
            // Create ui_response_text
            newUiResponseText = await db.createRow(
                TABLE_LOCALIZATIONS,
                <Localization>{
                    parent: newNode.parent,
                    is_system_created: true,
                },
                conn,
            );
            // Create voice_text
            newVoiceText = await db.createRow(
                TABLE_LOCALIZATIONS,
                <Localization>{
                    parent: newNode.parent,
                    is_system_created: true,
                },
                conn,
            );
            // Create condition
            newCondition = await db.createRow(
                TABLE_ROUTINES,
                <Routine>{
                    code: '',
                    type: ROUTINE_TYPE_USER_CREATED.id,
                    is_system_created: true,
                    parent: newNode.parent,
                    is_condition: true,
                },
                conn,
            );
            // Create code
            newCode = await db.createRow(
                TABLE_ROUTINES,
                <Routine>{
                    code: '',
                    type: ROUTINE_TYPE_USER_CREATED.id,
                    is_system_created: true,
                    parent: newNode.parent,
                    is_condition: false,
                },
                conn,
            );
        }
        // Create Node
        newNode = await db.createRow(
            TABLE_NODES,
            <Node>{
                parent: newNode.parent,
                actor: DB_DEFAULT_ACTOR_ID,
                ui_response_text: newUiResponseText ? newUiResponseText.id : null,
                voice_text: newVoiceText ? newVoiceText.id : null,
                condition: newCondition ? newCondition.id : null,
                code: newCode ? newCode.id : null,
                is_system_created: newNode.is_system_created,
                code_override:
                    newNode.code_override === undefined
                        ? CODE_OVERRIDE_DEFAULT
                        : newNode.code_override,
                // Graph Stuff
                type: newNode.type,
                position_x: newNode.position_x,
                position_y: newNode.position_y,
            },
            conn,
        );
    };

    if (connection) {
        if (isLoading) {
            await isLoading.wrapPromise(createOperation(connection));
        } else {
            await createOperation(connection);
        }
    } else {
        if (isLoading) {
            await isLoading.wrapPromise(db.executeTransaction(createOperation));
        } else {
            await db.executeTransaction(createOperation);
        }
    }

    // Register undo/redo
    if (!connection) {
        const undo: () => Promise<void> = async () => {
            await db.executeTransaction(async (conn: DbConnection) => {
                await db.deleteRow(TABLE_NODES, newNode, conn);
                await db.deleteRow(TABLE_ROUTINES, newCode, conn);
                await db.deleteRow(TABLE_ROUTINES, newCondition, conn);
                await db.deleteRow(TABLE_LOCALIZATIONS, newVoiceText, conn);
                await db.deleteRow(TABLE_LOCALIZATIONS, newUiResponseText, conn);
            });
        };
        const redo: () => Promise<void> = async () => {
            await db.executeTransaction(async (conn: DbConnection) => {
                await db.createRow(TABLE_LOCALIZATIONS, newUiResponseText, conn);
                await db.createRow(TABLE_LOCALIZATIONS, newVoiceText, conn);
                await db.createRow(TABLE_ROUTINES, newCondition, conn);
                await db.createRow(TABLE_ROUTINES, newCode, conn);
                await db.createRow(TABLE_NODES, newNode, conn);
            });
        };
        if (isLoading) {
            undoManager.register(
                new Undoable(
                    'node creation',
                    isLoading.wrapFunction(undo),
                    isLoading.wrapFunction(redo),
                ),
            );
        } else {
            undoManager.register(new Undoable('node creation', undo, redo));
        }
    }
    return newNode;
}
