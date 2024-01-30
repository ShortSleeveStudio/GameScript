import { TypeNameToType } from '@lib/utility/type-helpers';
import type { DropdownItem } from 'carbon-components-svelte/types/Dropdown/Dropdown.svelte';

///
/// Database Field Types
///
export const FIELD_TYPE_NAMES = [
    'Decimal', // 0
    'Integer', // 1
    'Text', // 2
] as const;
export const FIELD_TYPE_ID_DECIMAL: number = 0;
export const FIELD_TYPE_ID_INTEGER: number = 1;
export const FIELD_TYPE_ID_TEXT: number = 2;
export const FIELD_TYPE_IDS = [FIELD_TYPE_ID_DECIMAL, FIELD_TYPE_ID_INTEGER, FIELD_TYPE_ID_TEXT];

/**Field type name type */
export type FieldTypeName = (typeof FIELD_TYPE_NAMES)[number];

/**Field type id type */
export type FieldTypeId = (typeof FIELD_TYPE_IDS)[number];

///
/// Rows
///
export interface Row {
    // This is ignored during serialization for inserts/updates
    id: number;
    name: string;
    [key: string]: unknown; // helpful for dictionary-style lookups
}
export interface Annotated {
    notes: string; // used for developer notes
}
export interface SystemCreatable {
    isSystemCreated: boolean; // Used when a row is created by the system
}
export interface Principaled {
    principal: number; // FK
}
export interface Deletable {
    isDeleted: boolean;
}

///
/// Tables
///
export interface Table extends Row {}

export const TABLE_NAME_TABLES = 'tables';
export const TABLE_NAME_AUTO_COMPLETES = 'auto_completes';
export const TABLE_NAME_PROGRAMMING_LANGUAGES = 'programming_languages';
export const TABLE_NAME_PROGRAMMING_LANGUAGE_PRINCIPAL = 'programming_language_principal';
export const TABLE_NAME_ROUTINE_TYPES = 'routine_types';
export const TABLE_NAME_ROUTINES = 'routines';
export const TABLE_NAME_FILTERS = 'filters';
export const TABLE_NAME_CONVERSATIONS = 'conversations';
export const TABLE_NAME_LOCALES = 'locales';
export const TABLE_NAME_LOCALE_PRINCIPAL = 'locale_principal';
// export const TABLE_NAME_LOCALIZATION_TABLES = 'localization_tables';
export const TABLE_NAME_LOCALIZATIONS = 'localizations';
export const TABLE_NAME_ACTORS = 'actors';
export const TABLE_NAME_ACTOR_PRINCIPAL = 'actor_principal';
export const TABLE_NAME_NODES = 'nodes';
// export const TABLE_NAME_PROPERTY_TYPES = 'property_types';
// export const TABLE_NAME_PROPERTIES = 'properties';
// export const TABLE_NAME_DEFAULT_PROPERTIES = 'default_properties';
export const DATABASE_TABLE_NAMES = [
    TABLE_NAME_TABLES,
    TABLE_NAME_AUTO_COMPLETES,
    TABLE_NAME_PROGRAMMING_LANGUAGES,
    TABLE_NAME_PROGRAMMING_LANGUAGE_PRINCIPAL,
    TABLE_NAME_ROUTINE_TYPES,
    TABLE_NAME_ROUTINES,
    TABLE_NAME_FILTERS,
    TABLE_NAME_CONVERSATIONS,
    TABLE_NAME_LOCALES,
    TABLE_NAME_LOCALE_PRINCIPAL,
    // TABLE_NAME_LOCALIZATION_TABLES,
    TABLE_NAME_LOCALIZATIONS,
    TABLE_NAME_ACTORS,
    TABLE_NAME_ACTOR_PRINCIPAL,
    TABLE_NAME_NODES,
    // TABLE_NAME_PROPERTY_TYPES,
    // TABLE_NAME_PROPERTIES,
    // TABLE_NAME_DEFAULT_PROPERTIES,
] as const;
/**Database name type */
export type DatabaseTableId = (typeof DATABASE_TABLES)[number]['id'];
export type DatabaseTableName = (typeof DATABASE_TABLE_NAMES)[number];
export const DATABASE_TABLES: Table[] = DATABASE_TABLE_NAMES.map<Table>(
    TypeNameToType<DatabaseTableName, Table>,
);
export const TABLE_ID_TABLES: DatabaseTableId = 0;
export const TABLE_ID_AUTO_COMPLETES: DatabaseTableId = 1;
export const TABLE_ID_PROGRAMMING_LANGUAGES: DatabaseTableId = 2;
export const TABLE_ID_PROGRAMMING_LANGUAGE_PRINCIPAL: DatabaseTableId = 3;
export const TABLE_ID_ROUTINE_TYPES: DatabaseTableId = 4;
export const TABLE_ID_ROUTINES: DatabaseTableId = 5;
export const TABLE_ID_FILTERS: DatabaseTableId = 6;
export const TABLE_ID_CONVERSATIONS: DatabaseTableId = 7;
export const TABLE_ID_LOCALES: DatabaseTableId = 8;
export const TABLE_ID_LOCALE_PRINCIPAL: DatabaseTableId = 9;
// export const TABLE_ID_LOCALIZATION_TABLES: DatabaseTableId = 8;
export const TABLE_ID_LOCALIZATIONS: DatabaseTableId = 10;
export const TABLE_ID_ACTORS: DatabaseTableId = 11;
export const TABLE_ID_ACTOR_PRINCIPAL: DatabaseTableId = 12;
export const TABLE_ID_NODES: DatabaseTableId = 13;
// export const TABLE_ID_PROPERTY_TYPES: DatabaseTableId = 14;
// export const TABLE_ID_PROPERTIES: DatabaseTableId = 15;
// export const TABLE_ID_DEFAULT_PROPERTIES: DatabaseTableId = 16;

