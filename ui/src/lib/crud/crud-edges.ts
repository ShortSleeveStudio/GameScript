import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  query,
  type Edge,
  TABLE_EDGES,
} from '@gamescript/shared';

// ============================================================================
// Types
// ============================================================================

export interface CreateEdgeParams {
  conversationId: number;
  source: number;
  target: number;
  type?: 'default' | 'hidden';
  priority?: number;
}

// ============================================================================
// Create
// ============================================================================

export async function create(params: CreateEdgeParams): Promise<Edge> {
  const edge = await db.insert<Edge>(
    TABLE_EDGES,
    {
      parent: params.conversationId,
      source: params.source,
      target: params.target,
      type: params.type ?? 'default',
      priority: params.priority ?? 0,
      notes: null,
    }
  );

  const capturedEdge = { ...edge };

  registerUndoable(
    new Undoable(
      'Create connection',
      async () => {
        await db.delete(TABLE_EDGES, capturedEdge.id);
      },
      async () => {
        await db.insertWithId<Edge>(TABLE_EDGES, capturedEdge);
      }
    )
  );

  return edge;
}

// ============================================================================
// Update
// ============================================================================

export async function updateMany(oldEdges: Edge[], newEdges: Edge[]): Promise<Edge[]> {
  const results = await db.updateRows<Edge>(TABLE_EDGES, newEdges);

  registerUndoable(
    new Undoable(
      oldEdges.length > 1 ? 'Update connections' : 'Update connection',
      async () => {
        await db.updateRows(TABLE_EDGES, oldEdges);
      },
      async () => {
        await db.updateRows(TABLE_EDGES, newEdges);
      }
    )
  );

  return results;
}

export async function updateOne(oldEdge: Edge, newEdge: Edge): Promise<Edge> {
  const results = await updateMany([oldEdge], [newEdge]);
  return results[0];
}

// ============================================================================
// Delete
// ============================================================================

export async function remove(edgeId: number): Promise<void> {
  const edge = await db.selectById<Edge>(TABLE_EDGES, edgeId);
  if (!edge) throw new Error(`Edge ${edgeId} not found`);

  await db.delete(TABLE_EDGES, edgeId);

  const capturedEdge = { ...edge };

  registerUndoable(
    new Undoable(
      'Delete connection',
      async () => {
        await db.insertWithId<Edge>(TABLE_EDGES, capturedEdge);
      },
      async () => {
        await db.delete(TABLE_EDGES, capturedEdge.id);
      }
    )
  );
}

export async function removeMany(edgeIds: number[]): Promise<void> {
  if (edgeIds.length === 0) return;

  const edges = await db.select<Edge>(
    TABLE_EDGES,
    query<Edge>().where('id').in(edgeIds).build()
  );

  await db.delete(TABLE_EDGES, edgeIds);

  const capturedEdges = edges.map(e => ({ ...e }));

  registerUndoable(
    new Undoable(
      `Delete ${edgeIds.length} connection${edgeIds.length === 1 ? '' : 's'}`,
      async () => {
        await db.insertMany<Edge>(TABLE_EDGES, capturedEdges);
      },
      async () => {
        await db.delete(TABLE_EDGES, capturedEdges.map(e => e.id));
      }
    )
  );
}
