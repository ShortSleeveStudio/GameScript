#include "GSCompletionHandle.h"
#include "RunnerContext.h"
#include "GameScript.h"

void UGSCompletionHandle::NotifyReady()
{
	if (!OwnerContext.IsValid())
	{
		// Context was destroyed - silently ignore
		return;
	}

	// Call back to owner context
	// Note: OnListenerReady calls ReleaseHandle which invalidates this handle.
	// We must NOT call Invalidate() here because:
	// 1. ReleaseHandle already does it
	// 2. The handle may be reused during the state transition in OnListenerReady
	//    (e.g., NodeEnter -> ActionAndSpeech acquires the same handle)
	// 3. Calling Invalidate after OnListenerReady returns would corrupt the new use
	OwnerContext->OnListenerReady(ContextID);
}

void UGSCompletionHandle::SelectChoice(FNodeRef Choice)
{
	if (!OwnerContext.IsValid())
	{
		// Context was destroyed - silently ignore
		return;
	}

	// Call back to owner context
	// Note: OnListenerChoice calls ReleaseHandle which invalidates this handle.
	// See NotifyReady() comment for why we don't call Invalidate() here.
	OwnerContext->OnListenerChoice(Choice, ContextID);
}

void UGSCompletionHandle::SelectChoiceByIndex(int32 ChoiceIndex)
{
	if (!OwnerContext.IsValid())
	{
		// Context was destroyed - silently ignore
		return;
	}

	// Call back to owner context
	// Note: OnListenerChoiceByIndex calls ReleaseHandle which invalidates this handle.
	// See NotifyReady() comment for why we don't call Invalidate() here.
	OwnerContext->OnListenerChoiceByIndex(ChoiceIndex, ContextID);
}

void UGSCompletionHandle::Initialize(URunnerContext* InOwner, int32 InContextID)
{
	OwnerContext = InOwner;
	ContextID = InContextID;
}

void UGSCompletionHandle::Invalidate()
{
	OwnerContext = nullptr;
	ContextID = -1;
}

bool UGSCompletionHandle::IsValid() const
{
	return OwnerContext.IsValid() && ContextID >= 0;
}
