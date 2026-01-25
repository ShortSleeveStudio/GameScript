#pragma once

#include "CoreMinimal.h"
#include "Command.h"

/**
 * Writes command files for IPC with GameScript IDE extension.
 */
class GAMESCRIPTEDITOR_API FGameScriptCommandWriter
{
public:
	/**
	 * Writes a navigate command to open an entity in GameScript.
	 *
	 * @param EntityType The type of entity to navigate to
	 * @param Id The entity ID
	 */
	static void Navigate(ECommandEntityType EntityType, int32 Id);

	/**
	 * Writes a navigate command to open an entity in GameScript.
	 *
	 * @param EntityTypeString The type of entity as a string (e.g., "conversation")
	 * @param Id The entity ID
	 */
	static void Navigate(const FString& EntityTypeString, int32 Id);

private:
	/**
	 * Gets the absolute path to the GameScript data directory.
	 * Returns empty string if not configured or doesn't exist.
	 */
	static FString GetGameScriptDataPath();

	/**
	 * Writes the command structure to JSON file.
	 */
	static void WriteCommandFile(const FGameScriptCommand& Command);
};
