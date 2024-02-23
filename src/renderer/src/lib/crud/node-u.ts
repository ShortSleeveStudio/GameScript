import { TABLE_NODES } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { type Node } from '@lib/api/db/db-schema';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';

export async function nodesUpdate(
    oldNodes: Node[],
    newNodes: Node[],
    isLoading: IsLoadingStore,
    skipUndo: boolean = false,
): Promise<void> {
    // Update nodes
    await isLoading.wrapPromise(db.updateRows(TABLE_NODES, newNodes));

    // Register undo/redo
    if (skipUndo) return;
    undoManager.register(
        new Undoable(
            oldNodes.length > 1 ? 'node updates' : 'node update',
            isLoading.wrapFunction(async () => {
                await db.updateRows(TABLE_NODES, oldNodes);
            }),
            isLoading.wrapFunction(async () => {
                await db.updateRows(TABLE_NODES, newNodes);
            }),
        ),
    );
}
