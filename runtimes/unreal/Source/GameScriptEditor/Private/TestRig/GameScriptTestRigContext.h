#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "Refs.h"
#include "ActiveConversation.h"
#include "IGameScriptListener.h"
#include "Ids.h"
#include "GameScriptTestRigContext.generated.h"

class UGameScriptManifest;
class UGameScriptDatabase;
class UGameScriptRunner;
class UGameScriptSettings;
class UGSCompletionHandle;
class UGameScriptTestRigListener;

/**
 * History item representing a line of dialogue.
 */
USTRUCT()
struct FTestRigHistoryItem
{
	GENERATED_BODY()

	UPROPERTY()
	FString SpeakerName;

	UPROPERTY()
	FString DialogueText;

	FTestRigHistoryItem() = default;
	FTestRigHistoryItem(const FString& InSpeaker, const FString& InText)
		: SpeakerName(InSpeaker)
		, DialogueText(InText)
	{
	}
};

/**
 * UI state for the test rig.
 */
UENUM()
enum class ETestRigState : uint8
{
	NotInitialized,
	Ready,
	Running,
	WaitingForChoice,
	Error
};

/**
 * Delegate for UI updates.
 */
DECLARE_MULTICAST_DELEGATE(FOnTestRigUIUpdate);

/**
 * Context object for the test rig.
 * Holds all state needed by the Slate UI and listener.
 *
 * Architecture Note:
 * - Context owns the Listener (creates it in Initialize())
 * - Listener stores a pointer back to Context (set via SetContext())
 * - Listener modifies Context state in response to dialogue events
 * - This circular reference is intentional and safe because both objects
 *   have the same lifetime (created together, destroyed together)
 *
 * GC Safety: All UObject references are UPROPERTY() to prevent collection.
 */
UCLASS()
class UGameScriptTestRigContext : public UObject
{
	GENERATED_BODY()

public:
	UGameScriptTestRigContext();

	/**
	 * Initialize the context by loading the manifest.
	 * @return true if initialization succeeded
	 */
	bool Initialize();

	/**
	 * Shutdown and clean up resources.
	 * Must be called before the context is destroyed.
	 */
	void Shutdown();

	/**
	 * Start a conversation.
	 * @param ConversationId The conversation to start
	 * @return true if started successfully
	 */
	bool StartConversation(int32 ConversationId);

	/**
	 * Stop the current conversation.
	 */
	void StopConversation();

	/**
	 * Change the locale.
	 * @param LocaleIndex Index into the locale array
	 */
	void ChangeLocale(int32 LocaleIndex);

	/**
	 * Add a history item (called by listener).
	 */
	void AddHistoryItem(const FString& SpeakerName, const FString& DialogueText);

	/**
	 * Clear the history.
	 */
	void ClearHistory();

	/**
	 * Set the current choices (called by listener).
	 */
	void SetChoices(const TArray<FNodeRef>& InChoices);

	/**
	 * Clear the current choices.
	 */
	void ClearChoices();

	/**
	 * Set the current completion handle (called by listener).
	 */
	void SetCurrentHandle(UGSCompletionHandle* Handle);

	/**
	 * Set the state and optionally an error message.
	 */
	void SetState(ETestRigState NewState, const FString& ErrorMessage = FString());

	/**
	 * Notify UI to refresh.
	 */
	void NotifyUIUpdate();

	// --- Accessors ---

	bool IsInitialized() const { return State != ETestRigState::NotInitialized; }
	ETestRigState GetState() const { return State; }
	const FString& GetErrorMessage() const { return ErrorMessage; }
	const TArray<FTestRigHistoryItem>& GetHistory() const { return History; }
	const TArray<FNodeRef>& GetCurrentChoices() const { return CurrentChoices; }

	UGameScriptManifest* GetManifest() const { return Manifest; }
	UGameScriptDatabase* GetDatabase() const { return Database; }
	UGameScriptRunner* GetRunner() const { return Runner; }

	int32 GetCurrentLocaleIndex() const { return CurrentLocaleIndex; }
	void SetCurrentLocaleIndex(int32 Index) { CurrentLocaleIndex = Index; }

	UGSCompletionHandle* GetCurrentHandle() const { return CurrentHandle; }

	/**
	 * Get the listener instance (created in Initialize(), reused for all conversations).
	 */
	UGameScriptTestRigListener* GetListener() const { return Listener; }

	/**
	 * Delegate for UI updates.
	 */
	FOnTestRigUIUpdate OnUIUpdate;

	// --- Test Properties (for picker/customization testing) ---

	UPROPERTY(EditAnywhere, Category = "Test IDs")
	FGSConversationId TestConversationId;

	UPROPERTY(EditAnywhere, Category = "Test IDs")
	FGSActorId TestActorId;

	UPROPERTY(EditAnywhere, Category = "Test IDs")
	FGSLocalizationId TestLocalizationId;

	UPROPERTY(EditAnywhere, Category = "Test IDs")
	FGSLocaleId TestLocaleId;

private:
	UPROPERTY()
	TObjectPtr<UGameScriptManifest> Manifest;

	UPROPERTY()
	TObjectPtr<UGameScriptDatabase> Database;

	UPROPERTY()
	TObjectPtr<UGameScriptRunner> Runner;

	UPROPERTY()
	TObjectPtr<UGameScriptSettings> Settings;

	UPROPERTY()
	TObjectPtr<UGameScriptTestRigListener> Listener;

	UPROPERTY()
	TArray<FTestRigHistoryItem> History;

	UPROPERTY()
	TObjectPtr<UGSCompletionHandle> CurrentHandle;

	TArray<FNodeRef> CurrentChoices;

	ETestRigState State = ETestRigState::NotInitialized;
	FString ErrorMessage;
	int32 CurrentLocaleIndex = 0;

	FActiveConversation ActiveConversationHandle;

	/**
	 * Create or get the listener as a script interface.
	 */
	TScriptInterface<IGameScriptListener> GetListenerInterface();

	/**
	 * Create or get a task owner actor.
	 */
	AActor* GetTaskOwner();

	UPROPERTY()
	TObjectPtr<AActor> TaskOwnerActor;
};
