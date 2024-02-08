import { db } from '@lib/api/db/db';
import { TABLE_ID_EDGES, type Edge } from '@lib/api/db/db-schema';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';

export async function edgesCreate(edges: Edge[], isLoading: IsLoadingStore): Promise<void> {
    // Create edge
    const newEdges: Edge[] = await isLoading.wrapPromise(db.createRows(TABLE_ID_EDGES, edges));

    // Register undo/redo
    undoManager.register(
        new Undoable(
            'edge creation',
            isLoading.wrapFunction(async () => {
                await db.deleteRows(TABLE_ID_EDGES, newEdges);
            }),
            isLoading.wrapFunction(async () => {
                await db.createRows(TABLE_ID_EDGES, newEdges);
            }),
        ),
    );
}

export async function edgeCreate(edge: Edge, isLoading: IsLoadingStore): Promise<void> {
    await edgesCreate([edge], isLoading);
}
