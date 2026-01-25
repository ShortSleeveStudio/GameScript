#include "RunnerContext.h"
#include "GameScriptRunner.h"
#include "GameScriptDatabase.h"
#include "GameScriptSettings.h"
#include "GSCompletionHandle.h"
#include "GameScript.h"
#include "GameplayTasks/DialogueActionTask.h"
#include "GameplayTasksComponent.h"
#include "Async/Async.h"

// Static counter for unique context IDs (matches Unity's s_NextContextId pattern)
int32 URunnerContext::NextContextId = 1;

URunnerContext::URunnerContext()
{
	// Assign unique ID on construction (never changes, stable across pool operations)
	ContextId = NextContextId++;
}

void URunnerContext::Initialize(
	UGameScriptRunner* InRunner,
	int32 InConversationId,
	TScriptInterface<IGameScriptListener> InListener,
	UGameplayTasksComponent* InTaskOwner)
{
	Runner = InRunner;
	Database = InRunner->GetDatabase();
	ConversationId = InConversationId;
	Listener = InListener;
	TaskOwner = InTaskOwner;
	bIsActive = false;
	CurrentState = EState::Idle;
	CurrentEventID = 0;
	Sequence++;
	ActiveTask = nullptr;
	PendingHandle = nullptr;
	bActionCompleted = false;
	bSpeechCompleted = false;

	// Reset node tracking
	CurrentNode = FNodeRef();
	NodeToExit = FNodeRef();

	// Reset choice arrays (Reset keeps capacity, avoids reallocation)
	// Reserve on first use only (when slack is 0)
	constexpr int32 DefaultChoiceCapacity = 8;  // Typical max edges per node
	if (ValidChoices.GetSlack() == 0)
	{
		ValidChoices.Reserve(DefaultChoiceCapacity);
	}
	ValidChoices.Reset();
	if (HighestPriorityChoices.GetSlack() == 0)
	{
		HighestPriorityChoices.Reserve(DefaultChoiceCapacity);
	}
	HighestPriorityChoices.Reset();

	// Reset cancellation state for new conversation
	bIsCancelled.store(false, std::memory_order_relaxed);
}

void URunnerContext::Start()
{
	bIsActive = true;
	TransitionTo(EState::ConversationEnter);
}

void URunnerContext::Cancel()
{
	// Ensure we're on the game thread for thread safety
	if (!IsInGameThread())
	{
		// Queue to game thread to prevent race conditions with listener callbacks
		TWeakObjectPtr<URunnerContext> WeakThis(this);
		Async(EAsyncExecution::TaskGraphMainThread, [WeakThis]()
		{
			if (URunnerContext* StrongThis = WeakThis.Get())
			{
				StrongThis->Cancel();
			}
		});
		return;
	}

	if (!bIsActive)
	{
		return;
	}

	// Release pending handle back to pool (invalidates it)
	if (PendingHandle)
	{
		Runner->ReleaseHandle(PendingHandle);
		PendingHandle = nullptr;
	}

	// Cancel active task
	if (ActiveTask)
	{
		ActiveTask->EndTask();
		ActiveTask = nullptr;
	}

	// Set cancellation flag (atomic for thread-safe reads from actions)
	bIsCancelled.store(true, std::memory_order_release);

	// Notify listener (store pointer before use to prevent TOCTOU race)
	FConversationRef Conv = Database->FindConversation(ConversationId);
	UObject* ListenerObj = Listener.GetObject();
	if (ListenerObj)
	{
		IGameScriptListener::Execute_OnConversationCancelled(ListenerObj, Conv);
	}

	// Transition to cleanup
	TransitionTo(EState::Cleanup);
}

