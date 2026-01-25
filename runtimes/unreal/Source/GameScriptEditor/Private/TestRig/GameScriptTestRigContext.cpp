#include "TestRig/GameScriptTestRigContext.h"
#include "GameScriptLoader.h"
#include "GameScriptManifest.h"
#include "GameScriptDatabase.h"
#include "GameScriptRunner.h"
#include "GameScriptSettings.h"
#include "GSCompletionHandle.h"
#include "TestRig/GameScriptTestRigListener.h"
#include "Engine/World.h"
#include "Editor.h"

UGameScriptTestRigContext::UGameScriptTestRigContext()
{
}

bool UGameScriptTestRigContext::Initialize()
{
	// Load the manifest
	Manifest = UGameScriptLoader::LoadManifest();
	if (!Manifest)
	{
		SetState(ETestRigState::Error, TEXT("Failed to load manifest. Check GameScript settings."));
		return false;
	}

	// Get or create settings
	Settings = GetMutableDefault<UGameScriptSettings>();
	if (!Settings)
	{
		SetState(ETestRigState::Error, TEXT("Failed to get GameScript settings."));
		return false;
	}

	// Load the primary locale database
	FLocaleRef PrimaryLocale = Manifest->GetPrimaryLocale();
	if (!PrimaryLocale.IsValid())
	{
		SetState(ETestRigState::Error, TEXT("No primary locale found in manifest."));
		return false;
	}

	Database = Manifest->LoadDatabase(PrimaryLocale);
	if (!Database)
	{
		SetState(ETestRigState::Error, TEXT("Failed to load database for primary locale."));
		return false;
	}

	// Create the runner
	Runner = NewObject<UGameScriptRunner>(this);
	Runner->Initialize(Database, Settings);

	// Create the listener (once, reused for all conversations)
	Listener = NewObject<UGameScriptTestRigListener>(this);
	Listener->SetContext(this);

	// Find the primary locale index
	CurrentLocaleIndex = 0;
	int32 LocaleCount = Manifest->GetLocaleCount();
	for (int32 i = 0; i < LocaleCount; i++)
	{
		FLocaleRef Locale = Manifest->GetLocale(i);
		if (Locale.GetId() == PrimaryLocale.GetId())
		{
			CurrentLocaleIndex = i;
			break;
		}
	}

	SetState(ETestRigState::Ready);
	return true;
}

void UGameScriptTestRigContext::Shutdown()
{
	// Stop any running conversation
	StopConversation();

	// Cancel listener timers
	if (Listener)
	{
		Listener->CancelPendingTimers();
	}

	// Destroy the task owner actor if we created one
	if (TaskOwnerActor)
	{
		TaskOwnerActor->Destroy();
		TaskOwnerActor = nullptr;
	}

	// Clear state
	Runner = nullptr;
	Database = nullptr;
	Manifest = nullptr;
	Listener = nullptr;
	CurrentHandle = nullptr;
	History.Empty();
	CurrentChoices.Empty();
	State = ETestRigState::NotInitialized;
}

bool UGameScriptTestRigContext::StartConversation(int32 ConversationId)
{
	if (!Runner)
	{
		SetState(ETestRigState::Error, TEXT("Runner not initialized."));
		return false;
	}

	// Stop any existing conversation
	StopConversation();

	// Clear history and choices
	ClearHistory();
	ClearChoices();

	// Ensure listener timers are cancelled before starting new conversation
	if (Listener)
	{
		Listener->CancelPendingTimers();
	}

	// Get the listener interface
	TScriptInterface<IGameScriptListener> ListenerInterface = GetListenerInterface();
	if (!ListenerInterface)
	{
		SetState(ETestRigState::Error, TEXT("Failed to get listener."));
		return false;
	}

	// Get task owner
	AActor* TaskOwner = GetTaskOwner();
	if (!TaskOwner)
	{
		SetState(ETestRigState::Error, TEXT("Failed to create task owner."));
		return false;
	}

	// Start the conversation
	ActiveConversationHandle = Runner->StartConversation(ConversationId, ListenerInterface, TaskOwner);

	if (!Runner->IsActive(ActiveConversationHandle))
	{
		SetState(ETestRigState::Error, FString::Printf(TEXT("Failed to start conversation %d."), ConversationId));
		return false;
	}

	SetState(ETestRigState::Running);
	return true;
}

