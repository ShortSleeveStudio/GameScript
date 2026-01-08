import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  type ConversationProperty,
  TABLE_CONVERSATION_PROPERTIES,
} from '@gamescript/shared';

// ============================================================================
// Types
// ============================================================================

export interface CreateConversationPropertyParams {
  parent: number;
  template: number;
  is_reference: boolean;
  reference_value: number | null;
  value_string?: string;
  value_integer?: number;
  value_decimal?: number;
  value_boolean?: boolean;
}

// ============================================================================
// Create
// ============================================================================

export async function create(params: CreateConversationPropertyParams): Promise<ConversationProperty> {
  const property = await db.insert<ConversationProperty>(
    TABLE_CONVERSATION_PROPERTIES,
    {
      parent: params.parent,
      template: params.template,
      is_reference: params.is_reference,
      reference_value: params.reference_value,
      value_string: params.value_string ?? '',
      value_integer: params.value_integer ?? 0,
      value_decimal: params.value_decimal ?? 0,
      value_boolean: params.value_boolean ?? false,
    }
  );

  const capturedProperty = { ...property };

  registerUndoable(
    new Undoable(
      'Create conversation property',
      async () => {
        await db.delete(TABLE_CONVERSATION_PROPERTIES, capturedProperty.id);
      },
      async () => {
        await db.insertWithId<ConversationProperty>(TABLE_CONVERSATION_PROPERTIES, capturedProperty);
      }
    )
  );

  return property;
}

// ============================================================================
// Update
// ============================================================================

export async function updateMany(
  oldProperties: ConversationProperty[],
  newProperties: ConversationProperty[]
): Promise<ConversationProperty[]> {
  const results = await db.updateRows<ConversationProperty>(TABLE_CONVERSATION_PROPERTIES, newProperties);

  registerUndoable(
    new Undoable(
      oldProperties.length > 1 ? 'Update conversation properties' : 'Update conversation property',
      async () => {
        await db.updateRows(TABLE_CONVERSATION_PROPERTIES, oldProperties);
      },
      async () => {
        await db.updateRows(TABLE_CONVERSATION_PROPERTIES, newProperties);
      }
    )
  );

  return results;
}

export async function updateOne(
  oldProperty: ConversationProperty,
  newProperty: ConversationProperty
): Promise<ConversationProperty> {
  const results = await updateMany([oldProperty], [newProperty]);
  return results[0];
}

// ============================================================================
// Delete
// ============================================================================

export async function remove(propertyId: number): Promise<void> {
  const property = await db.selectById<ConversationProperty>(TABLE_CONVERSATION_PROPERTIES, propertyId);
  if (!property) throw new Error(`Conversation property ${propertyId} not found`);

  await db.delete(TABLE_CONVERSATION_PROPERTIES, propertyId);

  const capturedProperty = { ...property };

  registerUndoable(
    new Undoable(
      'Delete conversation property',
      async () => {
        await db.insertWithId<ConversationProperty>(TABLE_CONVERSATION_PROPERTIES, capturedProperty);
      },
      async () => {
        await db.delete(TABLE_CONVERSATION_PROPERTIES, capturedProperty.id);
      }
    )
  );
}

export async function removeMany(properties: ConversationProperty[]): Promise<void> {
  if (properties.length === 0) return;

  const ids = properties.map((p) => p.id);
  const capturedProperties = properties.map((p) => ({ ...p }));

  await db.delete(TABLE_CONVERSATION_PROPERTIES, ids);

  registerUndoable(
    new Undoable(
      properties.length > 1 ? 'Delete conversation properties' : 'Delete conversation property',
      async () => {
        await db.insertMany<ConversationProperty>(TABLE_CONVERSATION_PROPERTIES, capturedProperties);
      },
      async () => {
        await db.delete(TABLE_CONVERSATION_PROPERTIES, capturedProperties.map((p) => p.id));
      }
    )
  );
}
