import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  query,
  type PropertyValue,
  TABLE_PROPERTY_VALUES,
  PROPERTY_TYPE_STRING,
  PROPERTY_TYPE_INTEGER,
  PROPERTY_TYPE_DECIMAL,
  PROPERTY_TYPE_BOOLEAN,
} from '@gamescript/shared';

// ============================================================================
// Types
// ============================================================================

export interface CreatePropertyValueParams {
  template_id: number;
  value_string?: string | null;
  value_integer?: number | null;
  value_decimal?: number | null;
  value_boolean?: boolean | null;
}

// ============================================================================
// Read
// ============================================================================

export async function getAll(): Promise<PropertyValue[]> {
  return db.select<PropertyValue>(TABLE_PROPERTY_VALUES, query<PropertyValue>().build());
}

export async function getById(id: number): Promise<PropertyValue | null> {
  return db.selectById<PropertyValue>(TABLE_PROPERTY_VALUES, id);
}

export async function getByTemplate(templateId: number): Promise<PropertyValue[]> {
  return db.select<PropertyValue>(
    TABLE_PROPERTY_VALUES,
    query<PropertyValue>().where('template_id').eq(templateId).build()
  );
}

// ============================================================================
// Create
// ============================================================================

export async function create(params: CreatePropertyValueParams): Promise<PropertyValue> {
  const value = await db.insert<PropertyValue>(TABLE_PROPERTY_VALUES, {
    template_id: params.template_id,
    value_string: params.value_string ?? null,
    value_integer: params.value_integer ?? null,
    value_decimal: params.value_decimal ?? null,
    value_boolean: params.value_boolean ?? null,
  });

  const capturedValue = { ...value };

  registerUndoable(
    new Undoable(
      'Create property value',
      async () => {
        await db.delete(TABLE_PROPERTY_VALUES, capturedValue.id);
      },
      async () => {
        await db.insertWithId<PropertyValue>(TABLE_PROPERTY_VALUES, capturedValue);
      }
    )
  );

  return value;
}

// ============================================================================
// Update
// ============================================================================

export async function updateMany(
  oldValues: PropertyValue[],
  newValues: PropertyValue[]
): Promise<PropertyValue[]> {
  const results = await db.updateRows<PropertyValue>(TABLE_PROPERTY_VALUES, newValues);

  registerUndoable(
    new Undoable(
      oldValues.length > 1 ? 'Update property values' : 'Update property value',
      async () => {
        await db.updateRows(TABLE_PROPERTY_VALUES, oldValues);
      },
      async () => {
        await db.updateRows(TABLE_PROPERTY_VALUES, newValues);
      }
    )
  );

  return results;
}

export async function updateOne(
  oldValue: PropertyValue,
  newValue: PropertyValue
): Promise<PropertyValue> {
  const results = await updateMany([oldValue], [newValue]);
  return results[0];
}

// ============================================================================
// Delete
// ============================================================================

export async function remove(valueId: number): Promise<void> {
  const value = await db.selectById<PropertyValue>(TABLE_PROPERTY_VALUES, valueId);
  if (!value) throw new Error(`Property value ${valueId} not found`);

  await db.delete(TABLE_PROPERTY_VALUES, valueId);

  // Note: ON DELETE SET NULL on reference_value handles cleanup in node_properties
  // and conversation_properties. Properties referencing this value will have
  // reference_value set to null. UI should detect is_reference=true + reference_value=null
  // as a "broken reference" state.

  // Not undoable - user confirms via modal since this affects all properties using this value
}

export async function removeMany(values: PropertyValue[]): Promise<void> {
  if (values.length === 0) return;

  const ids = values.map((v) => v.id);
  await db.delete(TABLE_PROPERTY_VALUES, ids);

  // Not undoable - destructive operation confirmed by user
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the display value for a PropertyValue based on its template type.
 */
export function getDisplayValue(value: PropertyValue, templateType: number): string {
  switch (templateType) {
    case PROPERTY_TYPE_STRING.id:
      return value.value_string ?? '';
    case PROPERTY_TYPE_INTEGER.id:
      return value.value_integer?.toString() ?? '';
    case PROPERTY_TYPE_DECIMAL.id:
      return value.value_decimal?.toString() ?? '';
    case PROPERTY_TYPE_BOOLEAN.id:
      return value.value_boolean ? 'Yes' : 'No';
    default:
      return '';
  }
}

/**
 * Get the raw value for a PropertyValue based on its template type.
 */
export function getRawValue(
  value: PropertyValue,
  templateType: number
): string | number | boolean | null {
  switch (templateType) {
    case PROPERTY_TYPE_STRING.id:
      return value.value_string;
    case PROPERTY_TYPE_INTEGER.id:
      return value.value_integer;
    case PROPERTY_TYPE_DECIMAL.id:
      return value.value_decimal;
    case PROPERTY_TYPE_BOOLEAN.id:
      return value.value_boolean;
    default:
      return null;
  }
}
