// Table schema definitions

import {
  TABLE_TABLES,
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
  TABLE_SNAPSHOT_OUTPUT_PATH,
  TABLE_CODE_TEMPLATE,
  TABLE_CONVERSATION_TAG_CATEGORIES,
  TABLE_CONVERSATION_TAG_VALUES,
  TABLE_LOCALIZATION_TAG_CATEGORIES,
  TABLE_LOCALIZATION_TAG_VALUES,
} from '../types/constants.js';

export interface ColumnDefinition {
  name: string;
  type: 'INTEGER' | 'TEXT' | 'REAL' | 'BOOLEAN' | 'TIMESTAMP';
  primaryKey?: boolean;
  autoIncrement?: boolean;
  notNull?: boolean;
  unique?: boolean;
  defaultValue?: string | number | boolean | null;
  references?: {
    table: string;
    column: string;
  };
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  uniqueConstraints?: string[][];
}

// Core tables
export const conversationsTable: TableDefinition = {
  name: TABLE_CONVERSATIONS.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'is_deleted', type: 'BOOLEAN', notNull: true, defaultValue: false },
    { name: 'is_system_created', type: 'BOOLEAN', notNull: true, defaultValue: false },
    { name: 'is_layout_auto', type: 'BOOLEAN', notNull: true, defaultValue: true },
    { name: 'is_layout_vertical', type: 'BOOLEAN', notNull: true, defaultValue: false },
    { name: 'notes', type: 'TEXT' },
  ],
};

export const nodesTable: TableDefinition = {
  name: TABLE_NODES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'parent', type: 'INTEGER', notNull: true, references: { table: 'conversations', column: 'id' } },
    { name: 'type', type: 'TEXT', notNull: true, defaultValue: 'dialogue' },
    { name: 'actor', type: 'INTEGER', notNull: true, references: { table: 'actors', column: 'id' } },
    { name: 'voice_text', type: 'INTEGER', references: { table: 'localizations', column: 'id' } },
    { name: 'ui_response_text', type: 'INTEGER', references: { table: 'localizations', column: 'id' } },
    { name: 'has_condition', type: 'BOOLEAN', notNull: true, defaultValue: false },
    { name: 'has_action', type: 'BOOLEAN', notNull: true, defaultValue: false },
    { name: 'is_prevent_response', type: 'BOOLEAN', notNull: true, defaultValue: false },
    { name: 'position_x', type: 'REAL', notNull: true, defaultValue: 0 },
    { name: 'position_y', type: 'REAL', notNull: true, defaultValue: 0 },
    { name: 'notes', type: 'TEXT' },
    { name: 'is_system_created', type: 'BOOLEAN', notNull: true, defaultValue: false },
  ],
};

export const edgesTable: TableDefinition = {
  name: TABLE_EDGES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'parent', type: 'INTEGER', notNull: true, references: { table: 'conversations', column: 'id' } },
    { name: 'priority', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'type', type: 'TEXT', notNull: true, defaultValue: 'default' },
    { name: 'source', type: 'INTEGER', notNull: true, references: { table: 'nodes', column: 'id' } },
    { name: 'target', type: 'INTEGER', notNull: true, references: { table: 'nodes', column: 'id' } },
    { name: 'notes', type: 'TEXT' },
  ],
  uniqueConstraints: [['parent', 'source', 'target']],
};

export const actorsTable: TableDefinition = {
  name: TABLE_ACTORS.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'localized_name', type: 'INTEGER', notNull: true, references: { table: 'localizations', column: 'id' } },
    { name: 'color', type: 'TEXT', notNull: true, defaultValue: '#808080' },
    { name: 'is_system_created', type: 'BOOLEAN', notNull: true, defaultValue: false },
    { name: 'notes', type: 'TEXT' },
  ],
};

export const actorPrincipalTable: TableDefinition = {
  name: TABLE_ACTOR_PRINCIPAL.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'principal', type: 'INTEGER', notNull: true, references: { table: 'actors', column: 'id' } },
  ],
};

export const localesTable: TableDefinition = {
  name: TABLE_LOCALES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'localized_name', type: 'INTEGER', notNull: true, references: { table: 'localizations', column: 'id' } },
    { name: 'is_system_created', type: 'BOOLEAN', notNull: true, defaultValue: false },
  ],
};

export const localePrincipalTable: TableDefinition = {
  name: TABLE_LOCALE_PRINCIPAL.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'principal', type: 'INTEGER', notNull: true, references: { table: 'locales', column: 'id' } },
  ],
};

