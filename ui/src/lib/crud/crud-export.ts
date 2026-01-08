/**
 * CRUD operations for snapshot export.
 *
 * Provides read-only database queries optimized for exporting
 * complete snapshots of all data for a given locale.
 */

import { db } from '$lib/db';
import { bridge } from '$lib/api/bridge';
import {
  query,
  isLocaleColumn,
  TABLE_CONVERSATIONS,
  TABLE_NODES,
  TABLE_EDGES,
  TABLE_ACTORS,
  TABLE_LOCALIZATIONS,
  TABLE_PROPERTY_TEMPLATES,
  TABLE_NODE_PROPERTIES,
  TABLE_CONVERSATION_PROPERTIES,
  TABLE_PROPERTY_VALUES,
  TABLE_CONVERSATION_TAG_CATEGORIES,
  TABLE_CONVERSATION_TAG_VALUES,
  TABLE_LOCALIZATION_TAG_CATEGORIES,
  TABLE_LOCALIZATION_TAG_VALUES,
  TABLE_LOCALES,
  type Conversation,
  type Node,
  type Edge,
  type Actor,
  type Localization,
  type Locale,
  type PropertyTemplate,
  type NodeProperty,
  type ConversationProperty,
  type PropertyValue,
  type ConversationTagCategory,
  type ConversationTagValue,
  type LocalizationTagCategory,
  type LocalizationTagValue,
} from '@gamescript/shared';

// ============================================================================
// Locales
// ============================================================================

/**
 * Get all locales ordered by ID.
 */
export async function getAllLocales(): Promise<Locale[]> {
  return db.select<Locale>(TABLE_LOCALES, query<Locale>().orderBy('id', 'ASC').build());
}

/**
 * Get localized names for locales using the specified locale column.
 * Returns a map from locale ID to its localized display name.
 */
export async function getLocaleLocalizedNames(
  locales: Locale[],
  localeColumn: string
): Promise<Map<number, string>> {
  const localizationIds = locales.map((l) => l.localized_name);
  const textMap = await getLocalizationTextForLocale(localizationIds, localeColumn);

  const result = new Map<number, string>();
  for (const locale of locales) {
    const text = textMap.get(locale.localized_name);
    // Fall back to locale name if no localized name
    result.set(locale.id, text ?? locale.name);
  }
  return result;
}

// ============================================================================
// Conversations
// ============================================================================

/**
 * Get all non-deleted conversations ordered by ID.
 */
export async function getNonDeletedConversations(): Promise<Conversation[]> {
  return db.select<Conversation>(
    TABLE_CONVERSATIONS,
    query<Conversation>().where('is_deleted').eq(false).orderBy('id', 'ASC').build()
  );
}

// ============================================================================
// Nodes
// ============================================================================

/**
 * Get all nodes from non-deleted conversations ordered by ID.
 */
export async function getNodesFromNonDeletedConversations(): Promise<Node[]> {
  const sql = `
    SELECT n.* FROM "nodes" n
    JOIN "conversations" c ON n.parent = c.id
    WHERE c.is_deleted = ${db.placeholder(1)}
    ORDER BY n.id
  `;
  return bridge.query<Node>(sql, [false]);
}

// ============================================================================
// Edges
// ============================================================================

/**
 * Get all edges from non-deleted conversations ordered by ID.
 */
export async function getEdgesFromNonDeletedConversations(): Promise<Edge[]> {
  const sql = `
    SELECT e.* FROM "edges" e
    JOIN "conversations" c ON e.parent = c.id
    WHERE c.is_deleted = ${db.placeholder(1)}
    ORDER BY e.id
  `;
  return bridge.query<Edge>(sql, [false]);
}

// ============================================================================
// Actors
// ============================================================================

/**
 * Get all actors ordered by ID.
 */
export async function getAllActors(): Promise<Actor[]> {
  return db.select<Actor>(TABLE_ACTORS, query<Actor>().orderBy('id', 'ASC').build());
}

// ============================================================================
// Localizations
// ============================================================================

/**
 * Get all non-system-created localizations ordered by ID.
 */
export async function getNonSystemLocalizations(): Promise<Localization[]> {
  return db.select<Localization>(
    TABLE_LOCALIZATIONS,
    query<Localization>().where('is_system_created').eq(false).orderBy('id', 'ASC').build()
  );
}

