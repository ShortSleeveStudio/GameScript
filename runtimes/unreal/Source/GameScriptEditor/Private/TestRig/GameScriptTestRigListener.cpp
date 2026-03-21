#include "TestRig/GameScriptTestRigListener.h"
#include "TestRig/GameScriptTestRigContext.h"
#include "GSCompletionHandle.h"
#include "GameScriptRunner.h"
#include "GameScriptDatabase.h"
#include "Editor.h"

// Builds resolution params for a localization, matching Unity's ConversationUI.BuildResolutionParams.
// - Provides feminine gender override for dynamic subject actors
// - Reads TemplateString/Count node properties for templated localizations
static FTextResolutionParams BuildResolutionParams(
	UGameScriptTestRigContext* Ctx,
	FLocalizationRef Localization,
	FNodeRef Node)
{
	FTextResolutionParams Params;

	// Check the localization's SUBJECT actor (who the text is about), not the
	// node's speaker actor. Provide feminine override for dynamic subject actors.
	int32 SubjectIdx = Localization.GetSubjectActorIdx();
	if (SubjectIdx >= 0 && Ctx && Ctx->GetDatabase())
	{
		FActorRef SubjectActor = Ctx->GetDatabase()->GetActorByIndex(SubjectIdx);
		if (SubjectActor.IsValid() && SubjectActor.GetGrammaticalGender() == EGSGrammaticalGender::Dynamic)
		{
			Params.SetGenderOverride(EGSGenderCategory::Feminine);
		}
	}

	// is_templated lives on the localization, not as a node property
	if (!Localization.IsTemplated())
	{
		return Params;
	}

	// Read template args from node properties
	FString TemplateName;
	bool bHasCount = false;
	int32 Count = 0;

	int32 PropCount = Node.GetPropertyCount();
	for (int32 i = 0; i < PropCount; i++)
	{
		FNodePropertyRef Prop = Node.GetProperty(i);
		FString PropName = Prop.GetName();

		FString StringVal;
		int32 IntVal;
		if (PropName == TEXT("TemplateString") && Prop.TryGetString(StringVal))
		{
			TemplateName = StringVal;
		}
		else if (PropName == TEXT("Count") && Prop.TryGetInt(IntVal))
		{
			bHasCount = true;
			Count = IntVal;
		}
	}

	if (TemplateName.IsEmpty())
	{
		return Params;
	}

	if (bHasCount)
	{
		Params.SetPlural(FGSPluralArg(TemplateName, Count));
	}
	else
	{
		Params.Args.Add(FGSArg::String(TemplateName, TEXT("TESTING")));
	}

	return Params;
}

void UGameScriptTestRigListener::SetContext(UGameScriptTestRigContext* InContext)
{
	Context = InContext;
}

FTextResolutionParams UGameScriptTestRigListener::OnSpeechParams_Implementation(FLocalizationRef Localization, FNodeRef Node)
{
	return BuildResolutionParams(Context, Localization, Node);
}

FTextResolutionParams UGameScriptTestRigListener::OnDecisionParams_Implementation(FLocalizationRef Localization, FNodeRef Node)
{
	return BuildResolutionParams(Context, Localization, Node);
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

void UGameScriptTestRigListener::OnSpeech_Implementation(FNodeRef Node, const FString& VoiceText, UGSCompletionHandle* Handle)
{
	if (!Context)
	{
		if (Handle)
		{
			Handle->NotifyReady();
		}
		return;
	}

	// Get speaker name (prefer localized name, fall back to internal name)
	FActorRef Actor = Node.GetActor();
	FString SpeakerName;
	if (Actor.IsValid())
	{
		SpeakerName = Actor.GetLocalizedName();
		if (SpeakerName.IsEmpty())
		{
			SpeakerName = Actor.GetName();
		}
	}
	if (SpeakerName.IsEmpty())
	{
		SpeakerName = TEXT("<Actor Missing>");
	}

	// Add to history (VoiceText is pre-resolved by the runner)
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

void UGameScriptTestRigListener::OnDecision_Implementation(const TArray<FChoiceRef>& Choices, UGSCompletionHandle* Handle)
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

FChoiceRef UGameScriptTestRigListener::OnAutoDecision_Implementation(const TArray<FChoiceRef>& Choices)
{
	// For auto-decisions (hidden edges), just pick the first choice
	if (Choices.Num() > 0)
	{
		return Choices[0];
	}
	return FChoiceRef();
}
