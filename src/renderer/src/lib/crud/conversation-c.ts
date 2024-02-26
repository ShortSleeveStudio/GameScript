import { type Conversation, type Node } from '@common/common-schema';
import { NODE_TYPE_ROOT, TABLE_CONVERSATIONS } from '@common/common-types';
import type { DbConnection } from '@common/common-types-db';
import { db } from '@lib/api/db/db';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';
import { nodeCreate } from './node-c';
import { nodeDelete } from './node-d';

export async function conversationCreate(
    newConversation: Conversation,
    isLoading: IsLoadingStore,
): Promise<Conversation> {
    const node: Node = <Node>{
        type: NODE_TYPE_ROOT.name,
        isSystemCreated: true,
    };

    // Create converation
    let newNode: Node;
    await isLoading.wrapPromise(
        db.executeTransaction(async (conn: DbConnection) => {
            // Create conversation
            newConversation = await db.createRow(TABLE_CONVERSATIONS, newConversation, conn);

            // Create root node
            node.parent = newConversation.id;
            newNode = await nodeCreate(node, undefined, conn);
        }),
    );

    // Register undo/redo
    undoManager.register(
        new Undoable(
            'conversation creation',
            isLoading.wrapFunction(async () => {
                await db.executeTransaction(async (conn: DbConnection) => {
                    await nodeDelete(newNode, [], undefined, conn);
                    await db.deleteRow(TABLE_CONVERSATIONS, newConversation, conn);
                });
            }),
            isLoading.wrapFunction(async () => {
                await db.executeTransaction(async (conn: DbConnection) => {
                    await db.createRow(TABLE_CONVERSATIONS, newConversation, conn);
                    await nodeCreate(newNode, undefined, conn);
                });
            }),
        ),
    );
    return newConversation;
}
