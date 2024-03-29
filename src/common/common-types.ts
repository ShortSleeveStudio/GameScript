import type { DropdownItem } from 'carbon-components-svelte/types/Dropdown/Dropdown.svelte';
import type { ProgrammingLanguage, PropertyType, RoutineType, Table } from './common-schema';

/**Database Types */
export interface DatabaseType {
    id: number;
    name: string;
}
export const DATABASE_TYPE_SQLITE: DatabaseType = { id: 0, name: 'SQLite' };
export const DATABASE_TYPE_POSTGRES: DatabaseType = { id: 1, name: 'PostgreSQL' };
export const DATABASE_TYPES: DatabaseType[] = [
    DATABASE_TYPE_SQLITE,
    DATABASE_TYPE_POSTGRES,
] as const;
export type DatabaseTypeId = (typeof DATABASE_TYPES)[number]['id'];
export type DatabaseTypeName = (typeof DATABASE_TYPES)[number]['name'];
export const DATABASE_TYPE_DROPDOWN_ITEMS: DropdownItem[] = DATABASE_TYPES.map(
    (databaseType: DatabaseType) =>
        <DropdownItem>{
            id: databaseType.id,
            text: databaseType.name,
        },
);

/**Database Tables */
export const TABLE_TABLES: Table = { id: 0, name: 'tables' };
export const TABLE_AUTO_COMPLETES: Table = { id: 1, name: 'auto_completes' };
export const TABLE_PROGRAMMING_LANGUAGES: Table = {
    id: 2,
    name: 'programming_languages',
};
export const TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL: Table = {
    id: 3,
    name: 'programming_language_principal',
};
export const TABLE_ROUTINE_TYPES: Table = { id: 4, name: 'routine_types' };
export const TABLE_ROUTINES: Table = { id: 5, name: 'routines' };
export const TABLE_FILTERS: Table = { id: 6, name: 'filters' };
export const TABLE_CONVERSATIONS: Table = { id: 7, name: 'conversations' };
export const TABLE_LOCALES: Table = { id: 8, name: 'locales' };
export const TABLE_LOCALE_PRINCIPAL: Table = { id: 9, name: 'locale_principal' };
export const TABLE_LOCALIZATIONS: Table = { id: 10, name: 'localizations' };
export const TABLE_ACTORS: Table = { id: 11, name: 'actors' };
export const TABLE_ACTOR_PRINCIPAL: Table = { id: 12, name: 'actor_principal' };
export const TABLE_NODES: Table = { id: 13, name: 'nodes' };
export const TABLE_EDGES: Table = { id: 14, name: 'edges' };
export const TABLE_VERSION: Table = { id: 15, name: 'version' };
export const TABLE_NOTIFICATIONS: Table = { id: 16, name: 'notifications' };
export const TABLE_PROPERTY_TYPES: Table = { id: 17, name: 'property_types' };
export const TABLE_NODE_PROPERTY_TEMPLATES: Table = {
    id: 18,
    name: 'property_templates',
};
export const TABLE_NODE_PROPERTIES: Table = { id: 19, name: 'node_properties' };
export const DATABASE_TABLES: Table[] = [
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
    TABLE_NODE_PROPERTY_TEMPLATES,
    TABLE_NODE_PROPERTIES,
] as const;
export type DatabaseTableId = (typeof DATABASE_TABLES)[number]['id'];
export type DatabaseTableName = (typeof DATABASE_TABLES)[number]['name'];

/**Routine Types */
export const ROUTINE_TYPE_USER_CREATED = { id: 0, name: 'User' };
export const ROUTINE_TYPE_IMPORT = { id: 1, name: 'Import' };
export const ROUTINE_TYPE_DEFAULT = { id: 2, name: 'Default' };
export const ROUTINE_TYPES: RoutineType[] = [
    ROUTINE_TYPE_USER_CREATED,
    ROUTINE_TYPE_IMPORT,
    ROUTINE_TYPE_DEFAULT,
] as const;
export type RoutineTypeId = (typeof ROUTINE_TYPES)[number]['id'];
export type RoutineTypeName = (typeof ROUTINE_TYPES)[number]['name'];

/**Database Field Types */
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
] as const;
export type FieldTypeId = (typeof FIELD_TYPES)[number]['id'];
export type FieldTypeName = (typeof FIELD_TYPES)[number]['name'];

/**Programming Languages */
export const PROGRAMMING_LANGUAGE_CS: ProgrammingLanguage = { id: 0, name: 'C#' };
export const PROGRAMMING_LANGUAGE_CPP: ProgrammingLanguage = { id: 1, name: 'C++' };
export const PROGRAMMING_LANGUAGE_TYPES: ProgrammingLanguage[] = [
    PROGRAMMING_LANGUAGE_CS,
    PROGRAMMING_LANGUAGE_CPP,
] as const;
export type ProgrammingLanguageId = (typeof PROGRAMMING_LANGUAGE_TYPES)[number]['id'];
export type ProgrammingLanguageName = (typeof PROGRAMMING_LANGUAGE_TYPES)[number]['name'];
export const PROGRAMMING_LANGUAGE_DROPDOWN_ITEMS: DropdownItem[] = PROGRAMMING_LANGUAGE_TYPES.map(
    (languageType: ProgrammingLanguage) =>
        <DropdownItem>{
            id: languageType.id,
            text: languageType.name,
        },
);

