/**
 * CRUD operations for nodes.
 *
 * All operations use db.ts methods and handle undo registration internally.
 */

import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  query,
  type Node,
  type Edge,
  type NodeProperty,
  type Localization,
  TABLE_NODES,
  TABLE_EDGES,
  TABLE_LOCALIZATIONS,
  TABLE_NODE_PROPERTIES,
} from '@gamescript/shared';

// ============================================================================
// Read
// ============================================================================

export async function getAll(): Promise<Node[]> {
  return db.select<Node>(TABLE_NODES, query<Node>().build());
}

export async function getById(id: number): Promise<Node | null> {
  return db.selectById<Node>(TABLE_NODES, id);
}

export async function getByParent(conversationId: number): Promise<Node[]> {
  return db.select<Node>(TABLE_NODES, query<Node>().where('parent').eq(conversationId).build());
}

// ============================================================================
// Types
// ============================================================================

export interface CreateNodeParams {
  conversationId: number;
  position_x: number;
  position_y: number;
  voiceText?: string;
  responseText?: string;
  actor?: number | null;
}

export interface CreateNodeResult {
  node: Node;
  voiceTextLocalizationId: number | null;
  responseTextLocalizationId: number | null;
}

// ============================================================================
// Create
// ============================================================================

export async function create(params: CreateNodeParams): Promise<CreateNodeResult> {
  const results = await createMany([params]);
  return results[0];
}

/**
 * Create multiple nodes in a single transaction with unified undo.
 */
export async function createMany(paramsList: CreateNodeParams[]): Promise<CreateNodeResult[]> {
  if (paramsList.length === 0) return [];

  const results: CreateNodeResult[] = [];
  const capturedNodes: Node[] = [];
  const capturedLocalizations: Localization[] = [];

  await db.transaction(async (tx) => {
    for (const params of paramsList) {
      // 1. Create voice text localization
      const voiceLoc = await db.insert<Localization>(
        TABLE_LOCALIZATIONS,
        {
          parent: params.conversationId,
          name: params.voiceText ?? null,
          is_system_created: params.voiceText === undefined,
        },
        tx
      );
      capturedLocalizations.push({ ...voiceLoc });

      // 2. Create response text localization
      const responseLoc = await db.insert<Localization>(
        TABLE_LOCALIZATIONS,
        {
          parent: params.conversationId,
          name: params.responseText ?? null,
          is_system_created: params.responseText === undefined,
        },
        tx
      );
      capturedLocalizations.push({ ...responseLoc });

      // 3. Create the node
      const node = await db.insert<Node>(
        TABLE_NODES,
        {
          parent: params.conversationId,
          type: 'dialogue',
          position_x: params.position_x,
          position_y: params.position_y,
          actor: params.actor ?? null,
          voice_text: voiceLoc.id,
          ui_response_text: responseLoc.id,
          is_prevent_response: false,
          notes: null,
          is_system_created: false,
        },
        tx
      );
      capturedNodes.push({ ...node });

      results.push({
        node,
        voiceTextLocalizationId: voiceLoc.id,
        responseTextLocalizationId: responseLoc.id,
      });
    }
  });

  // Register single undo for all nodes
  registerUndoable(
    new Undoable(
      `Create ${paramsList.length} node${paramsList.length === 1 ? '' : 's'}`,
      async () => {
        // Undo: delete all created nodes (cascade deletes localizations)
        await deleteManyInternal(capturedNodes.map(n => n.id));
      },
      async () => {
        // Redo: restore all nodes and localizations
        await db.transaction(async (tx) => {
          await db.insertMany<Localization>(TABLE_LOCALIZATIONS, capturedLocalizations, tx);
          await db.insertMany<Node>(TABLE_NODES, capturedNodes, tx);
        });
      }
    )
  );

  return results;
}

// ============================================================================
// Update
// ============================================================================

