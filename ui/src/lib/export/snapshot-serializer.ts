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
  TextVariant,
  PropertyTemplate,
  NodeProperty,
  ConversationProperty,
  StringArray,
  NodeType,
  EdgeType,
  PropertyType,
  PropertyValue,
  Int32Value,
  FloatValue,
  BoolValue,
  PluralCategory,
  GenderCategory,
  GrammaticalGender,
} from '@gamescript/flatbuffers';
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
  ExportTextVariant,
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

  // 2. Localizations (unified array — dialogue text, actor names, raw strings)
  const localizationOffsets = data.localizations.map((l) => buildLocalization(builder, l));
  const localizationsVector =
    localizationOffsets.length > 0
      ? Snapshot.createLocalizationsVector(builder, localizationOffsets)
      : 0;

  // 3. Actors (reference localizations by index)
  const actorOffsets = data.actors.map((a) => buildActor(builder, a));
  const actorsVector =
    actorOffsets.length > 0 ? Snapshot.createActorsVector(builder, actorOffsets) : 0;

  // 4. Edges
  const edgeOffsets = data.edges.map((e) => buildEdge(builder, e));
  const edgesVector = edgeOffsets.length > 0 ? Snapshot.createEdgesVector(builder, edgeOffsets) : 0;

  // 5. Nodes (reference localizations by index)
  const nodeOffsets = data.nodes.map((n) => buildNode(builder, n));
  const nodesVector = nodeOffsets.length > 0 ? Snapshot.createNodesVector(builder, nodeOffsets) : 0;

  // 6. Conversations
  const conversationOffsets = data.conversations.map((c) => buildConversation(builder, c));
  const conversationsVector =
    conversationOffsets.length > 0
      ? Snapshot.createConversationsVector(builder, conversationOffsets)
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

  // Build the root Snapshot table using start/add/end pattern
  Snapshot.startSnapshot(builder);
  Snapshot.addLocaleId(builder, data.localeId);
  Snapshot.addLocaleName(builder, localeNameOffset);
  if (convTagNamesVector) Snapshot.addConversationTagNames(builder, convTagNamesVector);
  if (convTagValuesVector) Snapshot.addConversationTagValues(builder, convTagValuesVector);
  if (conversationsVector) Snapshot.addConversations(builder, conversationsVector);
  if (nodesVector) Snapshot.addNodes(builder, nodesVector);
  if (edgesVector) Snapshot.addEdges(builder, edgesVector);
  if (actorsVector) Snapshot.addActors(builder, actorsVector);
  if (locTagNamesVector) Snapshot.addLocalizationTagNames(builder, locTagNamesVector);
  if (locTagValuesVector) Snapshot.addLocalizationTagValues(builder, locTagValuesVector);
  if (localizationsVector) Snapshot.addLocalizations(builder, localizationsVector);
  if (propertyTemplatesVector) Snapshot.addPropertyTemplates(builder, propertyTemplatesVector);
  const snapshotOffset = Snapshot.endSnapshot(builder);

  // Finish with file identifier "GSP3"
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
  const colorOffset = builder.createString(actor.color);

  Actor.startActor(builder);
  Actor.addId(builder, actor.id);
  Actor.addName(builder, nameOffset);
  Actor.addColor(builder, colorOffset);
  Actor.addGrammaticalGender(builder, grammaticalGenderToEnum(actor.grammaticalGender));
  Actor.addLocalizedNameIdx(builder, actor.localizedNameIdx);
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
  // Always write localization indices explicitly — FlatBuffers int32 default is 0, not -1
  Node.addVoiceTextIdx(builder, node.voiceTextIdx);
  Node.addUiResponseTextIdx(builder, node.uiResponseTextIdx);
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

/**
 * Build a property value offset and determine its type.
 * Shared helper for node and conversation properties.
 */
function buildPropertyValue(
  builder: flatbuffers.Builder,
  value: ExportNodeProperty['value'],
): { type: PropertyValue; offset: flatbuffers.Offset } {
  if (value.stringVal !== undefined) {
    return {
      type: PropertyValue.string_val,
      offset: builder.createString(value.stringVal),
    };
  } else if (value.intVal !== undefined) {
    Int32Value.startInt32Value(builder);
    Int32Value.addValue(builder, value.intVal);
    return {
      type: PropertyValue.int_val,
      offset: Int32Value.endInt32Value(builder),
    };
  } else if (value.decimalVal !== undefined) {
    FloatValue.startFloatValue(builder);
    FloatValue.addValue(builder, value.decimalVal);
    return {
      type: PropertyValue.decimal_val,
      offset: FloatValue.endFloatValue(builder),
    };
  } else if (value.boolVal !== undefined) {
    BoolValue.startBoolValue(builder);
    BoolValue.addValue(builder, value.boolVal);
    return {
      type: PropertyValue.bool_val,
      offset: BoolValue.endBoolValue(builder),
    };
  }
  return { type: PropertyValue.NONE, offset: 0 };
}

