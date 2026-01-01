/**
 * Copy/paste functionality for graph nodes and edges.
 *
 * Uses db methods directly (not other CRUD modules) because:
 * 1. Paste needs a single undo action for the entire operation, not per-item
 * 2. We need transaction wrapping for atomicity
 * 3. Other CRUD modules register their own undoables which would conflict
 */

import type { Node as FlowNode, Edge as FlowEdge, Viewport } from '@xyflow/svelte';
import type {
  Node as DbNode,
  Edge as DbEdge,
  Localization,
  NodeProperty,
} from '@gamescript/shared';
import {
  query,
  TABLE_LOCALIZATIONS,
  TABLE_NODES,
  TABLE_EDGES,
  TABLE_NODE_PROPERTIES,
} from '@gamescript/shared';
import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import type { NodeData, EdgeData } from '$lib/components/graph/utils/types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Information about a copied node and its associated data.
 */
export interface NodeInfo {
  node: Partial<DbNode>;
  voiceText: Partial<Localization> | null;
  uiResponseText: Partial<Localization> | null;
  properties: Partial<NodeProperty>[];
}

/**
 * Information about a copied edge with source/target indices into the nodes array.
 * Using indices instead of object references so structuredClone works correctly.
 */
export interface CopyEdge {
  edge: Partial<DbEdge>;
  sourceIndex: number;
  targetIndex: number;
}

/**
 * Complete copy data including nodes, edges, and viewport state.
 */
export interface CopyData {
  nodes: NodeInfo[];
  edges: CopyEdge[];
  viewport: Viewport;
}

// ============================================================================
// Module State
// ============================================================================

let isCopying = false;
let copyData: CopyData | null = null;

// ============================================================================
// Copy Operation
// ============================================================================

/**
 * Copy selected nodes and edges to the internal clipboard.
 *
 * Gathers all node data including associated localizations and properties,
 * then strips IDs and foreign keys to prepare for paste.
 */
export async function createCopyData(
  nodesSelected: FlowNode[],
  edgesSelected: FlowEdge[],
  viewport: Viewport
): Promise<void> {
  if (isCopying) return;
  if (nodesSelected.length === 0 && edgesSelected.length === 0) return;

  isCopying = true;

  try {
    // Map from original node ID to index in the nodes array
    const nodeIdToIndex = new Map<number, number>();
    const copyNodes: NodeInfo[] = [];
    const copyEdges: CopyEdge[] = [];

    // Process each selected node
    for (const flowNode of nodesSelected) {
      const nodeData = flowNode.data as NodeData;
      const dbNode: DbNode = { ...nodeData.rowView.getValue() };

      // Skip root nodes - they can't be copied
      if (dbNode.type === 'root') continue;

      // Store original ID before we delete it
      const originalId = dbNode.id;

      // Fetch voice text localization
      let copyVoiceText: Partial<Localization> | null = null;
      if (dbNode.voice_text) {
        const voiceTexts = await db.select<Localization>(
          TABLE_LOCALIZATIONS,
          query<Localization>().where('id').eq(dbNode.voice_text).build()
        );
        if (voiceTexts.length > 0) {
          copyVoiceText = { ...voiceTexts[0] };
          delete (copyVoiceText as any).id;
          delete (copyVoiceText as any).parent;
        }
      }

      // Fetch UI response text localization
      let copyUiResponseText: Partial<Localization> | null = null;
      if (dbNode.ui_response_text) {
        const uiTexts = await db.select<Localization>(
          TABLE_LOCALIZATIONS,
          query<Localization>().where('id').eq(dbNode.ui_response_text).build()
        );
        if (uiTexts.length > 0) {
          copyUiResponseText = { ...uiTexts[0] };
          delete (copyUiResponseText as any).id;
          delete (copyUiResponseText as any).parent;
        }
      }

      // Fetch node properties
      const properties = await db.select<NodeProperty>(
        TABLE_NODE_PROPERTIES,
        query<NodeProperty>().where('parent').eq(dbNode.id).build()
      );
      const copyProperties: Partial<NodeProperty>[] = properties.map((p) => {
        const copy = { ...p };
        delete (copy as any).id;
        delete (copy as any).parent;
        return copy;
      });

      // Strip IDs and foreign keys from node
      delete (dbNode as any).id;
      delete (dbNode as any).parent;
      delete (dbNode as any).voice_text;
      delete (dbNode as any).ui_response_text;

      // Create node info and track index
      const nodeInfo: NodeInfo = {
        node: dbNode,
        voiceText: copyVoiceText,
        uiResponseText: copyUiResponseText,
        properties: copyProperties,
      };

      nodeIdToIndex.set(originalId, copyNodes.length);
      copyNodes.push(nodeInfo);
    }

    // Process edges - only include edges where both source and target are copied
    for (const flowEdge of edgesSelected) {
      const edgeData = flowEdge.data as EdgeData;
      const dbEdge: DbEdge = { ...edgeData.rowView.getValue() };

      const sourceIndex = nodeIdToIndex.get(dbEdge.source);
      const targetIndex = nodeIdToIndex.get(dbEdge.target);

      if (sourceIndex !== undefined && targetIndex !== undefined) {
        const copyEdge: Partial<DbEdge> = { ...dbEdge };

        // Strip IDs (keep parent - will be overwritten on paste)
        delete (copyEdge as any).id;
        delete (copyEdge as any).source;
        delete (copyEdge as any).target;

        copyEdges.push({
          edge: copyEdge,
          sourceIndex,
          targetIndex,
        });
      }
    }

    // Store copy data
    copyData = {
      nodes: copyNodes,
      edges: copyEdges,
      viewport: { ...viewport },
    };
  } finally {
    isCopying = false;
  }
}

