///
/// Rows
///
export interface Row {
    // This is ignored during serialization for inserts/updates
    id: number;
    [key: string]: unknown; // helpful for dictionary-style lookups
}
export interface Annotated {
    notes: string; // used for developer notes
}
export interface SystemCreatable {
    is_system_created: boolean; // Used when a row is created by the system
}
export interface Principaled {
    principal: number; // FK
}
export interface Deletable {
    is_deleted: boolean;
}
export interface ConversationChild {
    parent: number; // FK Conversation
}
export interface Named {
    name: string;
}

///
/// Auto-Completes
///
export interface AutoComplete extends Row, Named {
    icon: number;
    rule: number;
    insertion: string;
    documentation: string;
}

///
/// Programming Languages
///
export interface ProgrammingLanguage extends Row, Named {}

///
/// Programming Language Principal
///
export interface ProgrammingLanguagePrincipal extends Row, Principaled {}

///
/// Routine Types
///
export interface RoutineType extends Row, Named {}

///
/// Routines
///
export interface Routine extends Row, Annotated, SystemCreatable, ConversationChild, Named {
    code: string;
    type: number;
    is_condition: boolean;
}

///
/// Filters
///
export interface Filter extends Row, Annotated, Named {}

///
/// Conversations
///
export interface Conversation extends Row, SystemCreatable, Annotated, Deletable, Named {
    is_layout_auto: boolean;
    is_layout_vertical: boolean;
}

///
/// Locales
///
export interface Locale extends Row, SystemCreatable, Named {
    localized_name: number; // FK Localization
}

///
/// Locale Principal
///
export interface LocalePrincipal extends Row, Principaled {}

///
/// Localization
///
export interface Localization extends Row, SystemCreatable, ConversationChild, Named {
    // 'name' is used for nicknames
}

///
/// Actors
///
export interface Actor extends Row, Annotated, SystemCreatable, Named {
    color: string;
    localized_name: number; // FK Localization
}

///
/// Actor Principal
///
export interface ActorPrincipal extends Row, Principaled {}

///
/// Nodes
///
export interface Node extends Row, Annotated, SystemCreatable, ConversationChild {
    actor: number; // FK Actors
    voice_text: number; // FK Localizations
    ui_response_text: number; // FK Localizations
    condition: number; // FK Routines
    code: number; // FK Routines
    code_override: number | null;
    is_prevent_response: boolean;

    // Graph Stuff
    type: string;
    position_x: number;
    position_y: number;
}

///
/// Edges
///
export interface Edge extends Row, Annotated, ConversationChild {
    priority: number;

    // Graph Stuff
    type: string;
    source: number; // FK Nodes
    target: number; // FK Nodes
    // UNIQUE(parent, source, target)
}

///
/// Version
///
export interface Version extends Row {
    version: string;
}

///
/// Notifications
///
export interface Notification extends Row {
    timestamp: number;
    table_id: number;
    operation_id: number;
    json_payload: string;
}

///
/// Node Property Template
///
export interface NodePropertyTemplate extends Row, Named {
    type: number; // Property types
}

///
/// Node Properties
///
export interface NodeProperty extends Row {
    parent: number; // FK Node
    template: number; // FK Node Property Template
    value_string: string;
    value_integer: number;
    value_decimal: number;
    value_boolean: boolean;
}
