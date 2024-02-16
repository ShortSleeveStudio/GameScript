import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import {
    TABLE_ID_EDGES,
    TABLE_ID_LOCALIZATIONS,
    TABLE_ID_NODES,
    TABLE_ID_ROUTINES,
    type Edge,
    type Localization,
    type Node,
    type Routine,
} from '@lib/api/db/db-schema';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';
import type { DbConnection } from 'preload/api-db';

/**
 * Delete nodes
 * @param nodes nodes to delete (these should be clones)
 * @param edges edges to delete (these should be clones)
 * @param isLoading is loading
 * @param connection transaction connection
 */
export async function nodesDelete(
    nodes: Node[],
    edges: Edge[] = [],
    isLoading?: IsLoadingStore,
    connection?: DbConnection,
): Promise<void> {
    const nodesToDelete: Node[] = [];
    const nodeIds: number[] = [];
    const routineIds: number[] = [];
    const localizationIds: number[] = [];
    const edgeIdMap: Map<number, Edge> = new Map();
    for (let i = 0; i < edges.length; i++) {
        const edge: Edge = edges[i];
        edgeIdMap.set(edge.id, edge);
    }
    let edgesToDelete: Edge[];
    let routinesToDelete: Routine[];
    let localizationsToDelete: Localization[];

    const deleteOperation: (conn: DbConnection) => Promise<void> = async (conn: DbConnection) => {
        // Find Link Nodes
        gatherNodeData(nodes, nodesToDelete, nodeIds, routineIds, localizationIds);
        const linkNodesToDelete = await db.fetchRowsRaw<Node>(
            TABLE_ID_NODES,
            createFilter().where().column('link').in(nodeIds).endWhere().build(),
            conn,
        );
        gatherNodeData(linkNodesToDelete, nodesToDelete, nodeIds, routineIds, localizationIds);

        // Delete Edges
        edgesToDelete = await db.fetchRowsRaw<Edge>(
            TABLE_ID_EDGES,
            createFilter()
                .where()
                .column('source')
                .in(nodeIds)
                .or()
                .column('target')
                .in(nodeIds)
                .endWhere()
                .build(),
            conn,
        );
        for (let i = 0; i < edgesToDelete.length; i++) {
            const edge: Edge = edgesToDelete[i];
            edgeIdMap.set(edge.id, edge);
        }
        edgesToDelete = Array.from(edgeIdMap.values()); // Combine fetched and passed-in edges
        await db.deleteRows(TABLE_ID_EDGES, edgesToDelete, conn);

        // Delete Nodes
        await db.deleteRows(TABLE_ID_NODES, nodesToDelete, conn);

        // Delete Routines
        routinesToDelete = await db.fetchRowsRaw<Routine>(
            TABLE_ID_ROUTINES,
            createFilter().where().column('id').in(routineIds).endWhere().build(),
            conn,
        );
        await db.deleteRows(TABLE_ID_ROUTINES, routinesToDelete, conn);

        // Delete Localizations
        localizationsToDelete = await db.fetchRowsRaw<Localization>(
            TABLE_ID_LOCALIZATIONS,
            createFilter().where().column('id').in(localizationIds).endWhere().build(),
            conn,
        );
        await db.deleteRows(TABLE_ID_LOCALIZATIONS, localizationsToDelete, conn);
    };
    const undo: () => Promise<void> = async () => {
        await db.executeTransaction(async (conn: DbConnection) => {
            await db.createRows(TABLE_ID_LOCALIZATIONS, localizationsToDelete, conn);
            await db.createRows(TABLE_ID_ROUTINES, routinesToDelete, conn);
            await db.createRows(TABLE_ID_NODES, nodesToDelete, conn);
            await db.createRows(TABLE_ID_EDGES, edgesToDelete, conn);
        });
    };
    const redo: () => Promise<void> = async () => {
        await db.executeTransaction(async (conn: DbConnection) => {
            await db.deleteRows(TABLE_ID_EDGES, edgesToDelete, conn);
            await db.deleteRows(TABLE_ID_NODES, nodesToDelete, conn);
            await db.deleteRows(TABLE_ID_ROUTINES, routinesToDelete, conn);
            await db.deleteRows(TABLE_ID_LOCALIZATIONS, localizationsToDelete, conn);
        });
    };

    // Delete nodes
    if (connection) {
        if (isLoading) {
            await isLoading.wrapPromise(deleteOperation(connection));
        } else {
            await deleteOperation(connection);
        }
    } else {
        if (isLoading) {
            await isLoading.wrapPromise(db.executeTransaction(deleteOperation));
        } else {
            await db.executeTransaction(deleteOperation);
        }
    }

    // Register undo/redo
    if (connection) return;
    if (isLoading) {
        undoManager.register(
            new Undoable(
                'node deletion',
                isLoading.wrapFunction(undo),
                isLoading.wrapFunction(redo),
            ),
        );
    } else {
        undoManager.register(new Undoable('node deletion', undo, redo));
    }
}

export async function nodeDelete(
    node: Node,
    edges: Edge[],
    isLoading: IsLoadingStore,
    connection?: DbConnection,
): Promise<void> {
    await nodesDelete([node], edges, isLoading, connection);
}

function gatherNodeData(
    nodes: Node[],
    accumulator: Node[],
    nodeIds: number[],
    routineIds: number[],
    localizationIds: number[],
): void {
    for (let i = 0; i < nodes.length; i++) {
        const node: Node = nodes[i];
        accumulator.push(node);
        nodeIds.push(node.id);
        routineIds.push(node.code);
        routineIds.push(node.condition);
        localizationIds.push(node.uiResponseText);
        localizationIds.push(node.voiceText);
    }
}
