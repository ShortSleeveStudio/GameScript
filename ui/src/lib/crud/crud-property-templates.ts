import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  query,
  type PropertyTemplate,
  type PropertyValue,
  type NodeProperty,
  type ConversationProperty,
  TABLE_PROPERTY_TEMPLATES,
  TABLE_PROPERTY_VALUES,
  TABLE_NODE_PROPERTIES,
  TABLE_CONVERSATION_PROPERTIES,
} from '@gamescript/shared';

// ============================================================================
// Read
// ============================================================================

export async function getAll(): Promise<PropertyTemplate[]> {
  return db.select<PropertyTemplate>(TABLE_PROPERTY_TEMPLATES, query<PropertyTemplate>().build());
}

export async function getById(id: number): Promise<PropertyTemplate | null> {
  return db.selectById<PropertyTemplate>(TABLE_PROPERTY_TEMPLATES, id);
}

// ============================================================================
// Types
// ============================================================================

export interface CreatePropertyTemplateParams {
  parent: number;
  name: string;
  type: number;
}

// ============================================================================
// Create
// ============================================================================

export async function create(params: CreatePropertyTemplateParams): Promise<PropertyTemplate> {
  const template = await db.insert<PropertyTemplate>(
    TABLE_PROPERTY_TEMPLATES,
    {
      parent: params.parent,
      name: params.name,
      type: params.type,
    }
  );

  const capturedTemplate = { ...template };

  registerUndoable(
    new Undoable(
      `Create property "${params.name}"`,
      async () => {
        await db.delete(TABLE_PROPERTY_TEMPLATES, capturedTemplate.id);
      },
      async () => {
        await db.insertWithId<PropertyTemplate>(TABLE_PROPERTY_TEMPLATES, capturedTemplate);
      }
    )
  );

  return template;
}

// ============================================================================
// Update
// ============================================================================

export async function updateMany(oldTemplates: PropertyTemplate[], newTemplates: PropertyTemplate[]): Promise<PropertyTemplate[]> {
  const results = await db.updateRows<PropertyTemplate>(TABLE_PROPERTY_TEMPLATES, newTemplates);

  registerUndoable(
    new Undoable(
      oldTemplates.length > 1 ? 'Update properties' : 'Update property',
      async () => {
        await db.updateRows(TABLE_PROPERTY_TEMPLATES, oldTemplates);
      },
      async () => {
        await db.updateRows(TABLE_PROPERTY_TEMPLATES, newTemplates);
      }
    )
  );

  return results;
}

export async function updateOne(oldTemplate: PropertyTemplate, newTemplate: PropertyTemplate): Promise<PropertyTemplate> {
  const results = await updateMany([oldTemplate], [newTemplate]);
  return results[0];
}

// ============================================================================
// Delete
// ============================================================================

export async function remove(templateId: number): Promise<void> {
  const template = await db.selectById<PropertyTemplate>(TABLE_PROPERTY_TEMPLATES, templateId);
  if (!template) throw new Error(`Property template ${templateId} not found`);

  // Hard delete: delete all related data, then delete the template
  // This is intentionally NOT undoable - there could be thousands of properties
  // and the user is warned with a confirmation modal before proceeding
  await db.transaction(async (tx) => {
    // Delete all node properties using this template
    await db.deleteWhere(TABLE_NODE_PROPERTIES, query<NodeProperty>().where('template').eq(templateId).build(), tx);
    // Delete all conversation properties using this template
    await db.deleteWhere(TABLE_CONVERSATION_PROPERTIES, query<ConversationProperty>().where('template').eq(templateId).build(), tx);
    // Delete all predefined values for this template
    await db.deleteWhere(TABLE_PROPERTY_VALUES, query<PropertyValue>().where('template_id').eq(templateId).build(), tx);
    // Delete template
    await db.delete(TABLE_PROPERTY_TEMPLATES, templateId, tx);
  });

  // No undo registered - this is a destructive operation that the user confirmed
}
