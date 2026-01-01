/**
 * Connection validation utilities for the graph editor.
 *
 * Validates edge connections to prevent invalid graph states.
 */

import type { Connection } from '@xyflow/svelte';
import type { GraphNode, GraphEdge } from './types.js';
import { NODE_TYPES } from './types.js';

/**
 * Validation result with optional error message.
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate a new connection attempt.
 *
 * Rules:
 * - Cannot connect a node to itself (no self-loops)
 * - Cannot create duplicate edges between the same nodes
 * - Cannot connect TO a root node (root is always the start)
 * - Source and target must both exist
 */
export function validateConnection(
  connection: Connection,
  nodes: GraphNode[],
  edges: GraphEdge[]
): ValidationResult {
  const { source, target } = connection;

  // Basic validation
  if (!source || !target) {
    return { valid: false, message: 'Invalid connection: missing source or target' };
  }

  // No self-loops
  if (source === target) {
    return { valid: false, message: 'Cannot connect a node to itself' };
  }

  // Find nodes
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  if (!sourceNode) {
    return { valid: false, message: 'Source node not found' };
  }

  if (!targetNode) {
    return { valid: false, message: 'Target node not found' };
  }

  // Cannot connect TO a root node
  if (targetNode.type === NODE_TYPES.ROOT) {
    return { valid: false, message: 'Cannot connect to a root node' };
  }

  // Check for duplicate edges
  const duplicateEdge = edges.find(
    (e) => e.source === source && e.target === target
  );

  if (duplicateEdge) {
    return { valid: false, message: 'Connection already exists' };
  }

  return { valid: true };
}

/**
 * Check if a node can be deleted.
 *
 * Rules:
 * - Root nodes cannot be deleted
 */
export function canDeleteNode(node: GraphNode): ValidationResult {
  if (node.type === NODE_TYPES.ROOT) {
    return { valid: false, message: 'Cannot delete the root node' };
  }

  return { valid: true };
}

/**
 * Check if deleting a node would orphan other nodes.
 *
 * Returns the IDs of nodes that would become disconnected
 * from the root if this node were deleted.
 */
export function findOrphanedNodes(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): string[] {
  // Build adjacency list (directed from source to target)
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    // Skip edges involving the node to be deleted
    if (edge.source === nodeId || edge.target === nodeId) continue;
    adjacency.get(edge.source)?.add(edge.target);
  }

  // Find root node
  const rootNode = nodes.find((n) => n.type === NODE_TYPES.ROOT);
  if (!rootNode) return [];

  // BFS from root to find all reachable nodes
  const reachable = new Set<string>();
  const queue = [rootNode.id];
  reachable.add(rootNode.id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) || new Set();

    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Nodes that are not reachable (and not the deleted node itself) are orphaned
  const orphaned: string[] = [];
  for (const node of nodes) {
    if (node.id !== nodeId && !reachable.has(node.id)) {
      orphaned.push(node.id);
    }
  }

  return orphaned;
}

/**
 * Check if an edge can be deleted.
 *
 * Currently all edges can be deleted, but this hook allows
 * for future validation rules.
 */
export function canDeleteEdge(_edge: GraphEdge): ValidationResult {
  return { valid: true };
}

/**
 * Validate node position update.
 *
 * Ensures positions are within reasonable bounds.
 */
export function validatePosition(x: number, y: number): ValidationResult {
  const MAX_COORD = 100000;
  const MIN_COORD = -100000;

  if (x < MIN_COORD || x > MAX_COORD || y < MIN_COORD || y > MAX_COORD) {
    return { valid: false, message: 'Position out of bounds' };
  }

  return { valid: true };
}
