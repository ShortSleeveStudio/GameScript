#include "GameScriptBuildValidation.h"
#include "GameScriptDatabase.h"
#include "JumpTableBuilder.h"
#include "Attributes.h"
#include "Refs.h"
#include "Editor.h"

FDelegateHandle FGameScriptBuildValidation::PIEValidationHandle;

bool FGameScriptBuildValidation::Validate(TArray<FString>& OutErrors)
{
	OutErrors.Reset();

	// Get editor instance of database
	UGameScriptDatabase* Database = UGameScriptDatabase::EditorInstance;
	if (!Database)
	{
		// No database loaded - skip validation
		return true;
	}

	// Build jump tables from registered functions
	TArray<ConditionDelegate> Conditions;
	TArray<ActionDelegate> Actions;
	FJumpTableBuilder::BuildJumpTables(Database, Conditions, Actions);

	// Create presence arrays (bool is cheaper than checking for nullptr in tight loop)
	int32 NodeCount = Database->GetNodeCount();
	TArray<bool> ConditionPresence;
	TArray<bool> ActionPresence;
	ConditionPresence.SetNumZeroed(NodeCount);
	ActionPresence.SetNumZeroed(NodeCount);

	for (int32 i = 0; i < NodeCount; ++i)
	{
		ConditionPresence[i] = (Conditions[i] != nullptr);
		ActionPresence[i] = (Actions[i] != nullptr);
	}

	// Validate each node
	for (int32 i = 0; i < NodeCount; ++i)
	{
		ValidateNode(Database, i, ConditionPresence, ActionPresence, OutErrors);
	}

	return OutErrors.Num() == 0;
}

bool FGameScriptBuildValidation::ValidateAndLog()
{
	TArray<FString> Errors;
	bool bSuccess = Validate(Errors);

	if (!bSuccess)
	{
		UE_LOG(LogTemp, Error, TEXT(""));
		UE_LOG(LogTemp, Error, TEXT("=============================================="));
		UE_LOG(LogTemp, Error, TEXT("GameScript Build Validation Failed"));
		UE_LOG(LogTemp, Error, TEXT("=============================================="));
		UE_LOG(LogTemp, Error, TEXT(""));
		UE_LOG(LogTemp, Error, TEXT("Found %d error(s):"), Errors.Num());
		UE_LOG(LogTemp, Error, TEXT(""));

		for (int32 i = 0; i < Errors.Num(); ++i)
		{
			UE_LOG(LogTemp, Error, TEXT("  %d. %s"), i + 1, *Errors[i]);
		}

		UE_LOG(LogTemp, Error, TEXT(""));
		UE_LOG(LogTemp, Error, TEXT("Fix: Add the missing methods or remove the condition/action flags"));
		UE_LOG(LogTemp, Error, TEXT("     from the nodes in GameScript."));
		UE_LOG(LogTemp, Error, TEXT(""));
		UE_LOG(LogTemp, Error, TEXT("=============================================="));
		UE_LOG(LogTemp, Error, TEXT(""));
	}

	return bSuccess;
}

void FGameScriptBuildValidation::RegisterPIEValidation()
{
	if (GEditor && !PIEValidationHandle.IsValid())
	{
		PIEValidationHandle = FEditorDelegates::PreBeginPIE.AddStatic(&FGameScriptBuildValidation::OnPreBeginPIE);
	}
}

void FGameScriptBuildValidation::UnregisterPIEValidation()
{
	if (PIEValidationHandle.IsValid())
	{
		FEditorDelegates::PreBeginPIE.Remove(PIEValidationHandle);
		PIEValidationHandle.Reset();
	}
}

void FGameScriptBuildValidation::ValidateNode(
	const UGameScriptDatabase* Database,
	int32 NodeIndex,
	const TArray<bool>& ConditionPresence,
	const TArray<bool>& ActionPresence,
	TArray<FString>& OutErrors)
{
	FNodeRef Node = Database->GetNodeByIndex(NodeIndex);
	if (!Node.IsValid())
	{
		return;
	}

	int32 NodeId = Node.GetId();
	int32 ConversationId = Node.GetConversationId();
	FString ConversationName = UGameScriptDatabase::EditorGetConversationName(ConversationId);

	// Check condition
	if (Node.HasCondition() && !ConditionPresence[NodeIndex])
	{
		OutErrors.Add(FString::Printf(
			TEXT("Node %d in \"%s\" has HasCondition=true but no [NODE_CONDITION(%d)] method found."),
			NodeId,
			*ConversationName,
			NodeId
		));
	}

	// Check action
	if (Node.HasAction() && !ActionPresence[NodeIndex])
	{
		OutErrors.Add(FString::Printf(
			TEXT("Node %d in \"%s\" has HasAction=true but no [NODE_ACTION(%d)] method found."),
			NodeId,
			*ConversationName,
			NodeId
		));
	}
}

FString FGameScriptBuildValidation::GetConversationName(const UGameScriptDatabase* Database, int32 ConversationIndex)
{
	FConversationRef Conv = Database->GetConversationByIndex(ConversationIndex);
	if (Conv.IsValid())
	{
		return Conv.GetName();
	}
	return TEXT("<unknown>");
}

void FGameScriptBuildValidation::OnPreBeginPIE(bool bIsSimulating)
{
	// Run validation before PIE starts
	// Note: This doesn't block PIE from starting - just logs errors
	ValidateAndLog();
}
