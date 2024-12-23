import type { DbConnection } from '@common/common-db-types';
import {
    type Edge,
    type Localization,
    type Node,
    type NodeProperty,
    type Routine,
} from '@common/common-schema';
import {
    TABLE_EDGES,
    TABLE_LOCALIZATIONS,
    TABLE_NODES,
    TABLE_NODE_PROPERTIES,
    TABLE_ROUTINES,
} from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';

export async function nodeDelete(
    node: Node,
    edges: Edge[],
    isLoading: IsLoadingStore,
    connection?: DbConnection,
): Promise<void> {
    await nodesDelete([node], edges, isLoading, connection);
}

/**
 * Delete nodes (see: game-exporter-helper-db)
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
    let propertiesToDelete: NodeProperty[];
    let routinesToDelete: Routine[];
    let localizationsToDelete: Localization[];

    const deleteOperation: (conn: DbConnection) => Promise<void> = async (conn: DbConnection) => {
        // Delete Edges
        gatherNodeData(nodes, nodesToDelete, nodeIds, routineIds, localizationIds);

        if (nodeIds.length > 0) {
            // Grab edges to delete
            edgesToDelete = await db.fetchRowsRaw<Edge>(
                TABLE_EDGES,
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

            // Grab properties to delete
            propertiesToDelete = await db.fetchRowsRaw<NodeProperty>(
                TABLE_NODE_PROPERTIES,
                createFilter().where().column('parent').in(nodeIds).endWhere().build(),
                conn,
            );
        }
        edgesToDelete = Array.from(edgeIdMap.values()); // Combine fetched and passed-in edges

        // Delete Properties
        await db.deleteRows(TABLE_NODE_PROPERTIES, propertiesToDelete, conn);

        // Delete Edges
        await db.deleteRows(TABLE_EDGES, edgesToDelete, conn);

        // Delete Nodes
        await db.deleteRows(TABLE_NODES, nodesToDelete, conn);

        // Delete Routines
        if (routineIds.length > 0) {
            routinesToDelete = await db.fetchRowsRaw<Routine>(
                TABLE_ROUTINES,
                createFilter().where().column('id').in(routineIds).endWhere().build(),
                conn,
            );
        } else routinesToDelete = [];
        await db.deleteRows(TABLE_ROUTINES, routinesToDelete, conn);

        // Delete Localizations
        if (localizationIds.length > 0) {
            localizationsToDelete = await db.fetchRowsRaw<Localization>(
                TABLE_LOCALIZATIONS,
                createFilter().where().column('id').in(localizationIds).endWhere().build(),
                conn,
            );
        } else localizationsToDelete = [];
        await db.deleteRows(TABLE_LOCALIZATIONS, localizationsToDelete, conn);
    };
    const undo: () => Promise<void> = async () => {
        await db.executeTransaction(async (conn: DbConnection) => {
            await db.createRows(TABLE_LOCALIZATIONS, localizationsToDelete, conn);
            await db.createRows(TABLE_ROUTINES, routinesToDelete, conn);
            await db.createRows(TABLE_NODES, nodesToDelete, conn);
            await db.createRows(TABLE_EDGES, edgesToDelete, conn);
            await db.createRows(TABLE_NODE_PROPERTIES, propertiesToDelete, conn);
        });
    };
    const redo: () => Promise<void> = async () => {
        await db.executeTransaction(async (conn: DbConnection) => {
            await db.deleteRows(TABLE_NODE_PROPERTIES, propertiesToDelete, conn);
            await db.deleteRows(TABLE_EDGES, edgesToDelete, conn);
            await db.deleteRows(TABLE_NODES, nodesToDelete, conn);
            await db.deleteRows(TABLE_ROUTINES, routinesToDelete, conn);
            await db.deleteRows(TABLE_LOCALIZATIONS, localizationsToDelete, conn);
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
        localizationIds.push(node.ui_response_text);
        localizationIds.push(node.voice_text);
    }
}
