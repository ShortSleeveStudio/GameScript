#include "TestRig/GameScriptTestRigListener.h"
#include "TestRig/GameScriptTestRigContext.h"
#include "GSCompletionHandle.h"
#include "Editor.h"

void UGameScriptTestRigListener::SetContext(UGameScriptTestRigContext* InContext)
{
	Context = InContext;
}

void UGameScriptTestRigListener::CancelPendingTimers()
{
	if (GEditor && AutoAdvanceTimerHandle.IsValid())
	{
		GEditor->GetTimerManager()->ClearTimer(AutoAdvanceTimerHandle);
		AutoAdvanceTimerHandle.Invalidate();
	}
}

void UGameScriptTestRigListener::OnConversationEnter_Implementation(FConversationRef Conversation, UGSCompletionHandle* Handle)
{
	// Note: Timer cancellation and state clearing is handled by Context->StartConversation() before this is called

	// Immediately ready to proceed
	if (Handle)
	{
		Handle->NotifyReady();
	}
}

void UGameScriptTestRigListener::OnNodeEnter_Implementation(FNodeRef Node, UGSCompletionHandle* Handle)
{
	// Nothing to do on node enter in test rig
	// Immediately ready to proceed
	if (Handle)
	{
		Handle->NotifyReady();
	}
}

void UGameScriptTestRigListener::OnSpeech_Implementation(FNodeRef Node, UGSCompletionHandle* Handle)
{
	if (!Context)
	{
		if (Handle)
		{
			Handle->NotifyReady();
		}
		return;
	}

	// Get speaker name
	FActorRef Actor = Node.GetActor();
	FString SpeakerName;
	if (Actor.IsValid())
	{
		SpeakerName = Actor.GetName();
	}
	if (SpeakerName.IsEmpty())
	{
		SpeakerName = TEXT("<Unknown>");
	}

	// Get dialogue text
	FString VoiceText = Node.GetVoiceText();

	// Add to history
	if (!VoiceText.IsEmpty())
	{
		Context->AddHistoryItem(SpeakerName, VoiceText);
	}

	// Cancel any pending auto-advance timer before setting a new one
	// This prevents stale timers from firing on old handles
	CancelPendingTimers();

	// Auto-advance after delay (like Unity's 1-second pause between speech)
	if (Handle && GEditor)
	{
		TWeakObjectPtr<UGSCompletionHandle> WeakHandle(Handle);
		GEditor->GetTimerManager()->SetTimer(
			AutoAdvanceTimerHandle,
			[WeakHandle]()
			{
				if (UGSCompletionHandle* StrongHandle = WeakHandle.Get())
				{
					// Only call NotifyReady if handle is still valid
					// (hasn't been released back to pool)
					if (StrongHandle->IsValid())
					{
						StrongHandle->NotifyReady();
					}
					else
					{
						UE_LOG(LogTemp, Warning, TEXT("[TestRigListener] Handle no longer valid when timer fired"));
					}
				}
			},
			AutoAdvanceDelay,
			false
		);
	}
	else if (Handle)
	{
		// Fallback if no editor timer manager
		Handle->NotifyReady();
	}
}

void UGameScriptTestRigListener::OnDecision_Implementation(const TArray<FNodeRef>& Choices, UGSCompletionHandle* Handle)
{
	// Cancel auto-advance timer if running
	CancelPendingTimers();

	if (!Context)
	{
		// Can't proceed without context - select first choice if available
		if (Handle && Choices.Num() > 0)
		{
			Handle->SelectChoiceByIndex(0);
		}
		return;
	}

	// Store choices and handle for UI
	// Note: SetChoices() calls SetState(WaitingForChoice) which calls NotifyUIUpdate()
	Context->SetChoices(Choices);
	Context->SetCurrentHandle(Handle);
}

void UGameScriptTestRigListener::OnNodeExit_Implementation(FNodeRef Node, UGSCompletionHandle* Handle)
{
	// Clear choices when leaving a node
	if (Context)
	{
		Context->ClearChoices();
		Context->SetCurrentHandle(nullptr);

		// Update state if we were waiting for a choice
		if (Context->GetState() == ETestRigState::WaitingForChoice)
		{
			Context->SetState(ETestRigState::Running);
		}
	}

	// Immediately ready to proceed
	if (Handle)
	{
		Handle->NotifyReady();
	}
}

void UGameScriptTestRigListener::OnConversationExit_Implementation(FConversationRef Conversation, UGSCompletionHandle* Handle)
{
	// Add completion message to history
	if (Context)
	{
		FString ConvName = Conversation.IsValid() ? Conversation.GetName() : TEXT("Unknown");
		Context->AddHistoryItem(TEXT("[System]"), FString::Printf(TEXT("Conversation '%s' ended."), *ConvName));
		Context->SetState(ETestRigState::Ready);
	}

	// Immediately ready to proceed (cleanup happens in OnCleanup)
	if (Handle)
	{
		Handle->NotifyReady();
	}
}

void UGameScriptTestRigListener::OnConversationCancelled_Implementation(FConversationRef Conversation, UGSCompletionHandle* Handle)
{
	// Cancel any pending timers
	CancelPendingTimers();

	if (Context)
	{
		Context->ClearChoices();
		Context->SetCurrentHandle(nullptr);
		Context->AddHistoryItem(TEXT("[System]"), TEXT("Conversation cancelled."));
		Context->SetState(ETestRigState::Ready);
	}

	// Could add fade-out animation here:
	// await animation, then call Handle->NotifyReady()

	// Immediately ready to proceed
	if (Handle)
	{
		Handle->NotifyReady();
	}
}

void UGameScriptTestRigListener::OnError_Implementation(FConversationRef Conversation, const FString& ErrorMessage, UGSCompletionHandle* Handle)
{
	if (Context)
	{
		Context->SetState(ETestRigState::Error, ErrorMessage);
		Context->AddHistoryItem(TEXT("[Error]"), ErrorMessage);
	}

	// Could show error UI here:
	// show modal, wait for user to dismiss, then call Handle->NotifyReady()

	// Immediately ready to proceed
	if (Handle)
	{
		Handle->NotifyReady();
	}
}

void UGameScriptTestRigListener::OnCleanup_Implementation(FConversationRef Conversation, UGSCompletionHandle* Handle)
{
	// Cancel any pending timers
	CancelPendingTimers();

	if (Context)
	{
		Context->SetCurrentHandle(nullptr);
	}

	// Final cleanup - immediately ready to proceed
	if (Handle)
	{
		Handle->NotifyReady();
	}
}

FNodeRef UGameScriptTestRigListener::OnAutoDecision_Implementation(const TArray<FNodeRef>& Choices)
{
	// For auto-decisions (hidden edges), just pick the first choice
	if (Choices.Num() > 0)
	{
		return Choices[0];
	}
	return FNodeRef();
}