///
/// Auto-Completes
///
export interface AutoComplete extends Row {
    icon: number;
    rule: number;
    insertion: string;
    documentation: string;
}

/**
 * A note on icons. The following are unique:
 * issue,
 * snippet,
 * method/function/constructor,
 * field,
 * variable,
 * class,
 * struct,
 * interface,
 * module,
 * property,
 * event,
 * operator,
 * unit,
 * value/enum,
 * constant,
 * enum memeber,
 * keyword,
 * text,
 * color,
 * file,
 * reference,
 * custom color,
 * folder,
 * type parameter,
 * user
 */

///
/// Programming Languages
///
export interface ProgrammingLanguage extends Row {}

export const PROGRAMMING_LANGUAGE_NAME_CS = 'C#';
export const PROGRAMMING_LANGUAGE_NAME_CPP = 'C++';
export const PROGRAMMING_LANGUAGE_NAMES = [
    PROGRAMMING_LANGUAGE_NAME_CS,
    PROGRAMMING_LANGUAGE_NAME_CPP,
] as const;
/**Proramming language name type */
export type ProgrammingLanguageId = (typeof PROGRAMMING_LANGUAGES)[number]['id'];
export type ProgrammingLanguageName = (typeof PROGRAMMING_LANGUAGE_NAMES)[number];
export const PROGRAMMING_LANGUAGES: Table[] = PROGRAMMING_LANGUAGE_NAMES.map<ProgrammingLanguage>(
    TypeNameToType<ProgrammingLanguageName, ProgrammingLanguage>,
);
export const PROGRAMMING_LANGUAGE_ID_CS: ProgrammingLanguageId = 0;
export const PROGRAMMING_LANGUAGE_ID_CPP: ProgrammingLanguageId = 1;

/**Dropdowns to select programming lanugage */
export const PROGRAMMING_LANGUAGE_DROP_DOWN_ITEMS: DropdownItem[] = PROGRAMMING_LANGUAGE_NAMES.map(
    (languageName: string, index: number) =>
        <DropdownItem>{
            id: index,
            text: languageName,
        },
);

///
/// Programming Language Principal
///
export interface ProgrammingLanguagePrincipal extends Row, Principaled {}

///
/// Routine Types
///
export interface RoutineType extends Row {}

export const ROUTINE_TYPE_NAME_USER_CREATED = 'User';
export const ROUTINE_TYPE_NAME_IMPORT = 'Import';
export const ROUTINE_TYPE_NAME_DEFAULT = 'Default';
export const ROUTINE_TYPE_NAMES = [
    ROUTINE_TYPE_NAME_USER_CREATED, // 0
    ROUTINE_TYPE_NAME_IMPORT, // 1
    ROUTINE_TYPE_NAME_DEFAULT, // 2
] as const;
export const ROUTINE_TYPE_ID_USER: RoutineTypeId = 0;
export const ROUTINE_TYPE_ID_IMPORTS: RoutineTypeId = 1;
export const ROUTINE_TYPE_ID_DEFAULT: RoutineTypeId = 2;

/**List of supported Routine types */
export const ROUTINE_TYPES: RoutineType[] = ROUTINE_TYPE_NAMES.map<RoutineType>(
    TypeNameToType<RoutineTypeName, RoutineType>,
);

