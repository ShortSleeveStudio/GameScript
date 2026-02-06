#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "IGameScriptListener.h"
#include "GameScriptTestRigListener.generated.h"

class UGameScriptTestRigContext;

/**
 * Listener implementation for the test rig.
 * Updates the context state in response to dialogue events.
 *
 * Pattern:
 * - On lifecycle events (OnSpeech, OnDecision, etc.), update context and optionally auto-advance
 * - Store the completion handle in context for UI to use
 * - On sync events (OnError, OnCancelled), update context state immediately
 *
 * Architecture Note:
 * - Listener is owned by Context (created via NewObject<> in Context::Initialize())
 * - Listener stores pointer back to Context (via SetContext())
 * - This is a standard callback pattern where the listener modifies owner state
 */
UCLASS()
class UGameScriptTestRigListener : public UObject, public IGameScriptListener
{
	GENERATED_BODY()

public:
	/**
	 * Set the context that this listener updates.
	 */
	void SetContext(UGameScriptTestRigContext* InContext);

	/**
	 * Cancel any pending auto-advance timers.
	 * Called when starting a new conversation or shutting down.
	 */
	void CancelPendingTimers();

	// --- IGameScriptListener Implementation ---

	virtual void OnConversationEnter_Implementation(FConversationRef Conversation, UGSCompletionHandle* Handle) override;
	virtual void OnNodeEnter_Implementation(FNodeRef Node, UGSCompletionHandle* Handle) override;
	virtual void OnSpeech_Implementation(FNodeRef Node, UGSCompletionHandle* Handle) override;
	virtual void OnDecision_Implementation(const TArray<FNodeRef>& Choices, UGSCompletionHandle* Handle) override;
	virtual void OnNodeExit_Implementation(FNodeRef Node, UGSCompletionHandle* Handle) override;
	virtual void OnConversationExit_Implementation(FConversationRef Conversation, UGSCompletionHandle* Handle) override;
	virtual void OnConversationCancelled_Implementation(FConversationRef Conversation, UGSCompletionHandle* Handle) override;
	virtual void OnError_Implementation(FConversationRef Conversation, const FString& ErrorMessage, UGSCompletionHandle* Handle) override;
	virtual void OnCleanup_Implementation(FConversationRef Conversation, UGSCompletionHandle* Handle) override;
	virtual FNodeRef OnAutoDecision_Implementation(const TArray<FNodeRef>& Choices) override;

private:
	UPROPERTY()
	TObjectPtr<UGameScriptTestRigContext> Context;

	// Timer for auto-advancing after speech (like Unity's 1-second delay)
	FTimerHandle AutoAdvanceTimerHandle;
	static constexpr float AutoAdvanceDelay = 1.0f;
};
