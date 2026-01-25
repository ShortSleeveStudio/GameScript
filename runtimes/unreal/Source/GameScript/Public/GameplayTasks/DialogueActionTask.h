#pragma once

#include "CoreMinimal.h"
#include "GameplayTask.h"
#include "DialogueActionTask.generated.h"

/**
 * Base class for latent dialogue actions.
 * Provides OnCompleted and OnCancelled delegates for RunnerContext integration.
 *
 * Usage:
 *   NODE_ACTION(123)
 *   UGameplayTask* MyAction(const IDialogueContext* Context)
 *   {
 *       return UMyDialogueTask::CreateTask(Context, ...);
 *   }
 */
UCLASS(Abstract)
class GAMESCRIPT_API UDialogueActionTask : public UGameplayTask
{
	GENERATED_BODY()

public:
	DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnDialogueTaskComplete);

	/**
	 * Called when the task completes successfully.
	 */
	UPROPERTY(BlueprintAssignable)
	FOnDialogueTaskComplete OnCompleted;

	/**
	 * Called when the task is cancelled.
	 */
	UPROPERTY(BlueprintAssignable)
	FOnDialogueTaskComplete OnCancelled;

	/**
	 * Get the OnCompleted delegate.
	 */
	FOnDialogueTaskComplete& GetOnCompleted() { return OnCompleted; }

	/**
	 * Get the OnCancelled delegate.
	 */
	FOnDialogueTaskComplete& GetOnCancelled() { return OnCancelled; }

protected:
	/**
	 * Override to perform the action work.
	 */
	virtual void Activate() override {}

	/**
	 * Called when task is destroyed (cancellation or completion).
	 */
	virtual void OnDestroy(bool bInOwnerFinished) override
	{
		// If not finished normally, it was cancelled
		if (!bInOwnerFinished)
		{
			OnCancelled.Broadcast();
		}

		Super::OnDestroy(bInOwnerFinished);
	}

	/**
	 * Helper to complete the task successfully.
	 */
	void CompleteTask()
	{
		OnCompleted.Broadcast();
		EndTask();
	}
};