export async function updateMany(oldNodes: Node[], newNodes: Node[], skipUndo: boolean = false): Promise<Node[]> {
  const results = await db.updateRows<Node>(TABLE_NODES, newNodes);

  if (!skipUndo) {
    registerUndoable(
      new Undoable(
        oldNodes.length > 1 ? 'Update nodes' : 'Update node',
        async () => {
          await db.updateRows(TABLE_NODES, oldNodes);
        },
        async () => {
          await db.updateRows(TABLE_NODES, newNodes);
        }
      )
    );
  }

  return results;
}

export async function updateOne(oldNode: Node, newNode: Node): Promise<Node> {
  const results = await updateMany([oldNode], [newNode]);
  return results[0];
}

// ============================================================================
// Delete
// ============================================================================

export async function remove(nodeId: number): Promise<void> {
  // Capture all data before deletion for undo
  const node = await db.selectById<Node>(TABLE_NODES, nodeId);
  if (!node) throw new Error(`Node ${nodeId} not found`);

  const edges = await db.select<Edge>(
    TABLE_EDGES,
    query<Edge>().where('source').eq(nodeId).or('target').eq(nodeId).build()
  );

  const properties = await db.select<NodeProperty>(
    TABLE_NODE_PROPERTIES,
    query<NodeProperty>().where('parent').eq(nodeId).build()
  );

  const localizations: Localization[] = [];
  if (node.voice_text) {
    const loc = await db.selectById<Localization>(TABLE_LOCALIZATIONS, node.voice_text);
    if (loc) localizations.push(loc);
  }
  if (node.ui_response_text) {
    const loc = await db.selectById<Localization>(TABLE_LOCALIZATIONS, node.ui_response_text);
    if (loc) localizations.push(loc);
  }

  // Delete cascade
  await deleteInternal(nodeId);

  // Capture for closure
  const capturedNode = { ...node };
  const capturedEdges = edges.map(e => ({ ...e }));
  const capturedProperties = properties.map(p => ({ ...p }));
  const capturedLocalizations = localizations.map(l => ({ ...l }));

  registerUndoable(
    new Undoable(
      'Delete node',
      async () => {
        // Restore in order: localizations, node, edges, properties
        // Use transaction to batch all inserts and trigger single notification
        await db.transaction(async (tx) => {
          await db.insertMany<Localization>(TABLE_LOCALIZATIONS, capturedLocalizations, tx);
          await db.insertWithId<Node>(TABLE_NODES, capturedNode, tx);
          await db.insertMany<Edge>(TABLE_EDGES, capturedEdges, tx);
          await db.insertMany<NodeProperty>(TABLE_NODE_PROPERTIES, capturedProperties, tx);
        });
      },
      async () => {
        await deleteInternal(capturedNode.id);
      }
    )
  );
}

export async function removeMany(nodeIds: number[]): Promise<void> {
  if (nodeIds.length === 0) return;

  // Capture all data before deletion for undo
  const nodes = await db.select<Node>(
    TABLE_NODES,
    query<Node>().where('id').in(nodeIds).build()
  );

  const edges = await db.select<Edge>(
    TABLE_EDGES,
    query<Edge>().where('source').in(nodeIds).or('target').in(nodeIds).build()
  );

  const properties = await db.select<NodeProperty>(
    TABLE_NODE_PROPERTIES,
    query<NodeProperty>().where('parent').in(nodeIds).build()
  );

  const localizationIds: number[] = [];
  for (const node of nodes) {
    if (node.voice_text) localizationIds.push(node.voice_text);
    if (node.ui_response_text) localizationIds.push(node.ui_response_text);
  }

  const localizations = localizationIds.length > 0
    ? await db.select<Localization>(
        TABLE_LOCALIZATIONS,
        query<Localization>().where('id').in(localizationIds).build()
      )
    : [];

  // Delete cascade
  await deleteManyInternal(nodeIds);

  // Capture for closure
  const capturedNodes = nodes.map(n => ({ ...n }));
  const capturedEdges = edges.map(e => ({ ...e }));
  const capturedProperties = properties.map(p => ({ ...p }));
  const capturedLocalizations = localizations.map(l => ({ ...l }));

  registerUndoable(
    new Undoable(
      `Delete ${nodeIds.length} node${nodeIds.length === 1 ? '' : 's'}`,
      async () => {
        // Restore in order: localizations, nodes, edges, properties
        // Use transaction to batch all inserts and trigger single notification
        await db.transaction(async (tx) => {
          await db.insertMany<Localization>(TABLE_LOCALIZATIONS, capturedLocalizations, tx);
          await db.insertMany<Node>(TABLE_NODES, capturedNodes, tx);
          await db.insertMany<Edge>(TABLE_EDGES, capturedEdges, tx);
          await db.insertMany<NodeProperty>(TABLE_NODE_PROPERTIES, capturedProperties, tx);
        });
      },
      async () => {
        await deleteManyInternal(capturedNodes.map(n => n.id));
      }
    )
  );
}

