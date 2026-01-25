#include "GameScriptRunner.h"
#include "GameScriptDatabase.h"
#include "GameScriptSettings.h"
#include "JumpTableBuilder.h"
#include "RunnerContext.h"
#include "GSCompletionHandle.h"
#include "GameScript.h"
#include "GameFramework/Actor.h"
#include "GameplayTasksComponent.h"

UGameScriptRunner::UGameScriptRunner()
{
	// Default constructor (UObject requirement)
}

void UGameScriptRunner::Initialize(UGameScriptDatabase* InDatabase, UGameScriptSettings* InSettings)
{
	check(InDatabase);

	Database = InDatabase;
	Settings = InSettings;

	// Use default settings if none provided
	if (!Settings)
	{
		Settings = GetMutableDefault<UGameScriptSettings>();
	}

	// Build jump tables from global registrations
	BuildJumpTables();

	// Pre-allocate context pool
	int32 PoolSize = Settings->MaxConcurrentConversations;
	ContextPool.Reserve(PoolSize);
	ActiveContexts.Reserve(PoolSize);
}

FActiveConversation UGameScriptRunner::StartConversation(
	int32 ConversationId,
	TScriptInterface<IGameScriptListener> Listener,
	AActor* TaskOwner)
{
	if (!Listener.GetObject())
	{
		UE_LOG(LogGameScript, Error, TEXT("StartConversation failed - Listener is null"));
		return FActiveConversation();
	}

	if (!TaskOwner)
	{
		UE_LOG(LogGameScript, Error, TEXT("StartConversation failed - TaskOwner is null"));
		return FActiveConversation();
	}

	// Find conversation in database
	FConversationRef Conv = Database->FindConversation(ConversationId);
	if (!Conv.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("StartConversation failed - Conversation %d not found"), ConversationId);
		return FActiveConversation();
	}

	// Ensure TaskOwner has a UGameplayTasksComponent
	UGameplayTasksComponent* TasksComponent = TaskOwner->FindComponentByClass<UGameplayTasksComponent>();
	if (!TasksComponent)
	{
		// Add component dynamically if not present
		TasksComponent = NewObject<UGameplayTasksComponent>(TaskOwner, NAME_None, RF_Transient);
		TasksComponent->RegisterComponent();
	}

	// Acquire context from pool
	URunnerContext* Context = AcquireContext();
	if (!Context)
	{
		UE_LOG(LogGameScript, Error, TEXT("Failed to acquire context - pool exhausted"));
		return FActiveConversation();
	}

	// Initialize context (increments its own sequence counter)
	Context->Initialize(this, ConversationId, Listener, TasksComponent);

	// Get context ID and sequence for the handle
	int32 ContextId = Context->GetContextId();
	int32 Sequence = Context->GetSequence();

	// Start execution
	Context->Start();

	return FActiveConversation(ContextId, Sequence);
}

void UGameScriptRunner::StopConversation(FActiveConversation Handle)
{
	URunnerContext* Context = ValidateHandle(Handle);
	if (!Context)
	{
		return;
	}

	// Cancel the context - it will release itself via EnterCleanup
	// Don't call ReleaseContext here to avoid double-release
	Context->Cancel();
}

void UGameScriptRunner::StopAllConversations()
{
	// Collect context IDs first to avoid modifying map during iteration
	TArray<int32> ContextIds;
	ContextIds.Reserve(ActiveContexts.Num());
	for (const auto& Pair : ActiveContexts)
	{
		ContextIds.Add(Pair.Key);
	}

	// Cancel each context (Cancel() calls ReleaseContext() which removes from ActiveContexts)
	for (int32 ContextId : ContextIds)
	{
		if (TObjectPtr<URunnerContext>* ContextPtr = ActiveContexts.Find(ContextId))
		{
			URunnerContext* Context = *ContextPtr;
			if (Context && Context->IsActive())
			{
				Context->Cancel();
			}
		}
	}
}

bool UGameScriptRunner::IsActive(FActiveConversation Handle) const
{
	URunnerContext* Context = ValidateHandle(Handle);
	if (!Context)
	{
		return false;
	}

	return Context->IsActive();
}

URunnerContext* UGameScriptRunner::ValidateHandle(FActiveConversation Handle) const
{
	// Check handle validity
	if (!Handle.IsValid())
	{
		return nullptr;
	}

	// O(1) lookup by ContextId
	const TObjectPtr<URunnerContext>* ContextPtr = ActiveContexts.Find(Handle.ContextId);
	if (!ContextPtr)
	{
		return nullptr;
	}

	URunnerContext* Context = *ContextPtr;

	// Validate sequence to detect stale handles after context reuse
	if (!Context || Context->GetSequence() != Handle.Sequence)
	{
		return nullptr;
	}

	return Context;
}

URunnerContext* UGameScriptRunner::AcquireContext()
{
	URunnerContext* Context = nullptr;

	// Try to reuse from pool (O(1) pop from end)
	if (ContextPool.Num() > 0)
	{
		Context = ContextPool.Pop();
	}
	else
	{
		// Create new context with this runner as outer for proper GC
		Context = NewObject<URunnerContext>(this);
	}

	// Add to active map using context's unique ID (O(1) insert)
	ActiveContexts.Add(Context->GetContextId(), Context);
	return Context;
}

void UGameScriptRunner::ReleaseContext(URunnerContext* Context)
{
	if (!Context)
	{
		return;
	}

	// Remove from active map (O(1) removal)
	ActiveContexts.Remove(Context->GetContextId());

	// Return to pool (O(1) push to end)
	ContextPool.Add(Context);
}

UGSCompletionHandle* UGameScriptRunner::AcquireHandle()
{
	if (HandlePool.Num() > 0)
	{
		return HandlePool.Pop();
	}
	return NewObject<UGSCompletionHandle>(this);
}

void UGameScriptRunner::ReleaseHandle(UGSCompletionHandle* Handle)
{
	if (Handle)
	{
		Handle->Invalidate();
		HandlePool.Add(Handle);
	}
}

void UGameScriptRunner::BuildJumpTables()
{
	FJumpTableBuilder::BuildJumpTables(Database, Conditions, Actions);

	// Validate jump tables in development builds
#if !UE_BUILD_SHIPPING
	if (!FJumpTableBuilder::ValidateJumpTables(Database, Conditions, Actions))
	{
		UE_LOG(LogGameScript, Warning,
			TEXT("Jump table validation failed - some nodes may not execute properly. See log for details."));
	}
#endif
}
