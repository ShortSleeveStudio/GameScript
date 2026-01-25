#pragma once

#include "CoreMinimal.h"
#include "Command.generated.h"

/**
 * Entity type constants for command files.
 */
UENUM()
enum class ECommandEntityType : uint8
{
	Conversation,
	Actor,
	Localization,
	Locale
};

/**
 * Represents a command written to command.tmp for IPC with GameScript.
 * Uses .tmp extension so Unreal ignores it (no .uasset file generated).
 */
USTRUCT()
struct GAMESCRIPT_API FGameScriptCommand
{
	GENERATED_BODY()

	static constexpr const TCHAR* Filename = TEXT("command.tmp");

	/** The action to perform (e.g., "navigate") */
	UPROPERTY()
	FString Action;

	/** The entity type (e.g., "conversation", "actor") */
	UPROPERTY()
	FString Type;

	/** The entity ID */
	UPROPERTY()
	int32 Id = -1;

	FGameScriptCommand()
		: Action(TEXT(""))
		, Type(TEXT(""))
		, Id(-1)
	{
	}

	FGameScriptCommand(const FString& InAction, const FString& InType, int32 InId)
		: Action(InAction)
		, Type(InType)
		, Id(InId)
	{
	}

	/** Convert entity type enum to string */
	static FString EntityTypeToString(ECommandEntityType EntityType)
	{
		switch (EntityType)
		{
		case ECommandEntityType::Conversation:
			return TEXT("conversation");
		case ECommandEntityType::Actor:
			return TEXT("actor");
		case ECommandEntityType::Localization:
			return TEXT("localization");
		case ECommandEntityType::Locale:
			return TEXT("locale");
		default:
			return TEXT("unknown");
		}
	}
};

/**
 * Action constants for command files.
 */
namespace CommandAction
{
	static constexpr const TCHAR* Navigate = TEXT("navigate");
}
