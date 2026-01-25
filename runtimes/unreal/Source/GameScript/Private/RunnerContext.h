#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "IDialogueContext.h"
#include "IGameScriptListener.h"
#include <atomic>
#include "RunnerContext.generated.h"

// Forward declarations
class UGameScriptRunner;
class UGameScriptDatabase;
class UGameplayTask;
class UGSCompletionHandle;
class UGameplayTasksComponent;

/**
 * State machine for individual conversation execution.
 * Pooled and reused by GameScriptRunner.
 *
 * State Flow:
 * ConversationEnter → NodeEnter → ActionAndSpeech → EvaluateEdges →
 * (Decision/AutoDecision) → NodeExit → (loop or ConversationExit) → Cleanup → Idle
 *
 * Features:
 * - Context-ID validation prevents stale listener completions
 * - Atomic cancellation flag for cooperative task cancellation
 * - Implements IDialogueContext for action/condition access to node data
 */
UCLASS()
class URunnerContext : public UObject, public IDialogueContext
{
	GENERATED_BODY()

public:
	URunnerContext();

	/**
	 * Initialize context for a new conversation.
	 */
	void Initialize(
		UGameScriptRunner* InRunner,
		int32 InConversationId,
		TScriptInterface<IGameScriptListener> InListener,
		UGameplayTasksComponent* InTaskOwner
	);

	/**
	 * Start executing the conversation.
	 * Begins state machine at ConversationEnter.
	 */
	void Start();

	/**
	 * Cancel the conversation (triggers cleanup and idle).
	 */
	void Cancel();

	/**
	 * Check if this context is currently active.
	 */
	bool IsActive() const { return bIsActive; }

	/**
	 * Get the unique context ID (stable across pool operations).
	 */
	int32 GetContextId() const { return ContextId; }

	/**
	 * Get the sequence number (for handle validation after reuse).
	 */
	int32 GetSequence() const { return Sequence; }

	/**
	 * Called by completion handle when listener calls NotifyReady().
	 */
	void OnListenerReady(int32 ContextID);

	/**
	 * Called by completion handle when listener calls SelectChoice().
	 */
	void OnListenerChoice(FNodeRef Choice, int32 ContextID);

	/**
	 * Called by completion handle when listener calls SelectChoiceByIndex().
	 */
	void OnListenerChoiceByIndex(int32 ChoiceIndex, int32 ContextID);

	// --- IDialogueContext Implementation ---

	virtual bool IsCancelled() const override;
	virtual int32 GetNodeId() const override;
	virtual int32 GetConversationId() const override;
	virtual FActorRef GetActor() const override;
	virtual FString GetVoiceText() const override;
	virtual FString GetUIResponseText() const override;
	virtual int32 GetPropertyCount() const override;
	virtual FNodePropertyRef GetProperty(int32 Index) const override;
	virtual UGameplayTasksComponent* GetTaskOwner() const override;

private:
	// State machine states
	enum class EState
	{
		Idle,
		ConversationEnter,
		NodeEnter,
		ActionAndSpeech,
		EvaluateEdges,
		NodeExit,
		ConversationExit,
		Cleanup
	};

	EState CurrentState = EState::Idle;

	// Context data (UPROPERTY for GC safety)
	UPROPERTY()
	TObjectPtr<UGameScriptRunner> Runner = nullptr;

	UPROPERTY()
	TObjectPtr<UGameScriptDatabase> Database = nullptr;

	int32 ConversationId = -1;
	TScriptInterface<IGameScriptListener> Listener;

	// Task owner for latent actions
	UPROPERTY()
	TWeakObjectPtr<UGameplayTasksComponent> TaskOwner;

	// Current node
	FNodeRef CurrentNode;

	// Active task (for latent actions - UPROPERTY for GC safety)
	UPROPERTY()
	TObjectPtr<UGameplayTask> ActiveTask = nullptr;

	// Pending completion handle (acquired from Runner pool, released after use)
	UPROPERTY()
	UGSCompletionHandle* PendingHandle = nullptr;

	// Cancellation - simple atomic bool, no pool needed since each context needs exactly one
	std::atomic<bool> bIsCancelled{false};
	bool bIsActive = false;

	// Context-ID validation (prevents stale completions)
	int32 CurrentEventID = 0;

	// Unique context identifier (stable across pool operations, matches Unity pattern)
	int32 ContextId = -1;

	// Handle validation (incremented on each reuse)
	int32 Sequence = 0;

	// Static counter for unique context IDs
	static int32 NextContextId;

	// Concurrent action+speech tracking (matches Unity behavior)
	// Both action and speech run simultaneously for dialogue nodes
	bool bActionCompleted = false;
	bool bSpeechCompleted = false;

	// Valid choices (for decision state)
	TArray<FNodeRef> ValidChoices;
	TArray<FNodeRef> HighestPriorityChoices;  // Subset of ValidChoices with highest edge priority

	// Actor consistency tracking (computed during FindValidChoices to avoid extra loop)
	bool bAllChoicesSameActor = true;

	// Node being exited (stored before advancing to next node)
	FNodeRef NodeToExit;

	// --- State Machine Methods ---

	void EnterConversationEnter();
	void EnterNodeEnter();
	void EnterActionAndSpeech();
	void EnterEvaluateEdges();
	void EnterNodeExit();
	void EnterConversationExit();
	void EnterCleanup();

	// --- Transition Methods ---

	void TransitionTo(EState NewState);

	// --- Callbacks ---

	UFUNCTION()
	void OnActionCompleted();

	UFUNCTION()
	void OnActionCancelled();

	// --- Helpers ---

	void ExecuteAction(FNodeRef Node);
	bool EvaluateCondition(FNodeRef Node);
	void FindValidChoices();
	int32 GenerateContextID();

	/**
	 * Check if both action and speech have completed.
	 * Called after either completes to transition to EvaluateEdges when both done.
	 */
	void CheckActionAndSpeechComplete();
};