void UGameScriptTestRigContext::StopConversation()
{
	if (Runner && Runner->IsActive(ActiveConversationHandle))
	{
		Runner->StopConversation(ActiveConversationHandle);
	}
	ActiveConversationHandle = FActiveConversation();
	ClearChoices();
	SetCurrentHandle(nullptr);

	// Only set to Ready if we were running
	if (State == ETestRigState::Running || State == ETestRigState::WaitingForChoice)
	{
		SetState(ETestRigState::Ready);
	}
}

void UGameScriptTestRigContext::ChangeLocale(int32 LocaleIndex)
{
	if (!Manifest || !Database)
	{
		return;
	}

	int32 LocaleCount = Manifest->GetLocaleCount();
	if (LocaleIndex < 0 || LocaleIndex >= LocaleCount)
	{
		return;
	}

	FLocaleRef NewLocale = Manifest->GetLocale(LocaleIndex);
	if (!NewLocale.IsValid())
	{
		return;
	}

	// Just change locale - refs will get new data automatically
	// (Locale snapshots have identical structure, only text differs)
	if (Database->ChangeLocale(NewLocale))
	{
		CurrentLocaleIndex = LocaleIndex;
		NotifyUIUpdate();
	}
	else
	{
		SetState(ETestRigState::Error, TEXT("Failed to change locale."));
	}
}

void UGameScriptTestRigContext::AddHistoryItem(const FString& SpeakerName, const FString& DialogueText)
{
	History.Add(FTestRigHistoryItem(SpeakerName, DialogueText));
	NotifyUIUpdate();
}

void UGameScriptTestRigContext::ClearHistory()
{
	History.Empty();
	NotifyUIUpdate();
}

void UGameScriptTestRigContext::SetChoices(const TArray<FNodeRef>& InChoices)
{
	CurrentChoices = InChoices;
	SetState(ETestRigState::WaitingForChoice);
}

void UGameScriptTestRigContext::ClearChoices()
{
	CurrentChoices.Empty();
	// Don't call NotifyUIUpdate here - let the caller decide
}

void UGameScriptTestRigContext::SetCurrentHandle(UGSCompletionHandle* Handle)
{
	CurrentHandle = Handle;
}

void UGameScriptTestRigContext::SetState(ETestRigState NewState, const FString& InErrorMessage)
{
	State = NewState;
	ErrorMessage = InErrorMessage;
	NotifyUIUpdate();
}

void UGameScriptTestRigContext::NotifyUIUpdate()
{
	OnUIUpdate.Broadcast();
}

TScriptInterface<IGameScriptListener> UGameScriptTestRigContext::GetListenerInterface()
{
	// Listener is created once in Initialize()
	if (!Listener)
	{
		return TScriptInterface<IGameScriptListener>();
	}
	return TScriptInterface<IGameScriptListener>(Listener);
}

AActor* UGameScriptTestRigContext::GetTaskOwner()
{
	// Check if existing actor is still valid
	if (TaskOwnerActor && !IsValid(TaskOwnerActor))
	{
		TaskOwnerActor = nullptr;
	}

	// Create a transient actor for task ownership in editor
	if (!TaskOwnerActor)
	{
		UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
		if (World)
		{
			FActorSpawnParameters SpawnParams;
			// Don't specify a name - let Unreal auto-generate to avoid conflicts
			SpawnParams.ObjectFlags |= RF_Transient;
			TaskOwnerActor = World->SpawnActor<AActor>(AActor::StaticClass(), FTransform::Identity, SpawnParams);
		}
	}
	return TaskOwnerActor;
}
