import { TypeNameToType } from '@lib/utility/type-helpers';
import type { DropdownItem } from 'carbon-components-svelte/src/Dropdown/Dropdown.svelte';

///
/// Tables
///
export const TABLE_NAME_NODE_TYPES = 'node_types';
export const TABLE_NAME_FIELD_TYPES = 'field_types';
export const TABLE_NAME_NODES = 'nodes';
export const TABLE_NAME_FIELDS = 'fields';
export const DATABASE_TABLE_NAMES = [
    TABLE_NAME_NODE_TYPES,
    TABLE_NAME_FIELD_TYPES,
    TABLE_NAME_NODES,
    TABLE_NAME_FIELDS,
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
/// Programming Language Types
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
    (languageName: string) =>
        <DropdownItem>{
            id: languageName,
            text: languageName,
        },
);

///
/// Node Types
///
export interface NodeTypeRow extends Row {
    name: NodeTypeName;
}

/**Node type names */
export const NODE_TYPE_NAMES = [
    'Actor',
    'Auto-Complete',
    'Conversation',
    'Default Field',
    'Dialogue',
    'Locale',
    'Localization Table',
    'Localization',
    'Programming Language',
    'Routine',
] as const;
export const NODE_TYPE_ID_ACTOR = 0;
export const NODE_TYPE_ID_AUTO_COMPLETE = 1;
export const NODE_TYPE_ID_CONVERSATION = 2;
export const NODE_TYPE_ID_DEFAULT_FIELD = 3;
export const NODE_TYPE_ID_DIALOGUE = 4;
export const NODE_TYPE_ID_LOCALE = 5;
export const NODE_TYPE_ID_LOCALIZATION_TABLE = 6;
export const NODE_TYPE_ID_LOCALIZATION = 7;
export const NODE_TYPE_ID_PROGRAMMING_LANGUAGE = 8;
export const NODE_TYPE_ID_ROUTINE = 9;

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
export const FIELD_TYPE_ID_ACTOR: FieldTypeId = 0;
export const FIELD_TYPE_ID_BOOLEAN: FieldTypeId = 1;
export const FIELD_TYPE_ID_CODE: FieldTypeId = 2;
export const FIELD_TYPE_ID_COLOR: FieldTypeId = 3;
export const FIELD_TYPE_ID_DECIMAL: FieldTypeId = 4;
export const FIELD_TYPE_ID_INTEGER: FieldTypeId = 5;
export const FIELD_TYPE_ID_LOCALIZED_TEXT: FieldTypeId = 6;
export const FIELD_TYPE_ID_TEXT: FieldTypeId = 7;

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

///
/// Nodes
///
export interface NodeRow extends Row {
    parent: number; // FK Nodes
    type: NodeTypeId; // FK Node Types
    name: string;
    isFolder: boolean;
    // Unique(parent, name, type)
}

///
/// Fields
///
export interface FieldRow extends Row {
    parent: number; // FK Node
    type: FieldTypeId;
    name: string; // used to idenify EXCEPT for localizations which use reference
    isDefault: boolean; // Used for all node types (eg. adding arbitrary field to actor)
    // The following fields will only be conditionally populated
    bool: boolean;
    code: string;
    text: string; // When this is a default fields, this can contain helpful text
    color: string;
    decimal: number;
    integer: number;
    reference: number; // FK Nodes - Actor / Routine / Localized Text / Locale
    // Unique(parent, name, type)
}

/* 
Notes on each node type. A node type can be thought of as a table.

Actor
 - parent: always null
 - name: the nickname for the actor. There's also a localized text field.
 - isFolder: always false

Auto-Complete
 - parent: always null
 - name: not used, label is a field
 - isFolder: always false

Conversation
 - parent: can have folder conversations as parents
 - name: name of the folder or conversation
 - isFolder: true if folder, false if conversation

Default Fields
 - parent: always null
 - name: not used, label is a field
 - isFolder: always false

Dialogue
 - parent: the containing conversation
 - name: not used
 - isFolder: always false

Locale
 - parent: always null
 - name: name of the locale. eg. "en_US"
 - isFolder: always false

Localization Table
 - parent: always null. For now...
 - name: Actors | ConversationID + Conversation Name | user selected string
 - isFolder: always false. For now...

Localization
 - parent: the containing localization table
 - name: optional nickname
 - isFolder: always false

Programming Language
 - parent: always null
 - name: name of the selected programming language
 - isFolder: always false

Routine
 - parent: always null
 - name: name of the routine 
 - isFolder: always false
*/
