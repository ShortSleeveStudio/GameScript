#pragma once

#include "CoreMinimal.h"
#include "Attributes.h"
#include "ActiveConversation.h"
#include "IGameScriptListener.h"
#include "GameScriptRunner.generated.h"

// Forward declarations
class UGameScriptDatabase;
class UGameScriptSettings;
class URunnerContext;
class UGSCompletionHandle;
class AActor;

/**
 * Dialogue execution engine (UObject for proper lifecycle management).
 * Manages conversation lifecycle and dispatches actions/conditions via jump tables.
 *
 * Workflow:
 * 1. Create via NewObject<UGameScriptRunner>(Outer)
 * 2. Initialize(database, settings)
 * 3. StartConversation(id, listener) -> FActiveConversation handle
 * 4. RunnerContext executes state machine, calls listener methods
 * 5. StopConversation(handle) to cancel early
 *
 * Features:
 * - O(1) action/condition dispatch via array-indexed jump tables
 * - Pooled RunnerContext for zero-allocation conversation start
 * - Multiple concurrent conversations supported
 * - UObject lifecycle management for GC safety
 *
 * Usage Examples:
 *
 * \code
 * // Example 1: Starting a conversation with a UI listener
 * class UMyDialogueWidget : public UUserWidget, public IGameScriptListener
 * {
 *     UGameScriptRunner* Runner;
 *     FActiveConversation CurrentConversation;
 *
 *     void StartDialogue(int32 ConversationId)
 *     {
 *         if (Runner->IsActive(CurrentConversation))
 *         {
 *             // Stop previous conversation before starting new one
 *             Runner->StopConversation(CurrentConversation);
 *         }
 *
 *         // Start new conversation
 *         AActor* PlayerPawn = GetOwningPlayerPawn();
 *         CurrentConversation = Runner->StartConversation(
 *             ConversationId,
 *             this,        // This widget implements IGameScriptListener
 *             PlayerPawn   // Task owner for latent actions
 *         );
 *     }
 *
 *     // Implement IGameScriptListener methods...
 *     virtual void OnSpeech_Implementation(FNodeRef Node, UGSCompletionHandle* Handle) override
 *     {
 *         DialogueText->SetText(FText::FromString(Node.GetVoiceText()));
 *         // When ready, call Handle->NotifyReady() to continue
 *     }
 * };
 *
 * // Example 2: Multiple concurrent conversations
 * void AMyNPCManager::StartAllNPCConversations()
 * {
 *     TArray<FActiveConversation> ActiveConversations;
 *
 *     for (ANPCCharacter* NPC : NPCs)
 *     {
 *         FActiveConversation Handle = Runner->StartConversation(
 *             NPC->GetConversationId(),
 *             NPC->GetDialogueComponent(),
 *             NPC
 *         );
 *         ActiveConversations.Add(Handle);
 *     }
 *
 *     // All conversations run concurrently
 * }
 *
 * // Example 3: Checking conversation status
 * void AMyNPC::Tick(float DeltaTime)
 * {
 *     if (Runner->IsActive(DialogueHandle))
 *     {
 *         // Conversation still running - keep NPC facing player
 *         FacePlayer();
 *     }
 *     else
 *     {
 *         // Conversation finished - resume normal AI
 *         ResumeAI();
 *     }
 * }
 *
 * // Example 4: Emergency stop (e.g., player leaves area)
 * void AMyNPC::OnPlayerLeaveDialogueRange()
 * {
 *     if (Runner->IsActive(DialogueHandle))
 *     {
 *         Runner->StopConversation(DialogueHandle);
 *         // IGameScriptListener::OnConversationCancelled will be called
 *     }
 * }
 * \endcode
 */
UCLASS()
class GAMESCRIPT_API UGameScriptRunner : public UObject
{
	GENERATED_BODY()

public:
	UGameScriptRunner();

	/**
	 * Initialize the runner with a database and settings.
	 * Must be called after construction via NewObject.
	 */
	void Initialize(UGameScriptDatabase* InDatabase, UGameScriptSettings* InSettings);

	/**
	 * Start a new conversation.
	 * @param ConversationId - Database ID of the conversation
	 * @param Listener - Object implementing IGameScriptListener
	 * @param TaskOwner - Actor that owns the conversation (used for latent action task ownership)
	 *                    Must have or will have a UGameplayTasksComponent added
	 * @return Handle for querying/stopping the conversation
	 */
	FActiveConversation StartConversation(
		int32 ConversationId,
		TScriptInterface<IGameScriptListener> Listener,
		AActor* TaskOwner
	);

	/**
	 * Stop a running conversation (triggers cancellation).
	 */
	void StopConversation(FActiveConversation Handle);

	/**
	 * Stop all running conversations.
	 */
	void StopAllConversations();

	/**
	 * Check if a conversation is currently active.
	 */
	bool IsActive(FActiveConversation Handle) const;

	/**
	 * Get the database.
	 */
	UGameScriptDatabase* GetDatabase() const { return Database; }

	/**
	 * Get the settings.
	 */
	UGameScriptSettings* GetSettings() const { return Settings; }

	/**
	 * Get the condition jump table (for RunnerContext).
	 * Read-only access - array indexed by node index for O(1) dispatch.
	 * Do not modify the returned array.
	 */
	const TArray<ConditionDelegate>& GetConditions() const { return Conditions; }

	/**
	 * Get the action jump table (for RunnerContext).
	 * Read-only access - array indexed by node index for O(1) dispatch.
	 * Do not modify the returned array.
	 */
	const TArray<ActionDelegate>& GetActions() const { return Actions; }

	/**
	 * Acquire a completion handle from the pool (for RunnerContext).
	 * @return A completion handle that must be released via ReleaseHandle()
	 */
	UGSCompletionHandle* AcquireHandle();

	/**
	 * Release a completion handle back to the pool (for RunnerContext).
	 */
	void ReleaseHandle(UGSCompletionHandle* Handle);

private:
	// URunnerContext needs access to ReleaseContext for self-cleanup
	friend class URunnerContext;

	UPROPERTY()
	TObjectPtr<UGameScriptDatabase> Database;

	UPROPERTY()
	TObjectPtr<UGameScriptSettings> Settings;

	// Jump tables (built once at initialization)
	TArray<ConditionDelegate> Conditions;
	TArray<ActionDelegate> Actions;

	// Pool of reusable contexts (GC-protected)
	// Using TArray as a simple free-list for idle contexts
	UPROPERTY()
	TArray<TObjectPtr<URunnerContext>> ContextPool;

	// Active contexts mapped by ContextId for O(1) lookup
	// TMap provides stable access even when other contexts are released
	UPROPERTY()
	TMap<int32, TObjectPtr<URunnerContext>> ActiveContexts;

	// Pool of reusable completion handles (GC-protected)
	UPROPERTY()
	TArray<TObjectPtr<UGSCompletionHandle>> HandlePool;

	// Sequence counter for handle validation
	int32 NextSequence = 1;

	/**
	 * Validate a conversation handle and return the context if valid.
	 * @return Context pointer if valid, nullptr otherwise
	 */
	URunnerContext* ValidateHandle(FActiveConversation Handle) const;

	/**
	 * Acquire a context from the pool.
	 */
	URunnerContext* AcquireContext();

	/**
	 * Return a context to the pool.
	 */
	void ReleaseContext(URunnerContext* Context);

	/**
	 * Build jump tables from global registrations.
	 */
	void BuildJumpTables();
};
