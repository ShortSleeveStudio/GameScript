///
/// Helpers
///
import type { DropdownItem } from 'carbon-components-svelte/src/Dropdown/Dropdown.svelte';

function TypeNameToType<T, R>(name: T, index: number): R {
    return <R>{ id: index, name: name };
}

///
/// Databases
///
/**List of supported databases */
export const DATABASE_TYPE_NAMES = ['SQLite', 'PostgreSQL'] as const;

/**Database name type */
export type DatabaseTypeName = (typeof DATABASE_TYPE_NAMES)[number];

/**Database type name type */
export interface DatabaseType {
    id: number;
    name: DatabaseTypeName;
}

/**List of supported field types */
export const DATABASE_TYPES: DatabaseType[] = DATABASE_TYPE_NAMES.map<DatabaseType>(
    TypeNameToType<DatabaseTypeName, DatabaseType>,
);

///
/// Tables
///
/**List of tables */
export const TABLE_NAME_NODES = 'nodes';
export const TABLE_NAME_FIELDS = 'fields';
export const TABLE_NAME_NODE_TYPES = 'node_types';
export const TABLE_NAME_FIELD_TYPES = 'field_types';
export const TABLE_NAME_DEFAULT_FIELDS = 'default_fields';
export const TABLE_NAME_NODE_CONTAINERS = 'node_containers';
export const TABLE_NAME_PROGRAMMING_LANGUAGES = 'programming_languages';
export const TABLE_NAME_SELECTED_PROGRAMMING_LANGUAGE = 'selected_programming_language';
export const DATABASE_TABLE_NAMES = [
    TABLE_NAME_NODES,
    TABLE_NAME_FIELDS,
    TABLE_NAME_NODE_TYPES,
    TABLE_NAME_FIELD_TYPES,
    TABLE_NAME_DEFAULT_FIELDS,
    TABLE_NAME_NODE_CONTAINERS,
    TABLE_NAME_PROGRAMMING_LANGUAGES,
    TABLE_NAME_SELECTED_PROGRAMMING_LANGUAGE,
] as const;

/**Database name type */
export type DatabaseTableName = (typeof DATABASE_TABLE_NAMES)[number];

///
/// Rows
///
export interface Row {
    // This is ignored during serialization for inserts/updates
    id: number;
}

///
/// Node Type
///
export interface NodeTypeRow extends Row {
    name: NodeTypeName;
}

/**Node type names */
export const NODE_TYPE_NAMES = [
    'Actor', // 0
    'Conversation', // 1
    'Routine', // 2
    'Localization', // 3
] as const;
export const ACTOR_NODE_TYPE_ID = 0;
export const CONVERSATION_NODE_TYPE_ID = 1;
export const ROUTINE_NODE_TYPE_ID = 2;
export const LOCALIZATION_NODE_TYPE_ID = 3;

/**List of supported field types */
export const NODE_TYPES: NodeTypeRow[] = NODE_TYPE_NAMES.map<NodeTypeRow>(
    TypeNameToType<NodeTypeName, NodeTypeRow>,
);

/**Node type id type */
export type NodeTypeId = (typeof NODE_TYPES)[number]['id'];

/**Node type name type */
export type NodeTypeName = (typeof NODE_TYPE_NAMES)[number];

///
/// Field Types
///
export interface FieldTypeRow extends Row {
    name: FieldTypeName;
}

/**Field type name type */
export const FIELD_TYPE_NAMES = [
    'Actor', // 0
    'Boolean', // 1
    'Code', // 2
    'Color', // 3
    'Decimal', // 4
    'Integer', // 5
    'Localized Text', // 6
    'Text', // 7
] as const;
export const ACTOR_FIELD_TYPE_ID = 0;
export const BOOLEAN_FIELD_TYPE_ID = 1;
export const CODE_FIELD_TYPE_ID = 2;
export const COLOR_FIELD_TYPE_ID = 3;
export const DECIMAL_FIELD_TYPE_ID = 4;
export const INTEGER_FIELD_TYPE_ID = 5;
export const LOCALIZED_FIELD_TYPE_ID = 6;
export const TEXT_FIELD_TYPE_ID = 7;

/**List of supported field types */
export const FIELD_TYPES: FieldTypeRow[] = FIELD_TYPE_NAMES.map<FieldTypeRow>(
    TypeNameToType<FieldTypeName, FieldTypeRow>,
);

/**Field type name type */
export type FieldTypeName = (typeof FIELD_TYPE_NAMES)[number];

/**Field type id type */
export type FieldTypeId = (typeof FIELD_TYPES)[number]['id'];

/**Dropdown items for field types */
export const FIELD_TYPE_DROP_DOWN_ITEMS: DropdownItem[] = FIELD_TYPES.map(
    (fieldType: FieldTypeRow) =>
        <DropdownItem>{
            id: fieldType.id,
            text: fieldType.name,
        },
);

// ADD to Default Fields
// - default localization
// - default actor
// - default conversation
// - default routines

// ADD to Node COntainer
// - default localization
// - default actor

// locales is just another part of default fields table

///
/// Node Container
///  - Actors
///  - Conversations
///  - Routines
///  - Localizations
///
/// Constraints
///  - Unique(containerParent, name, nodeType)
export interface NodeContainerRow extends Row {
    containerParent: number; // FK NodeContainers
    isFolder: boolean;
    nodeType: NodeTypeId; // FK NodeTypes
    name: string;
}

///
/// Nodes
///
export interface NodeRow extends Row {
    containerParent: number; // FK NodeContainers
    type: NodeTypeId; // FK Node Types
}

///
/// Fields
///
/// Constraints
///  - Unique(nodeParent, name, type)
export interface FieldRow extends Row {
    nodeParent: number;
    name: string;
    isDefault: boolean; // Used for all node types (eg. adding arbitrary field to actor)
    type: FieldTypeId;
    // The following fields will only be conditionally populated
    actor: number; // FK NodeContainers
    bool: boolean;
    code: number; // FK Nodes
    color: string;
    decimal: number;
    integer: number;
    localizedText: number; // FK Nodes
    text: string;
}

///
/// Default Fields
///
export interface DefaultFieldRow extends Row {
    name: string;
    fieldType: number;
    nodeType: number;
    required: boolean;
}

///
/// Programming Language
///
export const PROGRAMMING_LANGUAGE_NAMES = [
    'C#', // 0
    'C++', // 1
] as const;
export const PROGRAMMING_LANGUAGE_ID_CS = 0;
export const PROGRAMMING_LANGUAGE_ID_CPP = 1;

/**Proramming language name type */
export type ProgrammingLanguageName = (typeof PROGRAMMING_LANGUAGE_NAMES)[number];

/**Dropdowns to select programming lanugage */
export const PROGRAMMING_LANGUAGE_DROP_DOWN_ITEMS: DropdownItem[] = PROGRAMMING_LANGUAGE_NAMES.map(
    (languageName: string, index: number) =>
        <DropdownItem>{
            id: index,
            text: languageName,
        },
);

/**Programming language row */
export interface ProgrammingLanguageRow extends Row {
    name: string;
    selected: boolean;
}

///
/// Selected Programming Language
///
export interface SelectedProgrammingLanguageRow extends Row {
    languageId: number;
}