function buildNodeProperty(
  builder: flatbuffers.Builder,
  prop: ExportNodeProperty,
): flatbuffers.Offset {
  const { type: valueType, offset: valueOffset } = buildPropertyValue(builder, prop.value);

  NodeProperty.startNodeProperty(builder);
  NodeProperty.addTemplateIdx(builder, prop.templateIdx);
  NodeProperty.addValueType(builder, valueType);
  if (valueOffset) {
    NodeProperty.addValue(builder, valueOffset);
  }
  return NodeProperty.endNodeProperty(builder);
}

function buildConversationProperty(
  builder: flatbuffers.Builder,
  prop: ExportConversationProperty,
): flatbuffers.Offset {
  const { type: valueType, offset: valueOffset } = buildPropertyValue(builder, prop.value);

  ConversationProperty.startConversationProperty(builder);
  ConversationProperty.addTemplateIdx(builder, prop.templateIdx);
  ConversationProperty.addValueType(builder, valueType);
  if (valueOffset) {
    ConversationProperty.addValue(builder, valueOffset);
  }
  return ConversationProperty.endConversationProperty(builder);
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

  // Build conversation properties
  const propertyOffsets = conv.properties.map((p) => buildConversationProperty(builder, p));
  const propertiesVector =
    propertyOffsets.length > 0 ? Conversation.createPropertiesVector(builder, propertyOffsets) : 0;

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
  if (propertiesVector) {
    Conversation.addProperties(builder, propertiesVector);
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

function buildTextVariant(
  builder: flatbuffers.Builder,
  variant: ExportTextVariant,
): flatbuffers.Offset {
  const textOffset = builder.createString(variant.text);

  TextVariant.startTextVariant(builder);
  TextVariant.addPlural(builder, pluralCategoryToEnum(variant.plural));
  TextVariant.addGender(builder, genderCategoryToEnum(variant.gender));
  TextVariant.addText(builder, textOffset);
  return TextVariant.endTextVariant(builder);
}

function buildLocalization(
  builder: flatbuffers.Builder,
  loc: ExportLocalization,
): flatbuffers.Offset {
  const nameOffset = loc.name ? builder.createString(loc.name) : 0;

  // Build variants (already sorted canonically by the fetcher)
  const variantOffsets = loc.variants.map((v) => buildTextVariant(builder, v));
  const variantsVector =
    variantOffsets.length > 0 ? Localization.createVariantsVector(builder, variantOffsets) : 0;

  const tagIndicesVector =
    loc.tagIndices.length > 0 ? Localization.createTagIndicesVector(builder, loc.tagIndices) : 0;

  Localization.startLocalization(builder);
  Localization.addId(builder, loc.id);
  if (nameOffset) {
    Localization.addName(builder, nameOffset);
  }
  // Always write subject_actor_idx explicitly — FlatBuffers int32 defaults to 0, not -1
  Localization.addSubjectActorIdx(builder, loc.subjectActorIdx);
  // subject_gender: enum default is 0 = Other, skip the add when null (saves space)
  if (loc.subjectGender !== null) {
    Localization.addSubjectGender(builder, genderCategoryToEnum(loc.subjectGender));
  }
  Localization.addIsTemplated(builder, loc.isTemplated);
  if (variantsVector) {
    Localization.addVariants(builder, variantsVector);
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
    case 'logic':
      return NodeType.Logic;
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

function pluralCategoryToEnum(plural: string): PluralCategory {
  switch (plural) {
    case 'zero':
      return PluralCategory.Zero;
    case 'one':
      return PluralCategory.One;
    case 'two':
      return PluralCategory.Two;
    case 'few':
      return PluralCategory.Few;
    case 'many':
      return PluralCategory.Many;
    case 'other':
      return PluralCategory.Other;
    default:
      return PluralCategory.Other;
  }
}

function genderCategoryToEnum(gender: string): GenderCategory {
  switch (gender) {
    case 'other':
      return GenderCategory.Other;
    case 'masculine':
      return GenderCategory.Masculine;
    case 'feminine':
      return GenderCategory.Feminine;
    case 'neuter':
      return GenderCategory.Neuter;
    default:
      return GenderCategory.Other;
  }
}

function grammaticalGenderToEnum(gender: string): GrammaticalGender {
  switch (gender) {
    case 'other':
      return GrammaticalGender.Other;
    case 'masculine':
      return GrammaticalGender.Masculine;
    case 'feminine':
      return GrammaticalGender.Feminine;
    case 'neuter':
      return GrammaticalGender.Neuter;
    case 'dynamic':
      return GrammaticalGender.Dynamic;
    default:
      return GrammaticalGender.Other;
  }
}