void URunnerContext::OnListenerReady(int32 ContextID)
{
	// Ensure we're on the game thread
	if (!IsInGameThread())
	{
		// Queue to game thread to ensure thread safety
		// Use weak pointer to prevent dangling pointer if context is destroyed before callback executes
		TWeakObjectPtr<URunnerContext> WeakThis(this);
		Async(EAsyncExecution::TaskGraphMainThread, [WeakThis, ContextID]()
		{
			URunnerContext* StrongThis = WeakThis.Get();

			if (StrongThis)
			{
				StrongThis->OnListenerReady(ContextID);
			}
		});
		return;
	}

	// Validate context ID
	if (ContextID != CurrentEventID)
	{
		// Ignore stale completion
		return;
	}

	// Release handle back to pool (it's been used successfully)
	if (PendingHandle)
	{
		Runner->ReleaseHandle(PendingHandle);
		PendingHandle = nullptr;
	}

	// Proceed based on current state
	switch (CurrentState)
	{
	case EState::ConversationEnter:
		// Root nodes skip directly to edge evaluation (matches Unity behavior)
		if (CurrentNode.IsValid() && CurrentNode.GetType() == ENodeType::Root)
		{
			TransitionTo(EState::EvaluateEdges);
		}
		else
		{
			TransitionTo(EState::NodeEnter);
		}
		break;

	case EState::NodeEnter:
		TransitionTo(EState::ActionAndSpeech);
		break;

	case EState::ActionAndSpeech:
		// Speech completed - mark it and check if both action+speech are done
		bSpeechCompleted = true;
		CheckActionAndSpeechComplete();
		break;

	case EState::NodeExit:
		// Check if we have a valid node to continue to
		// Note: ValidChoices contains choices from the PREVIOUS node, so don't check it here
		if (CurrentNode.IsValid())
		{
			TransitionTo(EState::NodeEnter);
		}
		else
		{
			TransitionTo(EState::ConversationExit);
		}
		break;

	case EState::ConversationExit:
		TransitionTo(EState::Cleanup);
		break;

	default:
		// Unexpected state - ignore
		UE_LOG(LogGameScript, Warning, TEXT("[RunnerContext] OnListenerReady called in unexpected state %d"), (int32)CurrentState);
		break;
	}
}

void URunnerContext::OnListenerChoice(FNodeRef Choice, int32 ContextID)
{
	// Ensure we're on the game thread
	if (!IsInGameThread())
	{
		// Queue to game thread to ensure thread safety
		// Use weak pointer to prevent dangling pointer if context is destroyed before callback executes
		TWeakObjectPtr<URunnerContext> WeakThis(this);
		Async(EAsyncExecution::TaskGraphMainThread, [WeakThis, Choice, ContextID]()
		{
			URunnerContext* StrongThis = WeakThis.Get();

			if (StrongThis)
			{
				StrongThis->OnListenerChoice(Choice, ContextID);
			}
		});
		return;
	}

	// Validate context ID
	if (ContextID != CurrentEventID)
	{
		// Ignore stale completion
		return;
	}

	// Release handle back to pool (it's been used successfully)
	if (PendingHandle)
	{
		Runner->ReleaseHandle(PendingHandle);
		PendingHandle = nullptr;
	}

	// Validate choice is in valid choices
	bool bFound = false;
	for (const FNodeRef& ValidChoice : ValidChoices)
	{
		if (ValidChoice.IsValid() && Choice.IsValid() &&
			ValidChoice.GetId() == Choice.GetId())
		{
			bFound = true;
			break;
		}
	}

	if (!bFound)
	{
		UE_LOG(LogGameScript, Error,
			TEXT("Selected choice (node %d) is not in valid choices"),
			Choice.GetId());
		return;
	}

	// Set current node to selected choice (NodeToExit was already stored in EnterEvaluateEdges)
	CurrentNode = Choice;

	// Proceed to node exit
	TransitionTo(EState::NodeExit);
}

