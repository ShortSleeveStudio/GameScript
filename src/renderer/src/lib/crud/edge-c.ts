import type { DbConnection } from '@common/common-db-types';
import { type Edge } from '@common/common-schema';
import { TABLE_EDGES } from '@common/common-types';
import { db } from '@lib/api/db/db';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager, type UndoAction } from '@lib/utility/undo-manager';

export async function edgesCreate(
    edges: Edge[],
    isLoading?: IsLoadingStore,
    connection?: DbConnection,
): Promise<void> {
    // Create edge
    let newEdges: Edge[];
    let undo: UndoAction;
    let redo: UndoAction;

    if (isLoading) {
        newEdges = await isLoading.wrapPromise(db.createRows(TABLE_EDGES, edges, connection));
        undo = isLoading.wrapFunction(async () => {
            await db.deleteRows(TABLE_EDGES, newEdges);
        });
        redo = isLoading.wrapFunction(async () => {
            await db.createRows(TABLE_EDGES, newEdges);
        });
    } else {
        newEdges = await db.createRows(TABLE_EDGES, edges, connection);
        undo = async () => {
            await db.deleteRows(TABLE_EDGES, newEdges);
        };
        redo = async () => {
            await db.createRows(TABLE_EDGES, newEdges);
        };
    }

    // Register undo/redo
    if (!connection) undoManager.register(new Undoable('edge creation', undo, redo));
}

export async function edgeCreate(
    edge: Edge,
    isLoading: IsLoadingStore,
    connection?: DbConnection,
): Promise<void> {
    await edgesCreate([edge], isLoading, connection);
}
