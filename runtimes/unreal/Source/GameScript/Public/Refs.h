#pragma once

#include "CoreMinimal.h"
#include "Refs.generated.h"

// Forward declarations
class UGameScriptDatabase;
class UGameScriptManifest;
namespace GameScriptSchema
{
	struct Conversation;
	struct Node;
	struct Edge;
	struct Actor;
	struct Localization;
	struct Locale;
	struct NodeProperty;
	struct ConversationProperty;
}

/**
 * Node types (mirrors FlatBuffers schema).
 */
UENUM(BlueprintType)
enum class ENodeType : uint8
{
	Root = 0,
	Dialogue = 1,
	Logic = 2
};

/**
 * Edge types (mirrors FlatBuffers schema).
 */
UENUM(BlueprintType)
enum class EEdgeType : uint8
{
	Default = 0,
	Hidden = 1
};

/**
 * Property value types (mirrors FlatBuffers schema).
 * Named EGSPropertyType to avoid collision with Unreal's EPropertyType.
 */
UENUM(BlueprintType)
enum class EGSPropertyType : uint8
{
	String = 0,
	Integer = 1,
	Decimal = 2,
	Boolean = 3
};

/**
 * Lightweight reference wrappers for FlatBuffers entities.
 * Non-owning - database must outlive all refs.
 * Zero allocation - wraps pointer + index for direct FlatBuffers access.
 *
 * CRITICAL LIFETIME REQUIREMENTS:
 * - Refs are non-owning value types that directly access FlatBuffers memory via the Database pointer
 * - The Database MUST outlive all ref instances
 * - Storing refs beyond the Database lifetime results in dangling pointers and undefined behavior
 * - Refs are designed for immediate use (function parameters, local variables, return values)
 * - DO NOT store refs as long-lived member variables unless you can guarantee the Database outlives the containing object
 * - DO NOT modify Database or Index fields after construction - these are immutable value types
 *
 * STRING ALLOCATION BEHAVIOR:
 * - String accessors (GetName, GetVoiceText, GetUIResponseText, etc.) allocate new FString instances on every call
 * - For frequently accessed strings (e.g., UI text updated every frame), cache the result in a local variable
 * - Example efficient usage:
 *     FString VoiceText = Node.GetVoiceText();  // Cache once
 *     DialogueText->SetText(FText::FromString(VoiceText));  // Reuse
 * - Avoid calling string accessors in tight loops or per-frame updates without caching
 */

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FConversationRef
{
	GENERATED_BODY()

	FConversationRef() : Database(nullptr), Index(-1) {}
	FConversationRef(const UGameScriptDatabase* InDatabase, int32 InIndex)
		: Database(InDatabase), Index(InIndex) {}

	bool IsValid() const { return Database != nullptr && Index >= 0; }

	bool operator==(const FConversationRef& Other) const { return Database == Other.Database && Index == Other.Index; }
	bool operator!=(const FConversationRef& Other) const { return !(*this == Other); }

	// Accessors (implemented in Refs.cpp)
	FString GetName() const;
	int32 GetId() const;
	FNodeRef GetRootNode() const;

	// Node access (for iterating all nodes in conversation)
	int32 GetNodeCount() const;
	FNodeRef GetNode(int32 NodeIndex) const;

	// Edge access (for iterating all edges in conversation)
	int32 GetEdgeCount() const;
	FEdgeRef GetEdge(int32 EdgeIndex) const;

	// Property access
	int32 GetPropertyCount() const;
	FConversationPropertyRef GetProperty(int32 PropertyIndex) const;

	const UGameScriptDatabase* Database;
	int32 Index;
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FNodeRef
{
	GENERATED_BODY()

	FNodeRef() : Database(nullptr), Index(-1) {}
	FNodeRef(const UGameScriptDatabase* InDatabase, int32 InIndex)
		: Database(InDatabase), Index(InIndex) {}

	bool IsValid() const { return Database != nullptr && Index >= 0; }

	bool operator==(const FNodeRef& Other) const { return Database == Other.Database && Index == Other.Index; }
	bool operator!=(const FNodeRef& Other) const { return !(*this == Other); }

	// Accessors (implemented in Refs.cpp)
	int32 GetId() const;
	int32 GetConversationId() const;
	FConversationRef GetConversation() const;  // Direct ref to parent conversation
	ENodeType GetType() const;
	FString GetVoiceText() const;
	FString GetUIResponseText() const;
	FActorRef GetActor() const;
	bool HasCondition() const;
	bool HasAction() const;
	bool IsPreventResponse() const;
	int32 GetOutgoingEdgeCount() const;
	FEdgeRef GetOutgoingEdge(int32 EdgeIndex) const;
	int32 GetIncomingEdgeCount() const;
	FEdgeRef GetIncomingEdge(int32 EdgeIndex) const;
	int32 GetPropertyCount() const;
	FNodePropertyRef GetProperty(int32 PropertyIndex) const;

	const UGameScriptDatabase* Database;
	int32 Index;
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FEdgeRef
{
	GENERATED_BODY()

	FEdgeRef() : Database(nullptr), Index(-1) {}
	FEdgeRef(const UGameScriptDatabase* InDatabase, int32 InIndex)
		: Database(InDatabase), Index(InIndex) {}

	bool IsValid() const { return Database != nullptr && Index >= 0; }

	bool operator==(const FEdgeRef& Other) const { return Database == Other.Database && Index == Other.Index; }
	bool operator!=(const FEdgeRef& Other) const { return !(*this == Other); }

	// Accessors (implemented in GameScriptDatabase.cpp)
	int32 GetId() const;
	EEdgeType GetType() const;
	FNodeRef GetSource() const;
	FNodeRef GetTarget() const;
	int32 GetPriority() const;
	// ... additional accessors

	const UGameScriptDatabase* Database;
	int32 Index;
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FActorRef
{
	GENERATED_BODY()

	FActorRef() : Database(nullptr), Index(-1) {}
	FActorRef(const UGameScriptDatabase* InDatabase, int32 InIndex)
		: Database(InDatabase), Index(InIndex) {}

	bool IsValid() const { return Database != nullptr && Index >= 0; }

	bool operator==(const FActorRef& Other) const { return Database == Other.Database && Index == Other.Index; }
	bool operator!=(const FActorRef& Other) const { return !(*this == Other); }

	// Accessors (implemented in Refs.cpp)
	int32 GetId() const;
	FString GetName() const;           // Internal name/identifier
	FString GetLocalizedName() const;  // Display name for UI
	FString GetColor() const;          // Hex color (e.g., "#808080")

	const UGameScriptDatabase* Database;
	int32 Index;
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FLocalizationRef
{
	GENERATED_BODY()

	FLocalizationRef() : Database(nullptr), Index(-1) {}
	FLocalizationRef(const UGameScriptDatabase* InDatabase, int32 InIndex)
		: Database(InDatabase), Index(InIndex) {}

	bool IsValid() const { return Database != nullptr && Index >= 0; }

	bool operator==(const FLocalizationRef& Other) const { return Database == Other.Database && Index == Other.Index; }
	bool operator!=(const FLocalizationRef& Other) const { return !(*this == Other); }

	// Accessors (implemented in GameScriptDatabase.cpp)
	int32 GetId() const;
	FString GetKey() const;
	FString GetText() const;
	// ... additional accessors

	const UGameScriptDatabase* Database;
	int32 Index;
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FLocaleRef
{
	GENERATED_BODY()

	FLocaleRef() : Manifest(nullptr), Index(-1) {}
	FLocaleRef(const UGameScriptManifest* InManifest, int32 InIndex)
		: Manifest(InManifest), Index(InIndex) {}

	bool IsValid() const { return Manifest != nullptr && Index >= 0; }

	bool operator==(const FLocaleRef& Other) const { return Manifest == Other.Manifest && Index == Other.Index; }
	bool operator!=(const FLocaleRef& Other) const { return !(*this == Other); }

	// Accessors (implemented in Refs.cpp)
	int32 GetId() const;
	FString GetCode() const;
	FString GetName() const;
	// ... additional accessors

	const UGameScriptManifest* Manifest;
	int32 Index;
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FNodePropertyRef
{
	GENERATED_BODY()

	FNodePropertyRef() : Database(nullptr), NodeIndex(-1), PropertyIndex(-1) {}
	FNodePropertyRef(const UGameScriptDatabase* InDatabase, int32 InNodeIndex, int32 InPropertyIndex)
		: Database(InDatabase), NodeIndex(InNodeIndex), PropertyIndex(InPropertyIndex) {}

	bool IsValid() const { return Database != nullptr && NodeIndex >= 0 && PropertyIndex >= 0; }

	bool operator==(const FNodePropertyRef& Other) const { return Database == Other.Database && NodeIndex == Other.NodeIndex && PropertyIndex == Other.PropertyIndex; }
	bool operator!=(const FNodePropertyRef& Other) const { return !(*this == Other); }

	// Accessors (implemented in Refs.cpp)
	FString GetName() const;
	EGSPropertyType GetType() const;

	// Typed value accessors - check GetType() first or use TryGet variants
	FString GetStringValue() const;
	int32 GetIntValue() const;
	float GetFloatValue() const;
	bool GetBoolValue() const;

	// Safe typed accessors - return false if type doesn't match
	bool TryGetString(FString& OutValue) const;
	bool TryGetInt(int32& OutValue) const;
	bool TryGetFloat(float& OutValue) const;
	bool TryGetBool(bool& OutValue) const;

	const UGameScriptDatabase* Database;
	int32 NodeIndex;        // Index of node in snapshot
	int32 PropertyIndex;    // Index of property within node's properties array
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FConversationPropertyRef
{
	GENERATED_BODY()

	FConversationPropertyRef() : Database(nullptr), ConversationIndex(-1), PropertyIndex(-1) {}
	FConversationPropertyRef(const UGameScriptDatabase* InDatabase, int32 InConversationIndex, int32 InPropertyIndex)
		: Database(InDatabase), ConversationIndex(InConversationIndex), PropertyIndex(InPropertyIndex) {}

	bool IsValid() const { return Database != nullptr && ConversationIndex >= 0 && PropertyIndex >= 0; }

	bool operator==(const FConversationPropertyRef& Other) const { return Database == Other.Database && ConversationIndex == Other.ConversationIndex && PropertyIndex == Other.PropertyIndex; }
	bool operator!=(const FConversationPropertyRef& Other) const { return !(*this == Other); }

	// Accessors (implemented in Refs.cpp)
	FString GetName() const;
	EGSPropertyType GetType() const;

	// Typed value accessors - check GetType() first or use TryGet variants
	FString GetStringValue() const;
	int32 GetIntValue() const;
	float GetFloatValue() const;
	bool GetBoolValue() const;

	// Safe typed accessors - return false if type doesn't match
	bool TryGetString(FString& OutValue) const;
	bool TryGetInt(int32& OutValue) const;
	bool TryGetFloat(float& OutValue) const;
	bool TryGetBool(bool& OutValue) const;

	const UGameScriptDatabase* Database;
	int32 ConversationIndex;  // Index of conversation in snapshot
	int32 PropertyIndex;      // Index of property within conversation's properties array
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FPropertyTemplateRef
{
	GENERATED_BODY()

	FPropertyTemplateRef() : Database(nullptr), Index(-1) {}
	FPropertyTemplateRef(const UGameScriptDatabase* InDatabase, int32 InIndex)
		: Database(InDatabase), Index(InIndex) {}

	bool IsValid() const { return Database != nullptr && Index >= 0; }

	bool operator==(const FPropertyTemplateRef& Other) const { return Database == Other.Database && Index == Other.Index; }
	bool operator!=(const FPropertyTemplateRef& Other) const { return !(*this == Other); }

	// Accessors (implemented in Refs.cpp)
	int32 GetId() const;
	FString GetName() const;
	FString GetType() const;  // "string", "int", "decimal", "bool"
	FString GetDefaultValue() const;
	// ... additional accessors

	const UGameScriptDatabase* Database;
	int32 Index;
};
