/**
 * Snapshot Serializer
 *
 * Serializes LocaleSnapshot data into FlatBuffers binary format.
 */

import * as flatbuffers from 'flatbuffers';
import {
  Snapshot,
  Conversation,
  Node,
  Edge,
  Actor,
  Localization,
  PropertyTemplate,
  NodeProperty,
  StringArray,
  NodeType,
  EdgeType,
  PropertyType,
  PropertyValue,
  Int32Value,
  FloatValue,
  BoolValue,
} from './generated/game-script.js';
import type {
  LocaleSnapshot,
  ExportConversation,
  ExportNode,
  ExportEdge,
  ExportActor,
  ExportLocalization,
  ExportPropertyTemplate,
  ExportNodeProperty,
} from './types.js';

/**
 * Serialize a LocaleSnapshot into a FlatBuffers binary buffer.
 */
export function serializeSnapshot(data: LocaleSnapshot): Uint8Array {
  const builder = new flatbuffers.Builder(1024);

  // Build all nested structures first (FlatBuffers requires bottom-up construction)

  // 0. Locale metadata
  const localeNameOffset = builder.createString(data.localeName);

  // 1. Property templates
  const propertyTemplateOffsets = data.propertyTemplates.map((pt) =>
    buildPropertyTemplate(builder, pt),
  );
  const propertyTemplatesVector =
    propertyTemplateOffsets.length > 0
      ? Snapshot.createPropertyTemplatesVector(builder, propertyTemplateOffsets)
      : 0;

  // 2. Actors
  const actorOffsets = data.actors.map((a) => buildActor(builder, a));
  const actorsVector =
    actorOffsets.length > 0 ? Snapshot.createActorsVector(builder, actorOffsets) : 0;

  // 3. Edges
  const edgeOffsets = data.edges.map((e) => buildEdge(builder, e));
  const edgesVector = edgeOffsets.length > 0 ? Snapshot.createEdgesVector(builder, edgeOffsets) : 0;

  // 4. Nodes (need edges already built for indices)
  const nodeOffsets = data.nodes.map((n) => buildNode(builder, n));
  const nodesVector = nodeOffsets.length > 0 ? Snapshot.createNodesVector(builder, nodeOffsets) : 0;

  // 5. Conversations
  const conversationOffsets = data.conversations.map((c) => buildConversation(builder, c));
  const conversationsVector =
    conversationOffsets.length > 0
      ? Snapshot.createConversationsVector(builder, conversationOffsets)
      : 0;

  // 6. Localizations
  const localizationOffsets = data.localizations.map((l) => buildLocalization(builder, l));
  const localizationsVector =
    localizationOffsets.length > 0
      ? Snapshot.createLocalizationsVector(builder, localizationOffsets)
      : 0;

  // 7. Conversation tags
  const convTagNameOffsets = data.conversationTagNames.map((n) => builder.createString(n));
  const convTagNamesVector =
    convTagNameOffsets.length > 0
      ? Snapshot.createConversationTagNamesVector(builder, convTagNameOffsets)
      : 0;

  const convTagValueOffsets = data.conversationTagValues.map((values) =>
    buildStringArray(builder, values),
  );
  const convTagValuesVector =
    convTagValueOffsets.length > 0
      ? Snapshot.createConversationTagValuesVector(builder, convTagValueOffsets)
      : 0;

  // 8. Localization tags
  const locTagNameOffsets = data.localizationTagNames.map((n) => builder.createString(n));
  const locTagNamesVector =
    locTagNameOffsets.length > 0
      ? Snapshot.createLocalizationTagNamesVector(builder, locTagNameOffsets)
      : 0;

  const locTagValueOffsets = data.localizationTagValues.map((values) =>
    buildStringArray(builder, values),
  );
  const locTagValuesVector =
    locTagValueOffsets.length > 0
      ? Snapshot.createLocalizationTagValuesVector(builder, locTagValueOffsets)
      : 0;

  // Build the root Snapshot table
  const snapshotOffset = Snapshot.createSnapshot(
    builder,
    data.localeId,
    localeNameOffset,
    convTagNamesVector,
    convTagValuesVector,
    conversationsVector,
    nodesVector,
    edgesVector,
    actorsVector,
    locTagNamesVector,
    locTagValuesVector,
    localizationsVector,
    propertyTemplatesVector,
  );

  // Finish with file identifier "GSPT"
  Snapshot.finishSnapshotBuffer(builder, snapshotOffset);

  return builder.asUint8Array();
}

// =============================================================================
// Builder Helpers
// =============================================================================

