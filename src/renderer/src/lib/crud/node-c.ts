import { db } from '@lib/api/db/db';
import {
    ROUTINE_TYPE_ID_USER,
    TABLE_ID_LOCALIZATIONS,
    TABLE_ID_NODES,
    TABLE_ID_ROUTINES,
    type Localization,
    type Node,
    type Routine,
} from '@lib/api/db/db-schema';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';
import type { DbConnection } from 'preload/api-db';

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
        // Create uiResponseText
        newUiResponseText = await db.createRow(
            TABLE_ID_LOCALIZATIONS,
            <Localization>{
                parent: newNode.parent,
                isSystemCreated: true,
            },
            conn,
        );
        // Create voiceText
        newVoiceText = await db.createRow(
            TABLE_ID_LOCALIZATIONS,
            <Localization>{
                parent: newNode.parent,
                isSystemCreated: true,
            },
            conn,
        );
        // Create condition
        newCondition = await db.createRow(
            TABLE_ID_ROUTINES,
            <Routine>{
                code: '',
                type: ROUTINE_TYPE_ID_USER,
                isSystemCreated: true,
                parent: newNode.parent,
            },
            conn,
        );
        // Create code
        newCode = await db.createRow(
            TABLE_ID_ROUTINES,
            <Routine>{
                code: '',
                type: ROUTINE_TYPE_ID_USER,
                isSystemCreated: true,
                parent: newNode.parent,
            },
            conn,
        );
        // Create Node
        newNode = await db.createRow(
            TABLE_ID_NODES,
            <Node>{
                parent: newNode.parent,
                actor: 0,
                uiResponseText: newUiResponseText.id,
                voiceText: newVoiceText.id,
                condition: newCondition.id,
                code: newCode.id,
                isSystemCreated: newNode.isSystemCreated,
                // Graph Stuff
                type: newNode.type,
                positionX: newNode.positionX,
                positionY: newNode.positionY,
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
                await db.deleteRow(TABLE_ID_NODES, newNode, conn);
                await db.deleteRow(TABLE_ID_ROUTINES, newCode, conn);
                await db.deleteRow(TABLE_ID_ROUTINES, newCondition, conn);
                await db.deleteRow(TABLE_ID_LOCALIZATIONS, newVoiceText, conn);
                await db.deleteRow(TABLE_ID_LOCALIZATIONS, newUiResponseText, conn);
            });
        };
        const redo: () => Promise<void> = async () => {
            await db.executeTransaction(async (conn: DbConnection) => {
                await db.createRow(TABLE_ID_LOCALIZATIONS, newUiResponseText, conn);
                await db.createRow(TABLE_ID_LOCALIZATIONS, newVoiceText, conn);
                await db.createRow(TABLE_ID_ROUTINES, newCondition, conn);
                await db.createRow(TABLE_ID_ROUTINES, newCode, conn);
                await db.createRow(TABLE_ID_NODES, newNode, conn);
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

    console.log('node create complete');
    return newNode;
}
