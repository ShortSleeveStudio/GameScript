import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  query,
  type Filter,
  TABLE_FILTERS,
  TABLE_CONVERSATIONS,
} from '@gamescript/shared';

// ============================================================================
// Read
// ============================================================================

export async function getAll(): Promise<Filter[]> {
  return db.select<Filter>(TABLE_FILTERS, query<Filter>().build());
}

export async function getById(id: number): Promise<Filter | null> {
  return db.selectById<Filter>(TABLE_FILTERS, id);
}

// ============================================================================
// Helpers
// ============================================================================

export function filterIdToColumn(filterId: number): string {
  return `filter_${filterId}`;
}

// ============================================================================
// Create
// ============================================================================

export async function create(name: string): Promise<Filter> {
  let filter: Filter | undefined;

  await db.transaction(async (tx) => {
    // 1. Create the filter
    filter = await db.insert<Filter>(
      TABLE_FILTERS,
      {
        name,
        notes: null,
      },
      tx
    );

    // 2. Add filter column to conversations table
    const columnName = `filter_${filter.id}`;
    await db.addColumn(TABLE_CONVERSATIONS, columnName, 'TEXT', tx);
  });

  if (!filter) throw new Error('Failed to create filter');

  const capturedFilter = { ...filter };

  registerUndoable(
    new Undoable(
      `Create filter "${name}"`,
      async () => {
        await deleteInternal(capturedFilter.id);
      },
      async () => {
        await restore(capturedFilter);
      }
    )
  );

  return filter;
}

// ============================================================================
// Update
// ============================================================================

export async function updateMany(oldFilters: Filter[], newFilters: Filter[]): Promise<Filter[]> {
  const results = await db.updateRows<Filter>(TABLE_FILTERS, newFilters);

  registerUndoable(
    new Undoable(
      oldFilters.length > 1 ? 'Update filters' : 'Update filter',
      async () => {
        await db.updateRows(TABLE_FILTERS, oldFilters);
      },
      async () => {
        await db.updateRows(TABLE_FILTERS, newFilters);
      }
    )
  );

  return results;
}

export async function updateOne(oldFilter: Filter, newFilter: Filter): Promise<Filter> {
  const results = await updateMany([oldFilter], [newFilter]);
  return results[0];
}

// ============================================================================
// Delete
// ============================================================================

export async function remove(filterId: number): Promise<void> {
  const filter = await db.selectById<Filter>(TABLE_FILTERS, filterId);
  if (!filter) throw new Error(`Filter ${filterId} not found`);

  await deleteInternal(filterId);

  const capturedFilter = { ...filter };

  registerUndoable(
    new Undoable(
      `Delete filter "${filter.name}"`,
      async () => {
        await restore(capturedFilter);
      },
      async () => {
        await deleteInternal(capturedFilter.id);
      }
    )
  );
}

// ============================================================================
// Restore
// ============================================================================

export async function restore(filter: Filter): Promise<void> {
  await db.transaction(async (tx) => {
    await db.insertWithId<Filter>(TABLE_FILTERS, filter, tx);
    const columnName = `filter_${filter.id}`;
    await db.addColumn(TABLE_CONVERSATIONS, columnName, 'TEXT', tx);
  });
}

// ============================================================================
// Internal
// ============================================================================

async function deleteInternal(filterId: number): Promise<void> {
  await db.transaction(async (tx) => {
    // Drop filter column from conversations
    const columnName = `filter_${filterId}`;
    await db.dropColumn(TABLE_CONVERSATIONS, columnName, tx);

    // Delete filter
    await db.delete(TABLE_FILTERS, filterId, tx);
  });
}