void URunnerContext::OnListenerChoiceByIndex(int32 ChoiceIndex, int32 ContextID)
{
	// Ensure we're on the game thread
	if (!IsInGameThread())
	{
		// Queue to game thread to ensure thread safety
		// Use weak pointer to prevent dangling pointer if context is destroyed before callback executes
		TWeakObjectPtr<URunnerContext> WeakThis(this);
		Async(EAsyncExecution::TaskGraphMainThread, [WeakThis, ChoiceIndex, ContextID]()
		{
			URunnerContext* StrongThis = WeakThis.Get();

			if (StrongThis)
			{
				StrongThis->OnListenerChoiceByIndex(ChoiceIndex, ContextID);
			}
		});
		return;
	}

	// Validate context ID
	if (ContextID != CurrentEventID)
	{
		// Ignore stale completion
		return;
	}

	// Release handle back to pool (it's been used successfully)
	if (PendingHandle)
	{
		Runner->ReleaseHandle(PendingHandle);
		PendingHandle = nullptr;
	}

	// Validate choice index
	if (ChoiceIndex < 0 || ChoiceIndex >= ValidChoices.Num())
	{
		UE_LOG(LogGameScript, Error,
			TEXT("Invalid choice index %d (valid range: 0-%d)"),
			ChoiceIndex, ValidChoices.Num() - 1);
		return;
	}

	// Set current node to selected choice
	CurrentNode = ValidChoices[ChoiceIndex];

	// Proceed to node exit
	TransitionTo(EState::NodeExit);
}

// --- IDialogueContext Implementation ---

bool URunnerContext::IsCancelled() const
{
	return bIsCancelled.load(std::memory_order_acquire);
}

int32 URunnerContext::GetNodeId() const
{
	return CurrentNode.IsValid() ? CurrentNode.GetId() : -1;
}

int32 URunnerContext::GetConversationId() const
{
	return ConversationId;
}

FActorRef URunnerContext::GetActor() const
{
	return CurrentNode.IsValid() ? CurrentNode.GetActor() : FActorRef();
}

FString URunnerContext::GetVoiceText() const
{
	return CurrentNode.IsValid() ? CurrentNode.GetVoiceText() : FString();
}

FString URunnerContext::GetUIResponseText() const
{
	return CurrentNode.IsValid() ? CurrentNode.GetUIResponseText() : FString();
}

int32 URunnerContext::GetPropertyCount() const
{
	return CurrentNode.IsValid() ? CurrentNode.GetPropertyCount() : 0;
}

FNodePropertyRef URunnerContext::GetProperty(int32 Index) const
{
	if (!CurrentNode.IsValid())
	{
		return FNodePropertyRef();
	}

	if (Index < 0 || Index >= CurrentNode.GetPropertyCount())
	{
		return FNodePropertyRef();
	}

	// Construct property ref with node index and property index
	return FNodePropertyRef(CurrentNode.Database, CurrentNode.Index, Index);
}

UGameplayTasksComponent* URunnerContext::GetTaskOwner() const
{
	return TaskOwner.Get();
}

// --- State Machine Methods ---

void URunnerContext::EnterConversationEnter()
{
	FConversationRef Conv = Database->FindConversation(ConversationId);
	if (!Conv.IsValid())
	{
		FString ErrorMsg = FString::Printf(TEXT("Conversation %d not found"), ConversationId);
		UE_LOG(LogGameScript, Error, TEXT("%s"), *ErrorMsg);
		IGameScriptListener::Execute_OnError(Listener.GetObject(), Conv, ErrorMsg);
		TransitionTo(EState::Cleanup);
		return;
	}

	// Get root node
	CurrentNode = Conv.GetRootNode();
	if (!CurrentNode.IsValid())
	{
		FString ErrorMsg = FString::Printf(TEXT("Conversation %d has no root node"), ConversationId);
		UE_LOG(LogGameScript, Error, TEXT("%s"), *ErrorMsg);
		IGameScriptListener::Execute_OnError(Listener.GetObject(), Conv, ErrorMsg);
		TransitionTo(EState::Cleanup);
		return;
	}

	// Acquire handle from pool and call listener
	int32 ContextID = GenerateContextID();
	PendingHandle = Runner->AcquireHandle();
	PendingHandle->Initialize(this, ContextID);
	IGameScriptListener::Execute_OnConversationEnter(Listener.GetObject(), Conv, PendingHandle);
}

