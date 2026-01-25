#pragma once

#include "CoreMinimal.h"
#include "Ids.generated.h"

/**
 * Type-safe ID wrappers for GameScript entities.
 * Used in serialized properties (details panels, Blueprints).
 * Custom property drawers provide name display + searchable pickers.
 */

// Note: All ID types prefixed with "FGS" to avoid conflicts with Unreal Engine types
// (e.g., FEdgeId conflicts with Engine's FEdgeID in MeshTypes.h)

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FGSConversationId
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GameScript")
	int32 Value = -1;

	constexpr FGSConversationId() = default;
	constexpr explicit FGSConversationId(int32 InValue) : Value(InValue) {}

	constexpr bool IsValid() const { return Value >= 0; }
	constexpr bool operator==(const FGSConversationId& Other) const { return Value == Other.Value; }
	constexpr bool operator!=(const FGSConversationId& Other) const { return Value != Other.Value; }
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FGSActorId
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GameScript")
	int32 Value = -1;

	constexpr FGSActorId() = default;
	constexpr explicit FGSActorId(int32 InValue) : Value(InValue) {}

	constexpr bool IsValid() const { return Value >= 0; }
	constexpr bool operator==(const FGSActorId& Other) const { return Value == Other.Value; }
	constexpr bool operator!=(const FGSActorId& Other) const { return Value != Other.Value; }
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FGSNodeId
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GameScript")
	int32 Value = -1;

	constexpr FGSNodeId() = default;
	constexpr explicit FGSNodeId(int32 InValue) : Value(InValue) {}

	constexpr bool IsValid() const { return Value >= 0; }
	constexpr bool operator==(const FGSNodeId& Other) const { return Value == Other.Value; }
	constexpr bool operator!=(const FGSNodeId& Other) const { return Value != Other.Value; }
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FGSEdgeId
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GameScript")
	int32 Value = -1;

	constexpr FGSEdgeId() = default;
	constexpr explicit FGSEdgeId(int32 InValue) : Value(InValue) {}

	constexpr bool IsValid() const { return Value >= 0; }
	constexpr bool operator==(const FGSEdgeId& Other) const { return Value == Other.Value; }
	constexpr bool operator!=(const FGSEdgeId& Other) const { return Value != Other.Value; }
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FGSLocalizationId
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GameScript")
	int32 Value = -1;

	constexpr FGSLocalizationId() = default;
	constexpr explicit FGSLocalizationId(int32 InValue) : Value(InValue) {}

	constexpr bool IsValid() const { return Value >= 0; }
	constexpr bool operator==(const FGSLocalizationId& Other) const { return Value == Other.Value; }
	constexpr bool operator!=(const FGSLocalizationId& Other) const { return Value != Other.Value; }
};

USTRUCT(BlueprintType)
struct GAMESCRIPT_API FGSLocaleId
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GameScript")
	int32 Value = -1;

	constexpr FGSLocaleId() = default;
	constexpr explicit FGSLocaleId(int32 InValue) : Value(InValue) {}

	constexpr bool IsValid() const { return Value >= 0; }
	constexpr bool operator==(const FGSLocaleId& Other) const { return Value == Other.Value; }
	constexpr bool operator!=(const FGSLocaleId& Other) const { return Value != Other.Value; }
};
