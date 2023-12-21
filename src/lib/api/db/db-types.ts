///
/// Helpers

import type { DropdownItem } from 'carbon-components-svelte/src/Dropdown/Dropdown.svelte';

///
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
export const DATABASE_TABLE_NAMES = [
    'conversations',
    'default_fields',
    'field_types',
    'fields',
    'node_types',
    'nodes',
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
/// Fields
///
/**Field type name type */
export const FIELD_TYPE_NAMES = [
    'Actor', // 0
    'Boolean', // 1
    'Code', // 2
    'Color', // 3
    'Localized Text', // 4
    'Number', // 5
    'String', // 6
] as const;
export const ACTOR_FIELD_TYPE_ID = 0;
export const BOOLEAN_FIELD_TYPE_ID = 1;
export const CODE_FIELD_TYPE_ID = 2;
export const COLOR_FIELD_TYPE_ID = 3;
export const LOCALIZED_FIELD_TYPE_ID = 4;
export const NUMBER_FIELD_TYPE_ID = 5;
export const STRING_FIELD_TYPE_ID = 6;

/**Field type name type */
export type FieldTypeName = (typeof FIELD_TYPE_NAMES)[number];

/**Field type */
export interface FieldType {
    id: number;
    name: FieldTypeName;
}

/**List of supported field types */
export const FIELD_TYPES: FieldType[] = FIELD_TYPE_NAMES.map<FieldType>(
    TypeNameToType<FieldTypeName, FieldType>,
);

/**Dropdown items for field types */
export const FIELD_TYPE_DROP_DOWN_ITEMS: DropdownItem[] = FIELD_TYPES.map(
    (fieldType: FieldType) =>
        <DropdownItem>{
            id: fieldType.id,
            text: fieldType.name,
        },
);

///
/// Nodes
///
/**List of supported node types */
export const NODE_TYPE_NAMES = [
    'Actor', // 0
    'Conversation', // 1
] as const;
export const ACTOR_NODE_TYPE_ID = 0;
export const CONVERSATION_NODE_TYPE_ID = 1;

/**Node type name type */
export type NodeTypeName = (typeof NODE_TYPE_NAMES)[number];

/**Node type */
export interface NodeType {
    id: number;
    name: NodeTypeName;
}

/**List of supported field types */
export const NODE_TYPES: NodeType[] = NODE_TYPE_NAMES.map<NodeType>(
    TypeNameToType<NodeTypeName, NodeType>,
);

///
/// Default Fields
///
export interface DefaultFieldRow extends Row {
    name: string;
    fieldType: number;
    nodeType: number;
    required: boolean;
}