/**Node Types */
export interface NodeType {
    id: number;
    name: string;
}
export const NODE_TYPE_ROOT: NodeType = { id: 0, name: 'root' };
export const NODE_TYPE_DIALOGUE: NodeType = { id: 1, name: 'dialogue' };
export const NODE_TYPES: NodeType[] = [NODE_TYPE_ROOT, NODE_TYPE_DIALOGUE] as const;
export type NodeTypeId = (typeof NODE_TYPES)[number]['id'];
export type NodeTypeName = (typeof NODE_TYPES)[number]['name'];

/**Edge Types */
export interface EdgeType {
    id: number;
    name: string;
}
export const EDGE_TYPE_DEFAULT: EdgeType = { id: 0, name: 'default' };
export const EDGE_TYPE_HIDDEN: EdgeType = { id: 1, name: 'hidden' };
export const EDGE_TYPES: EdgeType[] = [EDGE_TYPE_DEFAULT, EDGE_TYPE_HIDDEN] as const;
export type EdgeTypeId = (typeof EDGE_TYPES)[number]['id'];
export type EdgeTypeName = (typeof EDGE_TYPES)[number]['name'];
export const EDGE_TYPE_DROPDOWN_ITEMS: DropdownItem[] = EDGE_TYPES.map(
    (edgeType: EdgeType) =>
        <DropdownItem>{
            id: edgeType.name,
            text: edgeType.name.charAt(0).toUpperCase() + edgeType.name.slice(1),
        },
);

/**Build Localization Division */
export interface LocalizationDivisionType {
    id: number;
    name: string;
}
export const LOCALIZATION_DIVISION_SINGLE: LocalizationDivisionType = {
    id: 0,
    name: 'Single File',
};
export const LOCALIZATION_DIVISION_PER_CONVERSATION: LocalizationDivisionType = {
    id: 1,
    name: 'File Per Conversation',
};
export const LOCALIZATION_DIVISION_TYPES: LocalizationDivisionType[] = [
    LOCALIZATION_DIVISION_SINGLE,
    LOCALIZATION_DIVISION_PER_CONVERSATION,
] as const;
export type LocalizationDivisionTypeId = (typeof LOCALIZATION_DIVISION_TYPES)[number]['id'];
export type LocalizationDivisionTypeName = (typeof LOCALIZATION_DIVISION_TYPES)[number]['name'];
export const LOCALIZATION_DIVISION_DROPDOWN_ITEMS: DropdownItem[] = LOCALIZATION_DIVISION_TYPES.map(
    (divisionType: LocalizationDivisionType) =>
        <DropdownItem>{
            id: divisionType.id,
            text: divisionType.name,
        },
);

/**Build Localization Format */
export interface LocalizationFormatType {
    id: number;
    name: string;
}
export const LOCALIZATION_FORMAT_CSV: LocalizationFormatType = { id: 0, name: 'CSV' };
export const LOCALIZATION_FORMAT_JSON: LocalizationFormatType = { id: 1, name: 'JSON' };
export const LOCALIZATION_FORMAT_TYPES: LocalizationFormatType[] = [
    LOCALIZATION_FORMAT_CSV,
    LOCALIZATION_FORMAT_JSON,
] as const;
export type LocalizationFormatTypeId = (typeof LOCALIZATION_FORMAT_TYPES)[number]['id'];
export type LocalizationFormatTypeName = (typeof LOCALIZATION_FORMAT_TYPES)[number]['name'];
export const LOCALIZATION_FORMAT_DROPDOWN_ITEMS: DropdownItem[] = LOCALIZATION_FORMAT_TYPES.map(
    (formatType: LocalizationFormatType) =>
        <DropdownItem>{
            id: formatType.id,
            text: formatType.name,
        },
);

/**Db Operation Type */
export interface DbOpType {
    id: number;
    name: string;
}
export const DB_OP_CREATE: OpTypeId = 0;
export const DB_OP_DELETE: OpTypeId = 1;
export const DB_OP_UPDATE: OpTypeId = 2;
export const DB_OP_ALTER: OpTypeId = 3;
export const DB_OPS: number[] = [DB_OP_CREATE, DB_OP_DELETE, DB_OP_UPDATE, DB_OP_ALTER] as const;
export type OpTypeId = (typeof DB_OPS)[number];

/**Property Types */
export const PROPERTY_TYPE_STRING: PropertyType = { id: 0, name: 'String' };
export const PROPERTY_TYPE_INTEGER: PropertyType = { id: 1, name: 'Integer' };
export const PROPERTY_TYPE_DECIMAL: PropertyType = { id: 2, name: 'Decimal' };
export const PROPERTY_TYPE_BOOLEAN: PropertyType = { id: 3, name: 'Boolean' };
export const PROPERTY_TYPE_EMPTY: PropertyType = { id: 4, name: 'Empty' };
export const PROPERTY_TYPES: PropertyType[] = [
    PROPERTY_TYPE_STRING,
    PROPERTY_TYPE_INTEGER,
    PROPERTY_TYPE_DECIMAL,
    PROPERTY_TYPE_BOOLEAN,
    PROPERTY_TYPE_EMPTY,
] as const;
export type PropertyTypeId = (typeof PROPERTY_TYPES)[number]['id'];
export type PropertyTypeName = (typeof PROPERTY_TYPES)[number]['name'];
export const PROPERTY_TYPE_DROPDOWN_ITEMS: DropdownItem[] = PROPERTY_TYPES.map(
    (propertyType: PropertyType) =>
        <DropdownItem>{
            id: propertyType.id,
            text: propertyType.name,
        },
);
