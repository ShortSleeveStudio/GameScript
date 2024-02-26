import { type Edge } from '@common/common-schema';
import { TABLE_EDGES } from '@common/common-types';
import { db } from '@lib/api/db/db';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';

export async function edgesCreate(edges: Edge[], isLoading: IsLoadingStore): Promise<void> {
    // Create edge
    const newEdges: Edge[] = await isLoading.wrapPromise(db.createRows(TABLE_EDGES, edges));

    // Register undo/redo
    undoManager.register(
        new Undoable(
            'edge creation',
            isLoading.wrapFunction(async () => {
                await db.deleteRows(TABLE_EDGES, newEdges);
            }),
            isLoading.wrapFunction(async () => {
                await db.createRows(TABLE_EDGES, newEdges);
            }),
        ),
    );
}

export async function edgeCreate(edge: Edge, isLoading: IsLoadingStore): Promise<void> {
    await edgesCreate([edge], isLoading);
}
