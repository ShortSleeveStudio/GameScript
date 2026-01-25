#pragma once

#include "CoreMinimal.h"

/**
 * Validates that all nodes with HasCondition or HasAction have corresponding
 * attributed methods. Called before PIE or builds to catch missing implementations.
 */
class GAMESCRIPTEDITOR_API FGameScriptBuildValidation
{
public:
	/**
	 * Validates the current snapshot against registered jump table entries.
	 *
	 * @param OutErrors Array to populate with error messages
	 * @return True if validation passed, false if errors were found
	 */
	static bool Validate(TArray<FString>& OutErrors);

	/**
	 * Logs validation errors to the output log.
	 * Returns false if validation failed.
	 */
	static bool ValidateAndLog();

	/**
	 * Registers PIE pre-start validation hook.
	 * Call this from the editor module's StartupModule().
	 */
	static void RegisterPIEValidation();

	/**
	 * Unregisters PIE validation hook.
	 * Call this from the editor module's ShutdownModule().
	 */
	static void UnregisterPIEValidation();

private:
	/**
	 * Validates a single node against the jump tables.
	 */
	static void ValidateNode(
		const class UGameScriptDatabase* Database,
		int32 NodeIndex,
		const TArray<bool>& ConditionPresence,
		const TArray<bool>& ActionPresence,
		TArray<FString>& OutErrors
	);

	/**
	 * Gets the conversation name for error messages.
	 */
	static FString GetConversationName(const class UGameScriptDatabase* Database, int32 ConversationIndex);

	/**
	 * PIE start callback for validation.
	 */
	static void OnPreBeginPIE(bool bIsSimulating);

	/** Delegate handle for PIE callback */
	static FDelegateHandle PIEValidationHandle;
};
