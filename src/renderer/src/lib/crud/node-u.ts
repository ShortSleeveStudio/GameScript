import { db } from '@lib/api/db/db';
import { TABLE_ID_NODES, type Node } from '@lib/api/db/db-schema';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';

export async function nodesUpdate(
    oldNodes: Node[],
    newNodes: Node[],
    isLoading: IsLoadingStore,
    skipUndo: boolean = false,
): Promise<void> {
    // Update nodes
    await isLoading.wrapPromise(db.updateRows(TABLE_ID_NODES, newNodes));

    // Register undo/redo
    if (skipUndo) return;
    undoManager.register(
        new Undoable(
            'node updates',
            isLoading.wrapFunction(async () => {
                await db.updateRows(TABLE_ID_NODES, oldNodes);
            }),
            isLoading.wrapFunction(async () => {
                await db.updateRows(TABLE_ID_NODES, newNodes);
            }),
        ),
    );
}