// ============================================================================
// Paste Operation
// ============================================================================

/**
 * Paste copied nodes and edges into the specified conversation.
 *
 * Clones the copy data, updates parent references to the target conversation,
 * adjusts positions based on viewport differences, and inserts all records.
 *
 * All inserts are wrapped in a transaction for atomicity, and a single
 * undo action is registered for the entire paste operation.
 */
export async function pasteCopyData(
  parentConversationId: number,
  viewport: Viewport
): Promise<void> {
  if (!copyData || copyData.nodes.length === 0) return;

  // Deep clone the copy data
  const clonedData: CopyData = structuredClone(copyData);

  // Calculate position adjustment based on viewport differences
  const xDiff =
    viewport.x / viewport.zoom - clonedData.viewport.x / clonedData.viewport.zoom;
  const yDiff =
    viewport.y / viewport.zoom - clonedData.viewport.y / clonedData.viewport.zoom;
  const scaleDiff = clonedData.viewport.zoom / viewport.zoom;

  // Track newly created IDs for undo
  const createdLocalizationIds: number[] = [];
  const createdNodeIds: number[] = [];
  const createdEdgeIds: number[] = [];
  const createdPropertyIds: number[] = [];

  // Track newly created node IDs by index (matching clonedData.nodes order)
  const newNodeIds: number[] = [];

  await db.transaction(async (tx) => {
    // Insert nodes and associated data
    for (const nodeInfo of clonedData.nodes) {
      // Update parent reference
      nodeInfo.node.parent = parentConversationId;

      // Adjust position
      nodeInfo.node.position_x = (nodeInfo.node.position_x ?? 0) * scaleDiff - xDiff;
      nodeInfo.node.position_y = (nodeInfo.node.position_y ?? 0) * scaleDiff - yDiff;

      // Create voice text localization (required for dialogue nodes)
      const voiceTextLoc = await db.insert<Localization>(
        TABLE_LOCALIZATIONS,
        {
          parent: parentConversationId,
          name: nodeInfo.voiceText?.name ?? null,
          is_system_created: nodeInfo.voiceText?.is_system_created ?? true,
        } as Omit<Localization, 'id'>,
        tx
      );
      createdLocalizationIds.push(voiceTextLoc.id);

      // Create UI response text localization (required for dialogue nodes)
      const uiResponseTextLoc = await db.insert<Localization>(
        TABLE_LOCALIZATIONS,
        {
          parent: parentConversationId,
          name: nodeInfo.uiResponseText?.name ?? null,
          is_system_created: nodeInfo.uiResponseText?.is_system_created ?? true,
        } as Omit<Localization, 'id'>,
        tx
      );
      createdLocalizationIds.push(uiResponseTextLoc.id);

      // Set localization references
      nodeInfo.node.voice_text = voiceTextLoc.id;
      nodeInfo.node.ui_response_text = uiResponseTextLoc.id;

      // Create node
      const node = await db.insert<DbNode>(
        TABLE_NODES,
        nodeInfo.node as Omit<DbNode, 'id'>,
        tx
      );
      newNodeIds.push(node.id);
      createdNodeIds.push(node.id);

      // Create properties with new parent (node ID, not conversation ID)
      for (const prop of nodeInfo.properties) {
        prop.parent = node.id;
        const property = await db.insert<NodeProperty>(
          TABLE_NODE_PROPERTIES,
          prop as Omit<NodeProperty, 'id'>,
          tx
        );
        createdPropertyIds.push(property.id);
      }
    }

    // Insert edges using indices to look up new node IDs
    for (const copyEdge of clonedData.edges) {
      const sourceId = newNodeIds[copyEdge.sourceIndex];
      const targetId = newNodeIds[copyEdge.targetIndex];

      if (sourceId !== undefined && targetId !== undefined) {
        copyEdge.edge.parent = parentConversationId;
        copyEdge.edge.source = sourceId;
        copyEdge.edge.target = targetId;

        const edge = await db.insert<DbEdge>(
          TABLE_EDGES,
          copyEdge.edge as Omit<DbEdge, 'id'>,
          tx
        );
        createdEdgeIds.push(edge.id);
      }
    }
  });

  // Register single undo action for entire paste operation
  const nodeCount = createdNodeIds.length;
  const edgeCount = createdEdgeIds.length;

  registerUndoable(
    new Undoable(
      `Paste ${nodeCount} node${nodeCount === 1 ? '' : 's'}${edgeCount > 0 ? ` and ${edgeCount} connection${edgeCount === 1 ? '' : 's'}` : ''}`,
      async () => {
        // Undo: delete all created items in reverse order of creation
        await db.transaction(async (tx) => {
          // Delete edges first (no dependencies)
          if (createdEdgeIds.length > 0) {
            await db.delete(TABLE_EDGES, createdEdgeIds, tx);
          }
          // Delete properties
          if (createdPropertyIds.length > 0) {
            await db.delete(TABLE_NODE_PROPERTIES, createdPropertyIds, tx);
          }
          // Delete nodes
          if (createdNodeIds.length > 0) {
            await db.delete(TABLE_NODES, createdNodeIds, tx);
          }
          // Delete localizations last
          if (createdLocalizationIds.length > 0) {
            await db.delete(TABLE_LOCALIZATIONS, createdLocalizationIds, tx);
          }
        });
      },
      async () => {
        // Redo: paste again (re-run the paste operation)
        // Note: This will create new IDs, which is expected behavior
        await pasteCopyDataInternal(parentConversationId, viewport, clonedData);
      }
    )
  );
}

