import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  query,
  type Localization,
  type TransactionContext,
  TABLE_LOCALIZATIONS,
} from '@gamescript/shared';

// ============================================================================
// Constants
// ============================================================================

/** Maximum IDs per query to avoid SQL IN clause limits (SQLite: 999) */
const ID_LOOKUP_CHUNK_SIZE = 500;

// ============================================================================
// Read
// ============================================================================

export async function getAll(): Promise<Localization[]> {
  return db.select<Localization>(TABLE_LOCALIZATIONS, query<Localization>().build());
}

export async function getById(id: number): Promise<Localization | null> {
  return db.selectById<Localization>(TABLE_LOCALIZATIONS, id);
}

/**
 * Get multiple localizations by their IDs in chunked queries.
 * Avoids SQL IN clause limits (SQLite: 999, PostgreSQL: ~32k).
 * Use this for large-scale operations like CSV import.
 */
export async function getByIdsChunked(ids: number[]): Promise<Map<number, Localization>> {
  if (ids.length === 0) return new Map();

  const result = new Map<number, Localization>();

  for (let i = 0; i < ids.length; i += ID_LOOKUP_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + ID_LOOKUP_CHUNK_SIZE);
    const rows = await db.select<Localization>(
      TABLE_LOCALIZATIONS,
      query<Localization>().where('id').in(chunk).build()
    );
    for (const row of rows) {
      result.set(row.id, row);
    }
  }

  return result;
}

/**
 * Get total count of localizations.
 * Used for progress reporting during export.
 */
export async function getCount(): Promise<number> {
  return db.count<Localization>(TABLE_LOCALIZATIONS, query<Localization>().build());
}

/**
 * Get localizations in paginated batches for streaming export.
 * Uses offset-based pagination ordered by ID for consistent results.
 *
 * @param offset - Number of rows to skip
 * @param limit - Maximum rows to return
 */
export async function getBatch(offset: number, limit: number): Promise<Localization[]> {
  return db.select<Localization>(
    TABLE_LOCALIZATIONS,
    query<Localization>()
      .orderBy('id', 'asc')
      .offset(offset)
      .limit(limit)
      .build()
  );
}

export async function getByParent(conversationId: number): Promise<Localization[]> {
  return db.select<Localization>(TABLE_LOCALIZATIONS, query<Localization>().where('parent').eq(conversationId).build());
}

// ============================================================================
// Types
// ============================================================================

export interface CreateLocalizationParams {
  parent: number;
  name: string;
  is_system_created?: boolean;
}

// ============================================================================
// Create
// ============================================================================

export async function create(params: CreateLocalizationParams): Promise<Localization> {
  const localization = await db.insert<Localization>(
    TABLE_LOCALIZATIONS,
    {
      parent: params.parent,
      name: params.name,
      is_system_created: params.is_system_created ?? false,
    }
  );

  const capturedLocalization = { ...localization };

  registerUndoable(
    new Undoable(
      'Create localization',
      async () => {
        await db.delete(TABLE_LOCALIZATIONS, capturedLocalization.id);
      },
      async () => {
        await db.insertWithId<Localization>(TABLE_LOCALIZATIONS, capturedLocalization);
      }
    )
  );

  return localization;
}

// ============================================================================
// Update
// ============================================================================

export async function updateMany(oldLocalizations: Localization[], newLocalizations: Localization[]): Promise<Localization[]> {
  const results = await db.updateRows<Localization>(TABLE_LOCALIZATIONS, newLocalizations);

  registerUndoable(
    new Undoable(
      oldLocalizations.length > 1 ? 'Update localizations' : 'Update localization',
      async () => {
        await db.updateRows(TABLE_LOCALIZATIONS, oldLocalizations);
      },
      async () => {
        await db.updateRows(TABLE_LOCALIZATIONS, newLocalizations);
      }
    )
  );

  return results;
}

export async function updateOne(oldLocalization: Localization, newLocalization: Localization): Promise<Localization> {
  const results = await updateMany([oldLocalization], [newLocalization]);
  return results[0];
}

/**
 * Update a localization with partial data.
 * Used for search/replace where we only know the column being changed.
 * Does NOT register undo - caller is responsible for batching undo across multiple calls.
 */
export async function updatePartial(id: number, partial: Partial<Localization>): Promise<void> {
  await db.updatePartial<Localization>(TABLE_LOCALIZATIONS, id, partial);
}

/**
 * Update multiple localizations with partial data in a batch.
 * Used for CSV import where we update many rows efficiently.
 * Does NOT register undo - bulk imports are not undoable.
 *
 * @param updates - Array of {id, data} pairs to update
 * @param connection - Optional transaction context
 * @returns Number of rows updated
 */
export async function updatePartialBatch(
  updates: Array<{ id: number; data: Partial<Localization> }>,
  connection?: TransactionContext
): Promise<number> {
  if (updates.length === 0) return 0;

  let count = 0;
  for (const { id, data } of updates) {
    await db.updatePartial<Localization>(TABLE_LOCALIZATIONS, id, data, connection);
    count++;
  }
  return count;
}

/**
 * Create multiple localizations with specific IDs (for CSV import with upsert).
 * Does NOT register undo - bulk imports are not undoable.
 *
 * @param rows - Localization objects including their IDs
 * @param connection - Optional transaction context
 * @returns Created localizations
 */
export async function createBatchWithIds(
  rows: Localization[],
  connection?: TransactionContext
): Promise<Localization[]> {
  if (rows.length === 0) return [];
  return db.insertMany<Localization>(TABLE_LOCALIZATIONS, rows, connection);
}

// ============================================================================
// Delete
// ============================================================================

export async function remove(localizationId: number): Promise<void> {
  const localization = await db.selectById<Localization>(TABLE_LOCALIZATIONS, localizationId);
  if (!localization) throw new Error(`Localization ${localizationId} not found`);

  await db.delete(TABLE_LOCALIZATIONS, localizationId);

  const capturedLocalization = { ...localization };

  registerUndoable(
    new Undoable(
      'Delete localization',
      async () => {
        await db.insertWithId<Localization>(TABLE_LOCALIZATIONS, capturedLocalization);
      },
      async () => {
        await db.delete(TABLE_LOCALIZATIONS, capturedLocalization.id);
      }
    )
  );
}

export async function removeMany(localizations: Localization[]): Promise<void> {
  if (localizations.length === 0) return;

  const ids = localizations.map((l) => l.id);
  const capturedLocalizations = localizations.map((l) => ({ ...l }));

  await db.delete(TABLE_LOCALIZATIONS, ids);

  registerUndoable(
    new Undoable(
      localizations.length > 1 ? 'Delete localizations' : 'Delete localization',
      async () => {
        await db.insertMany<Localization>(TABLE_LOCALIZATIONS, capturedLocalizations);
      },
      async () => {
        await db.delete(TABLE_LOCALIZATIONS, capturedLocalizations.map((l) => l.id));
      }
    )
  );
}
