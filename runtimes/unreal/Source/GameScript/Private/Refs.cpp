#include "Refs.h"
#include "GameScriptDatabase.h"
#include "GameScriptManifest.h"
#include "Generated/snapshot.h"

// --- Helper Macros ---

// Check validity and return default value if invalid
// Also checks that Snapshot is not null (can happen during locale reload)
#define GAMESCRIPT_REF_CHECK_VALID(DefaultValue) \
	if (!IsValid()) { return DefaultValue; } \
	if (!Database->GetSnapshot()) { return DefaultValue; }

// Get snapshot and entity pointer (reduces duplicate boilerplate)
#define GAMESCRIPT_GET_ENTITY(EntityType, ArrayMethod, EntityVar) \
	const GameScript::Snapshot* Snapshot = Database->GetSnapshot(); \
	const GameScript::EntityType* EntityVar = Snapshot->ArrayMethod()->Get(Index);

// --- Helper Functions ---

// Helper template to convert PropertyValue union to string
// Works with both NodeProperty and ConversationProperty
template<typename TProperty>
static FString ConvertPropertyValueToString(const TProperty* Property)
{
	if (!Property)
	{
		return FString();
	}

	switch (Property->value_type())
	{
	case GameScript::PropertyValue::string_val:
		if (const auto* StringVal = Property->value_as_string_val())
		{
			return FString(UTF8_TO_TCHAR(StringVal->c_str()));
		}
		break;

	case GameScript::PropertyValue::int_val:
		if (const GameScript::Int32Value* IntVal = Property->value_as_int_val())
		{
			return FString::FromInt(IntVal->value());
		}
		break;

	case GameScript::PropertyValue::decimal_val:
		if (const GameScript::FloatValue* FloatVal = Property->value_as_decimal_val())
		{
			return FString::SanitizeFloat(FloatVal->value());
		}
		break;

	case GameScript::PropertyValue::bool_val:
		if (const GameScript::BoolValue* BoolVal = Property->value_as_bool_val())
		{
			return BoolVal->value() ? TEXT("true") : TEXT("false");
		}
		break;

	default:
		break;
	}

	return FString();
}

// --- FConversationRef ---

FString FConversationRef::GetName() const
{
	GAMESCRIPT_REF_CHECK_VALID(FString());
	GAMESCRIPT_GET_ENTITY(Conversation, conversations, Conv);
	if (Conv->name())
	{
		return FString(UTF8_TO_TCHAR(Conv->name()->c_str()));
	}
	return FString();
}

int32 FConversationRef::GetId() const
{
	GAMESCRIPT_REF_CHECK_VALID(-1);
	GAMESCRIPT_GET_ENTITY(Conversation, conversations, Conv);
	return Conv->id();
}

FNodeRef FConversationRef::GetRootNode() const
{
	GAMESCRIPT_REF_CHECK_VALID(FNodeRef());
	GAMESCRIPT_GET_ENTITY(Conversation, conversations, Conv);
	int32 RootNodeIdx = Conv->root_node_idx();
	return (RootNodeIdx >= 0) ? FNodeRef(Database, RootNodeIdx) : FNodeRef();
}

int32 FConversationRef::GetPropertyCount() const
{
	GAMESCRIPT_REF_CHECK_VALID(0);
	GAMESCRIPT_GET_ENTITY(Conversation, conversations, Conv);
	return Conv->properties() ? static_cast<int32>(Conv->properties()->size()) : 0;
}

FConversationPropertyRef FConversationRef::GetProperty(int32 PropertyIndex) const
{
	GAMESCRIPT_REF_CHECK_VALID(FConversationPropertyRef());
	GAMESCRIPT_GET_ENTITY(Conversation, conversations, Conv);

	if (!Conv->properties() || PropertyIndex < 0 || PropertyIndex >= static_cast<int32>(Conv->properties()->size()))
	{
		return FConversationPropertyRef();
	}

	return FConversationPropertyRef(Database, Index, PropertyIndex);
}

int32 FConversationRef::GetNodeCount() const
{
	GAMESCRIPT_REF_CHECK_VALID(0);
	GAMESCRIPT_GET_ENTITY(Conversation, conversations, Conv);
	return Conv->node_indices() ? static_cast<int32>(Conv->node_indices()->size()) : 0;
}

