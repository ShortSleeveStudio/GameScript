/**
 * CRUD operations for graph selection deletion.
 *
 * This module provides a unified delete operation for nodes and edges
 * that handles undo/redo as a single atomic operation.
 *
 * When deleting both nodes and edges together (e.g., from a graph selection),
 * this function ensures:
 * 1. Edges explicitly selected AND edges connected to selected nodes are all captured
 * 2. All deletions happen in a single transaction
 * 3. A single undo entry is created that restores everything
 *
 * Ported from GameScriptElectron node-d.ts nodesDelete function.
 */

import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import { bridge } from '$lib/api/bridge';
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

/**
 * Delete nodes and edges from a graph selection with unified undo support.
 *
 * This function handles the complexity of:
 * - Merging explicitly selected edges with edges connected to selected nodes
 * - Deleting all related data (localizations, properties) in proper order
 * - Creating a single undo entry that restores everything atomically
 *
 * @param nodes - Nodes to delete (clones with current data)
 * @param edges - Edges to delete (clones with current data) - may overlap with connected edges
 */
export async function deleteGraphSelection(
  nodes: Node[],
  edges: Edge[]
): Promise<void> {
  // Early exit if nothing to delete
  if (nodes.length === 0 && edges.length === 0) return;

  // Use a map to merge explicit edges with connected edges (handles duplicates)
  const edgeIdMap: Map<number, Edge> = new Map();
  for (const edge of edges) {
    edgeIdMap.set(edge.id, edge);
  }

  // Gather node IDs and localization IDs from nodes
  const nodeIds: number[] = [];
  const localizationIds: number[] = [];
  for (const node of nodes) {
    nodeIds.push(node.id);
    if (node.voice_text) localizationIds.push(node.voice_text);
    if (node.ui_response_text) localizationIds.push(node.ui_response_text);
  }

  // Delete code methods for nodes that have them
  // Group nodes by conversation to batch deletions (avoids stale symbol issues)
  const nodesByConversation = new Map<number, Node[]>();
  for (const node of nodes) {
    if (node.has_condition || node.has_action) {
      const existing = nodesByConversation.get(node.parent) ?? [];
      existing.push(node);
      nodesByConversation.set(node.parent, existing);
    }
  }

  // Map: nodeId -> { conversationId, conditionCode, actionCode }
  const capturedCodeMap = new Map<number, { conversationId: number; conditionCode: string; actionCode: string }>();

  // Delete all methods per conversation in a single batch call
  for (const [conversationId, convNodes] of nodesByConversation) {
    const methodNames: string[] = [];
    for (const node of convNodes) {
      if (node.has_condition) {
        methodNames.push(`Node_${node.id}_Condition`);
      }
      if (node.has_action) {
        methodNames.push(`Node_${node.id}_Action`);
      }
    }

    const result = await bridge.deleteMethodsSilent(conversationId, methodNames);

    // Map results back to individual nodes
    for (const node of convNodes) {
      const conditionCode = result.deletedMethods[`Node_${node.id}_Condition`] ?? '';
      const actionCode = result.deletedMethods[`Node_${node.id}_Action`] ?? '';
      if (conditionCode || actionCode) {
        capturedCodeMap.set(node.id, {
          conversationId,
          conditionCode,
          actionCode,
        });
      }
    }
  }

  // Data to capture for undo/redo
  let edgesToDelete: Edge[] = [];
  let propertiesToDelete: NodeProperty[] = [];
  let localizationsToDelete: Localization[] = [];

  // Perform deletion in a transaction
  await db.transaction(async (tx) => {
    // Fetch edges connected to nodes being deleted
    if (nodeIds.length > 0) {
      const connectedEdges = await db.select<Edge>(
        TABLE_EDGES,
        query<Edge>().where('source').in(nodeIds).or('target').in(nodeIds).build(),
        tx
      );
      // Add to map (duplicates are handled by Map)
      for (const edge of connectedEdges) {
        edgeIdMap.set(edge.id, edge);
      }

      // Fetch properties to delete
      propertiesToDelete = await db.select<NodeProperty>(
        TABLE_NODE_PROPERTIES,
        query<NodeProperty>().where('parent').in(nodeIds).build(),
        tx
      );
    }

    // Convert map to array - this is the complete set of edges to delete
    edgesToDelete = Array.from(edgeIdMap.values());

    // Fetch localizations to delete
    if (localizationIds.length > 0) {
      localizationsToDelete = await db.select<Localization>(
        TABLE_LOCALIZATIONS,
        query<Localization>().where('id').in(localizationIds).build(),
        tx
      );
    }

    // Delete in proper order (respecting foreign key constraints)
    // 1. Properties (depend on nodes)
    if (propertiesToDelete.length > 0) {
      await db.delete(TABLE_NODE_PROPERTIES, propertiesToDelete.map(p => p.id), tx);
    }

    // 2. Edges (depend on nodes)
    if (edgesToDelete.length > 0) {
      await db.delete(TABLE_EDGES, edgesToDelete.map(e => e.id), tx);
    }

    // 3. Nodes
    if (nodes.length > 0) {
      await db.delete(TABLE_NODES, nodeIds, tx);
    }

    // 4. Localizations (nodes depended on these, now safe to delete)
    if (localizationsToDelete.length > 0) {
      await db.delete(TABLE_LOCALIZATIONS, localizationsToDelete.map(l => l.id), tx);
    }
  });

  // Capture for closure (create copies)
  const capturedNodes = nodes.map(n => ({ ...n }));
  const capturedEdges = edgesToDelete.map(e => ({ ...e }));
  const capturedProperties = propertiesToDelete.map(p => ({ ...p }));
  const capturedLocalizations = localizationsToDelete.map(l => ({ ...l }));

  // Build description
  const parts: string[] = [];
  if (capturedNodes.length > 0) {
    parts.push(`${capturedNodes.length} node${capturedNodes.length === 1 ? '' : 's'}`);
  }
  if (capturedEdges.length > 0) {
    parts.push(`${capturedEdges.length} connection${capturedEdges.length === 1 ? '' : 's'}`);
  }
  const description = `Delete ${parts.join(' and ')}`;

  // Register unified undo/redo
  registerUndoable(
    new Undoable(
      description,
      // Undo: restore everything in reverse order
      async () => {
        // Restore code methods first
        for (const [nodeId, codeData] of capturedCodeMap) {
          if (codeData.conditionCode) {
            await bridge.restoreMethod(codeData.conversationId, `Node_${nodeId}_Condition`, codeData.conditionCode);
          }
          if (codeData.actionCode) {
            await bridge.restoreMethod(codeData.conversationId, `Node_${nodeId}_Action`, codeData.actionCode);
          }
        }

        await db.transaction(async (tx) => {
          // Restore in reverse order of deletion
          if (capturedLocalizations.length > 0) {
            await db.insertMany<Localization>(TABLE_LOCALIZATIONS, capturedLocalizations, tx);
          }
          if (capturedNodes.length > 0) {
            await db.insertMany<Node>(TABLE_NODES, capturedNodes, tx);
          }
          if (capturedEdges.length > 0) {
            await db.insertMany<Edge>(TABLE_EDGES, capturedEdges, tx);
          }
          if (capturedProperties.length > 0) {
            await db.insertMany<NodeProperty>(TABLE_NODE_PROPERTIES, capturedProperties, tx);
          }
        });
      },
      // Redo: delete everything again
      async () => {
        // Delete code methods again - batch by conversation
        const methodsByConversation = new Map<number, string[]>();
        for (const [nodeId, codeData] of capturedCodeMap) {
          const methods = methodsByConversation.get(codeData.conversationId) ?? [];
          if (codeData.conditionCode) {
            methods.push(`Node_${nodeId}_Condition`);
          }
          if (codeData.actionCode) {
            methods.push(`Node_${nodeId}_Action`);
          }
          if (methods.length > 0) {
            methodsByConversation.set(codeData.conversationId, methods);
          }
        }
        for (const [conversationId, methodNames] of methodsByConversation) {
          await bridge.deleteMethodsSilent(conversationId, methodNames);
        }

        await db.transaction(async (tx) => {
          // Delete in same order as original
          if (capturedProperties.length > 0) {
            await db.delete(TABLE_NODE_PROPERTIES, capturedProperties.map(p => p.id), tx);
          }
          if (capturedEdges.length > 0) {
            await db.delete(TABLE_EDGES, capturedEdges.map(e => e.id), tx);
          }
          if (capturedNodes.length > 0) {
            await db.delete(TABLE_NODES, capturedNodes.map(n => n.id), tx);
          }
          if (capturedLocalizations.length > 0) {
            await db.delete(TABLE_LOCALIZATIONS, capturedLocalizations.map(l => l.id), tx);
          }
        });
      }
    )
  );
}
