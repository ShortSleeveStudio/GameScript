import { db } from '@lib/api/db/db';
import {
    NODE_TYPE_ROOT,
    TABLE_ID_CONVERSATIONS,
    type Conversation,
    type Node,
} from '@lib/api/db/db-schema';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';
import type { DbConnection } from 'preload/api-db';
import { nodeCreate } from './node-c';
import { nodeDelete } from './node-d';

export async function conversationCreate(
    newConversation: Conversation,
    isLoading: IsLoadingStore,
): Promise<Conversation> {
    const node: Node = <Node>{
        type: NODE_TYPE_ROOT,
        isSystemCreated: true,
    };

    // Create converation
    let newNode: Node;

    await isLoading.wrapPromise(
        db.executeTransaction(async (conn: DbConnection) => {
            // Create conversation
            newConversation = await db.createRow(TABLE_ID_CONVERSATIONS, newConversation, conn);

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
                    await db.deleteRow(TABLE_ID_CONVERSATIONS, newConversation, conn);
                });
            }),
            isLoading.wrapFunction(async () => {
                await db.executeTransaction(async (conn: DbConnection) => {
                    await db.createRow(TABLE_ID_CONVERSATIONS, newConversation, conn);
                    await nodeCreate(newNode, undefined, conn);
                });
            }),
        ),
    );
    return newConversation;
}