function buildPropertyTemplate(
  builder: flatbuffers.Builder,
  pt: ExportPropertyTemplate,
): flatbuffers.Offset {
  const nameOffset = builder.createString(pt.name);

  PropertyTemplate.startPropertyTemplate(builder);
  PropertyTemplate.addId(builder, pt.id);
  PropertyTemplate.addName(builder, nameOffset);
  PropertyTemplate.addType(builder, propertyTypeToEnum(pt.type));
  return PropertyTemplate.endPropertyTemplate(builder);
}

function buildActor(builder: flatbuffers.Builder, actor: ExportActor): flatbuffers.Offset {
  const nameOffset = builder.createString(actor.name);
  const localizedNameOffset = actor.localizedName
    ? builder.createString(actor.localizedName)
    : 0;
  const colorOffset = builder.createString(actor.color);

  Actor.startActor(builder);
  Actor.addId(builder, actor.id);
  Actor.addName(builder, nameOffset);
  if (localizedNameOffset) {
    Actor.addLocalizedName(builder, localizedNameOffset);
  }
  Actor.addColor(builder, colorOffset);
  return Actor.endActor(builder);
}

function buildEdge(builder: flatbuffers.Builder, edge: ExportEdge): flatbuffers.Offset {
  Edge.startEdge(builder);
  Edge.addId(builder, edge.id);
  Edge.addConversationIdx(builder, edge.conversationIdx);
  Edge.addSourceIdx(builder, edge.sourceIdx);
  Edge.addTargetIdx(builder, edge.targetIdx);
  Edge.addPriority(builder, edge.priority);
  Edge.addType(builder, edgeTypeToEnum(edge.type));
  return Edge.endEdge(builder);
}

function buildNode(builder: flatbuffers.Builder, node: ExportNode): flatbuffers.Offset {
  // Build strings first
  const voiceTextOffset = node.voiceText ? builder.createString(node.voiceText) : 0;
  const uiResponseTextOffset = node.uiResponseText
    ? builder.createString(node.uiResponseText)
    : 0;
  const notesOffset = node.notes ? builder.createString(node.notes) : 0;

  // Build properties
  const propertyOffsets = node.properties.map((p) => buildNodeProperty(builder, p));
  const propertiesVector =
    propertyOffsets.length > 0 ? Node.createPropertiesVector(builder, propertyOffsets) : 0;

  // Build edge index arrays
  const outgoingEdgesVector =
    node.outgoingEdgeIndices.length > 0
      ? Node.createOutgoingEdgeIndicesVector(builder, node.outgoingEdgeIndices)
      : 0;
  const incomingEdgesVector =
    node.incomingEdgeIndices.length > 0
      ? Node.createIncomingEdgeIndicesVector(builder, node.incomingEdgeIndices)
      : 0;

  Node.startNode(builder);
  Node.addId(builder, node.id);
  Node.addConversationIdx(builder, node.conversationIdx);
  Node.addType(builder, nodeTypeToEnum(node.type));
  Node.addActorIdx(builder, node.actorIdx);
  if (voiceTextOffset) {
    Node.addVoiceText(builder, voiceTextOffset);
  }
  if (uiResponseTextOffset) {
    Node.addUiResponseText(builder, uiResponseTextOffset);
  }
  Node.addHasCondition(builder, node.hasCondition);
  Node.addHasAction(builder, node.hasAction);
  Node.addIsPreventResponse(builder, node.isPreventResponse);
  Node.addPositionX(builder, node.positionX);
  Node.addPositionY(builder, node.positionY);
  if (notesOffset) {
    Node.addNotes(builder, notesOffset);
  }
  if (propertiesVector) {
    Node.addProperties(builder, propertiesVector);
  }
  if (outgoingEdgesVector) {
    Node.addOutgoingEdgeIndices(builder, outgoingEdgesVector);
  }
  if (incomingEdgesVector) {
    Node.addIncomingEdgeIndices(builder, incomingEdgesVector);
  }
  return Node.endNode(builder);
}