/**
 * Internal paste implementation for redo operations.
 * Does not register undo (that's handled by the caller).
 */
async function pasteCopyDataInternal(
  parentConversationId: number,
  viewport: Viewport,
  data: CopyData
): Promise<void> {
  // Deep clone to avoid mutating the original
  const clonedData: CopyData = structuredClone(data);

  // Calculate position adjustment
  const xDiff =
    viewport.x / viewport.zoom - clonedData.viewport.x / clonedData.viewport.zoom;
  const yDiff =
    viewport.y / viewport.zoom - clonedData.viewport.y / clonedData.viewport.zoom;
  const scaleDiff = clonedData.viewport.zoom / viewport.zoom;

  const newNodeIds: number[] = [];

  await db.transaction(async (tx) => {
    for (const nodeInfo of clonedData.nodes) {
      nodeInfo.node.parent = parentConversationId;
      nodeInfo.node.position_x = (nodeInfo.node.position_x ?? 0) * scaleDiff - xDiff;
      nodeInfo.node.position_y = (nodeInfo.node.position_y ?? 0) * scaleDiff - yDiff;

      // Create voice text localization (required for dialogue nodes)
      const voiceTextLoc = await db.insert<Localization>(
        TABLE_LOCALIZATIONS,
        {
          parent: parentConversationId,
          name: nodeInfo.voiceText?.name ?? null,
          is_system_created: nodeInfo.voiceText?.is_system_created ?? true,
        } as Omit<Localization, 'id'>,
        tx
      );

      // Create UI response text localization (required for dialogue nodes)
      const uiResponseTextLoc = await db.insert<Localization>(
        TABLE_LOCALIZATIONS,
        {
          parent: parentConversationId,
          name: nodeInfo.uiResponseText?.name ?? null,
          is_system_created: nodeInfo.uiResponseText?.is_system_created ?? true,
        } as Omit<Localization, 'id'>,
        tx
      );

      nodeInfo.node.voice_text = voiceTextLoc.id;
      nodeInfo.node.ui_response_text = uiResponseTextLoc.id;

      const node = await db.insert<DbNode>(
        TABLE_NODES,
        nodeInfo.node as Omit<DbNode, 'id'>,
        tx
      );
      newNodeIds.push(node.id);

      for (const prop of nodeInfo.properties) {
        prop.parent = node.id;
        await db.insert<NodeProperty>(
          TABLE_NODE_PROPERTIES,
          prop as Omit<NodeProperty, 'id'>,
          tx
        );
      }
    }

    for (const copyEdge of clonedData.edges) {
      const sourceId = newNodeIds[copyEdge.sourceIndex];
      const targetId = newNodeIds[copyEdge.targetIndex];

      if (sourceId !== undefined && targetId !== undefined) {
        copyEdge.edge.parent = parentConversationId;
        copyEdge.edge.source = sourceId;
        copyEdge.edge.target = targetId;

        await db.insert<DbEdge>(
          TABLE_EDGES,
          copyEdge.edge as Omit<DbEdge, 'id'>,
          tx
        );
      }
    }
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if there is data available to paste.
 */
export function hasCopyData(): boolean {
  return copyData !== null && copyData.nodes.length > 0;
}

/**
 * Clear the copy data.
 */
export function clearCopyData(): void {
  copyData = null;
}
