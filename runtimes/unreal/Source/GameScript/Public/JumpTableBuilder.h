#pragma once

#include "CoreMinimal.h"
#include "Attributes.h"

// Forward declaration
class UGameScriptDatabase;

/**
 * Builds indexed jump tables from registered conditions/actions.
 * Called once during GameScriptRunner construction.
 *
 * Process:
 * 1. Build node ID to array index map from snapshot
 * 2. Allocate arrays sized to node count
 * 3. Scan global registries (GConditionRegistrations, GActionRegistrations)
 * 4. Place function pointers at their node's array index
 *
 * Result: O(1) dispatch via array indexing
 */
class GAMESCRIPT_API FJumpTableBuilder
{
public:
	/**
	 * Build jump tables for conditions and actions.
	 * @param Database - Snapshot data source (for node ID to index mapping)
	 * @param OutConditions - Output array sized to node count
	 * @param OutActions - Output array sized to node count
	 */
	static void BuildJumpTables(
		const UGameScriptDatabase* Database,
		TArray<ConditionDelegate>& OutConditions,
		TArray<ActionDelegate>& OutActions
	);

	/**
	 * Validate that all nodes with HasCondition/HasAction flags have corresponding
	 * implementations in the jump tables.
	 * @param Database - Database to validate against
	 * @param Conditions - Condition jump table to validate
	 * @param Actions - Action jump table to validate
	 * @return True if validation passed, false if missing implementations found
	 */
	static bool ValidateJumpTables(
		const UGameScriptDatabase* Database,
		const TArray<ConditionDelegate>& Conditions,
		const TArray<ActionDelegate>& Actions
	);

private:
	/**
	 * Build mapping from node ID to array index.
	 * Required because node IDs may be sparse.
	 */
	static void BuildNodeIdToIndexMap(
		const UGameScriptDatabase* Database,
		TMap<int32, int32>& OutMap
	);
};
