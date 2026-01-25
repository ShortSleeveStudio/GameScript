#pragma once

#include "CoreMinimal.h"
#include "DialogueActionTask.h"
#include "TimerManager.h"
#include "DialogueAction_Delay.generated.h"

class IDialogueContext;

/**
 * Latent dialogue action that waits for a specified duration.
 *
 * Usage example:
 *   NODE_ACTION(123)
 *   UGameplayTask* WaitBeforeReply(const IDialogueContext* Context)
 *   {
 *       return UDialogueAction_Delay::CreateTask(Context, 2.0f);
 *   }
 */
UCLASS()
class GAMESCRIPT_API UDialogueAction_Delay : public UDialogueActionTask
{
	GENERATED_BODY()

public:
	/**
	 * Create a delay task that waits for the specified duration.
	 *
	 * @param Context The dialogue context (used to get World for timer manager)
	 * @param Duration Duration to wait in seconds
	 * @return The created task, ready to be activated
	 */
	static UDialogueAction_Delay* CreateTask(
		const IDialogueContext* Context,
		float Duration);

protected:
	/**
	 * Start the timer.
	 */
	virtual void Activate() override;

	/**
	 * Clean up timer on cancellation.
	 */
	virtual void OnDestroy(bool bInOwnerFinished) override;

private:
	/**
	 * Called when the timer completes.
	 */
	void OnTimerComplete();

	/** Duration to wait in seconds */
	float WaitDuration = 0.0f;

	/** Timer handle for cleanup */
	FTimerHandle TimerHandle;
};
