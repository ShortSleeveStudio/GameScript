import type { DbConnection } from '@common/common-db-types';
import type { Edge, Localization, Node, NodeProperty, Routine } from '@common/common-schema';
import { TABLE_LOCALIZATIONS, TABLE_NODE_PROPERTIES, TABLE_ROUTINES } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { edgesCreate } from '@lib/crud/edge-c';
import { nodesCreateWithInfo, type NodeInfo } from '@lib/crud/node-c';
import { nodesDelete } from '@lib/crud/node-d';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';
import { type Edge as FlowEdge, type Node as FlowNode } from '@xyflow/svelte';
import { get } from 'svelte/store';
import type { EdgeData, NodeData } from './graph-data';

export interface CopyData {
    nodes: NodeInfo[];
    edges: CopyEdge[];
}

export interface CopyEdge {
    edge: Edge;
    source: NodeInfo;
    target: NodeInfo;
}

let isCopying: boolean = false;
let copyData: CopyData;
export async function createCopyData(
    isLoading: IsLoadingStore,
    nodesSelected: FlowNode[],
    edgesSelected: FlowEdge[],
): Promise<void> {
    if (isCopying) return null;
    isCopying = true;
    try {
        const copyNodeMap: Map<number, NodeInfo> = new Map();
        const copyEdges: CopyEdge[] = [];
        await isLoading.wrapPromise(
            db.executeTransaction(async (conn: DbConnection) => {
                for (let i = 0; i < nodesSelected.length; i++) {
                    // Create copy node
                    const copyNode: Node = <Node>{
                        ...get((<NodeData>nodesSelected[i].data).rowView),
                    };

                    // Create copy voice text
                    const copyVoiceText: Localization = (
                        await db.fetchRowsRaw<Localization>(
                            TABLE_LOCALIZATIONS,
                            createFilter()
                                .where()
                                .column('id')
                                .eq(copyNode.voice_text)
                                .endWhere()
                                .build(),
                            conn,
                        )
                    )[0];

                    // Create copy ui response text
                    const copyUiResponseText: Localization = (
                        await db.fetchRowsRaw<Localization>(
                            TABLE_LOCALIZATIONS,
                            createFilter()
                                .where()
                                .column('id')
                                .eq(copyNode.ui_response_text)
                                .endWhere()
                                .build(),
                            conn,
                        )
                    )[0];

                    // Create copy code routine
                    const copyCode: Routine = (
                        await db.fetchRowsRaw<Routine>(
                            TABLE_ROUTINES,
                            createFilter()
                                .where()
                                .column('id')
                                .eq(copyNode.code)
                                .endWhere()
                                .build(),
                            conn,
                        )
                    )[0];

                    // Create copy condition routine
                    const copyCondition: Routine = (
                        await db.fetchRowsRaw<Routine>(
                            TABLE_ROUTINES,
                            createFilter()
                                .where()
                                .column('id')
                                .eq(copyNode.condition)
                                .endWhere()
                                .build(),
                            conn,
                        )
                    )[0];

                    // Create copy properties
                    const copyProperties: NodeProperty[] = await db.fetchRowsRaw<NodeProperty>(
                        TABLE_NODE_PROPERTIES,
                        createFilter().where().column('parent').eq(copyNode.id).endWhere().build(),
                    );

                    // Store copy node in map
                    copyNodeMap.set(copyNode.id, <NodeInfo>{
                        node: copyNode,
                        voiceText: copyVoiceText,
                        uiResponseText: copyUiResponseText,
                        code: copyCode,
                        condition: copyCondition,
                        properties: copyProperties,
                    });

                    // Delete foreign keys
                    delete copyNode.id;
                    delete copyNode.voice_text;
                    delete copyNode.ui_response_text;
                    delete copyNode.condition;
                    delete copyNode.code;
                    delete copyNode.parent;
                    delete copyVoiceText.id;
                    delete copyVoiceText.parent;
                    delete copyUiResponseText.id;
                    delete copyUiResponseText.parent;
                    delete copyCode.id;
                    delete copyCode.parent;
                    delete copyCondition.id;
                    delete copyCondition.parent;
                    for (let j = 0; j < copyProperties.length; j++) {
                        delete copyProperties[j].id;
                        delete copyProperties[j].parent;
                    }
                }
                for (let i = 0; i < edgesSelected.length; i++) {
                    const edge: Edge = get((<EdgeData>edgesSelected[i].data).rowView);
                    const source: NodeInfo = copyNodeMap.get(edge.source);
                    const target: NodeInfo = copyNodeMap.get(edge.target);
                    if (source && target) {
                        const copyEdge: Edge = <Edge>{ ...edge };
                        delete copyEdge.id;
                        delete copyEdge.source;
                        delete copyEdge.target;
                        copyEdges.push(<CopyEdge>{
                            edge: copyEdge,
                            source: source,
                            target: target,
                        });
                    }
                }

                // Store copy data
                copyData = <CopyData>{
                    nodes: [...copyNodeMap.values()],
                    edges: copyEdges,
                };
            }),
        );
    } finally {
        isCopying = false;
    }
}

export async function pasteCopyData(
    isLoading: IsLoadingStore,
    parentConversationId: number,
): Promise<void> {
    if (!copyData) return;
    const clonedCopyData: CopyData = structuredClone(copyData);

    // Set parents
    for (let i = 0; i < clonedCopyData.nodes.length; i++) {
        const nodeInfo: NodeInfo = clonedCopyData.nodes[i];
        nodeInfo.node.parent = parentConversationId;
        nodeInfo.code.parent = parentConversationId;
        nodeInfo.condition.parent = parentConversationId;
        nodeInfo.voiceText.parent = parentConversationId;
        nodeInfo.uiResponseText.parent = parentConversationId;
        for (let j = 0; j < nodeInfo.properties.length; j++) {
            nodeInfo.properties[j].parent = parentConversationId;
        }
    }
    for (let i = 0; i < clonedCopyData.edges.length; i++) {
        const edge: CopyEdge = clonedCopyData.edges[i];
        edge.edge.parent = parentConversationId;
    }

    await isLoading.wrapPromise(
        db.executeTransaction(async (conn: DbConnection) => {
            // This will update the node info objects
            await nodesCreateWithInfo(clonedCopyData.nodes, undefined, conn);

            // Edges
            for (let i = 0; i < clonedCopyData.edges.length; i++) {
                const copyEdge: CopyEdge = clonedCopyData.edges[i];
                copyEdge.edge.source = copyEdge.source.node.id;
                copyEdge.edge.target = copyEdge.target.node.id;
            }
            await edgesCreate(
                clonedCopyData.edges.map((copyEdge) => copyEdge.edge),
                undefined,
                conn,
            );
        }),
    );

    undoManager.register(
        new Undoable(
            'conversation editor paste',
            isLoading.wrapFunction(async () => {
                await db.executeTransaction(async (conn: DbConnection) => {
                    await nodesDelete(
                        clonedCopyData.nodes.map((nodeInfo) => nodeInfo.node),
                        clonedCopyData.edges.map((copyEdge) => copyEdge.edge),
                        undefined,
                        conn,
                    );
                });
            }),
            isLoading.wrapFunction(async () => {
                await db.executeTransaction(async (conn: DbConnection) => {
                    await nodesCreateWithInfo(clonedCopyData.nodes, undefined, conn);
                    await edgesCreate(
                        clonedCopyData.edges.map((copyEdge) => copyEdge.edge),
                        undefined,
                        conn,
                    );
                });
            }),
        ),
    );
}