void URunnerContext::EnterNodeEnter()
{
	if (!CurrentNode.IsValid())
	{
		FString ErrorMsg = TEXT("No current node - transitioning to ConversationExit");
		UE_LOG(LogGameScript, Error, TEXT("%s"), *ErrorMsg);
		FConversationRef Conv = Database->FindConversation(ConversationId);
		IGameScriptListener::Execute_OnError(Listener.GetObject(), Conv, ErrorMsg);
		TransitionTo(EState::ConversationExit);
		return;
	}

	// Acquire handle from pool and call listener
	int32 ContextID = GenerateContextID();
	PendingHandle = Runner->AcquireHandle();
	PendingHandle->Initialize(this, ContextID);
	IGameScriptListener::Execute_OnNodeEnter(Listener.GetObject(), CurrentNode, PendingHandle);
}

void URunnerContext::EnterActionAndSpeech()
{
	if (!CurrentNode.IsValid())
	{
		TransitionTo(EState::EvaluateEdges);
		return;
	}

	// Reset tracking for concurrent completion
	bActionCompleted = false;
	bSpeechCompleted = false;

	ENodeType NodeType = CurrentNode.GetType();
	bool bHasAction = CurrentNode.HasAction();
	bool bIsDialogue = (NodeType == ENodeType::Dialogue);

	if (bHasAction && bIsDialogue)
	{
		// CONCURRENT: Fire both action and speech at the same time (matches Unity)
		// Action completion is tracked via OnActionCompleted callback
		// Speech completion is tracked via OnListenerReady in ActionAndSpeech state
		ExecuteAction(CurrentNode);

		// Fire speech immediately (don't wait for action)
		int32 ContextID = GenerateContextID();
		PendingHandle = Runner->AcquireHandle();
		PendingHandle->Initialize(this, ContextID);
		IGameScriptListener::Execute_OnSpeech(Listener.GetObject(), CurrentNode, PendingHandle);
	}
	else if (bHasAction)
	{
		// Logic node with action: action only, no speech
		bSpeechCompleted = true;  // Mark speech as "done" (not needed)
		ExecuteAction(CurrentNode);
	}
	else if (bIsDialogue)
	{
		// Dialogue node without action: speech only
		bActionCompleted = true;  // Mark action as "done" (not needed)
		int32 ContextID = GenerateContextID();
		PendingHandle = Runner->AcquireHandle();
		PendingHandle->Initialize(this, ContextID);
		IGameScriptListener::Execute_OnSpeech(Listener.GetObject(), CurrentNode, PendingHandle);
	}
	else
	{
		// Logic/Root node without action: skip to edges
		TransitionTo(EState::EvaluateEdges);
	}
}