export const localizationsTable: TableDefinition = {
  name: TABLE_LOCALIZATIONS.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'parent', type: 'INTEGER', references: { table: 'conversations', column: 'id' } },
    { name: 'name', type: 'TEXT' },
    { name: 'is_system_created', type: 'BOOLEAN', notNull: true, defaultValue: false },
    // Note: locale_N columns are added dynamically
  ],
};

export const nodePropertiesTable: TableDefinition = {
  name: TABLE_NODE_PROPERTIES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'parent', type: 'INTEGER', notNull: true, references: { table: 'nodes', column: 'id' } },
    { name: 'template', type: 'INTEGER', notNull: true, references: { table: 'property_templates', column: 'id' } },
    { name: 'value_string', type: 'TEXT' },
    { name: 'value_integer', type: 'INTEGER' },
    { name: 'value_decimal', type: 'REAL' },
    { name: 'value_boolean', type: 'BOOLEAN' },
  ],
};

export const propertyTemplatesTable: TableDefinition = {
  name: TABLE_PROPERTY_TEMPLATES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'parent', type: 'INTEGER', notNull: true }, // FK Table (tables not implemented yet in v2)
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'type', type: 'INTEGER', notNull: true, references: { table: 'property_types', column: 'id' } },
  ],
};

export const notificationsTable: TableDefinition = {
  name: TABLE_NOTIFICATIONS.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'timestamp', type: 'INTEGER' },
    { name: 'table_id', type: 'INTEGER' },
    { name: 'operation_id', type: 'INTEGER' },
    { name: 'json_payload', type: 'TEXT' },
  ],
};

// Property types lookup table
export const propertyTypesTable: TableDefinition = {
  name: TABLE_PROPERTY_TYPES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'TEXT', notNull: true },
  ],
};

// Tables metadata table
export const tablesTable: TableDefinition = {
  name: TABLE_TABLES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'name', type: 'TEXT', notNull: true },
  ],
};

// Version table for schema migrations
export const versionTable: TableDefinition = {
  name: TABLE_VERSION.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'version', type: 'TEXT', notNull: true },
    { name: 'applied_at', type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
  ],
};

// Code output folder setting (singleton table, single row with id = 1)
export const codeOutputFolderTable: TableDefinition = {
  name: TABLE_CODE_OUTPUT_FOLDER.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'value', type: 'TEXT' },
  ],
};

// Snapshot output path setting (singleton table, single row with id = 1)
export const snapshotOutputPathTable: TableDefinition = {
  name: TABLE_SNAPSHOT_OUTPUT_PATH.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'value', type: 'TEXT' },
  ],
};

// Code template setting (singleton table, single row with id = 1)
// Stores 'unity' | 'godot' | 'unreal'
export const codeTemplateTable: TableDefinition = {
  name: TABLE_CODE_TEMPLATE.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'value', type: 'TEXT' },
  ],
};

// Conversation tag tables
export const conversationTagCategoriesTable: TableDefinition = {
  name: TABLE_CONVERSATION_TAG_CATEGORIES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'name', type: 'TEXT', notNull: true },
  ],
};

export const conversationTagValuesTable: TableDefinition = {
  name: TABLE_CONVERSATION_TAG_VALUES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'category_id', type: 'INTEGER', notNull: true, references: { table: 'conversation_tag_categories', column: 'id' } },
    { name: 'name', type: 'TEXT', notNull: true },
  ],
};

// Localization tag tables
export const localizationTagCategoriesTable: TableDefinition = {
  name: TABLE_LOCALIZATION_TAG_CATEGORIES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'name', type: 'TEXT', notNull: true },
  ],
};

export const localizationTagValuesTable: TableDefinition = {
  name: TABLE_LOCALIZATION_TAG_VALUES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'category_id', type: 'INTEGER', notNull: true, references: { table: 'localization_tag_categories', column: 'id' } },
    { name: 'name', type: 'TEXT', notNull: true },
  ],
};

// All tables in dependency order
export const allTables: TableDefinition[] = [
  tablesTable,
  versionTable,
  propertyTypesTable,
  localesTable,
  localePrincipalTable,
  conversationTagCategoriesTable,
  conversationTagValuesTable,
  conversationsTable,
  localizationTagCategoriesTable,
  localizationTagValuesTable,
  localizationsTable,
  actorsTable,
  actorPrincipalTable,
  propertyTemplatesTable,
  nodesTable,
  edgesTable,
  nodePropertiesTable,
  notificationsTable,
  codeOutputFolderTable,
  snapshotOutputPathTable,
  codeTemplateTable,
];