FNodeRef FConversationRef::GetNode(int32 NodeIndex) const
{
	GAMESCRIPT_REF_CHECK_VALID(FNodeRef());
	GAMESCRIPT_GET_ENTITY(Conversation, conversations, Conv);

	if (!Conv->node_indices() || NodeIndex < 0 || NodeIndex >= static_cast<int32>(Conv->node_indices()->size()))
	{
		return FNodeRef();
	}

	int32 ActualNodeIndex = Conv->node_indices()->Get(NodeIndex);
	return FNodeRef(Database, ActualNodeIndex);
}

int32 FConversationRef::GetEdgeCount() const
{
	GAMESCRIPT_REF_CHECK_VALID(0);
	GAMESCRIPT_GET_ENTITY(Conversation, conversations, Conv);
	return Conv->edge_indices() ? static_cast<int32>(Conv->edge_indices()->size()) : 0;
}

FEdgeRef FConversationRef::GetEdge(int32 EdgeIndex) const
{
	GAMESCRIPT_REF_CHECK_VALID(FEdgeRef());
	GAMESCRIPT_GET_ENTITY(Conversation, conversations, Conv);

	if (!Conv->edge_indices() || EdgeIndex < 0 || EdgeIndex >= static_cast<int32>(Conv->edge_indices()->size()))
	{
		return FEdgeRef();
	}

	int32 ActualEdgeIndex = Conv->edge_indices()->Get(EdgeIndex);
	return FEdgeRef(Database, ActualEdgeIndex);
}

// --- FNodeRef ---

int32 FNodeRef::GetId() const
{
	GAMESCRIPT_REF_CHECK_VALID(-1);
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	return Node->id();
}

int32 FNodeRef::GetConversationId() const
{
	GAMESCRIPT_REF_CHECK_VALID(-1);
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	return Snapshot->conversations()->Get(Node->conversation_idx())->id();
}

FConversationRef FNodeRef::GetConversation() const
{
	GAMESCRIPT_REF_CHECK_VALID(FConversationRef());
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	int32 ConvIdx = Node->conversation_idx();
	return (ConvIdx >= 0) ? FConversationRef(Database, ConvIdx) : FConversationRef();
}

ENodeType FNodeRef::GetType() const
{
	GAMESCRIPT_REF_CHECK_VALID(ENodeType::Logic);
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	return static_cast<ENodeType>(Node->type());
}

FString FNodeRef::GetVoiceText() const
{
	GAMESCRIPT_REF_CHECK_VALID(FString());
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	if (Node->voice_text())
	{
		return FString(UTF8_TO_TCHAR(Node->voice_text()->c_str()));
	}
	return FString();
}

FString FNodeRef::GetUIResponseText() const
{
	GAMESCRIPT_REF_CHECK_VALID(FString());
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	if (Node->ui_response_text())
	{
		return FString(UTF8_TO_TCHAR(Node->ui_response_text()->c_str()));
	}
	return FString();
}

FActorRef FNodeRef::GetActor() const
{
	GAMESCRIPT_REF_CHECK_VALID(FActorRef());
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	int32 ActorIdx = Node->actor_idx();
	return (ActorIdx >= 0) ? FActorRef(Database, ActorIdx) : FActorRef();
}

bool FNodeRef::HasCondition() const
{
	GAMESCRIPT_REF_CHECK_VALID(false);
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	return Node->has_condition();
}

bool FNodeRef::HasAction() const
{
	GAMESCRIPT_REF_CHECK_VALID(false);
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	return Node->has_action();
}

bool FNodeRef::IsPreventResponse() const
{
	GAMESCRIPT_REF_CHECK_VALID(false);
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	return Node->is_prevent_response();
}

int32 FNodeRef::GetOutgoingEdgeCount() const
{
	GAMESCRIPT_REF_CHECK_VALID(0);
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	return Node->outgoing_edge_indices() ? static_cast<int32>(Node->outgoing_edge_indices()->size()) : 0;
}

FEdgeRef FNodeRef::GetOutgoingEdge(int32 EdgeIndex) const
{
	GAMESCRIPT_REF_CHECK_VALID(FEdgeRef());
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);

	if (!Node->outgoing_edge_indices() || EdgeIndex < 0 || EdgeIndex >= static_cast<int32>(Node->outgoing_edge_indices()->size()))
	{
		return FEdgeRef();
	}

	int32 EdgeIdx = Node->outgoing_edge_indices()->Get(EdgeIndex);
	return FEdgeRef(Database, EdgeIdx);
}

