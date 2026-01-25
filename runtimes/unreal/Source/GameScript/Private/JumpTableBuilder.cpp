#include "JumpTableBuilder.h"
#include "GameScriptDatabase.h"
#include "GameScript.h"

void FJumpTableBuilder::BuildJumpTables(
	const UGameScriptDatabase* Database,
	TArray<ConditionDelegate>& OutConditions,
	TArray<ActionDelegate>& OutActions)
{
	check(Database);

	// 1. Build node ID to array index map
	TMap<int32, int32> NodeIdToIndex;
	BuildNodeIdToIndexMap(Database, NodeIdToIndex);

	// 2. Allocate arrays sized to node count
	int32 NodeCount = Database->GetNodeCount();
	OutConditions.SetNumZeroed(NodeCount);
	OutActions.SetNumZeroed(NodeCount);

	// 3. Place conditions from global registry
	for (FNodeConditionRegistration* Reg : GConditionRegistrations)
	{
		if (int32* Index = NodeIdToIndex.Find(Reg->NodeId))
		{
			OutConditions[*Index] = Reg->Function;
		}
		else
		{
			UE_LOG(LogGameScript, Warning,
				TEXT("Condition registered for unknown node ID: %d"), Reg->NodeId);
		}
	}

	// 4. Place actions from global registry
	for (FNodeActionRegistration* Reg : GActionRegistrations)
	{
		if (int32* Index = NodeIdToIndex.Find(Reg->NodeId))
		{
			OutActions[*Index] = Reg->Function;
		}
		else
		{
			UE_LOG(LogGameScript, Warning,
				TEXT("Action registered for unknown node ID: %d"), Reg->NodeId);
		}
	}
}

void FJumpTableBuilder::BuildNodeIdToIndexMap(
	const UGameScriptDatabase* Database,
	TMap<int32, int32>& OutMap)
{
	check(Database);

	int32 NodeCount = Database->GetNodeCount();
	OutMap.Reserve(NodeCount);

	for (int32 Index = 0; Index < NodeCount; ++Index)
	{
		FNodeRef NodeRef = Database->GetNodeByIndex(Index);
		if (NodeRef.IsValid())
		{
			int32 NodeId = NodeRef.GetId();
			OutMap.Add(NodeId, Index);
		}
	}
}

bool FJumpTableBuilder::ValidateJumpTables(
	const UGameScriptDatabase* Database,
	const TArray<ConditionDelegate>& Conditions,
	const TArray<ActionDelegate>& Actions)
{
	check(Database);

	int32 MissingConditions = 0;
	int32 MissingActions = 0;
	int32 NodeCount = Database->GetNodeCount();

	// Validate that jump table sizes match node count
	if (Conditions.Num() != NodeCount || Actions.Num() != NodeCount)
	{
		UE_LOG(LogGameScript, Error,
			TEXT("Jump table validation failed - size mismatch (Conditions: %d, Actions: %d, Nodes: %d)"),
			Conditions.Num(), Actions.Num(), NodeCount);
		return false;
	}

	// Check each node
	for (int32 Index = 0; Index < NodeCount; ++Index)
	{
		FNodeRef Node = Database->GetNodeByIndex(Index);
		if (!Node.IsValid())
		{
			continue;
		}

		// If node has condition flag, verify implementation exists
		if (Node.HasCondition() && !Conditions[Index])
		{
			UE_LOG(LogGameScript, Error,
				TEXT("Jump table validation failed - Node %d has HasCondition=true but no condition implementation found"),
				Node.GetId());
			MissingConditions++;
		}

		// If node has action flag, verify implementation exists
		if (Node.HasAction() && !Actions[Index])
		{
			UE_LOG(LogGameScript, Error,
				TEXT("Jump table validation failed - Node %d has HasAction=true but no action implementation found"),
				Node.GetId());
			MissingActions++;
		}
	}

	if (MissingConditions > 0 || MissingActions > 0)
	{
		UE_LOG(LogGameScript, Error,
			TEXT("Jump table validation failed - Missing %d conditions and %d actions"),
			MissingConditions, MissingActions);
		return false;
	}

	UE_LOG(LogGameScript, Log,
		TEXT("Jump table validation passed - All %d nodes have valid implementations"),
		NodeCount);
	return true;
}