function buildNodeProperty(
  builder: flatbuffers.Builder,
  prop: ExportNodeProperty,
): flatbuffers.Offset {
  // Determine property value type and build the value
  let valueType = PropertyValue.NONE;
  let valueOffset: flatbuffers.Offset = 0;

  if (prop.value.stringVal !== undefined) {
    valueType = PropertyValue.string_val;
    valueOffset = builder.createString(prop.value.stringVal);
  } else if (prop.value.intVal !== undefined) {
    Int32Value.startInt32Value(builder);
    Int32Value.addValue(builder, prop.value.intVal);
    valueOffset = Int32Value.endInt32Value(builder);
    valueType = PropertyValue.int_val;
  } else if (prop.value.decimalVal !== undefined) {
    FloatValue.startFloatValue(builder);
    FloatValue.addValue(builder, prop.value.decimalVal);
    valueOffset = FloatValue.endFloatValue(builder);
    valueType = PropertyValue.decimal_val;
  } else if (prop.value.boolVal !== undefined) {
    BoolValue.startBoolValue(builder);
    BoolValue.addValue(builder, prop.value.boolVal);
    valueOffset = BoolValue.endBoolValue(builder);
    valueType = PropertyValue.bool_val;
  }

  NodeProperty.startNodeProperty(builder);
  NodeProperty.addTemplateIdx(builder, prop.templateIdx);
  NodeProperty.addValueType(builder, valueType);
  if (valueOffset) {
    NodeProperty.addValue(builder, valueOffset);
  }
  return NodeProperty.endNodeProperty(builder);
}

function buildConversation(
  builder: flatbuffers.Builder,
  conv: ExportConversation,
): flatbuffers.Offset {
  const nameOffset = builder.createString(conv.name);
  const notesOffset = conv.notes ? builder.createString(conv.notes) : 0;

  const tagIndicesVector =
    conv.tagIndices.length > 0
      ? Conversation.createTagIndicesVector(builder, conv.tagIndices)
      : 0;
  const nodeIndicesVector =
    conv.nodeIndices.length > 0
      ? Conversation.createNodeIndicesVector(builder, conv.nodeIndices)
      : 0;
  const edgeIndicesVector =
    conv.edgeIndices.length > 0
      ? Conversation.createEdgeIndicesVector(builder, conv.edgeIndices)
      : 0;

  Conversation.startConversation(builder);
  Conversation.addId(builder, conv.id);
  Conversation.addName(builder, nameOffset);
  if (notesOffset) {
    Conversation.addNotes(builder, notesOffset);
  }
  Conversation.addIsLayoutAuto(builder, conv.isLayoutAuto);
  Conversation.addIsLayoutVertical(builder, conv.isLayoutVertical);
  if (tagIndicesVector) {
    Conversation.addTagIndices(builder, tagIndicesVector);
  }
  if (nodeIndicesVector) {
    Conversation.addNodeIndices(builder, nodeIndicesVector);
  }
  if (edgeIndicesVector) {
    Conversation.addEdgeIndices(builder, edgeIndicesVector);
  }
  Conversation.addRootNodeIdx(builder, conv.rootNodeIdx);
  return Conversation.endConversation(builder);
}

function buildLocalization(
  builder: flatbuffers.Builder,
  loc: ExportLocalization,
): flatbuffers.Offset {
  const nameOffset = loc.name ? builder.createString(loc.name) : 0;
  const textOffset = loc.text ? builder.createString(loc.text) : 0;
  const tagIndicesVector =
    loc.tagIndices.length > 0 ? Localization.createTagIndicesVector(builder, loc.tagIndices) : 0;

  Localization.startLocalization(builder);
  Localization.addId(builder, loc.id);
  if (nameOffset) {
    Localization.addName(builder, nameOffset);
  }
  if (textOffset) {
    Localization.addText(builder, textOffset);
  }
  if (tagIndicesVector) {
    Localization.addTagIndices(builder, tagIndicesVector);
  }
  return Localization.endLocalization(builder);
}

function buildStringArray(builder: flatbuffers.Builder, values: string[]): flatbuffers.Offset {
  const stringOffsets = values.map((v) => builder.createString(v));
  const valuesVector =
    stringOffsets.length > 0 ? StringArray.createValuesVector(builder, stringOffsets) : 0;

  StringArray.startStringArray(builder);
  if (valuesVector) {
    StringArray.addValues(builder, valuesVector);
  }
  return StringArray.endStringArray(builder);
}

// =============================================================================
// Enum Converters
// =============================================================================

function nodeTypeToEnum(type: string): NodeType {
  switch (type) {
    case 'root':
      return NodeType.Root;
    case 'dialogue':
      return NodeType.Dialogue;
    default:
      return NodeType.Dialogue;
  }
}

function edgeTypeToEnum(type: string): EdgeType {
  switch (type) {
    case 'default':
      return EdgeType.Default;
    case 'hidden':
      return EdgeType.Hidden;
    default:
      return EdgeType.Default;
  }
}

function propertyTypeToEnum(type: string): PropertyType {
  switch (type) {
    case 'string':
      return PropertyType.String;
    case 'integer':
      return PropertyType.Integer;
    case 'decimal':
      return PropertyType.Decimal;
    case 'boolean':
      return PropertyType.Boolean;
    default:
      return PropertyType.String;
  }
}