int32 FNodeRef::GetIncomingEdgeCount() const
{
	GAMESCRIPT_REF_CHECK_VALID(0);
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	return Node->incoming_edge_indices() ? static_cast<int32>(Node->incoming_edge_indices()->size()) : 0;
}

FEdgeRef FNodeRef::GetIncomingEdge(int32 EdgeIndex) const
{
	GAMESCRIPT_REF_CHECK_VALID(FEdgeRef());
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);

	if (!Node->incoming_edge_indices() || EdgeIndex < 0 || EdgeIndex >= static_cast<int32>(Node->incoming_edge_indices()->size()))
	{
		return FEdgeRef();
	}

	int32 EdgeIdx = Node->incoming_edge_indices()->Get(EdgeIndex);
	return FEdgeRef(Database, EdgeIdx);
}

int32 FNodeRef::GetPropertyCount() const
{
	GAMESCRIPT_REF_CHECK_VALID(0);
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);
	return Node->properties() ? Node->properties()->size() : 0;
}

FNodePropertyRef FNodeRef::GetProperty(int32 PropertyIndex) const
{
	GAMESCRIPT_REF_CHECK_VALID(FNodePropertyRef());
	GAMESCRIPT_GET_ENTITY(Node, nodes, Node);

	if (!Node->properties() || PropertyIndex < 0 || PropertyIndex >= static_cast<int32>(Node->properties()->size()))
	{
		return FNodePropertyRef();
	}

	return FNodePropertyRef(Database, Index, PropertyIndex);
}

// --- FEdgeRef ---

int32 FEdgeRef::GetId() const
{
	GAMESCRIPT_REF_CHECK_VALID(-1);
	GAMESCRIPT_GET_ENTITY(Edge, edges, Edge);
	return Edge->id();
}

EEdgeType FEdgeRef::GetType() const
{
	GAMESCRIPT_REF_CHECK_VALID(EEdgeType::Default);
	GAMESCRIPT_GET_ENTITY(Edge, edges, Edge);
	return static_cast<EEdgeType>(Edge->type());
}

FNodeRef FEdgeRef::GetSource() const
{
	GAMESCRIPT_REF_CHECK_VALID(FNodeRef());
	GAMESCRIPT_GET_ENTITY(Edge, edges, Edge);
	return FNodeRef(Database, Edge->source_idx());
}

FNodeRef FEdgeRef::GetTarget() const
{
	GAMESCRIPT_REF_CHECK_VALID(FNodeRef());
	GAMESCRIPT_GET_ENTITY(Edge, edges, Edge);
	return FNodeRef(Database, Edge->target_idx());
}

int32 FEdgeRef::GetPriority() const
{
	GAMESCRIPT_REF_CHECK_VALID(0);
	GAMESCRIPT_GET_ENTITY(Edge, edges, Edge);
	return Edge->priority();
}

// --- FActorRef ---

int32 FActorRef::GetId() const
{
	GAMESCRIPT_REF_CHECK_VALID(-1);
	GAMESCRIPT_GET_ENTITY(Actor, actors, Actor);
	return Actor->id();
}

FString FActorRef::GetName() const
{
	GAMESCRIPT_REF_CHECK_VALID(FString());
	GAMESCRIPT_GET_ENTITY(Actor, actors, Actor);
	if (Actor->name())
	{
		return FString(UTF8_TO_TCHAR(Actor->name()->c_str()));
	}
	return FString();
}

FString FActorRef::GetLocalizedName() const
{
	GAMESCRIPT_REF_CHECK_VALID(FString());
	GAMESCRIPT_GET_ENTITY(Actor, actors, Actor);
	if (Actor->localized_name())
	{
		return FString(UTF8_TO_TCHAR(Actor->localized_name()->c_str()));
	}
	return FString();
}

FString FActorRef::GetColor() const
{
	GAMESCRIPT_REF_CHECK_VALID(FString());
	GAMESCRIPT_GET_ENTITY(Actor, actors, Actor);
	if (Actor->color())
	{
		return FString(UTF8_TO_TCHAR(Actor->color()->c_str()));
	}
	return FString();
}

// --- FLocalizationRef ---

int32 FLocalizationRef::GetId() const
{
	GAMESCRIPT_REF_CHECK_VALID(-1);
	GAMESCRIPT_GET_ENTITY(Localization, localizations, Loc);
	return Loc->id();
}

