import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  type NodeProperty,
  TABLE_NODE_PROPERTIES,
} from '@gamescript/shared';

// ============================================================================
// Types
// ============================================================================

export interface CreateNodePropertyParams {
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

export async function create(params: CreateNodePropertyParams): Promise<NodeProperty> {
  const nodeProperty = await db.insert<NodeProperty>(
    TABLE_NODE_PROPERTIES,
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

  const capturedNodeProperty = { ...nodeProperty };

  registerUndoable(
    new Undoable(
      'Create node property',
      async () => {
        await db.delete(TABLE_NODE_PROPERTIES, capturedNodeProperty.id);
      },
      async () => {
        await db.insertWithId<NodeProperty>(TABLE_NODE_PROPERTIES, capturedNodeProperty);
      }
    )
  );

  return nodeProperty;
}

// ============================================================================
// Update
// ============================================================================

export async function updateMany(oldProperties: NodeProperty[], newProperties: NodeProperty[]): Promise<NodeProperty[]> {
  const results = await db.updateRows<NodeProperty>(TABLE_NODE_PROPERTIES, newProperties);

  registerUndoable(
    new Undoable(
      oldProperties.length > 1 ? 'Update node properties' : 'Update node property',
      async () => {
        await db.updateRows(TABLE_NODE_PROPERTIES, oldProperties);
      },
      async () => {
        await db.updateRows(TABLE_NODE_PROPERTIES, newProperties);
      }
    )
  );

  return results;
}

export async function updateOne(oldProperty: NodeProperty, newProperty: NodeProperty): Promise<NodeProperty> {
  const results = await updateMany([oldProperty], [newProperty]);
  return results[0];
}

// ============================================================================
// Delete
// ============================================================================

export async function remove(nodePropertyId: number): Promise<void> {
  const nodeProperty = await db.selectById<NodeProperty>(TABLE_NODE_PROPERTIES, nodePropertyId);
  if (!nodeProperty) throw new Error(`Node property ${nodePropertyId} not found`);

  await db.delete(TABLE_NODE_PROPERTIES, nodePropertyId);

  const capturedNodeProperty = { ...nodeProperty };

  registerUndoable(
    new Undoable(
      'Delete node property',
      async () => {
        await db.insertWithId<NodeProperty>(TABLE_NODE_PROPERTIES, capturedNodeProperty);
      },
      async () => {
        await db.delete(TABLE_NODE_PROPERTIES, capturedNodeProperty.id);
      }
    )
  );
}

export async function removeMany(nodeProperties: NodeProperty[]): Promise<void> {
  if (nodeProperties.length === 0) return;

  const ids = nodeProperties.map((p) => p.id);
  const capturedNodeProperties = nodeProperties.map((p) => ({ ...p }));

  await db.delete(TABLE_NODE_PROPERTIES, ids);

  registerUndoable(
    new Undoable(
      nodeProperties.length > 1 ? 'Delete node properties' : 'Delete node property',
      async () => {
        await db.insertMany<NodeProperty>(TABLE_NODE_PROPERTIES, capturedNodeProperties);
      },
      async () => {
        await db.delete(TABLE_NODE_PROPERTIES, capturedNodeProperties.map((p) => p.id));
      }
    )
  );
}
