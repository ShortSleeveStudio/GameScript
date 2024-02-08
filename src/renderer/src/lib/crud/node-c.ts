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

export async function nodeCreate(node: Node, isLoading: IsLoadingStore): Promise<void> {
    let uiText: Localization;
    let voiceText: Localization;
    let condition: Routine;
    let code: Routine;
    await isLoading.wrapPromise(
        db.executeTransaction(async (conn: DbConnection) => {
            // Create uiText
            uiText = await db.createRow(
                TABLE_ID_LOCALIZATIONS,
                <Localization>{
                    parent: node.parent,
                    isSystemCreated: true,
                },
                conn,
            );
            // Create voiceText
            voiceText = await db.createRow(
                TABLE_ID_LOCALIZATIONS,
                <Localization>{
                    parent: node.parent,
                    isSystemCreated: true,
                },
                conn,
            );
            // Create condition
            condition = await db.createRow(
                TABLE_ID_ROUTINES,
                <Routine>{
                    code: '',
                    type: ROUTINE_TYPE_ID_USER,
                    isSystemCreated: true,
                },
                conn,
            );
            // Create code
            code = await db.createRow(
                TABLE_ID_ROUTINES,
                <Routine>{
                    code: '',
                    type: ROUTINE_TYPE_ID_USER,
                    isSystemCreated: true,
                },
                conn,
            );
            // Create Node
            node = await db.createRow(
                TABLE_ID_NODES,
                <Node>{
                    parent: node.parent,
                    actor: 0,
                    uiText: uiText.id,
                    voiceText: voiceText.id,
                    condition: condition.id,
                    code: code.id,
                    // Graph Stuff
                    type: node.type,
                    positionX: node.positionX,
                    positionY: node.positionY,
                },
                conn,
            );
        }),
    );

    // Register undo/redo
    undoManager.register(
        new Undoable(
            'node creation',
            isLoading.wrapFunction(async () => {
                await db.executeTransaction(async (conn: DbConnection) => {
                    await db.deleteRow(TABLE_ID_NODES, node, conn);
                    await db.deleteRow(TABLE_ID_ROUTINES, code, conn);
                    await db.deleteRow(TABLE_ID_ROUTINES, condition, conn);
                    await db.deleteRow(TABLE_ID_LOCALIZATIONS, voiceText, conn);
                    await db.deleteRow(TABLE_ID_LOCALIZATIONS, uiText, conn);
                });
            }),
            isLoading.wrapFunction(async () => {
                await db.executeTransaction(async (conn: DbConnection) => {
                    await db.createRow(TABLE_ID_LOCALIZATIONS, uiText, conn);
                    await db.createRow(TABLE_ID_LOCALIZATIONS, voiceText, conn);
                    await db.createRow(TABLE_ID_ROUTINES, condition, conn);
                    await db.createRow(TABLE_ID_ROUTINES, code, conn);
                    await db.createRow(TABLE_ID_NODES, node, conn);
                });
            }),
        ),
    );

    return node;
}
