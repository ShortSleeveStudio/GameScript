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

// Core tables with IDs matching the Electron app
export const TABLE_TABLES: TableRef = { id: 0, name: 'tables' };
export const TABLE_AUTO_COMPLETES: TableRef = { id: 1, name: 'auto_completes' };
export const TABLE_PROGRAMMING_LANGUAGES: TableRef = { id: 2, name: 'programming_languages' };
export const TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL: TableRef = { id: 3, name: 'programming_language_principal' };
export const TABLE_ROUTINE_TYPES: TableRef = { id: 4, name: 'routine_types' };
export const TABLE_ROUTINES: TableRef = { id: 5, name: 'routines' };
export const TABLE_FILTERS: TableRef = { id: 6, name: 'filters' };
export const TABLE_CONVERSATIONS: TableRef = { id: 7, name: 'conversations' };
export const TABLE_LOCALES: TableRef = { id: 8, name: 'locales' };
export const TABLE_LOCALE_PRINCIPAL: TableRef = { id: 9, name: 'locale_principal' };
export const TABLE_LOCALIZATIONS: TableRef = { id: 10, name: 'localizations' };
export const TABLE_ACTORS: TableRef = { id: 11, name: 'actors' };
export const TABLE_ACTOR_PRINCIPAL: TableRef = { id: 12, name: 'actor_principal' };
export const TABLE_NODES: TableRef = { id: 13, name: 'nodes' };
export const TABLE_EDGES: TableRef = { id: 14, name: 'edges' };
export const TABLE_VERSION: TableRef = { id: 15, name: 'version' };
export const TABLE_NOTIFICATIONS: TableRef = { id: 16, name: 'notifications' };
export const TABLE_PROPERTY_TYPES: TableRef = { id: 17, name: 'property_types' };
export const TABLE_PROPERTY_TEMPLATES: TableRef = { id: 18, name: 'property_templates' };
export const TABLE_NODE_PROPERTIES: TableRef = { id: 19, name: 'node_properties' };
export const TABLE_CODE_OUTPUT_FOLDER: TableRef = { id: 20, name: 'code_output_folder' };

export const DATABASE_TABLES: TableRef[] = [
  TABLE_TABLES,
  TABLE_AUTO_COMPLETES,
  TABLE_PROGRAMMING_LANGUAGES,
  TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
  TABLE_ROUTINE_TYPES,
  TABLE_ROUTINES,
  TABLE_FILTERS,
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

export const NODE_TYPE_ROOT: NodeType = { id: 0, name: 'root' };
export const NODE_TYPE_DIALOGUE: NodeType = { id: 1, name: 'dialogue' };
export const NODE_TYPES: NodeType[] = [NODE_TYPE_ROOT, NODE_TYPE_DIALOGUE];

// Edge types
export interface EdgeType {
  id: number;
  name: string;
}

export const EDGE_TYPE_DEFAULT: EdgeType = { id: 0, name: 'default' };
export const EDGE_TYPE_HIDDEN: EdgeType = { id: 1, name: 'hidden' };
export const EDGE_TYPES: EdgeType[] = [EDGE_TYPE_DEFAULT, EDGE_TYPE_HIDDEN];

// Property types
export interface PropertyTypeRef {
  id: number;
  name: string;
}

export const PROPERTY_TYPE_STRING: PropertyTypeRef = { id: 0, name: 'String' };
export const PROPERTY_TYPE_INTEGER: PropertyTypeRef = { id: 1, name: 'Integer' };
export const PROPERTY_TYPE_DECIMAL: PropertyTypeRef = { id: 2, name: 'Decimal' };
export const PROPERTY_TYPE_BOOLEAN: PropertyTypeRef = { id: 3, name: 'Boolean' };
export const PROPERTY_TYPE_EMPTY: PropertyTypeRef = { id: 4, name: 'Empty' };

export const PROPERTY_TYPES: PropertyTypeRef[] = [
  PROPERTY_TYPE_STRING,
  PROPERTY_TYPE_INTEGER,
  PROPERTY_TYPE_DECIMAL,
  PROPERTY_TYPE_BOOLEAN,
  PROPERTY_TYPE_EMPTY,
];

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

// Default entity IDs (created during schema initialization)
export const DB_DEFAULT_LOCALE_ID = 1; // English
export const DB_DEFAULT_ACTOR_ID = 1; // Narrator