FString FLocalizationRef::GetKey() const
{
	GAMESCRIPT_REF_CHECK_VALID(FString());
	GAMESCRIPT_GET_ENTITY(Localization, localizations, Loc);
	if (Loc->name())
	{
		return FString(UTF8_TO_TCHAR(Loc->name()->c_str()));
	}
	return FString();
}

FString FLocalizationRef::GetText() const
{
	GAMESCRIPT_REF_CHECK_VALID(FString());
	GAMESCRIPT_GET_ENTITY(Localization, localizations, Loc);
	if (Loc->text())
	{
		return FString(UTF8_TO_TCHAR(Loc->text()->c_str()));
	}
	return FString();
}

// --- FLocaleRef ---

int32 FLocaleRef::GetId() const
{
	if (!IsValid())
	{
		return -1;
	}

	const FManifestLocale& LocaleMetadata = Manifest->GetLocaleMetadata(Index);
	return LocaleMetadata.Id;
}

FString FLocaleRef::GetCode() const
{
	if (!IsValid())
	{
		return FString();
	}

	const FManifestLocale& LocaleMetadata = Manifest->GetLocaleMetadata(Index);
	return LocaleMetadata.Name;
}

FString FLocaleRef::GetName() const
{
	if (!IsValid())
	{
		return FString();
	}

	const FManifestLocale& LocaleMetadata = Manifest->GetLocaleMetadata(Index);
	return LocaleMetadata.LocalizedName;
}

// --- FNodePropertyRef ---

// Helper macro to get node property safely
#define GAMESCRIPT_GET_NODE_PROPERTY(DefaultValue) \
	GAMESCRIPT_REF_CHECK_VALID(DefaultValue); \
	const GameScript::Snapshot* Snapshot = Database->GetSnapshot(); \
	const GameScript::Node* Node = Snapshot->nodes()->Get(NodeIndex); \
	if (!Node->properties() || PropertyIndex >= static_cast<int32>(Node->properties()->size())) { return DefaultValue; } \
	const GameScript::NodeProperty* Property = Node->properties()->Get(PropertyIndex);

FString FNodePropertyRef::GetName() const
{
	GAMESCRIPT_GET_NODE_PROPERTY(FString());

	int32 TemplateIdx = Property->template_idx();
	if (TemplateIdx < 0 || TemplateIdx >= static_cast<int32>(Snapshot->property_templates()->size()))
	{
		return FString();
	}

	const GameScript::PropertyTemplate* Template = Snapshot->property_templates()->Get(TemplateIdx);
	return FString(UTF8_TO_TCHAR(Template->name()->c_str()));
}

EGSPropertyType FNodePropertyRef::GetType() const
{
	GAMESCRIPT_GET_NODE_PROPERTY(EGSPropertyType::String);

	int32 TemplateIdx = Property->template_idx();
	if (TemplateIdx < 0 || TemplateIdx >= static_cast<int32>(Snapshot->property_templates()->size()))
	{
		return EGSPropertyType::String;
	}

	const GameScript::PropertyTemplate* Template = Snapshot->property_templates()->Get(TemplateIdx);
	return static_cast<EGSPropertyType>(Template->type());
}

FString FNodePropertyRef::GetStringValue() const
{
	GAMESCRIPT_GET_NODE_PROPERTY(FString());

	if (Property->value_type() == GameScript::PropertyValue::string_val)
	{
		if (const auto* StringVal = Property->value_as_string_val())
		{
			return FString(UTF8_TO_TCHAR(StringVal->c_str()));
		}
	}
	return FString();
}

int32 FNodePropertyRef::GetIntValue() const
{
	GAMESCRIPT_GET_NODE_PROPERTY(0);

	if (Property->value_type() == GameScript::PropertyValue::int_val)
	{
		if (const GameScript::Int32Value* IntVal = Property->value_as_int_val())
		{
			return IntVal->value();
		}
	}
	return 0;
}

float FNodePropertyRef::GetFloatValue() const
{
	GAMESCRIPT_GET_NODE_PROPERTY(0.0f);

	if (Property->value_type() == GameScript::PropertyValue::decimal_val)
	{
		if (const GameScript::FloatValue* FloatVal = Property->value_as_decimal_val())
		{
			return FloatVal->value();
		}
	}
	return 0.0f;
}

