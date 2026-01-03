// Constants extracted from GameScriptElectron

// Field types for database columns
export interface FieldType {
  id: number;
  name: string;
}

export const FIELD_TYPE_DECIMAL: FieldType = { id: 0, name: 'Decimal' };
export const FIELD_TYPE_INTEGER: FieldType = { id: 1, name: 'Integer' };
export const FIELD_TYPE_TEXT: FieldType = { id: 2, name: 'Text' };
export const FIELD_TYPE_BOOLEAN: FieldType = { id: 3, name: 'Boolean' };
export const FIELD_TYPE_LONG: FieldType = { id: 4, name: 'Long' };

export const FIELD_TYPES: FieldType[] = [
  FIELD_TYPE_DECIMAL,
  FIELD_TYPE_INTEGER,
  FIELD_TYPE_TEXT,
  FIELD_TYPE_BOOLEAN,
  FIELD_TYPE_LONG,
];

export type FieldTypeId = (typeof FIELD_TYPES)[number]['id'];

// Table identifiers (matching GameScriptElectron common-types.ts)
export interface TableRef {
  id: number;
  name: string;
}

// Core tables
export const TABLE_TABLES: TableRef = { id: 0, name: 'tables' };
export const TABLE_AUTO_COMPLETES: TableRef = { id: 1, name: 'auto_completes' };
export const TABLE_PROGRAMMING_LANGUAGES: TableRef = { id: 2, name: 'programming_languages' };
export const TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL: TableRef = { id: 3, name: 'programming_language_principal' };
export const TABLE_ROUTINE_TYPES: TableRef = { id: 4, name: 'routine_types' };
export const TABLE_ROUTINES: TableRef = { id: 5, name: 'routines' };
export const TABLE_CONVERSATIONS: TableRef = { id: 6, name: 'conversations' };
export const TABLE_LOCALES: TableRef = { id: 7, name: 'locales' };
export const TABLE_LOCALE_PRINCIPAL: TableRef = { id: 8, name: 'locale_principal' };
export const TABLE_LOCALIZATIONS: TableRef = { id: 9, name: 'localizations' };
export const TABLE_ACTORS: TableRef = { id: 10, name: 'actors' };
export const TABLE_ACTOR_PRINCIPAL: TableRef = { id: 11, name: 'actor_principal' };
export const TABLE_NODES: TableRef = { id: 12, name: 'nodes' };
export const TABLE_EDGES: TableRef = { id: 13, name: 'edges' };
export const TABLE_VERSION: TableRef = { id: 14, name: 'version' };
export const TABLE_NOTIFICATIONS: TableRef = { id: 15, name: 'notifications' };
export const TABLE_PROPERTY_TYPES: TableRef = { id: 16, name: 'property_types' };
export const TABLE_PROPERTY_TEMPLATES: TableRef = { id: 17, name: 'property_templates' };
export const TABLE_NODE_PROPERTIES: TableRef = { id: 18, name: 'node_properties' };
export const TABLE_CODE_OUTPUT_FOLDER: TableRef = { id: 19, name: 'code_output_folder' };

// Conversation tags
export const TABLE_CONVERSATION_TAG_CATEGORIES: TableRef = { id: 20, name: 'conversation_tag_categories' };
export const TABLE_CONVERSATION_TAG_VALUES: TableRef = { id: 21, name: 'conversation_tag_values' };

// Localization tags
export const TABLE_LOCALIZATION_TAG_CATEGORIES: TableRef = { id: 22, name: 'localization_tag_categories' };
export const TABLE_LOCALIZATION_TAG_VALUES: TableRef = { id: 23, name: 'localization_tag_values' };

// Settings tables
export const TABLE_SNAPSHOT_OUTPUT_PATH: TableRef = { id: 24, name: 'snapshot_output_path' };
export const TABLE_CODE_TEMPLATE: TableRef = { id: 25, name: 'code_template' };

export const DATABASE_TABLES: TableRef[] = [
  TABLE_TABLES,
  TABLE_AUTO_COMPLETES,
  TABLE_PROGRAMMING_LANGUAGES,
  TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
  TABLE_ROUTINE_TYPES,
  TABLE_ROUTINES,
  TABLE_CONVERSATIONS,
  TABLE_LOCALES,
  TABLE_LOCALE_PRINCIPAL,
  TABLE_LOCALIZATIONS,
  TABLE_ACTORS,
  TABLE_ACTOR_PRINCIPAL,
  TABLE_NODES,
  TABLE_EDGES,
  TABLE_VERSION,
  TABLE_NOTIFICATIONS,
  TABLE_PROPERTY_TYPES,
  TABLE_PROPERTY_TEMPLATES,
  TABLE_NODE_PROPERTIES,
  TABLE_CODE_OUTPUT_FOLDER,
  TABLE_CONVERSATION_TAG_CATEGORIES,
  TABLE_CONVERSATION_TAG_VALUES,
  TABLE_LOCALIZATION_TAG_CATEGORIES,
  TABLE_LOCALIZATION_TAG_VALUES,
  TABLE_SNAPSHOT_OUTPUT_PATH,
  TABLE_CODE_TEMPLATE,
];