/**Routine type name type */
export type RoutineTypeName = (typeof ROUTINE_TYPE_NAMES)[number];

/**Routine type id type */
export type RoutineTypeId = (typeof ROUTINE_TYPES)[number]['id'];

///
/// Routines
///
export interface Routine extends Row, Annotated {
    code: string;
    type: RoutineTypeId;
}

///
/// Filters
///
export interface Filter extends Row, Annotated {}

///
/// Conversations
///
export interface Conversation extends Row, SystemCreatable, Annotated, Deletable {}
export const ACTOR_CONVERSATION_ID = 0;
export const ACTOR_CONVERSATION_NAME = 'Actors';

///
/// Locales
///
export interface Locale extends Row, SystemCreatable {}

///
/// Locale Principal
///
export interface LocalePrincipal extends Row, Principaled {}

///
/// Localization Tables
///
// export interface LocalizationTable extends Row, SystemCreatable {}

///
/// Localization
///
export interface Localization extends Row, SystemCreatable {
    parent: number; // FK Conversations
    // 'name' is used for nicknames
}

///
/// Actors
///
export interface Actor extends Row, Annotated, SystemCreatable {
    color: string;
    localizedName: number; // FK Localization
}

///
/// Actor Principal
///
export interface ActorPrincipal extends Row, Principaled {}

///
/// Nodes
///
export interface Node extends Row, Annotated {
    parent: number; // FK Conversation
    actor: number; // FK Actors
    uiText: number; // FK Localizations
    voiceText: number; // FK Localizations
    condition: number; // FK Routines
    code: number; // FK Routines
}

// ///
// /// Property Types
// ///
// export interface PropertyType extends Row {
//     name: PropertyTypeName;
// }

// /**Property type name type */
// export const PROPERTY_TYPE_NAMES = [
//     'Boolean', // 0
//     'Decimal', // 1
//     'Integer', // 2
//     'Text', // 3
//     'Localized Text', // 4
// ] as const;
// export const PROPERTY_TYPE_ID_BOOLEAN: PropertyTypeId = 0;
// export const PROPERTY_TYPE_ID_DECIMAL: PropertyTypeId = 1;
// export const PROPERTY_TYPE_ID_INTEGER: PropertyTypeId = 2;
// export const PROPERTY_TYPE_ID_TEXT: PropertyTypeId = 3;
// export const PROPERTY_TYPE_ID_LOCALIZED_TEXT: PropertyTypeId = 4;
// export const PROPERTY_TYPE_IDS = [
//     PROPERTY_TYPE_ID_BOOLEAN,
//     PROPERTY_TYPE_ID_DECIMAL,
//     PROPERTY_TYPE_ID_INTEGER,
//     PROPERTY_TYPE_ID_TEXT,
//     PROPERTY_TYPE_ID_LOCALIZED_TEXT,
// ];

// /**List of supported property types */
// export const PROPERTY_TYPES: PropertyType[] = PROPERTY_TYPE_NAMES.map<PropertyType>(
//     TypeNameToType<PropertyTypeName, PropertyType>,
// );

// /**Property type name type */
// export type PropertyTypeName = (typeof PROPERTY_TYPE_NAMES)[number];

// /**Property type id type */
// export type PropertyTypeId = (typeof PROPERTY_TYPES)[number]['id'];

// /**Dropdown items for property types */
// export const PROPERTY_TYPE_DROP_DOWN_ITEMS: DropdownItem[] = PROPERTY_TYPES.map(
//     (propertyType: PropertyType) =>
//         <DropdownItem>{
//             id: propertyType.id,
//             text: propertyType.name,
//         },
// );

///
/// Property
///
// export const PROPERTY_FK_COLUMN_NAME_ACTORS = 'parentActor';
// export const PROPERTY_FK_COLUMN_NAME_CONVERSATIONS = 'parentConversation';
// export const PROPERTY_FK_COLUMN_NAME_NODES = 'parentNode';
// export interface Property extends Row {
//     defaultId: number; // FK Default Properties
//     parentActor: number; // FK Actors
//     parentConversation: number; // FK Conversations
//     parentNode: number; // FK Nodes
//     parentType: DatabaseTableId; // FK Tables
//     type: PropertyTypeId; // TK Property Types
//     isDefault: boolean;
//     // The following fields represent the actual data
//     bool: boolean;
//     decimal: number;
//     integer: number;
//     text: string;
//     localizedText: number; // FK Localizations
// }

// ///
// /// Default Properties
// ///
// export interface DefaultProperty extends Row {
//     type: PropertyTypeId; // TK Property Types
//     parentType: DatabaseTableId; // FK Tables
// }