/**
 * Get localized text for specific localization IDs and a given locale.
 * Returns a map from localization ID to text value.
 *
 * @param localizationIds - Array of localization IDs to fetch
 * @param localeColumn - The locale column name (e.g., "locale_1")
 */
export async function getLocalizationTextForLocale(
  localizationIds: number[],
  localeColumn: string
): Promise<Map<number, string | null>> {
  if (localizationIds.length === 0) {
    return new Map();
  }

  // Validate locale column name to prevent SQL injection
  if (!isLocaleColumn(localeColumn)) {
    throw new Error(`Invalid locale column name: ${localeColumn}`);
  }

  const placeholders = localizationIds.map((_, i) => db.placeholder(i + 1)).join(', ');
  const sql = `SELECT id, "${localeColumn}" as text FROM "localizations" WHERE id IN (${placeholders})`;
  const rows = await bridge.query<{ id: number; text: string | null }>(sql, localizationIds);

  const textMap = new Map<number, string | null>();
  for (const row of rows) {
    textMap.set(row.id, row.text);
  }

  return textMap;
}

// ============================================================================
// Property Templates
// ============================================================================

/**
 * Get all property templates ordered by ID.
 */
export async function getAllPropertyTemplates(): Promise<PropertyTemplate[]> {
  return db.select<PropertyTemplate>(
    TABLE_PROPERTY_TEMPLATES,
    query<PropertyTemplate>().orderBy('id', 'ASC').build()
  );
}

// ============================================================================
// Node Properties
// ============================================================================

/**
 * Get all node properties from nodes in non-deleted conversations.
 */
export async function getNodePropertiesFromNonDeletedConversations(): Promise<NodeProperty[]> {
  const sql = `
    SELECT np.* FROM "node_properties" np
    JOIN "nodes" n ON np.parent = n.id
    JOIN "conversations" c ON n.parent = c.id
    WHERE c.is_deleted = ${db.placeholder(1)}
    ORDER BY np.id
  `;
  return bridge.query<NodeProperty>(sql, [false]);
}

// ============================================================================
// Conversation Tags
// ============================================================================

/**
 * Get all conversation tag categories ordered by ID.
 */
export async function getConversationTagCategories(): Promise<ConversationTagCategory[]> {
  return db.select<ConversationTagCategory>(
    TABLE_CONVERSATION_TAG_CATEGORIES,
    query<ConversationTagCategory>().orderBy('id', 'ASC').build()
  );
}

/**
 * Get all conversation tag values ordered by category_id and id.
 */
export async function getConversationTagValues(): Promise<ConversationTagValue[]> {
  return db.select<ConversationTagValue>(
    TABLE_CONVERSATION_TAG_VALUES,
    query<ConversationTagValue>().orderBy('category_id', 'ASC').orderBy('id', 'ASC').build()
  );
}

// ============================================================================
// Localization Tags
// ============================================================================

/**
 * Get all localization tag categories ordered by ID.
 */
export async function getLocalizationTagCategories(): Promise<LocalizationTagCategory[]> {
  return db.select<LocalizationTagCategory>(
    TABLE_LOCALIZATION_TAG_CATEGORIES,
    query<LocalizationTagCategory>().orderBy('id', 'ASC').build()
  );
}

/**
 * Get all localization tag values ordered by category_id and id.
 */
export async function getLocalizationTagValues(): Promise<LocalizationTagValue[]> {
  return db.select<LocalizationTagValue>(
    TABLE_LOCALIZATION_TAG_VALUES,
    query<LocalizationTagValue>().orderBy('category_id', 'ASC').orderBy('id', 'ASC').build()
  );
}

// ============================================================================
// Conversation Properties
// ============================================================================

/**
 * Get all conversation properties from non-deleted conversations.
 */
export async function getConversationPropertiesFromNonDeletedConversations(): Promise<ConversationProperty[]> {
  const sql = `
    SELECT cp.* FROM "conversation_properties" cp
    JOIN "conversations" c ON cp.parent = c.id
    WHERE c.is_deleted = ${db.placeholder(1)}
    ORDER BY cp.id
  `;
  return bridge.query<ConversationProperty>(sql, [false]);
}

// ============================================================================
// Property Values (Predefined Values)
// ============================================================================

/**
 * Get all property values (predefined values for property templates).
 */
export async function getAllPropertyValues(): Promise<PropertyValue[]> {
  return db.select<PropertyValue>(
    TABLE_PROPERTY_VALUES,
    query<PropertyValue>().orderBy('id', 'ASC').build()
  );
}
