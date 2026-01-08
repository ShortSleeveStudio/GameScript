// Core entity types matching the database schema
// Extracted from GameScriptElectron/src/common/common-schema.ts

///
/// Base interfaces for common patterns
///
export interface Row {
  id: number;
  [key: string]: unknown;
}

export interface Annotated {
  notes: string | null;
}

export interface SystemCreatable {
  is_system_created: boolean;
}

export interface Principaled {
  principal: number;
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
/// Tables
///
export interface Table extends Row, Named {}

///
/// Conversations
///
export interface Conversation extends Row, SystemCreatable, Annotated, Deletable, Named {
  is_layout_auto: boolean;
  is_layout_vertical: boolean;
  // Dynamic tag columns: tag_category_1, tag_category_2, etc.
  // Each references a ConversationTagValue.id or null
  [key: `tag_category_${number}`]: number | null;
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
export interface Localization extends Row, SystemCreatable, Named {
  // Localizations can optionally belong to a conversation, but are typically standalone
  parent: number | null; // FK Conversation (nullable)
  // Dynamic locale columns: locale_1, locale_2, etc.
  [key: `locale_${number}`]: string | null;
  // Dynamic tag columns: tag_category_1, tag_category_2, etc.
  // Each references a LocalizationTagValue.id or null
  [key: `tag_category_${number}`]: number | null;
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
  voice_text: number | null; // FK Localizations
  ui_response_text: number | null; // FK Localizations
  is_prevent_response: boolean;

  // Graph positioning
  type: string; // 'root' | 'dialogue'
  position_x: number;
  position_y: number;

  // Code
  has_condition: boolean;
  has_action: boolean;
}

///
/// Edges
///
export interface Edge extends Row, Annotated, ConversationChild {
  priority: number;

  // Graph structure
  type: string; // 'default' | 'hidden'
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
/// Notifications (for change tracking)
///
export interface Notification extends Row {
  timestamp: number | null;
  table_id: number | null;
  operation_id: number | null;
  json_payload: string | null;
}

///
/// Property Types
///
export interface PropertyType extends Row {
  name: string;
}

///
/// Property Template
///
export interface PropertyTemplate extends Row, Named {
  parent: number; // FK Table
  type: number; // FK PropertyType
}

///
/// Property Values (predefined values for property templates)
///
export interface PropertyValue extends Row {
  template_id: number; // FK PropertyTemplate
  value_string: string | null;
  value_integer: number | null;
  value_decimal: number | null;
  value_boolean: boolean | null;
}

///
/// Node Properties
///
export interface NodeProperty extends Row {
  parent: number; // FK Node
  template: number; // FK PropertyTemplate
  is_reference: boolean; // Whether this property uses a predefined value
  reference_value: number | null; // FK PropertyValue (nullable)
  value_string: string | null;
  value_integer: number | null;
  value_decimal: number | null;
  value_boolean: boolean | null;
}

///
/// Conversation Properties
///
export interface ConversationProperty extends Row {
  parent: number; // FK Conversation
  template: number; // FK PropertyTemplate
  is_reference: boolean; // Whether this property uses a predefined value
  reference_value: number | null; // FK PropertyValue (nullable)
  value_string: string | null;
  value_integer: number | null;
  value_decimal: number | null;
  value_boolean: boolean | null;
}

///
/// Code Output Folder (singleton setting)
///
export interface CodeOutputFolder extends Row {
  value: string | null;
}

///
/// Snapshot Output Path (singleton setting)
///
export interface SnapshotOutputPath extends Row {
  value: string | null;
}

///
/// Code Template (singleton setting)
/// Stores the selected code template: 'unity' | 'godot' | 'unreal'
///
export interface CodeTemplate extends Row {
  value: string | null;
}

///
/// Base Tag Types (for generic CRUD and UI components)
///

/** Base interface for tag categories - used by generic tag CRUD and UI components */
export interface BaseTagCategory extends Row, Named {}

/** Base interface for tag values - used by generic tag CRUD and UI components */
export interface BaseTagValue extends Row, Named {
  category_id: number;
}

///
/// Conversation Tag Categories
///
export interface ConversationTagCategory extends BaseTagCategory {}

///
/// Conversation Tag Values
///
export interface ConversationTagValue extends BaseTagValue {}

///
/// Localization Tag Categories
///
export interface LocalizationTagCategory extends BaseTagCategory {}

///
/// Localization Tag Values
///
export interface LocalizationTagValue extends BaseTagValue {}
