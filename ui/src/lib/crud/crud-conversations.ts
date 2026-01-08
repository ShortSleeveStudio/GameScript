import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import { bridge } from '$lib/api/bridge';
import {
  query,
  type Conversation,
  type Node,
  type Edge,
  type NodeProperty,
  type ConversationProperty,
  type Localization,
  type CodeTemplateType,
  TABLE_CONVERSATIONS,
  TABLE_NODES,
  TABLE_EDGES,
  TABLE_NODE_PROPERTIES,
  TABLE_CONVERSATION_PROPERTIES,
  TABLE_LOCALIZATIONS,
  NODE_TYPE_ROOT,
  DB_DEFAULT_ACTOR_ID,
} from '@gamescript/shared';

// ============================================================================
// Read
// ============================================================================

export async function getAll(): Promise<Conversation[]> {
  return db.select<Conversation>(TABLE_CONVERSATIONS, query<Conversation>().build());
}

export async function getById(id: number): Promise<Conversation | null> {
  return db.selectById<Conversation>(TABLE_CONVERSATIONS, id);
}

// ============================================================================
// Types
// ============================================================================

export interface CreateConversationParams {
  name: string;
  notes?: string;
  is_layout_auto?: boolean;
  is_layout_vertical?: boolean;
}

// ============================================================================
// Create
// ============================================================================

export async function create(params: CreateConversationParams): Promise<Conversation> {
  let conversation: Conversation | undefined;
  let rootNode: Node | undefined;

  await db.transaction(async (tx) => {
    // 1. Create the conversation
    conversation = await db.insert<Conversation>(
      TABLE_CONVERSATIONS,
      {
        name: params.name,
        notes: params.notes ?? null,
        is_layout_auto: params.is_layout_auto ?? true,
        is_layout_vertical: params.is_layout_vertical ?? true,
        is_deleted: false,
        is_system_created: false,
      },
      tx
    );

    // 2. Create the root node (no localizations needed for root nodes)
    rootNode = await db.insert<Node>(
      TABLE_NODES,
      {
        parent: conversation.id,
        type: NODE_TYPE_ROOT.name,
        is_system_created: true,
        position_x: 0,
        position_y: 0,
        actor: DB_DEFAULT_ACTOR_ID,
        voice_text: null,
        ui_response_text: null,
        is_prevent_response: false,
        notes: null,
        has_condition: false,
        has_action: false,
      },
      tx
    );
  });

  if (!conversation || !rootNode) {
    throw new Error('Failed to create conversation');
  }

  const capturedConversation = { ...conversation };
  const capturedRootNode = { ...rootNode };

  registerUndoable(
    new Undoable(
      `Create conversation "${params.name}"`,
      async () => {
        // Undo: delete root node, then conversation
        await db.transaction(async (tx) => {
          await db.delete(TABLE_NODES, capturedRootNode.id, tx);
          await db.delete(TABLE_CONVERSATIONS, capturedConversation.id, tx);
        });
      },
      async () => {
        // Redo: recreate conversation, then root node
        await db.transaction(async (tx) => {
          await db.insertWithId<Conversation>(TABLE_CONVERSATIONS, capturedConversation, tx);
          await db.insertWithId<Node>(TABLE_NODES, capturedRootNode, tx);
        });
      }
    )
  );

  return conversation;
}

// ============================================================================
// Update
// ============================================================================

export async function updateMany(oldConversations: Conversation[], newConversations: Conversation[]): Promise<Conversation[]> {
  const results = await db.updateRows<Conversation>(TABLE_CONVERSATIONS, newConversations);

  registerUndoable(
    new Undoable(
      oldConversations.length > 1 ? 'Update conversations' : 'Update conversation',
      async () => {
        await db.updateRows(TABLE_CONVERSATIONS, oldConversations);
      },
      async () => {
        await db.updateRows(TABLE_CONVERSATIONS, newConversations);
      }
    )
  );

  return results;
}

