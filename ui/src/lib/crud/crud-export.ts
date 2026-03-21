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
  isLocaleFormColumn,
  localeIdToColumns,
  getRequiredPluralCategories,
  getLocaleAutonym,
  isKnownLocale,
  GENDER_CATEGORIES,
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
  type PluralCategory,
  type GenderCategory,
} from '@gamescript/shared';
import type { ExportTextVariant } from '$lib/export/types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Full localization export data for a single row × locale combination.
 */
export interface LocalizationExportData {
  name: string | null;
  variants: ExportTextVariant[];
  subjectActorId: number | null;
  subjectGender: string | null;
  isTemplated: boolean;
}

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
 * Get localized names for locales.
 * For CLDR locales: uses the autonym (language's name in its own script).
 * For custom locales: falls back to the database localization.
 * Returns a map from locale ID to its localized display name.
 */
export async function getLocaleLocalizedNames(
  locales: Locale[],
  localeId: number
): Promise<Map<number, string>> {
  const result = new Map<number, string>();

  // Collect non-CLDR locales that need database lookup
  const dbLookupLocales: Locale[] = [];

  for (const locale of locales) {
    const code = locale.name;

    if (isKnownLocale(code)) {
      result.set(locale.id, getLocaleAutonym(code));
    } else {
      dbLookupLocales.push(locale);
    }
  }

  // Fall back to database for non-CLDR locales
  if (dbLookupLocales.length > 0) {
    const localizationIds = dbLookupLocales.map((l) => l.localized_name);
    const textMap = await getLocalizationDefaultText(localizationIds, localeId);

    for (const locale of dbLookupLocales) {
      const text = textMap.get(locale.localized_name);
      result.set(locale.id, text ?? locale.name);
    }
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
 * Get the default text (form_other_other only) for specific localization IDs and a given locale.
 * Lightweight single-column fetch for display-name use cases.
 *
 * @param localizationIds - Array of localization IDs to fetch
 * @param localeId - The locale ID
 */
export async function getLocalizationDefaultText(
  localizationIds: number[],
  localeId: number
): Promise<Map<number, string | null>> {
  if (localizationIds.length === 0) {
    return new Map();
  }

  const defaultColumn = localeIdToColumns(localeId).default;

  // Column is constructed from localeIdToColumns — deterministic and safe.
  // Validate as defense-in-depth against SQL injection.
  if (!isLocaleFormColumn(defaultColumn)) {
    throw new Error(`Invalid locale column name: ${defaultColumn}`);
  }

  const placeholders = localizationIds.map((_, i) => db.placeholder(i + 1)).join(', ');
  const sql = `SELECT id, "${defaultColumn}" as text FROM "localizations" WHERE id IN (${placeholders})`;
  const rows = await bridge.query<{ id: number; text: string | null }>(sql, localizationIds);

  const textMap = new Map<number, string | null>();
  for (const row of rows) {
    textMap.set(row.id, row.text);
  }

  return textMap;
}

/**
 * Get all form data and metadata for specific localization IDs and a given locale.
 * Fetches only CLDR-relevant form columns plus metadata columns.
 *
 * @param localizationIds - Array of localization IDs to fetch
 * @param locale - The locale (needs .id and .name for CLDR lookup)
 */
export async function getLocalizationFormsForLocale(
  localizationIds: number[],
  locale: Locale,
): Promise<Map<number, LocalizationExportData>> {
  if (localizationIds.length === 0) {
    return new Map();
  }

  const columns = localeIdToColumns(locale.id);
  const requiredPlurals = getRequiredPluralCategories(locale.name);

  // Build the set of CLDR-relevant form columns
  const formColumns: { column: string; plural: PluralCategory; gender: GenderCategory }[] = [];
  for (const plural of requiredPlurals) {
    for (const gender of GENDER_CATEGORIES) {
      const col = columns.form(plural, gender);
      // Defense-in-depth: validate each column name
      if (!isLocaleFormColumn(col)) {
        throw new Error(`Invalid locale column name: ${col}`);
      }
      formColumns.push({ column: col, plural, gender });
    }
  }

  // Build SELECT with metadata + form columns
  const columnSelects = [
    'id',
    'name',
    'subject_actor',
    'subject_gender',
    'is_templated',
    ...formColumns.map((fc) => `"${fc.column}"`),
  ];

  const placeholders = localizationIds.map((_, i) => db.placeholder(i + 1)).join(', ');
  const sql = `SELECT ${columnSelects.join(', ')} FROM "localizations" WHERE id IN (${placeholders})`;
  const rows = await bridge.query<Record<string, unknown>>(sql, localizationIds);

  const result = new Map<number, LocalizationExportData>();
  for (const row of rows) {
    // Build sparse variants array — only non-null text values
    const variants: ExportTextVariant[] = [];
    for (const fc of formColumns) {
      const text = row[fc.column] as string | null;
      if (text !== null && text !== undefined) {
        variants.push({ plural: fc.plural, gender: fc.gender, text });
      }
    }

    result.set(row.id as number, {
      name: (row.name as string | null) ?? null,
      variants,
      subjectActorId: (row.subject_actor as number | null) ?? null,
      subjectGender: (row.subject_gender as string | null) ?? null,
      isTemplated: Boolean(row.is_templated),
    });
  }

  return result;
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
