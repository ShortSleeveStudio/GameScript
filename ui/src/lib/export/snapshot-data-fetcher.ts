/**
 * Snapshot Data Fetcher
 *
 * Fetches all data needed for a locale snapshot from the database.
 * Builds ID-to-index maps for O(1) lookups and resolves all relationships.
 *
 * Uses crud-export.ts for all database access.
 */

import { snapshotExport } from '$lib/crud';
import {
  localeIdToColumn,
  tagCategoryIdToColumn,
  PROPERTY_TYPE_STRING,
  PROPERTY_TYPE_INTEGER,
  PROPERTY_TYPE_DECIMAL,
  PROPERTY_TYPE_BOOLEAN,
} from '@gamescript/shared';
import type {
  Conversation,
  Node,
  Edge,
  Actor,
  Localization,
  Locale,
  PropertyTemplate,
  NodeProperty,
  ConversationProperty,
  PropertyValue,
  ConversationTagCategory,
  ConversationTagValue,
  LocalizationTagCategory,
  LocalizationTagValue,
  NodeTypeName,
  EdgeTypeName,
  ExportPropertyTypeName,
} from '@gamescript/shared';
import type {
  LocaleSnapshot,
  ExportConversation,
  ExportNode,
  ExportEdge,
  ExportActor,
  ExportLocalization,
  ExportPropertyTemplate,
  ExportNodeProperty,
  ExportConversationProperty,
  ExportPropertyValue,
  IdToIndexMaps,
} from './types.js';

/**
 * Fetches and transforms database data into a LocaleSnapshot.
 * Supports cancellation for long-running operations.
 */
export class SnapshotDataFetcher {
  private _cancelled = false;

  /**
   * Cancel the current fetch operation.
   */
  cancel(): void {
    this._cancelled = true;
  }

  /**
   * Check if operation was cancelled.
   */
  private checkCancelled(): void {
    if (this._cancelled) {
      throw new Error('Export cancelled');
    }
  }