export async function updateOne(oldConversation: Conversation, newConversation: Conversation): Promise<Conversation> {
  const results = await updateMany([oldConversation], [newConversation]);
  return results[0];
}

// ============================================================================
// Delete (soft delete)
// ============================================================================

export async function remove(conversationId: number): Promise<void> {
  await db.updatePartial<Conversation>(TABLE_CONVERSATIONS, conversationId, { is_deleted: true });

  registerUndoable(
    new Undoable(
      'Delete conversation',
      async () => {
        await db.updatePartial<Conversation>(TABLE_CONVERSATIONS, conversationId, { is_deleted: false });
      },
      async () => {
        await db.updatePartial<Conversation>(TABLE_CONVERSATIONS, conversationId, { is_deleted: true });
      }
    )
  );
}

// ============================================================================
// Restore (from soft delete)
// ============================================================================

export async function restore(conversationId: number): Promise<void> {
  await db.updatePartial<Conversation>(TABLE_CONVERSATIONS, conversationId, { is_deleted: false });
}

// ============================================================================
// Permanent delete (cascades to all children)
// ============================================================================

export async function permanentlyDelete(conversationId: number, codeTemplate: CodeTemplateType): Promise<void> {
  // Delete the conversation code file (no undo for permanent delete)
  await bridge.deleteCodeFile(conversationId, codeTemplate);

  await db.transaction(async (tx) => {
    // 1. Get all nodes for this conversation
    const nodes = await db.select<Node>(
      TABLE_NODES,
      query<Node>().where('parent').eq(conversationId).build(),
      tx
    );
    const nodeIds = nodes.map(n => n.id);

    if (nodeIds.length > 0) {
      // 2. Delete edges connected to these nodes
      const edges = await db.select<Edge>(
        TABLE_EDGES,
        query<Edge>().where('source').in(nodeIds).or('target').in(nodeIds).build(),
        tx
      );
      if (edges.length > 0) {
        await db.delete(TABLE_EDGES, edges.map(e => e.id), tx);
      }

      // 3. Delete node properties
      const properties = await db.select<NodeProperty>(
        TABLE_NODE_PROPERTIES,
        query<NodeProperty>().where('parent').in(nodeIds).build(),
        tx
      );
      if (properties.length > 0) {
        await db.delete(TABLE_NODE_PROPERTIES, properties.map(p => p.id), tx);
      }

      // 4. Collect node localization IDs (voice_text, ui_response_text)
      const nodeLocalizationIds: number[] = [];
      for (const node of nodes) {
        if (node.voice_text) nodeLocalizationIds.push(node.voice_text);
        if (node.ui_response_text) nodeLocalizationIds.push(node.ui_response_text);
      }

      // 5. Delete nodes
      await db.delete(TABLE_NODES, nodeIds, tx);

      // 6. Delete node localizations
      if (nodeLocalizationIds.length > 0) {
        await db.delete(TABLE_LOCALIZATIONS, nodeLocalizationIds, tx);
      }
    }

    // 7. Delete conversation localizations (parent = conversationId)
    const conversationLocalizations = await db.select<Localization>(
      TABLE_LOCALIZATIONS,
      query<Localization>().where('parent').eq(conversationId).build(),
      tx
    );
    if (conversationLocalizations.length > 0) {
      await db.delete(TABLE_LOCALIZATIONS, conversationLocalizations.map(l => l.id), tx);
    }

    // 8. Delete conversation properties
    const conversationProperties = await db.select<ConversationProperty>(
      TABLE_CONVERSATION_PROPERTIES,
      query<ConversationProperty>().where('parent').eq(conversationId).build(),
      tx
    );
    if (conversationProperties.length > 0) {
      await db.delete(TABLE_CONVERSATION_PROPERTIES, conversationProperties.map(p => p.id), tx);
    }

    // 9. Delete the conversation itself
    await db.delete(TABLE_CONVERSATIONS, conversationId, tx);
  });
}
