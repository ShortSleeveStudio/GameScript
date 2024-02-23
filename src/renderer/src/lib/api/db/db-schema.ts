import { TypeNameToType } from '@lib/utility/type-helpers';

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

// export const TABLE_NAME_TABLES = 'tables';
// export const TABLE_NAME_AUTO_COMPLETES = 'auto_completes';
// export const TABLE_NAME_PROGRAMMING_LANGUAGES = 'programming_languages';
// export const TABLE_NAME_PROGRAMMING_LANGUAGE_PRINCIPAL = 'programming_language_principal';
// export const TABLE_NAME_ROUTINE_TYPES = 'routine_types';
// export const TABLE_NAME_ROUTINES = 'routines';
// export const TABLE_NAME_FILTERS = 'filters';
// export const TABLE_NAME_CONVERSATIONS = 'conversations';
// export const TABLE_NAME_LOCALES = 'locales';
// export const TABLE_NAME_LOCALE_PRINCIPAL = 'locale_principal';
// export const TABLE_NAME_LOCALIZATIONS = 'localizations';
// export const TABLE_NAME_ACTORS = 'actors';
// export const TABLE_NAME_ACTOR_PRINCIPAL = 'actor_principal';
// export const TABLE_NAME_NODES = 'nodes';
// export const TABLE_NAME_EDGES = 'edges';
// export const DATABASE_TABLE_NAMES = [
//     TABLE_NAME_TABLES,
//     TABLE_NAME_AUTO_COMPLETES,
//     TABLE_NAME_PROGRAMMING_LANGUAGES,
//     TABLE_NAME_PROGRAMMING_LANGUAGE_PRINCIPAL,
//     TABLE_NAME_ROUTINE_TYPES,
//     TABLE_NAME_ROUTINES,
//     TABLE_NAME_FILTERS,
//     TABLE_NAME_CONVERSATIONS,
//     TABLE_NAME_LOCALES,
//     TABLE_NAME_LOCALE_PRINCIPAL,
//     TABLE_NAME_LOCALIZATIONS,
//     TABLE_NAME_ACTORS,
//     TABLE_NAME_ACTOR_PRINCIPAL,
//     TABLE_NAME_NODES,
//     TABLE_NAME_EDGES,
// ] as const;
// /**Database name type */
// export type DatabaseTableId = (typeof DATABASE_TABLES)[number]['id'];
// export type DatabaseTableName = (typeof DATABASE_TABLE_NAMES)[number];
// export const DATABASE_TABLES: Table[] = DATABASE_TABLE_NAMES.map<Table>(
//     TypeNameToType<DatabaseTableName, Table>,
// );
// export const TABLE_ID_TABLES: DatabaseTableId = 0;
// export const TABLE_ID_AUTO_COMPLETES: DatabaseTableId = 1;
// export const TABLE_ID_PROGRAMMING_LANGUAGES: DatabaseTableId = 2;
// export const TABLE_ID_PROGRAMMING_LANGUAGE_PRINCIPAL: DatabaseTableId = 3;
// export const TABLE_ID_ROUTINE_TYPES: DatabaseTableId = 4;
// export const TABLE_ID_ROUTINES: DatabaseTableId = 5;
// export const TABLE_ID_FILTERS: DatabaseTableId = 6;
// export const TABLE_ID_CONVERSATIONS: DatabaseTableId = 7;
// export const TABLE_ID_LOCALES: DatabaseTableId = 8;
// export const TABLE_ID_LOCALE_PRINCIPAL: DatabaseTableId = 9;
// export const TABLE_ID_LOCALIZATIONS: DatabaseTableId = 10;
// export const TABLE_ID_ACTORS: DatabaseTableId = 11;
// export const TABLE_ID_ACTOR_PRINCIPAL: DatabaseTableId = 12;
// export const TABLE_ID_NODES: DatabaseTableId = 13;
// export const TABLE_ID_EDGES: DatabaseTableId = 14;

///
/// Auto-Completes
///
export interface AutoComplete extends Row {
    icon: number;
    rule: number;
    insertion: string;
    documentation: string;
}

///
/// Programming Languages
///
export interface ProgrammingLanguage extends Row {}

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
export interface Routine extends Row, Annotated, SystemCreatable {
    code: string;
    type: RoutineTypeId;
    parent: number; // FK Conversations
}

///
/// Filters
///
export interface Filter extends Row, Annotated {}

///
/// Conversations
///
export interface Conversation extends Row, SystemCreatable, Annotated, Deletable {
    layoutAuto: boolean;
    layoutVertical: boolean;
}

///
/// Locales
///
export interface Locale extends Row, SystemCreatable {}

///
/// Locale Principal
///
export interface LocalePrincipal extends Row, Principaled {}

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
export const NODE_TYPE_LINK: NodeType = 'link';
export const NODE_TYPE_ROOT: NodeType = 'root';
export const NODE_TYPE_DIALOGUE: NodeType = 'dialogue';
export const NODE_TYPES: string[] = [NODE_TYPE_LINK, NODE_TYPE_ROOT, NODE_TYPE_DIALOGUE] as const;
export type NodeType = (typeof NODE_TYPES)[number];
export interface Node extends Row, Annotated, SystemCreatable {
    parent: number; // FK Conversation
    actor: number; // FK Actors
    voiceText: number; // FK Localizations
    uiResponseText: number; // FK Localizations
    condition: number; // FK Routines
    code: number; // FK Routines
    codeOverride: number | null;
    preventResponse: boolean;
    link: number; // FK Nodes

    // Graph Stuff
    type: NodeType;
    positionX: number;
    positionY: number;
}

///
/// Edges
///
export const EDGE_TYPE_DEFAULT: EdgeType = 'default';
export const EDGE_TYPES: string[] = [EDGE_TYPE_DEFAULT] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];
export interface Edge extends Row, Annotated {
    parent: number; // FK Conversations
    priority: number;

    // Graph Stuff
    type: EdgeType;
    source: number; // FK Nodes
    target: number; // FK Nodes
    // UNIQUE(parent, source, target)
}
