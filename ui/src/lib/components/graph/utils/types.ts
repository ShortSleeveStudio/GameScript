/**
 * Type definitions for the graph editor.
 *
 * These types bridge between our database entities (via DbRowView) and
 * Svelte Flow's internal node/edge representations.
 *
 * Ported from GameScriptElectron graph-data.ts, adapted for new architecture.
 */

import type { Node as DbNode, Edge as DbEdge, Localization } from '@gamescript/shared';
import type { Node as FlowNode, Edge as FlowEdge } from '@xyflow/svelte';
import type { IDbRowView, IDbTableView } from '$lib/db';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';

// ============================================================================
// Node Types
// ============================================================================

/**
 * Data attached to each Svelte Flow node.
 *
 * Uses IDbRowView for reactive data binding - when the underlying row
 * changes, components subscribed to $rowView automatically re-render.
 */
export interface NodeData extends Record<string, unknown> {
  /** Reactive row view for the node database entity */
  rowView: IDbRowView<DbNode>;
  /** Table view of localizations for this conversation (for voice/UI text) */
  localizations: IDbTableView<Localization>;
  /** Whether this node is selected */
  selected: boolean;
}

/** Svelte Flow node with our custom data */
export type GraphNode = FlowNode<NodeData>;

/** Node type identifiers */
export const NODE_TYPES = {
  ROOT: 'root',
  DIALOGUE: 'dialogue',
} as const;

export type NodeTypeName = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

// ============================================================================
// Edge Types
// ============================================================================

/** Section of an ELK-computed edge path */
export interface ElkEdgeSection {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  bendPoints?: Array<{ x: number; y: number }>;
}

/**
 * Data attached to each Svelte Flow edge.
 *
 * Uses IDbRowView for reactive data binding.
 */
export interface EdgeData extends Record<string, unknown> {
  /** Reactive row view for the edge database entity */
  rowView: IDbRowView<DbEdge>;
  /** Table view of localizations (shared with nodes) */
  localizations: IDbTableView<Localization>;
  /** Whether this edge is selected */
  selected: boolean;
  /** ELK layout edge data (populated when auto-layout is enabled) */
  elkEdge?: ElkExtendedEdge;
}

/** Svelte Flow edge with our custom data */
export type GraphEdge = FlowEdge<EdgeData>;

/** Edge type identifiers */
export const EDGE_TYPES = {
  DEFAULT: 'default',
  HIDDEN: 'hidden',
} as const;

export type EdgeTypeName = (typeof EDGE_TYPES)[keyof typeof EDGE_TYPES];

// ============================================================================
// Graph State
// ============================================================================

/** Viewport state for saving/restoring camera position */
export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

// ============================================================================
// Layout Constants
// ============================================================================

/** Port container thickness for handles (numeric, in pixels) */
export const PORT_CONTAINER_THICKNESS_PX = 32; // 8 * 4

/** Port container thickness for handles (CSS string) */
export const PORT_CONTAINER_THICKNESS = `${PORT_CONTAINER_THICKNESS_PX}px`;

/** Node content width (without ports) */
export const NODE_CONTENT_WIDTH = 200;

/** Node title bar height */
export const NODE_TITLE_HEIGHT = 32;

/** Node color bar height (dialogue nodes) */
export const NODE_COLOR_HEIGHT = 6;

/** Node UI text area height */
export const NODE_UI_TEXT_HEIGHT = 42;

/** Node voice text area height */
export const NODE_VOICE_TEXT_HEIGHT = 80;

/** Node divider height */
export const NODE_DIVIDER_HEIGHT = 1;

/**
 * Fixed node dimensions for ELK layout calculations.
 *
 * Using fixed dimensions eliminates race conditions where layout runs
 * before nodes are measured in the DOM. All node types have consistent
 * sizes, so we can compute dimensions statically.
 */
export const NODE_DIMENSIONS = {
  /** Root node: content width + one port (source only) */
  [NODE_TYPES.ROOT]: {
    width: NODE_CONTENT_WIDTH + PORT_CONTAINER_THICKNESS_PX,
    height: NODE_TITLE_HEIGHT,
  },
  /** Dialogue node: content width + two ports (source and target) */
  [NODE_TYPES.DIALOGUE]: {
    width: NODE_CONTENT_WIDTH + PORT_CONTAINER_THICKNESS_PX * 2,
    height: NODE_TITLE_HEIGHT + NODE_COLOR_HEIGHT + NODE_UI_TEXT_HEIGHT + NODE_DIVIDER_HEIGHT + NODE_VOICE_TEXT_HEIGHT,
  },
} as const;

/** Handle positions */
export const HANDLE_POSITIONS = {
  /** Input handle position for vertical layout */
  INPUT_VERTICAL: 'top',
  /** Output handle position for vertical layout */
  OUTPUT_VERTICAL: 'bottom',
  /** Input handle position for horizontal layout */
  INPUT_HORIZONTAL: 'left',
  /** Output handle position for horizontal layout */
  OUTPUT_HORIZONTAL: 'right',
} as const;

/** Hidden edge tag dimensions */
export const TAG_WIDTH = 80;
export const TAG_HEIGHT = 32;
export const TAG_DISTANCE_TO_NODE = 60;

// ============================================================================
// Graph Context
// ============================================================================

/** Context key for graph-level functions */
export const GRAPH_CONTEXT = Symbol('graph-context');

/** Functions available to child components via context */
export interface GraphContext {
  /** Delete nodes and edges from the graph */
  onDelete: (nodes: DbNode[], edges: DbEdge[]) => Promise<void>;
}
