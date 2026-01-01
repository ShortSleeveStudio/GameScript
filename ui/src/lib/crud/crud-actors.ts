import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  query,
  type Node,
  type Actor,
  type Localization,
  TABLE_NODES,
  TABLE_LOCALIZATIONS,
  TABLE_ACTORS,
  DB_DEFAULT_ACTOR_ID,
} from '@gamescript/shared';

// Helper to delete an actor and reassign its nodes to the default actor
async function deleteInternal(actorId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const actor = await db.selectById<Actor>(TABLE_ACTORS, actorId, tx);
    if (!actor) throw new Error(`Actor ${actorId} not found`);

    // Reassign nodes to default actor
    const nodesUsingActor = await db.select<Node>(
      TABLE_NODES,
      query<Node>().where('actor').eq(actorId).build(),
      tx
    );
    for (const node of nodesUsingActor) {
      await db.updatePartial<Node>(TABLE_NODES, node.id, { actor: DB_DEFAULT_ACTOR_ID }, tx);
    }

    // Delete actor
    await db.delete(TABLE_ACTORS, actorId, tx);

    // Delete localized name
    if (actor.localized_name) {
      await db.delete(TABLE_LOCALIZATIONS, actor.localized_name, tx);
    }
  });
}

// ============================================================================
// Read
// ============================================================================

export async function getAll(): Promise<Actor[]> {
  return db.select<Actor>(TABLE_ACTORS, query<Actor>().build());
}

export async function getById(id: number): Promise<Actor | null> {
  return db.selectById<Actor>(TABLE_ACTORS, id);
}

// ============================================================================
// Types
// ============================================================================

export interface CreateActorParams {
  name: string;
  color?: string;
  notes?: string | null;
}

export interface CreateActorResult {
  actor: Actor;
  localizedNameId: number;
}

// ============================================================================
// Create
// ============================================================================

export async function create(params: CreateActorParams): Promise<CreateActorResult> {
  let actor: Actor | undefined;
  let localization: Localization | undefined;

  const color = params.color ?? '#808080';

  await db.transaction(async (tx) => {
    // 1. Create localization for the actor's localized name
    localization = await db.insert<Localization>(
      TABLE_LOCALIZATIONS,
      {
        parent: null as any,
        name: null as any,
        is_system_created: true,
      },
      tx
    );

    // 2. Create the actor
    actor = await db.insert<Actor>(
      TABLE_ACTORS,
      {
        name: params.name,
        color,
        notes: params.notes ?? null,
        localized_name: localization.id,
        is_system_created: false,
      },
      tx
    );
  });

  if (!actor || !localization) throw new Error('Failed to create actor');

  const capturedActor = { ...actor };
  const capturedLocalization = { ...localization };

  registerUndoable(
    new Undoable(
      `Create actor "${params.name}"`,
      async () => {
        await deleteInternal(capturedActor.id);
      },
      async () => {
        await db.transaction(async (tx) => {
          await db.insertWithId<Localization>(TABLE_LOCALIZATIONS, capturedLocalization, tx);
          await db.insertWithId<Actor>(TABLE_ACTORS, capturedActor, tx);
        });
      }
    )
  );

  return { actor, localizedNameId: localization.id };
}

// ============================================================================
// Update
// ============================================================================

export async function updateMany(oldActors: Actor[], newActors: Actor[]): Promise<Actor[]> {
  const results = await db.updateRows<Actor>(TABLE_ACTORS, newActors);

  registerUndoable(
    new Undoable(
      oldActors.length > 1 ? 'Update actors' : 'Update actor',
      async () => {
        await db.updateRows(TABLE_ACTORS, oldActors);
      },
      async () => {
        await db.updateRows(TABLE_ACTORS, newActors);
      }
    )
  );

  return results;
}

export async function updateOne(oldActor: Actor, newActor: Actor): Promise<Actor> {
  const results = await updateMany([oldActor], [newActor]);
  return results[0];
}

// ============================================================================
// Delete
// ============================================================================

export async function remove(actorId: number): Promise<void> {
  if (actorId === DB_DEFAULT_ACTOR_ID) {
    throw new Error('Cannot delete the default actor');
  }
  await deleteInternal(actorId);
  // Not undoable: reassigns potentially many nodes, user confirms via modal.
}
