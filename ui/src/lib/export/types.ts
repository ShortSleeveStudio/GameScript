/**
 * Export type definitions for snapshot generation.
 *
 * These interfaces represent the intermediate format between database rows
 * and FlatBuffers serialization. They use array indices instead of database IDs
 * for O(1) runtime lookups.
 */

import type {
  NodeTypeName,
  EdgeTypeName,
  ExportPropertyTypeName,
} from '@gamescript/shared';

// =============================================================================
// Export Data Types (intermediate format before FlatBuffers)
// =============================================================================

/**
 * Exported conversation with resolved indices.
 */
export interface ExportConversation {
  /** Original database ID (for code lookups) */
  id: number;
  name: string;
  notes: string | null;
  isLayoutAuto: boolean;
  isLayoutVertical: boolean;
  /** Indices into tag values arrays, -1 = untagged for that category */
  tagIndices: number[];
  /** Custom properties on this conversation */
  properties: ExportConversationProperty[];
  /** Indices into ExportSnapshot.nodes */
  nodeIndices: number[];
  /** Indices into ExportSnapshot.edges */
  edgeIndices: number[];
  /** Index into ExportSnapshot.nodes, -1 = no root */
  rootNodeIdx: number;
}

/**
 * Exported property template.
 */
export interface ExportPropertyTemplate {
  /** Original database ID */
  id: number;
  name: string;
  type: ExportPropertyTypeName;
}

/**
 * Property value (shared between node and conversation properties).
 * Only one field will be set based on the template type.
 */
export interface ExportPropertyValue {
  stringVal?: string;
  intVal?: number;
  decimalVal?: number;
  boolVal?: boolean;
}

/**
 * Exported node property with resolved template index.
 */
export interface ExportNodeProperty {
  /** Index into ExportSnapshot.propertyTemplates */
  templateIdx: number;
  /** The property value (only one will be set based on type) */
  value: ExportPropertyValue;
}

/**
 * Exported conversation property with resolved template index.
 */
export interface ExportConversationProperty {
  /** Index into ExportSnapshot.propertyTemplates */
  templateIdx: number;
  /** The property value (only one will be set based on type) */
  value: ExportPropertyValue;
}

/**
 * Exported node with resolved indices and localized text.
 */
export interface ExportNode {
  /** Original database ID (for code lookups) */
  id: number;
  /** Index into ExportSnapshot.conversations */
  conversationIdx: number;
  type: NodeTypeName;
  /** Index into ExportSnapshot.actors, -1 = no actor */
  actorIdx: number;
  /** Resolved localized text for this locale */
  voiceText: string | null;
  /** Resolved localized text for this locale */
  uiResponseText: string | null;
  hasCondition: boolean;
  hasAction: boolean;
  isPreventResponse: boolean;
  positionX: number;
  positionY: number;
  notes: string | null;
  properties: ExportNodeProperty[];
  /** Indices into ExportSnapshot.edges, sorted by priority */
  outgoingEdgeIndices: number[];
  /** Indices into ExportSnapshot.edges */
  incomingEdgeIndices: number[];
}

/**
 * Exported edge with resolved indices.
 */
export interface ExportEdge {
  /** Original database ID */
  id: number;
  /** Index into ExportSnapshot.conversations */
  conversationIdx: number;
  /** Index into ExportSnapshot.nodes */
  sourceIdx: number;
  /** Index into ExportSnapshot.nodes */
  targetIdx: number;
  priority: number;
  type: EdgeTypeName;
}

/**
 * Exported actor with resolved localized name.
 */
export interface ExportActor {
  /** Original database ID */
  id: number;
  /** Internal name/identifier */
  name: string;
  /** Resolved localized display name for this locale */
  localizedName: string | null;
  /** Hex color, e.g., "#808080" */
  color: string;
}

/**
 * Exported localization (non-dialogue strings).
 */
export interface ExportLocalization {
  /** Original database ID */
  id: number;
  /** Key, e.g., "menu.start", "item.sword.name" */
  name: string | null;
  /** Resolved localized text for this locale */
  text: string | null;
  /** Indices into tag values arrays, -1 = untagged for that category */
  tagIndices: number[];
}

/**
 * Complete snapshot data for a single locale.
 */
export interface LocaleSnapshot {
  /** Locale ID this snapshot is for */
  localeId: number;
  /** Locale name (e.g., "en", "fr") */
  localeName: string;

  /** Conversation tag category names */
  conversationTagNames: string[];
  /** Conversation tag values per category */
  conversationTagValues: string[][];

  /** Localization tag category names */
  localizationTagNames: string[];
  /** Localization tag values per category */
  localizationTagValues: string[][];

  /** All non-deleted conversations */
  conversations: ExportConversation[];
  /** All nodes from non-deleted conversations */
  nodes: ExportNode[];
  /** All edges from non-deleted conversations */
  edges: ExportEdge[];
  /** All actors */
  actors: ExportActor[];
  /** All non-system localizations */
  localizations: ExportLocalization[];
  /** All property templates */
  propertyTemplates: ExportPropertyTemplate[];
}

// =============================================================================
// Export Progress and Result Types
// =============================================================================

/**
 * Export progress state.
 */
export interface ExportProgress {
  /** Current phase of export */
  phase: 'preparing' | 'fetching' | 'serializing' | 'writing' | 'complete' | 'cancelled' | 'error';
  /** Current locale being processed (if in locale-specific phase) */
  currentLocale?: string;
  /** Total number of locales */
  totalLocales: number;
  /** Number of locales completed */
  completedLocales: number;
  /** Error message if phase is 'error' */
  error?: string;
}

/**
 * Locale entry in the manifest.
 */
export interface ExportManifestLocale {
  id: number;
  name: string;
  localizedName: string;
  hash: string;
}

/**
 * Manifest file format stored alongside snapshots.
 */
export interface ExportManifest {
  /** Schema version for the manifest format */
  version: string;
  /** List of exported locales with id, code, and hash */
  locales: ExportManifestLocale[];
  /** Index into locales array for the primary locale */
  primaryLocale: number;
  /** ISO timestamp of export */
  exportedAt: string;
}

/**
 * Result of an export operation.
 */
export interface ExportResult {
  success: boolean;
  /** Number of locales exported */
  localesExported: number;
  /** Number of locales skipped (unchanged) */
  localesSkipped: number;
  /** Total size in bytes written */
  bytesWritten: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if not successful */
  error?: string;
}

// =============================================================================
// ID to Index Mapping Types (used during fetch)
// =============================================================================

/**
 * Maps database IDs to array indices.
 * Built during data fetching for O(1) lookups.
 */
export interface IdToIndexMaps {
  conversations: Map<number, number>;
  nodes: Map<number, number>;
  edges: Map<number, number>;
  actors: Map<number, number>;
  propertyTemplates: Map<number, number>;
  /** Maps tag value ID to [categoryIndex, valueIndex] */
  conversationTagValues: Map<number, [number, number]>;
  /** Maps tag value ID to [categoryIndex, valueIndex] */
  localizationTagValues: Map<number, [number, number]>;
}