// ============================================================================
// Restore (for undo - no undo registration)
// ============================================================================

export async function restore(
  node: Node,
  voiceTextLocalization: Localization | null,
  responseTextLocalization: Localization | null
): Promise<void> {
  await db.transaction(async (tx) => {
    if (voiceTextLocalization) {
      await db.insertWithId<Localization>(TABLE_LOCALIZATIONS, voiceTextLocalization, tx);
    }
    if (responseTextLocalization) {
      await db.insertWithId<Localization>(TABLE_LOCALIZATIONS, responseTextLocalization, tx);
    }
    await db.insertWithId<Node>(TABLE_NODES, node, tx);
  });
}

// ============================================================================
// Internal helpers (no undo registration)
// ============================================================================

async function deleteInternal(nodeId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const node = await db.selectById<Node>(TABLE_NODES, nodeId, tx);
    if (!node) return;

    // Delete edges
    const edges = await db.select<Edge>(
      TABLE_EDGES,
      query<Edge>().where('source').eq(nodeId).or('target').eq(nodeId).build(),
      tx
    );
    if (edges.length > 0) {
      await db.delete(TABLE_EDGES, edges.map(e => e.id), tx);
    }

    // Delete properties
    const properties = await db.select<NodeProperty>(
      TABLE_NODE_PROPERTIES,
      query<NodeProperty>().where('parent').eq(nodeId).build(),
      tx
    );
    if (properties.length > 0) {
      await db.delete(TABLE_NODE_PROPERTIES, properties.map(p => p.id), tx);
    }

    // Delete node
    await db.delete(TABLE_NODES, nodeId, tx);

    // Delete localizations
    const localizationIds: number[] = [];
    if (node.voice_text) localizationIds.push(node.voice_text);
    if (node.ui_response_text) localizationIds.push(node.ui_response_text);
    if (localizationIds.length > 0) {
      await db.delete(TABLE_LOCALIZATIONS, localizationIds, tx);
    }
  });
}

async function deleteManyInternal(nodeIds: number[]): Promise<void> {
  if (nodeIds.length === 0) return;

  await db.transaction(async (tx) => {
    const nodes = await db.select<Node>(
      TABLE_NODES,
      query<Node>().where('id').in(nodeIds).build(),
      tx
    );

    // Delete edges
    const edges = await db.select<Edge>(
      TABLE_EDGES,
      query<Edge>().where('source').in(nodeIds).or('target').in(nodeIds).build(),
      tx
    );
    if (edges.length > 0) {
      await db.delete(TABLE_EDGES, edges.map(e => e.id), tx);
    }

    // Delete properties
    const properties = await db.select<NodeProperty>(
      TABLE_NODE_PROPERTIES,
      query<NodeProperty>().where('parent').in(nodeIds).build(),
      tx
    );
    if (properties.length > 0) {
      await db.delete(TABLE_NODE_PROPERTIES, properties.map(p => p.id), tx);
    }

    // Delete nodes
    await db.delete(TABLE_NODES, nodeIds, tx);

    // Delete localizations
    const localizationIds: number[] = [];
    for (const node of nodes) {
      if (node.voice_text) localizationIds.push(node.voice_text);
      if (node.ui_response_text) localizationIds.push(node.ui_response_text);
    }
    if (localizationIds.length > 0) {
      await db.delete(TABLE_LOCALIZATIONS, localizationIds, tx);
    }
  });
}
