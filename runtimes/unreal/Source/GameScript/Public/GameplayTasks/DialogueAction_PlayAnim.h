#pragma once

#include "CoreMinimal.h"
#include "DialogueActionTask.h"
#include "TimerManager.h"
#include "DialogueAction_PlayAnim.generated.h"

class IDialogueContext;
class UAnimMontage;
class ACharacter;
class USkeletalMeshComponent;

/**
 * Latent dialogue action that plays an animation montage.
 *
 * Usage example:
 *   NODE_ACTION(456)
 *   UGameplayTask* PlayHandOverGoldAnim(const IDialogueContext* Context)
 *   {
 *       ACharacter* NPC = GetNPCForActor(Context->GetActor());
 *       return UDialogueAction_PlayAnim::CreateTask(Context, NPC, HandOverGoldMontage);
 *   }
 */
UCLASS()
class GAMESCRIPT_API UDialogueAction_PlayAnim : public UDialogueActionTask
{
	GENERATED_BODY()

public:
	/**
	 * Create a task that plays an animation montage on a character.
	 *
	 * @param Context The dialogue context (unused in this implementation)
	 * @param Character The character to play the animation on
	 * @param Montage The animation montage to play
	 * @return The created task, ready to be activated
	 */
	static UDialogueAction_PlayAnim* CreateTask(
		const IDialogueContext* Context,
		ACharacter* Character,
		UAnimMontage* Montage);

	/**
	 * Create a task that plays an animation montage on a skeletal mesh component.
	 *
	 * @param Context The dialogue context (unused in this implementation)
	 * @param MeshComponent The skeletal mesh component to play the animation on
	 * @param Montage The animation montage to play
	 * @return The created task, ready to be activated
	 */
	static UDialogueAction_PlayAnim* CreateTaskForMesh(
		const IDialogueContext* Context,
		USkeletalMeshComponent* MeshComponent,
		UAnimMontage* Montage);

protected:
	/**
	 * Start playing the montage.
	 */
	virtual void Activate() override;

	/**
	 * Stop the montage on cancellation.
	 */
	virtual void OnDestroy(bool bInOwnerFinished) override;

private:
	/**
	 * Called when the montage completes naturally.
	 */
	void OnMontageComplete();

	/**
	 * Called when the montage is interrupted.
	 */
	UFUNCTION()
	void OnMontageBlendOut(UAnimMontage* Montage, bool bInterrupted);

	/** The skeletal mesh component to play the animation on */
	UPROPERTY()
	TObjectPtr<USkeletalMeshComponent> TargetMesh;

	/** The montage to play */
	UPROPERTY()
	TObjectPtr<UAnimMontage> MontageToPlay;

	/** Timer handle for completion callback */
	FTimerHandle TimerHandle;

	/** Whether the montage has completed */
	bool bCompleted = false;
};