bool FNodePropertyRef::GetBoolValue() const
{
	GAMESCRIPT_GET_NODE_PROPERTY(false);

	if (Property->value_type() == GameScript::PropertyValue::bool_val)
	{
		if (const GameScript::BoolValue* BoolVal = Property->value_as_bool_val())
		{
			return BoolVal->value();
		}
	}
	return false;
}

bool FNodePropertyRef::TryGetString(FString& OutValue) const
{
	GAMESCRIPT_GET_NODE_PROPERTY(false);

	if (Property->value_type() == GameScript::PropertyValue::string_val)
	{
		if (const auto* StringVal = Property->value_as_string_val())
		{
			OutValue = FString(UTF8_TO_TCHAR(StringVal->c_str()));
			return true;
		}
	}
	return false;
}

bool FNodePropertyRef::TryGetInt(int32& OutValue) const
{
	GAMESCRIPT_GET_NODE_PROPERTY(false);

	if (Property->value_type() == GameScript::PropertyValue::int_val)
	{
		if (const GameScript::Int32Value* IntVal = Property->value_as_int_val())
		{
			OutValue = IntVal->value();
			return true;
		}
	}
	return false;
}

bool FNodePropertyRef::TryGetFloat(float& OutValue) const
{
	GAMESCRIPT_GET_NODE_PROPERTY(false);

	if (Property->value_type() == GameScript::PropertyValue::decimal_val)
	{
		if (const GameScript::FloatValue* FloatVal = Property->value_as_decimal_val())
		{
			OutValue = FloatVal->value();
			return true;
		}
	}
	return false;
}

bool FNodePropertyRef::TryGetBool(bool& OutValue) const
{
	GAMESCRIPT_GET_NODE_PROPERTY(false);

	if (Property->value_type() == GameScript::PropertyValue::bool_val)
	{
		if (const GameScript::BoolValue* BoolVal = Property->value_as_bool_val())
		{
			OutValue = BoolVal->value();
			return true;
		}
	}
	return false;
}

// --- FPropertyTemplateRef ---

int32 FPropertyTemplateRef::GetId() const
{
	GAMESCRIPT_REF_CHECK_VALID(-1);
	const GameScript::Snapshot* Snapshot = Database->GetSnapshot();
	const GameScript::PropertyTemplate* Template = Snapshot->property_templates()->Get(Index);
	return Template->id();
}

FString FPropertyTemplateRef::GetName() const
{
	GAMESCRIPT_REF_CHECK_VALID(FString());
	const GameScript::Snapshot* Snapshot = Database->GetSnapshot();
	const GameScript::PropertyTemplate* Template = Snapshot->property_templates()->Get(Index);
	if (Template->name())
	{
		return FString(UTF8_TO_TCHAR(Template->name()->c_str()));
	}
	return FString();
}

FString FPropertyTemplateRef::GetType() const
{
	GAMESCRIPT_REF_CHECK_VALID(FString());
	const GameScript::Snapshot* Snapshot = Database->GetSnapshot();
	const GameScript::PropertyTemplate* Template = Snapshot->property_templates()->Get(Index);

	// Map FlatBuffers enum to string
	switch (Template->type())
	{
	case GameScript::PropertyType::String:
		return TEXT("string");
	case GameScript::PropertyType::Integer:
		return TEXT("int");
	case GameScript::PropertyType::Decimal:
		return TEXT("decimal");
	case GameScript::PropertyType::Boolean:
		return TEXT("bool");
	default:
		return TEXT("unknown");
	}
}

FString FPropertyTemplateRef::GetDefaultValue() const
{
	GAMESCRIPT_REF_CHECK_VALID(FString());
	// Note: PropertyTemplate no longer has default_value in FlatBuffers v25 schema
	// Default values are only stored in actual Property instances
	return FString();
}

// --- FConversationPropertyRef ---

// Helper macro to get conversation property safely
#define GAMESCRIPT_GET_CONV_PROPERTY(DefaultValue) \
	GAMESCRIPT_REF_CHECK_VALID(DefaultValue); \
	const GameScript::Snapshot* Snapshot = Database->GetSnapshot(); \
	const GameScript::Conversation* Conversation = Snapshot->conversations()->Get(ConversationIndex); \
	if (!Conversation->properties() || PropertyIndex >= static_cast<int32>(Conversation->properties()->size())) { return DefaultValue; } \
	const GameScript::ConversationProperty* Property = Conversation->properties()->Get(PropertyIndex);

