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
    isSystemCreated: boolean; // Used when a row is created by the system
}
export interface Principaled {
    principal: number; // FK
}
export interface Deletable {
    isDeleted: boolean;
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
    isCondition: boolean;
}

///
/// Filters
///
export interface Filter extends Row, Annotated, Named {}

///
/// Conversations
///
export interface Conversation extends Row, SystemCreatable, Annotated, Deletable, Named {
    isLayoutAuto: boolean;
    isLayoutVertical: boolean;
}

///
/// Locales
///
export interface Locale extends Row, SystemCreatable, Named {
    localizedName: number; // FK Localization
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
    localizedName: number; // FK Localization
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
    voiceText: number; // FK Localizations
    uiResponseText: number; // FK Localizations
    condition: number; // FK Routines
    code: number; // FK Routines
    codeOverride: number | null;
    isPreventResponse: boolean;

    // Graph Stuff
    type: string;
    positionX: number;
    positionY: number;
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
/// System
///
export interface System extends Row {
    version: string;
}
