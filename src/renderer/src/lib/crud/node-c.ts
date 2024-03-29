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

interface NodeInfo {
    node: Node;
    code: Routine;
    condition: Routine;
    voiceText: Localization;
    uiResponseText: Localization;
}

export async function nodeCreate(
    newNode: Node,
    isLoading?: IsLoadingStore,
    connection?: DbConnection,
): Promise<Node> {
    return await nodesCreate([newNode], isLoading, connection)[0];
}

export async function nodesCreate(
    newNodes: Node[],
    isLoading?: IsLoadingStore,
    connection?: DbConnection,
): Promise<Node[]> {
    const nodeInfos: NodeInfo[] = [];
    if (connection) {
        if (isLoading) {
            await isLoading.wrapFunction(async () => {
                for (let i = 0; i < newNodes.length; i++) {
                    await createOperation(nodeInfos, connection, newNodes[i]);
                }
            });
        } else {
            for (let i = 0; i < newNodes.length; i++) {
                await createOperation(nodeInfos, connection, newNodes[i]);
            }
        }
    } else {
        if (isLoading) {
            await isLoading.wrapPromise(
                db.executeTransaction(async (conn: DbConnection) => {
                    for (let i = 0; i < newNodes.length; i++) {
                        await createOperation(nodeInfos, conn, newNodes[i]);
                    }
                }),
            );
        } else {
            await db.executeTransaction(async (conn: DbConnection) => {
                for (let i = 0; i < newNodes.length; i++) {
                    await createOperation(nodeInfos, conn, newNodes[i]);
                }
            });
        }
    }

    // Register undo/redo
    if (!connection) {
        const undo: () => Promise<void> = async () => {
            await db.executeTransaction(async (conn: DbConnection) => {
                for (let i = 0; i < nodeInfos.length; i++) {
                    const nodeInfo: NodeInfo = nodeInfos[i];
                    await db.deleteRow(TABLE_NODES, nodeInfo.node, conn);
                    await db.deleteRow(TABLE_ROUTINES, nodeInfo.code, conn);
                    await db.deleteRow(TABLE_ROUTINES, nodeInfo.condition, conn);
                    await db.deleteRow(TABLE_LOCALIZATIONS, nodeInfo.voiceText, conn);
                    await db.deleteRow(TABLE_LOCALIZATIONS, nodeInfo.uiResponseText, conn);
                }
            });
        };
        const redo: () => Promise<void> = async () => {
            await db.executeTransaction(async (conn: DbConnection) => {
                for (let i = 0; i < nodeInfos.length; i++) {
                    const nodeInfo: NodeInfo = nodeInfos[i];
                    await db.createRow(TABLE_LOCALIZATIONS, nodeInfo.uiResponseText, conn);
                    await db.createRow(TABLE_LOCALIZATIONS, nodeInfo.voiceText, conn);
                    await db.createRow(TABLE_ROUTINES, nodeInfo.condition, conn);
                    await db.createRow(TABLE_ROUTINES, nodeInfo.code, conn);
                    await db.createRow(TABLE_NODES, nodeInfo.node, conn);
                }
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
    return nodeInfos.map((nodeInfo) => nodeInfo.node);
}

async function createOperation(
    nodeInfo: NodeInfo[],
    conn: DbConnection,
    newNode: Node,
): Promise<void> {
    let newCode: Routine;
    let newCondition: Routine;
    let newVoiceText: Localization;
    let newUiResponseText: Localization;
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
            actor: newNode.actor === undefined ? DB_DEFAULT_ACTOR_ID : newNode.actor,
            ui_response_text: newUiResponseText ? newUiResponseText.id : null,
            voice_text: newVoiceText ? newVoiceText.id : null,
            condition: newCondition ? newCondition.id : null,
            code: newCode ? newCode.id : null,
            is_system_created: newNode.is_system_created,
            code_override:
                newNode.code_override === undefined ? CODE_OVERRIDE_DEFAULT : newNode.code_override,
            // Graph Stuff
            type: newNode.type,
            position_x: newNode.position_x,
            position_y: newNode.position_y,
        },
        conn,
    );

    nodeInfo.push(<NodeInfo>{
        node: newNode,
        code: newCode,
        condition: newCondition,
        voiceText: newVoiceText,
        uiResponseText: newUiResponseText,
    });
}
