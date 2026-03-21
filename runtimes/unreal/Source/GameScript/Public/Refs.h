#pragma once

#include "CoreMinimal.h"
#include "TextResolutionParams.h"
#include "Refs.generated.h"

// Forward declarations
class UGameScriptDatabase;
class UGameScriptManifest;
namespace GameScript
{
	struct Conversation;
	struct Node;
	struct Edge;
	struct Actor;
	struct Localization;
	struct Locale;
	struct Snapshot;
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
 * - String accessors (GetName, GetLocalizedName, GetText, etc.) allocate new FString instances on every call
 * - For frequently accessed strings (e.g., UI text updated every frame), cache the result in a local variable
 * - Example efficient usage:
 *     FString VoiceText = Localization.GetText();  // Cache once
 *     DialogueText->SetText(FText::FromString(VoiceText));  // Reuse
 * - Avoid calling string accessors in tight loops or per-frame updates without caching
 */

// Forward declarations for ref types
struct FNodeRef;
struct FEdgeRef;
struct FActorRef;
struct FLocalizationRef;
struct FConversationPropertyRef;
struct FNodePropertyRef;
struct FChoiceRef;

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
	int32 GetVoiceTextLocalizationIdx() const;
	int32 GetUIResponseTextLocalizationIdx() const;
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

	/**
	 * Resolves gender from the snapshot without a dynamic-actor provider.
	 * Dynamic grammatical gender falls back to GenderCategory::Other.
	 * Matches Unity's NodeRef.ResolveStaticGender().
	 */
	static EGSGenderCategory ResolveStaticGender(
		const GameScript::Localization* Loc,
		const GameScript::Snapshot* Snapshot);

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

	// Accessors (implemented in Refs.cpp)
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
	int32 GetLocalizedNameIdx() const; // Index into snapshot localizations, -1 if none
	FString GetLocalizedName() const;  // Static-gender-resolved display name for UI
	EGSGrammaticalGender GetGrammaticalGender() const;
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

	// Accessors (implemented in Refs.cpp)
	int32 GetId() const;
	FString GetKey() const;
	int32 GetSubjectActorIdx() const;       // Index into snapshot actors, -1 if none
	EGSGenderCategory GetSubjectGender() const;
	bool IsTemplated() const;
	int32 GetVariantCount() const;

	/**
	 * Returns the static-gender-resolved text for this localization.
	 * Gender is resolved from the snapshot only (subject actor's grammatical gender or the
	 * localization's own gender override). Dynamic actors default to GenderCategory::Other.
	 * Plural defaults to PluralCategory::Other. No template substitution is performed.
	 * Returns empty FString if there are no variants or no variant matches.
	 */
	FString GetText() const;

	const UGameScriptDatabase* Database;
	int32 Index;
};

/**
 * Represents a candidate choice node presented to the player during a decision point.
 * Wraps a snapshot node index together with the runner-resolved UI response text, so
 * the listener never needs to call into the snapshot directly to render a choice button.
 */
USTRUCT(BlueprintType)
struct GAMESCRIPT_API FChoiceRef
{
	GENERATED_BODY()

	FChoiceRef() : Database(nullptr), Index(-1) {}
	FChoiceRef(const UGameScriptDatabase* InDatabase, int32 InIndex, const FString& InResolvedText)
		: Database(InDatabase), Index(InIndex), ResolvedUIResponseText(InResolvedText) {}

	bool IsValid() const { return Database != nullptr && Index >= 0; }

	bool operator==(const FChoiceRef& Other) const { return Database == Other.Database && Index == Other.Index; }
	bool operator!=(const FChoiceRef& Other) const { return !(*this == Other); }

	// Accessors (implemented in Refs.cpp)
	int32 GetId() const;
	ENodeType GetType() const;
	FActorRef GetActor() const;
	bool HasCondition() const;
	bool HasAction() const;
	bool IsPreventResponse() const;

	/** Returns the runner-resolved UI response text. Gender, plural, and template
	 *  substitution have already been applied. Empty if the node has no UI response text. */
	FString GetUIResponseText() const { return ResolvedUIResponseText; }

	int32 GetPropertyCount() const;
	FNodePropertyRef GetProperty(int32 PropertyIndex) const;

	/** Returns the underlying FNodeRef for this choice. */
	FNodeRef GetNode() const;

	const UGameScriptDatabase* Database;
	int32 Index;

	/** Pre-resolved UI response text stored at construction. */
	UPROPERTY(BlueprintReadOnly, Category = "GameScript")
	FString ResolvedUIResponseText;
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