  /**
   * Fetch all data for a specific locale and return a complete LocaleSnapshot.
   */
  async fetchForLocale(locale: Locale): Promise<LocaleSnapshot> {
    this._cancelled = false;
    const localeColumn = localeIdToColumn(locale.id);

    // Fetch tag categories and values first (needed for index mapping)
    const [
      conversationTagCategories,
      conversationTagValues,
      localizationTagCategories,
      localizationTagValues,
    ] = await Promise.all([
      snapshotExport.getConversationTagCategories(),
      snapshotExport.getConversationTagValues(),
      snapshotExport.getLocalizationTagCategories(),
      snapshotExport.getLocalizationTagValues(),
    ]);
    this.checkCancelled();

    // Build tag value ID -> [categoryIdx, valueIdx] maps
    const conversationTagValueMap = this.buildTagValueMap(
      conversationTagCategories,
      conversationTagValues,
    );
    const localizationTagValueMap = this.buildTagValueMap(
      localizationTagCategories,
      localizationTagValues,
    );

    // Fetch main entities
    const [
      conversations,
      nodes,
      edges,
      actors,
      localizations,
      propertyTemplates,
      nodeProperties,
      conversationProperties,
      propertyValues,
    ] = await Promise.all([
      snapshotExport.getNonDeletedConversations(),
      snapshotExport.getNodesFromNonDeletedConversations(),
      snapshotExport.getEdgesFromNonDeletedConversations(),
      snapshotExport.getAllActors(),
      snapshotExport.getNonSystemLocalizations(),
      snapshotExport.getAllPropertyTemplates(),
      snapshotExport.getNodePropertiesFromNonDeletedConversations(),
      snapshotExport.getConversationPropertiesFromNonDeletedConversations(),
      snapshotExport.getAllPropertyValues(),
    ]);
    this.checkCancelled();

    // Build ID -> index maps
    const idMaps = this.buildIdMaps(
      conversations,
      nodes,
      edges,
      actors,
      propertyTemplates,
      conversationTagValueMap,
      localizationTagValueMap,
    );

    // Collect all localization IDs we need text for
    const localizationIds = this.collectLocalizationIds(nodes, actors, localizations);

    // Fetch all localized text for the specified locale
    const localizationTextMap = await snapshotExport.getLocalizationTextForLocale(
      localizationIds,
      localeColumn,
    );
    this.checkCancelled();

    // Build property value ID -> PropertyValue map once for resolving references
    const propertyValueMap = new Map<number, PropertyValue>();
    for (const pv of propertyValues) {
      propertyValueMap.set(pv.id, pv);
    }

    // Transform to export format
    const exportConversations = this.transformConversations(
      conversations,
      nodes,
      edges,
      conversationProperties,
      propertyTemplates,
      propertyValueMap,
      conversationTagCategories,
      idMaps,
    );
    const exportNodes = this.transformNodes(
      nodes,
      edges,
      nodeProperties,
      propertyTemplates,
      propertyValueMap,
      localizationTextMap,
      idMaps,
    );
    const exportEdges = this.transformEdges(edges, idMaps);
    const exportActors = this.transformActors(actors, localizationTextMap);
    const exportLocalizations = this.transformLocalizations(
      localizations,
      localizationTagCategories,
      localizationTextMap,
      idMaps,
    );
    const exportPropertyTemplates = this.transformPropertyTemplates(propertyTemplates);

    return {
      localeId: locale.id,
      localeName: locale.name,
      conversationTagNames: conversationTagCategories.map((c) => c.name),
      conversationTagValues: conversationTagCategories.map((cat) =>
        conversationTagValues.filter((v) => v.category_id === cat.id).map((v) => v.name),
      ),
      localizationTagNames: localizationTagCategories.map((c) => c.name),
      localizationTagValues: localizationTagCategories.map((cat) =>
        localizationTagValues.filter((v) => v.category_id === cat.id).map((v) => v.name),
      ),
      conversations: exportConversations,
      nodes: exportNodes,
      edges: exportEdges,
      actors: exportActors,
      localizations: exportLocalizations,
      propertyTemplates: exportPropertyTemplates,
    };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Get a required index from a map, throwing an error if not found.
   * Use this instead of non-null assertions for better error messages.
   */
  private getRequiredIndex(
    map: Map<number, number>,
    id: number,
    entityType: string,
    contextId?: number,
  ): number {
    const index = map.get(id);
    if (index === undefined) {
      const context = contextId !== undefined ? ` (referenced by ${entityType} ${contextId})` : '';
      throw new Error(`Data integrity error: ${entityType} ID ${id} not found in index map${context}`);
    }
    return index;
  }

  /**
   * Collect all localization IDs needed for text lookup.
   */
  private collectLocalizationIds(
    nodes: Node[],
    actors: Actor[],
    localizations: Localization[],
  ): number[] {
    const ids = new Set<number>();

    for (const node of nodes) {
      if (node.voice_text !== null) ids.add(node.voice_text);
      if (node.ui_response_text !== null) ids.add(node.ui_response_text);
    }

    for (const actor of actors) {
      ids.add(actor.localized_name);
    }

    for (const loc of localizations) {
      ids.add(loc.id);
    }

    return Array.from(ids);
  }

  // ===========================================================================
  // ID to Index Map Builders
  // ===========================================================================

  private buildTagValueMap(
    categories: { id: number; name: string }[],
    values: { id: number; category_id: number; name: string }[],
  ): Map<number, [number, number]> {
    const map = new Map<number, [number, number]>();

    // Build category ID -> index map
    const categoryIdxMap = new Map<number, number>();
    for (let i = 0; i < categories.length; i++) {
      categoryIdxMap.set(categories[i].id, i);
    }

    // Build per-category value index
    const categoryValueCounts = new Map<number, number>();
    for (const value of values) {
      const categoryIdx = categoryIdxMap.get(value.category_id);
      if (categoryIdx === undefined) continue;

      const valueIdx = categoryValueCounts.get(value.category_id) ?? 0;
      map.set(value.id, [categoryIdx, valueIdx]);
      categoryValueCounts.set(value.category_id, valueIdx + 1);
    }

    return map;
  }

  private buildIdMaps(
    conversations: Conversation[],
    nodes: Node[],
    edges: Edge[],
    actors: Actor[],
    propertyTemplates: PropertyTemplate[],
    conversationTagValueMap: Map<number, [number, number]>,
    localizationTagValueMap: Map<number, [number, number]>,
  ): IdToIndexMaps {
    const conversationMap = new Map<number, number>();
    const nodeMap = new Map<number, number>();
    const edgeMap = new Map<number, number>();
    const actorMap = new Map<number, number>();
    const templateMap = new Map<number, number>();

    for (let i = 0; i < conversations.length; i++) {
      conversationMap.set(conversations[i].id, i);
    }
    for (let i = 0; i < nodes.length; i++) {
      nodeMap.set(nodes[i].id, i);
    }
    for (let i = 0; i < edges.length; i++) {
      edgeMap.set(edges[i].id, i);
    }
    for (let i = 0; i < actors.length; i++) {
      actorMap.set(actors[i].id, i);
    }
    for (let i = 0; i < propertyTemplates.length; i++) {
      templateMap.set(propertyTemplates[i].id, i);
    }

    return {
      conversations: conversationMap,
      nodes: nodeMap,
      edges: edgeMap,
      actors: actorMap,
      propertyTemplates: templateMap,
      conversationTagValues: conversationTagValueMap,
      localizationTagValues: localizationTagValueMap,
    };
  }

  // ===========================================================================
  // Transformers
  // ===========================================================================

  private transformConversations(
    conversations: Conversation[],
    nodes: Node[],
    edges: Edge[],
    conversationProperties: ConversationProperty[],
    propertyTemplates: PropertyTemplate[],
    propertyValueMap: Map<number, PropertyValue>,
    tagCategories: ConversationTagCategory[],
    idMaps: IdToIndexMaps,
  ): ExportConversation[] {
    // Build conversation ID -> properties map
    const convPropertiesMap = new Map<number, ConversationProperty[]>();
    for (const prop of conversationProperties) {
      const list = convPropertiesMap.get(prop.parent) ?? [];
      list.push(prop);
      convPropertiesMap.set(prop.parent, list);
    }

    return conversations.map((conv) => {
      // Find nodes belonging to this conversation
      const nodeIndices: number[] = [];
      let rootNodeIdx = -1;

      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].parent === conv.id) {
          nodeIndices.push(i);
          if (nodes[i].type === 'root') {
            rootNodeIdx = i;
          }
        }
      }

      // Find edges belonging to this conversation
      const edgeIndices: number[] = [];
      for (let i = 0; i < edges.length; i++) {
        if (edges[i].parent === conv.id) {
          edgeIndices.push(i);
        }
      }

      // Resolve tag indices
      const tagIndices = this.resolveConversationTagIndices(conv, tagCategories, idMaps);

      // Transform conversation properties
      const props = convPropertiesMap.get(conv.id) ?? [];
      const exportProps = this.transformConversationProperties(props, propertyTemplates, propertyValueMap, idMaps);

      return {
        id: conv.id,
        name: conv.name,
        notes: conv.notes,
        isLayoutAuto: conv.is_layout_auto,
        isLayoutVertical: conv.is_layout_vertical,
        tagIndices,
        properties: exportProps,
        nodeIndices,
        edgeIndices,
        rootNodeIdx,
      };
    });
  }

  private resolveConversationTagIndices(
    conv: Conversation,
    categories: ConversationTagCategory[],
    idMaps: IdToIndexMaps,
  ): number[] {
    const indices: number[] = [];

    for (const cat of categories) {
      const column = tagCategoryIdToColumn(cat.id);
      const valueId = (conv as Record<string, unknown>)[column] as number | null;

      if (valueId === null || valueId === undefined) {
        indices.push(-1);
      } else {
        const mapping = idMaps.conversationTagValues.get(valueId);
        if (mapping) {
          // Return the value index within the category
          indices.push(mapping[1]);
        } else {
          indices.push(-1);
        }
      }
    }

    return indices;
  }

  private transformNodes(
    nodes: Node[],
    edges: Edge[],
    nodeProperties: NodeProperty[],
    propertyTemplates: PropertyTemplate[],
    propertyValueMap: Map<number, PropertyValue>,
    localizationTextMap: Map<number, string | null>,
    idMaps: IdToIndexMaps,
  ): ExportNode[] {
    // Build node ID -> properties map
    const nodePropertiesMap = new Map<number, NodeProperty[]>();
    for (const prop of nodeProperties) {
      const list = nodePropertiesMap.get(prop.parent) ?? [];
      list.push(prop);
      nodePropertiesMap.set(prop.parent, list);
    }

    // Build node ID -> outgoing/incoming edges
    const outgoingEdgesMap = new Map<number, Edge[]>();
    const incomingEdgesMap = new Map<number, Edge[]>();
    for (const edge of edges) {
      const outgoing = outgoingEdgesMap.get(edge.source) ?? [];
      outgoing.push(edge);
      outgoingEdgesMap.set(edge.source, outgoing);

      const incoming = incomingEdgesMap.get(edge.target) ?? [];
      incoming.push(edge);
      incomingEdgesMap.set(edge.target, incoming);
    }

    return nodes.map((node) => {
      // Get outgoing edges sorted by priority
      const outgoingEdges = outgoingEdgesMap.get(node.id) ?? [];
      outgoingEdges.sort((a, b) => a.priority - b.priority);
      const outgoingEdgeIndices = outgoingEdges.map((e) =>
        this.getRequiredIndex(idMaps.edges, e.id, 'edge', node.id),
      );

      // Get incoming edges
      const incomingEdges = incomingEdgesMap.get(node.id) ?? [];
      const incomingEdgeIndices = incomingEdges.map((e) =>
        this.getRequiredIndex(idMaps.edges, e.id, 'edge', node.id),
      );

      // Transform properties
      const props = nodePropertiesMap.get(node.id) ?? [];
      const exportProps = this.transformNodeProperties(props, propertyTemplates, propertyValueMap, idMaps);

      // System-created nodes (e.g., root nodes) and logic nodes should have actorIdx = 0
      const actorIdx = node.is_system_created || node.type === 'logic' ? 0 : (idMaps.actors.get(node.actor) ?? 0);

      return {
        id: node.id,
        conversationIdx: this.getRequiredIndex(idMaps.conversations, node.parent, 'conversation', node.id),
        type: node.type as NodeTypeName,
        actorIdx,
        voiceText: node.voice_text !== null ? localizationTextMap.get(node.voice_text) ?? null : null,
        uiResponseText: node.ui_response_text !== null ? localizationTextMap.get(node.ui_response_text) ?? null : null,
        hasCondition: node.has_condition,
        hasAction: node.has_action,
        isPreventResponse: node.is_prevent_response,
        positionX: node.position_x,
        positionY: node.position_y,
        notes: node.notes,
        properties: exportProps,
        outgoingEdgeIndices,
        incomingEdgeIndices,
      };
    });
  }

  private transformNodeProperties(
    props: NodeProperty[],
    templates: PropertyTemplate[],
    propertyValueMap: Map<number, PropertyValue>,
    idMaps: IdToIndexMaps,
  ): ExportNodeProperty[] {
    const result: ExportNodeProperty[] = [];

    for (const prop of props) {
      // Skip broken references (is_reference=true but reference_value=null)
      if (prop.is_reference && prop.reference_value === null) {
        continue;
      }

      const templateIdx = idMaps.propertyTemplates.get(prop.template) ?? -1;
      const template = templates.find((t) => t.id === prop.template);

      // Resolve property value - if is_reference, get value from property_values table
      const value = this.resolvePropertyValue(prop, template, propertyValueMap);

      result.push({
        templateIdx,
        value,
      });
    }

    return result;
  }

  private transformConversationProperties(
    props: ConversationProperty[],
    templates: PropertyTemplate[],
    propertyValueMap: Map<number, PropertyValue>,
    idMaps: IdToIndexMaps,
  ): ExportConversationProperty[] {
    const result: ExportConversationProperty[] = [];

    for (const prop of props) {
      // Skip broken references (is_reference=true but reference_value=null)
      if (prop.is_reference && prop.reference_value === null) {
        continue;
      }

      const templateIdx = idMaps.propertyTemplates.get(prop.template) ?? -1;
      const template = templates.find((t) => t.id === prop.template);

      // Resolve property value - if is_reference, get value from property_values table
      const value = this.resolvePropertyValue(prop, template, propertyValueMap);

      result.push({
        templateIdx,
        value,
      });
    }

    return result;
  }

  /**
   * Resolve a property value, handling both direct values and references to predefined values.
   */
  private resolvePropertyValue(
    prop: NodeProperty | ConversationProperty,
    template: PropertyTemplate | undefined,
    propertyValueMap: Map<number, PropertyValue>,
  ): ExportPropertyValue {
    const value: ExportPropertyValue = {};

    if (!template) return value;

    // If this is a reference to a predefined value, resolve it
    if (prop.is_reference && prop.reference_value !== null) {
      const predefinedValue = propertyValueMap.get(prop.reference_value);
      if (predefinedValue) {
        switch (template.type) {
          case PROPERTY_TYPE_STRING.id:
            value.stringVal = predefinedValue.value_string ?? undefined;
            break;
          case PROPERTY_TYPE_INTEGER.id:
            value.intVal = predefinedValue.value_integer ?? undefined;
            break;
          case PROPERTY_TYPE_DECIMAL.id:
            value.decimalVal = predefinedValue.value_decimal ?? undefined;
            break;
          case PROPERTY_TYPE_BOOLEAN.id:
            value.boolVal = predefinedValue.value_boolean ?? undefined;
            break;
        }
        return value;
      }
      // If reference not found, fall through to use direct value as fallback
    }

    // Use direct value from property
    switch (template.type) {
      case PROPERTY_TYPE_STRING.id:
        value.stringVal = prop.value_string ?? undefined;
        break;
      case PROPERTY_TYPE_INTEGER.id:
        value.intVal = prop.value_integer ?? undefined;
        break;
      case PROPERTY_TYPE_DECIMAL.id:
        value.decimalVal = prop.value_decimal ?? undefined;
        break;
      case PROPERTY_TYPE_BOOLEAN.id:
        value.boolVal = prop.value_boolean ?? undefined;
        break;
    }

    return value;
  }

  private transformEdges(edges: Edge[], idMaps: IdToIndexMaps): ExportEdge[] {
    return edges.map((edge) => ({
      id: edge.id,
      conversationIdx: this.getRequiredIndex(idMaps.conversations, edge.parent, 'conversation', edge.id),
      sourceIdx: this.getRequiredIndex(idMaps.nodes, edge.source, 'source node', edge.id),
      targetIdx: this.getRequiredIndex(idMaps.nodes, edge.target, 'target node', edge.id),
      priority: edge.priority,
      type: edge.type as EdgeTypeName,
    }));
  }

  private transformActors(
    actors: Actor[],
    localizationTextMap: Map<number, string | null>,
  ): ExportActor[] {
    return actors.map((actor) => ({
      id: actor.id,
      name: actor.name,
      localizedName: localizationTextMap.get(actor.localized_name) ?? null,
      color: actor.color,
    }));
  }

  private transformLocalizations(
    localizations: Localization[],
    tagCategories: LocalizationTagCategory[],
    localizationTextMap: Map<number, string | null>,
    idMaps: IdToIndexMaps,
  ): ExportLocalization[] {
    return localizations.map((loc) => {
      const tagIndices = this.resolveLocalizationTagIndices(loc, tagCategories, idMaps);

      return {
        id: loc.id,
        name: loc.name,
        text: localizationTextMap.get(loc.id) ?? null,
        tagIndices,
      };
    });
  }

  private resolveLocalizationTagIndices(
    loc: Localization,
    categories: LocalizationTagCategory[],
    idMaps: IdToIndexMaps,
  ): number[] {
    const indices: number[] = [];

    for (const cat of categories) {
      const column = tagCategoryIdToColumn(cat.id);
      const valueId = (loc as Record<string, unknown>)[column] as number | null;

      if (valueId === null || valueId === undefined) {
        indices.push(-1);
      } else {
        const mapping = idMaps.localizationTagValues.get(valueId);
        if (mapping) {
          indices.push(mapping[1]);
        } else {
          indices.push(-1);
        }
      }
    }

    return indices;
  }

  private transformPropertyTemplates(templates: PropertyTemplate[]): ExportPropertyTemplate[] {
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      type: this.propertyTypeIdToName(t.type),
    }));
  }

  private propertyTypeIdToName(typeId: number): ExportPropertyTypeName {
    switch (typeId) {
      case PROPERTY_TYPE_STRING.id:
        return 'string';
      case PROPERTY_TYPE_INTEGER.id:
        return 'integer';
      case PROPERTY_TYPE_DECIMAL.id:
        return 'decimal';
      case PROPERTY_TYPE_BOOLEAN.id:
        return 'boolean';
      default:
        return 'string';
    }
  }
}
