#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "Refs.h"
#include "IGameScriptListener.generated.h"

// Forward declaration
class UGSCompletionHandle;

/**
 * UInterface declaration for GameScript listener.
 * Implement this interface to receive dialogue events.
 */
UINTERFACE(MinimalAPI, Blueprintable)
class UGameScriptListener : public UInterface
{
	GENERATED_BODY()
};

/**
 * Listener interface for dialogue execution events.
 *
 * Lifecycle Methods:
 * - OnConversationEnter, OnNodeEnter, OnSpeech, OnDecision, OnNodeExit, OnConversationExit
 * - These are async - the runner waits for Handle->NotifyReady() or Handle->SelectChoice() to proceed
 * - Handle parameter is your "return address" - call methods on it to signal completion
 *
 * Completion Pattern:
 * - Receive UGSCompletionHandle* in lifecycle methods
 * - Do async work (display UI, play animation, etc.)
 * - Call Handle->NotifyReady() when done
 * - For decisions, call Handle->SelectChoice(Choice) or Handle->SelectChoiceByIndex(Index)
 *
 * Synchronous Events:
 * - OnCleanup, OnError, OnConversationCancelled, OnAutoDecision
 * - These are immediate notifications, no handle provided
 *
 * Safety:
 * - Handle is safe to store temporarily (in timers, callbacks, etc.)
 * - Handle automatically invalidates after use or if conversation is cancelled
 * - Multiple conversations can safely use the same listener object
 */
class GAMESCRIPT_API IGameScriptListener
{
	GENERATED_BODY()

public:
	// --- Lifecycle Events (Async - require completion signal) ---

	UFUNCTION(BlueprintNativeEvent, Category = "GameScript|Lifecycle")
	void OnConversationEnter(FConversationRef Conversation, UGSCompletionHandle* Handle);
	virtual void OnConversationEnter_Implementation(FConversationRef Conversation, UGSCompletionHandle* Handle) {}

	UFUNCTION(BlueprintNativeEvent, Category = "GameScript|Lifecycle")
	void OnNodeEnter(FNodeRef Node, UGSCompletionHandle* Handle);
	virtual void OnNodeEnter_Implementation(FNodeRef Node, UGSCompletionHandle* Handle) {}

	UFUNCTION(BlueprintNativeEvent, Category = "GameScript|Lifecycle")
	void OnSpeech(FNodeRef Node, UGSCompletionHandle* Handle);
	virtual void OnSpeech_Implementation(FNodeRef Node, UGSCompletionHandle* Handle) {}

	UFUNCTION(BlueprintNativeEvent, Category = "GameScript|Lifecycle")
	void OnDecision(const TArray<FNodeRef>& Choices, UGSCompletionHandle* Handle);
	virtual void OnDecision_Implementation(const TArray<FNodeRef>& Choices, UGSCompletionHandle* Handle) {}

	UFUNCTION(BlueprintNativeEvent, Category = "GameScript|Lifecycle")
	void OnNodeExit(FNodeRef Node, UGSCompletionHandle* Handle);
	virtual void OnNodeExit_Implementation(FNodeRef Node, UGSCompletionHandle* Handle) {}

	UFUNCTION(BlueprintNativeEvent, Category = "GameScript|Lifecycle")
	void OnConversationExit(FConversationRef Conversation, UGSCompletionHandle* Handle);
	virtual void OnConversationExit_Implementation(FConversationRef Conversation, UGSCompletionHandle* Handle) {}

	// --- Synchronous Events (Immediate notification, no handle) ---

	UFUNCTION(BlueprintNativeEvent, Category = "GameScript|Events")
	void OnCleanup(FConversationRef Conversation);
	virtual void OnCleanup_Implementation(FConversationRef Conversation) {}

	UFUNCTION(BlueprintNativeEvent, Category = "GameScript|Events")
	void OnError(FConversationRef Conversation, const FString& ErrorMessage);
	virtual void OnError_Implementation(FConversationRef Conversation, const FString& ErrorMessage) {}

	UFUNCTION(BlueprintNativeEvent, Category = "GameScript|Events")
	void OnConversationCancelled(FConversationRef Conversation);
	virtual void OnConversationCancelled_Implementation(FConversationRef Conversation) {}

	/**
	 * Called when the conversation auto-advances without player input
	 * (e.g., when IsPreventResponse is true or no UI response text).
	 * Return the node to advance to from the list of highest-priority choices.
	 *
	 * Default implementation selects randomly among the choices.
	 * Override to implement weighted selection, round-robin, or game-specific logic.
	 *
	 * @param Choices Highest-priority target nodes (all passed their conditions and share the same priority)
	 * @return The node to advance to
	 */
	UFUNCTION(BlueprintNativeEvent, Category = "GameScript|Events")
	FNodeRef OnAutoDecision(const TArray<FNodeRef>& Choices);
	virtual FNodeRef OnAutoDecision_Implementation(const TArray<FNodeRef>& Choices)
	{
		// Match Unity behavior: return random choice from provided list
		if (Choices.Num() > 0)
		{
			return Choices[FMath::RandRange(0, Choices.Num() - 1)];
		}
		return FNodeRef();
	}
};
