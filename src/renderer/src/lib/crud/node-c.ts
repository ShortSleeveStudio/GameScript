import { CODE_OVERRIDE_DEFAULT } from '@common/common-db';
import { DB_DEFAULT_ACTOR_ID } from '@common/common-db-initialization';
import type { DbConnection } from '@common/common-db-types';
import {
    type Localization,
    type Node,
    type NodeProperty,
    type Routine,
} from '@common/common-schema';
import {
    NODE_TYPE_ROOT,
    ROUTINE_TYPE_USER_CREATED,
    TABLE_LOCALIZATIONS,
    TABLE_NODES,
    TABLE_NODE_PROPERTIES,
    TABLE_ROUTINES,
} from '@common/common-types';
import { db } from '@lib/api/db/db';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';

export interface NodeInfo {
    node: Node;
    code: Routine;
    condition: Routine;
    voiceText: Localization;
    uiResponseText: Localization;
    properties: NodeProperty[];
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
    // Populate node info for creation
    const nodeInfos: NodeInfo[] = [];
    for (let i = 0; i < newNodes.length; i++) {
        const newNode: Node = newNodes[i];
        const isRoot: boolean = newNode.type === NODE_TYPE_ROOT.name;
        nodeInfos.push(<NodeInfo>{
            uiResponseText: isRoot
                ? null
                : <Localization>{
                      parent: newNode.parent,
                      is_system_created: true,
                  },
            voiceText: isRoot
                ? null
                : <Localization>{
                      parent: newNode.parent,
                      is_system_created: true,
                  },
            condition: isRoot
                ? null
                : <Routine>{
                      code: '',
                      type: ROUTINE_TYPE_USER_CREATED.id,
                      is_system_created: true,
                      parent: newNode.parent,
                      is_condition: true,
                  },
            code: isRoot
                ? null
                : <Routine>{
                      code: '',
                      type: ROUTINE_TYPE_USER_CREATED.id,
                      is_system_created: true,
                      parent: newNode.parent,
                      is_condition: false,
                  },
            node: newNode,
        });
    }
    const nodeInfosResult: NodeInfo[] = await nodesCreateWithInfo(nodeInfos, isLoading, connection);
    return nodeInfosResult.map((nodeInfo) => nodeInfo.node);
}

export async function nodesCreateWithInfo(
    nodeInfos: NodeInfo[],
    isLoading?: IsLoadingStore,
    connection?: DbConnection,
): Promise<NodeInfo[]> {
    if (connection) {
        if (isLoading) {
            await isLoading.wrapFunction(async () => {
                await createOperation(nodeInfos, connection);
            });
        } else {
            await createOperation(nodeInfos, connection);
        }
    } else {
        if (isLoading) {
            await isLoading.wrapPromise(
                db.executeTransaction(async (conn: DbConnection) => {
                    await createOperation(nodeInfos, conn);
                }),
            );
        } else {
            await db.executeTransaction(async (conn: DbConnection) => {
                await createOperation(nodeInfos, conn);
            });
        }
    }

    // Register undo/redo
    if (!connection) {
        const undo: () => Promise<void> = async () => {
            await db.executeTransaction(async (conn: DbConnection) => {
                for (let i = 0; i < nodeInfos.length; i++) {
                    const nodeInfo: NodeInfo = nodeInfos[i];
                    if (nodeInfo.properties) {
                        await db.deleteRows(TABLE_NODE_PROPERTIES, nodeInfo.properties, conn);
                    }
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
                    if (nodeInfo.properties) {
                        await db.createRows(TABLE_NODE_PROPERTIES, nodeInfo.properties, conn);
                    }
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
    return nodeInfos;
}

async function createOperation(nodeInfos: NodeInfo[], conn: DbConnection): Promise<void> {
    for (let i = 0; i < nodeInfos.length; i++) {
        const nodeInfo: NodeInfo = nodeInfos[i];
        if (nodeInfo.uiResponseText) {
            nodeInfo.uiResponseText = await db.createRow(
                TABLE_LOCALIZATIONS,
                nodeInfo.uiResponseText,
                conn,
            );
        }
        if (nodeInfo.voiceText) {
            nodeInfo.voiceText = await db.createRow(TABLE_LOCALIZATIONS, nodeInfo.voiceText, conn);
        }
        if (nodeInfo.code) {
            nodeInfo.code = await db.createRow(TABLE_ROUTINES, nodeInfo.code, conn);
        }
        if (nodeInfo.condition) {
            nodeInfo.condition = await db.createRow(TABLE_ROUTINES, nodeInfo.condition, conn);
        }
        const nodeToCreate = <Node>{
            parent: nodeInfo.node.parent,
            actor: nodeInfo.node.actor === undefined ? DB_DEFAULT_ACTOR_ID : nodeInfo.node.actor,
            ui_response_text: nodeInfo.uiResponseText ? nodeInfo.uiResponseText.id : null,
            voice_text: nodeInfo.voiceText ? nodeInfo.voiceText.id : null,
            condition: nodeInfo.condition ? nodeInfo.condition.id : null,
            code: nodeInfo.code ? nodeInfo.code.id : null,
            is_system_created: nodeInfo.node.is_system_created,
            code_override:
                nodeInfo.node.code_override === undefined
                    ? CODE_OVERRIDE_DEFAULT
                    : nodeInfo.node.code_override,
            // Graph Stuff
            type: nodeInfo.node.type,
            position_x: nodeInfo.node.position_x,
            position_y: nodeInfo.node.position_y,
        };
        if ('id' in nodeInfo.node) nodeToCreate.id = nodeInfo.node.id;
        nodeInfo.node = await db.createRow(TABLE_NODES, nodeToCreate, conn);
        if (nodeInfo.properties && nodeInfo.properties.length > 0) {
            for (let j = 0; j < nodeInfo.properties.length; j++) {
                nodeInfo.properties[j].parent = nodeInfo.node.id;
            }
            nodeInfo.properties = await db.createRows(
                TABLE_NODE_PROPERTIES,
                nodeInfo.properties,
                conn,
            );
        }
    }
}