void URunnerContext::EnterEvaluateEdges()
{
	// Find valid choices
	FindValidChoices();

	if (ValidChoices.Num() == 0)
	{
		// No valid edges, conversation ends
		TransitionTo(EState::ConversationExit);
		return;
	}

	// Determine if we should show a decision prompt
	// bAllChoicesSameActor is computed during FindValidChoices() to avoid an extra loop
	bool bShouldShowDecision = false;

	// Never show decisions if current node prevents it
	if (!CurrentNode.IsPreventResponse())
	{
		if (ValidChoices.Num() > 1)
		{
			// Multiple choices = decision (only if all same actor)
			bShouldShowDecision = bAllChoicesSameActor;
		}
		else if (ValidChoices.Num() == 1 && !Runner->GetSettings()->bPreventSingleNodeChoices)
		{
			// Single choice with UI text = decision (unless settings prevent it)
			FString ResponseText = ValidChoices[0].GetUIResponseText();
			if (!ResponseText.IsEmpty())
			{
				// Only show if same actor as current node (for continuity)
				bShouldShowDecision = bAllChoicesSameActor;
			}
		}
	}

	if (bShouldShowDecision)
	{
		// Store current node for OnNodeExit (before it gets changed)
		NodeToExit = CurrentNode;

		// Player choice required: Call OnDecision
		int32 ContextID = GenerateContextID();
		PendingHandle = Runner->AcquireHandle();
		PendingHandle->Initialize(this, ContextID);
		IGameScriptListener::Execute_OnDecision(Listener.GetObject(), ValidChoices, PendingHandle);
		// Wait for listener to call SelectChoice() or SelectChoiceByIndex()
	}
	else
	{
		// Store current node for OnNodeExit (before it gets changed)
		NodeToExit = CurrentNode;

		// Auto-advance: Call OnAutoDecision with highest-priority choices (matches Unity)
		FNodeRef SelectedNode = IGameScriptListener::Execute_OnAutoDecision(
			Listener.GetObject(), HighestPriorityChoices);

		// Validate that returned node is in valid choices (not just IsValid)
		bool bFoundInChoices = false;
		if (SelectedNode.IsValid())
		{
			for (const FNodeRef& Choice : ValidChoices)
			{
				if (Choice.IsValid() && Choice.GetId() == SelectedNode.GetId())
				{
					bFoundInChoices = true;
					break;
				}
			}
		}

		if (!bFoundInChoices)
		{
			// Error: selection is not in valid choices - matches Unity behavior
			FString ErrorMsg = FString::Printf(
				TEXT("OnAutoDecision returned node (index %d) that is not in the valid choices list. Ensure your listener returns one of the provided choices."),
				SelectedNode.IsValid() ? SelectedNode.Index : -1);
			UE_LOG(LogGameScript, Error, TEXT("%s"), *ErrorMsg);
			FConversationRef Conv = Database->FindConversation(ConversationId);
			IGameScriptListener::Execute_OnError(Listener.GetObject(), Conv, ErrorMsg);
			TransitionTo(EState::Cleanup);
			return;
		}

		CurrentNode = SelectedNode;

		TransitionTo(EState::NodeExit);
	}
}

void URunnerContext::EnterNodeExit()
{
	// Use NodeToExit which was stored before advancing to the next node
	// This ensures OnNodeExit receives the node being exited, not the next node
	// Skip OnNodeExit for root nodes (matches Unity behavior)
	if (!NodeToExit.IsValid() || NodeToExit.GetType() == ENodeType::Root)
	{
		// Proceed to next state based on whether we have a valid next node
		if (CurrentNode.IsValid())
		{
			TransitionTo(EState::NodeEnter);
		}
		else
		{
			TransitionTo(EState::ConversationExit);
		}
		return;
	}

	// Acquire handle from pool and call listener
	int32 ContextID = GenerateContextID();
	PendingHandle = Runner->AcquireHandle();
	PendingHandle->Initialize(this, ContextID);
	IGameScriptListener::Execute_OnNodeExit(Listener.GetObject(), NodeToExit, PendingHandle);
}

void URunnerContext::EnterConversationExit()
{
	FConversationRef Conv = Database->FindConversation(ConversationId);

	// Acquire handle from pool and call listener
	int32 ContextID = GenerateContextID();
	PendingHandle = Runner->AcquireHandle();
	PendingHandle->Initialize(this, ContextID);
	IGameScriptListener::Execute_OnConversationExit(Listener.GetObject(), Conv, PendingHandle);
}

