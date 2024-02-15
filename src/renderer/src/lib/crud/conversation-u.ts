import { db } from '@lib/api/db/db';
import { TABLE_ID_CONVERSATIONS, type Conversation } from '@lib/api/db/db-schema';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';

export async function conversationUpdate(
    newConversation: Conversation,
    oldConversation: Conversation,
    isLoading: IsLoadingStore,
): Promise<void> {
    // Update conversation
    await isLoading.wrapPromise(db.updateRow(TABLE_ID_CONVERSATIONS, newConversation));

    // Register undo/redo
    undoManager.register(
        new Undoable(
            'conversation changed',
            isLoading.wrapFunction(async () => {
                await db.updateRow(TABLE_ID_CONVERSATIONS, oldConversation);
            }),
            isLoading.wrapFunction(async () => {
                await db.updateRow(TABLE_ID_CONVERSATIONS, newConversation);
            }),
        ),
    );
}