FString FConversationPropertyRef::GetName() const
{
	GAMESCRIPT_GET_CONV_PROPERTY(FString());

	int32 TemplateIdx = Property->template_idx();
	if (TemplateIdx < 0 || TemplateIdx >= static_cast<int32>(Snapshot->property_templates()->size()))
	{
		return FString();
	}

	const GameScript::PropertyTemplate* Template = Snapshot->property_templates()->Get(TemplateIdx);
	return FString(UTF8_TO_TCHAR(Template->name()->c_str()));
}

EGSPropertyType FConversationPropertyRef::GetType() const
{
	GAMESCRIPT_GET_CONV_PROPERTY(EGSPropertyType::String);

	int32 TemplateIdx = Property->template_idx();
	if (TemplateIdx < 0 || TemplateIdx >= static_cast<int32>(Snapshot->property_templates()->size()))
	{
		return EGSPropertyType::String;
	}

	const GameScript::PropertyTemplate* Template = Snapshot->property_templates()->Get(TemplateIdx);
	return static_cast<EGSPropertyType>(Template->type());
}

FString FConversationPropertyRef::GetStringValue() const
{
	GAMESCRIPT_GET_CONV_PROPERTY(FString());

	if (Property->value_type() == GameScript::PropertyValue::string_val)
	{
		if (const auto* StringVal = Property->value_as_string_val())
		{
			return FString(UTF8_TO_TCHAR(StringVal->c_str()));
		}
	}
	return FString();
}

int32 FConversationPropertyRef::GetIntValue() const
{
	GAMESCRIPT_GET_CONV_PROPERTY(0);

	if (Property->value_type() == GameScript::PropertyValue::int_val)
	{
		if (const GameScript::Int32Value* IntVal = Property->value_as_int_val())
		{
			return IntVal->value();
		}
	}
	return 0;
}

float FConversationPropertyRef::GetFloatValue() const
{
	GAMESCRIPT_GET_CONV_PROPERTY(0.0f);

	if (Property->value_type() == GameScript::PropertyValue::decimal_val)
	{
		if (const GameScript::FloatValue* FloatVal = Property->value_as_decimal_val())
		{
			return FloatVal->value();
		}
	}
	return 0.0f;
}

bool FConversationPropertyRef::GetBoolValue() const
{
	GAMESCRIPT_GET_CONV_PROPERTY(false);

	if (Property->value_type() == GameScript::PropertyValue::bool_val)
	{
		if (const GameScript::BoolValue* BoolVal = Property->value_as_bool_val())
		{
			return BoolVal->value();
		}
	}
	return false;
}

bool FConversationPropertyRef::TryGetString(FString& OutValue) const
{
	GAMESCRIPT_GET_CONV_PROPERTY(false);

	if (Property->value_type() == GameScript::PropertyValue::string_val)
	{
		if (const auto* StringVal = Property->value_as_string_val())
		{
			OutValue = FString(UTF8_TO_TCHAR(StringVal->c_str()));
			return true;
		}
	}
	return false;
}

bool FConversationPropertyRef::TryGetInt(int32& OutValue) const
{
	GAMESCRIPT_GET_CONV_PROPERTY(false);

	if (Property->value_type() == GameScript::PropertyValue::int_val)
	{
		if (const GameScript::Int32Value* IntVal = Property->value_as_int_val())
		{
			OutValue = IntVal->value();
			return true;
		}
	}
	return false;
}

bool FConversationPropertyRef::TryGetFloat(float& OutValue) const
{
	GAMESCRIPT_GET_CONV_PROPERTY(false);

	if (Property->value_type() == GameScript::PropertyValue::decimal_val)
	{
		if (const GameScript::FloatValue* FloatVal = Property->value_as_decimal_val())
		{
			OutValue = FloatVal->value();
			return true;
		}
	}
	return false;
}

bool FConversationPropertyRef::TryGetBool(bool& OutValue) const
{
	GAMESCRIPT_GET_CONV_PROPERTY(false);

	if (Property->value_type() == GameScript::PropertyValue::bool_val)
	{
		if (const GameScript::BoolValue* BoolVal = Property->value_as_bool_val())
		{
			OutValue = BoolVal->value();
			return true;
		}
	}
	return false;
}