void URunnerContext::EnterCleanup()
{
	FConversationRef Conv = Database->FindConversation(ConversationId);

	// Call listener (synchronous)
	if (Listener.GetObject())
	{
		IGameScriptListener::Execute_OnCleanup(Listener.GetObject(), Conv);
	}

	// Release any pending handle back to pool
	if (PendingHandle)
	{
		Runner->ReleaseHandle(PendingHandle);
		PendingHandle = nullptr;
	}

	// Note: bIsCancelled is reset in Initialize() when context is reused

	// Reset node tracking
	CurrentNode = FNodeRef();
	NodeToExit = FNodeRef();

	// Reset choice arrays (Reset keeps capacity for reuse)
	ValidChoices.Reset();
	HighestPriorityChoices.Reset();

	// Clear listener reference
	Listener = nullptr;

	// Mark inactive
	bIsActive = false;
	CurrentState = EState::Idle;

	// Return context to pool (must be last - context may be reused immediately)
	// This matches Unity's behavior where the finally block releases the context
	if (Runner)
	{
		Runner->ReleaseContext(this);
	}
}

void URunnerContext::TransitionTo(EState NewState)
{
	// State machine must always run on game thread for thread safety
	check(IsInGameThread());

	CurrentState = NewState;

	switch (NewState)
	{
	case EState::ConversationEnter:
		EnterConversationEnter();
		break;
	case EState::NodeEnter:
		EnterNodeEnter();
		break;
	case EState::ActionAndSpeech:
		EnterActionAndSpeech();
		break;
	case EState::EvaluateEdges:
		EnterEvaluateEdges();
		break;
	case EState::NodeExit:
		EnterNodeExit();
		break;
	case EState::ConversationExit:
		EnterConversationExit();
		break;
	case EState::Cleanup:
		EnterCleanup();
		break;
	default:
		break;
	}
}

void URunnerContext::OnActionCompleted()
{
	ActiveTask = nullptr;

	// Mark action as complete and check if both action+speech are done
	bActionCompleted = true;
	CheckActionAndSpeechComplete();
}

void URunnerContext::OnActionCancelled()
{
	ActiveTask = nullptr;
	// Cancellation already handled by Cancel()
}

void URunnerContext::ExecuteAction(FNodeRef Node)
{
	if (!Node.IsValid())
	{
		OnActionCompleted();
		return;
	}

	// Get action delegate from jump table using node's index (O(1) access)
	const TArray<ActionDelegate>& Actions = Runner->GetActions();
	int32 NodeIndex = Node.Index;

	if (NodeIndex < 0 || NodeIndex >= Actions.Num())
	{
		UE_LOG(LogGameScript, Warning,
			TEXT("No action found for node %d"), Node.GetId());
		OnActionCompleted();
		return;
	}

	ActionDelegate Action = Actions[NodeIndex];
	if (!Action)
	{
		UE_LOG(LogGameScript, Warning,
			TEXT("Action delegate is null for node %d"), Node.GetId());
		OnActionCompleted();
		return;
	}

	// Execute action
	UGameplayTask* Task = Action(this);

	if (Task)
	{
		// Task returned - check if valid before using
		if (IsValid(Task))
		{
			// Cast to DialogueActionTask to access delegates
			// All dialogue tasks must inherit from UDialogueActionTask
			UDialogueActionTask* DialogueTask = Cast<UDialogueActionTask>(Task);
			if (DialogueTask)
			{
				// Latent action - wait for completion
				DialogueTask->GetOnCompleted().AddDynamic(this, &URunnerContext::OnActionCompleted);
				DialogueTask->GetOnCancelled().AddDynamic(this, &URunnerContext::OnActionCancelled);
				DialogueTask->ReadyForActivation();
				ActiveTask = DialogueTask;
			}
			else
			{
				// Task doesn't derive from UDialogueActionTask
				UE_LOG(LogGameScript, Error,
					TEXT("Action returned UGameplayTask that doesn't inherit from UDialogueActionTask for node %d. All dialogue tasks must use UDialogueActionTask as base class."),
					Node.GetId());
				OnActionCompleted();
			}
		}
		else
		{
			// Invalid task - log warning and proceed immediately
			UE_LOG(LogGameScript, Warning,
				TEXT("Action returned invalid task for node %d"), Node.GetId());
			OnActionCompleted();
		}
	}
	else
	{
		// Instant action (nullptr) - proceed immediately
		OnActionCompleted();
	}
}