/** Set of known table names for efficient validation (e.g., SQL injection prevention) */
export const KNOWN_TABLE_NAMES: ReadonlySet<string> = new Set(DATABASE_TABLES.map((t) => t.name));

/** Check if a table name is valid/known */
export function isKnownTableName(name: string): boolean {
  return KNOWN_TABLE_NAMES.has(name);
}

/**
 * Get table reference by name.
 */
export function getTableByName(name: string): TableRef | undefined {
  return DATABASE_TABLES.find((t) => t.name === name);
}

/**
 * Get table reference by id.
 */
export function getTableById(id: number): TableRef | undefined {
  return DATABASE_TABLES[id];
}

// Node types
export interface NodeType {
  id: number;
  name: string;
}

export const NODE_TYPE_ROOT = { id: 0, name: 'root' } as const;
export const NODE_TYPE_DIALOGUE = { id: 1, name: 'dialogue' } as const;
export const NODE_TYPES = [NODE_TYPE_ROOT, NODE_TYPE_DIALOGUE] as const;

/** String literal type for node types (e.g., 'root' | 'dialogue') */
export type NodeTypeName = (typeof NODE_TYPES)[number]['name'];

// Edge types
export interface EdgeType {
  id: number;
  name: string;
}

export const EDGE_TYPE_DEFAULT = { id: 0, name: 'default' } as const;
export const EDGE_TYPE_HIDDEN = { id: 1, name: 'hidden' } as const;
export const EDGE_TYPES = [EDGE_TYPE_DEFAULT, EDGE_TYPE_HIDDEN] as const;

/** String literal type for edge types (e.g., 'default' | 'hidden') */
export type EdgeTypeName = (typeof EDGE_TYPES)[number]['name'];

// Property types
export interface PropertyTypeRef {
  id: number;
  name: string;
}

export const PROPERTY_TYPE_STRING = { id: 1, name: 'String' } as const;
export const PROPERTY_TYPE_INTEGER = { id: 2, name: 'Integer' } as const;
export const PROPERTY_TYPE_DECIMAL = { id: 3, name: 'Decimal' } as const;
export const PROPERTY_TYPE_BOOLEAN = { id: 4, name: 'Boolean' } as const;

export const PROPERTY_TYPES = [
  PROPERTY_TYPE_STRING,
  PROPERTY_TYPE_INTEGER,
  PROPERTY_TYPE_DECIMAL,
  PROPERTY_TYPE_BOOLEAN,
] as const;

/** String literal type for property types used in export (lowercase for FlatBuffers compatibility) */
export type ExportPropertyTypeName = 'string' | 'integer' | 'decimal' | 'boolean';

// Localization export options
export interface LocalizationDivisionType {
  id: number;
  name: string;
}

export const LOCALIZATION_DIVISION_SINGLE: LocalizationDivisionType = { id: 0, name: 'Single File' };
export const LOCALIZATION_DIVISION_PER_CONVERSATION: LocalizationDivisionType = { id: 1, name: 'File Per Conversation' };
export const LOCALIZATION_DIVISION_TYPES: LocalizationDivisionType[] = [
  LOCALIZATION_DIVISION_SINGLE,
  LOCALIZATION_DIVISION_PER_CONVERSATION,
];

export interface LocalizationFormatType {
  id: number;
  name: string;
}

export const LOCALIZATION_FORMAT_CSV: LocalizationFormatType = { id: 0, name: 'CSV' };
export const LOCALIZATION_FORMAT_JSON: LocalizationFormatType = { id: 1, name: 'JSON' };
export const LOCALIZATION_FORMAT_TYPES: LocalizationFormatType[] = [
  LOCALIZATION_FORMAT_CSV,
  LOCALIZATION_FORMAT_JSON,
];

// Locale helper functions
export function localeIdToColumn(localeId: number): string {
  return `locale_${localeId}`;
}

export function localeColumnToId(column: string): number | null {
  const match = column.match(/^locale_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export function isLocaleColumn(column: string): boolean {
  return /^locale_\d+$/.test(column);
}

// Tag category helper functions
export function tagCategoryIdToColumn(categoryId: number): string {
  return `tag_category_${categoryId}`;
}

export function tagCategoryColumnToId(column: string): number | null {
  const match = column.match(/^tag_category_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export function isTagCategoryColumn(column: string): boolean {
  return /^tag_category_\d+$/.test(column);
}

// Default entity IDs (created during schema initialization)
export const DB_DEFAULT_LOCALE_ID = 1; // English
export const DB_DEFAULT_ACTOR_ID = 1; // Narrator
