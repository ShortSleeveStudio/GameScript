#pragma once

#include "CoreMinimal.h"
#include "Refs.h"

// Forward declarations
class UGameplayTask;
class UGameplayTasksComponent;

/**
 * Read-only context provided to node conditions and actions during execution.
 * Pure C++ interface - not Blueprint-exposed.
 *
 * Provides access to:
 * - Current node/conversation data (from FlatBuffers snapshot)
 * - Cancellation status for cooperative cancellation
 * - Actor, localized text, custom properties
 * - Task creation factory for latent actions
 */
class GAMESCRIPT_API IDialogueContext
{
public:
	virtual ~IDialogueContext() = default;

	/**
	 * Check if this conversation has been cancelled.
	 * Actions should check this periodically and exit early when true.
	 * Thread-safe: uses atomic reads internally.
	 */
	virtual bool IsCancelled() const = 0;

	// Current node/conversation IDs
	virtual int32 GetNodeId() const = 0;
	virtual int32 GetConversationId() const = 0;

	// Actor reference (who's speaking)
	virtual FActorRef GetActor() const = 0;

	// Localized text
	virtual FString GetVoiceText() const = 0;
	virtual FString GetUIResponseText() const = 0;

	// Custom properties
	virtual int32 GetPropertyCount() const = 0;
	virtual FNodePropertyRef GetProperty(int32 Index) const = 0;

	// Task creation factory (for latent actions)
	// Returns the GameplayTasksComponent that owns conversation tasks
	virtual UGameplayTasksComponent* GetTaskOwner() const = 0;
};