bool URunnerContext::EvaluateCondition(FNodeRef Node)
{
	if (!Node.IsValid())
	{
		return true; // No condition = always pass
	}

	if (!Node.HasCondition())
	{
		return true;
	}

	// Get condition delegate from jump table using node's index (O(1) access)
	const TArray<ConditionDelegate>& Conditions = Runner->GetConditions();
	int32 NodeIndex = Node.Index;

	if (NodeIndex < 0 || NodeIndex >= Conditions.Num())
	{
		UE_LOG(LogGameScript, Warning,
			TEXT("No condition found for node %d"), Node.GetId());
		return true;
	}

	ConditionDelegate Condition = Conditions[NodeIndex];
	if (!Condition)
	{
		UE_LOG(LogGameScript, Warning,
			TEXT("Condition delegate is null for node %d"), Node.GetId());
		return true;
	}

	// Temporarily set current node for condition context (matches Unity behavior)
	// This ensures Context->GetNodeId(), GetActor(), etc. return the target node's data
	FNodeRef SavedNode = CurrentNode;
	CurrentNode = Node;

	bool bResult = Condition(this);

	// Restore current node
	CurrentNode = SavedNode;

	return bResult;
}

void URunnerContext::FindValidChoices()
{
	if (!CurrentNode.IsValid())
	{
		ValidChoices.Reset();
		HighestPriorityChoices.Reset();
		bAllChoicesSameActor = true;
		return;
	}

	// Get edge count - capacity is preserved from previous runs via Reset()
	int32 EdgeCount = CurrentNode.GetOutgoingEdgeCount();

	// Use Reset() instead of Empty() to keep allocated capacity (avoids reallocation)
	ValidChoices.Reset();
	HighestPriorityChoices.Reset();

	int32 HighestPriority = TNumericLimits<int32>::Min();

	// Track actor consistency during iteration (matches Unity single-loop pattern)
	bAllChoicesSameActor = true;
	int32 FirstActorId = -1;

	// Iterate through outgoing edges (already sorted by priority in snapshot)
	for (int32 i = 0; i < EdgeCount; ++i)
	{
		FEdgeRef Edge = CurrentNode.GetOutgoingEdge(i);
		if (!Edge.IsValid())
		{
			continue;
		}

		FNodeRef Target = Edge.GetTarget();
		if (!Target.IsValid())
		{
			continue;
		}

		// Check condition if present
		if (Target.HasCondition())
		{
			if (!EvaluateCondition(Target))
			{
				continue;
			}
		}

		// Valid choice - add to list
		ValidChoices.Add(Target);

		// Track actor consistency (matches Unity behavior)
		FActorRef TargetActor = Target.GetActor();
		int32 TargetActorId = TargetActor.IsValid() ? TargetActor.GetId() : -1;
		if (ValidChoices.Num() == 1)
		{
			FirstActorId = TargetActorId;
		}
		else if (bAllChoicesSameActor && TargetActorId != FirstActorId)
		{
			bAllChoicesSameActor = false;
		}

		// Track highest priority choices (matches Unity behavior)
		int32 EdgePriority = Edge.GetPriority();
		if (EdgePriority > HighestPriority)
		{
			HighestPriority = EdgePriority;
			HighestPriorityChoices.Reset();
			HighestPriorityChoices.Add(Target);
		}
		else if (EdgePriority == HighestPriority)
		{
			HighestPriorityChoices.Add(Target);
		}
	}
}

int32 URunnerContext::GenerateContextID()
{
	return ++CurrentEventID;
}

void URunnerContext::CheckActionAndSpeechComplete()
{
	// Only transition when BOTH action and speech have completed
	// This matches Unity's WhenAllAwaiter pattern for concurrent execution
	if (bActionCompleted && bSpeechCompleted)
	{
		TransitionTo(EState::EvaluateEdges);
	}
}
