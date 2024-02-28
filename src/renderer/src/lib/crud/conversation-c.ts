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
    connection?: DbConnection,
): Promise<Conversation> {
    // Create converation
    let newNode: Node = <Node>{
        type: NODE_TYPE_ROOT.name,
        isSystemCreated: true,
    };

    const createOperation: (conn: DbConnection) => Promise<void> = async (conn: DbConnection) => {
        // Create conversation
        newConversation = await db.createRow(TABLE_CONVERSATIONS, newConversation, conn);

        // Create root node
        newNode.parent = newConversation.id;
        newNode = await nodeCreate(newNode, undefined, conn);
    };

    if (connection) {
        await isLoading.wrapPromise(createOperation(connection));
    } else {
        await isLoading.wrapPromise(db.executeTransaction(createOperation));
    }

    // Register undo/redo
    if (!connection) {
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
    }
    return newConversation;
}
