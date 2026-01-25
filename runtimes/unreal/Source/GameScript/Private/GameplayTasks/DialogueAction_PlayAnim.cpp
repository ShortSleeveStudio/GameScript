#include "GameplayTasks/DialogueAction_PlayAnim.h"
#include "IDialogueContext.h"
#include "GameplayTasksComponent.h"
#include "GameScript.h"
#include "GameFramework/Character.h"
#include "Components/SkeletalMeshComponent.h"
#include "Animation/AnimMontage.h"
#include "Animation/AnimInstance.h"
#include "TimerManager.h"
#include "Engine/World.h"

UDialogueAction_PlayAnim* UDialogueAction_PlayAnim::CreateTask(
	const IDialogueContext* Context,
	ACharacter* Character,
	UAnimMontage* Montage)
{
	if (!Character)
	{
		UE_LOG(LogGameScript, Error, TEXT("Character is null"));
		return nullptr;
	}

	USkeletalMeshComponent* Mesh = Character->GetMesh();
	return CreateTaskForMesh(Context, Mesh, Montage);
}

UDialogueAction_PlayAnim* UDialogueAction_PlayAnim::CreateTaskForMesh(
	const IDialogueContext* Context,
	USkeletalMeshComponent* MeshComponent,
	UAnimMontage* Montage)
{
	if (!Context)
	{
		UE_LOG(LogGameScript, Error, TEXT("Context is null"));
		return nullptr;
	}

	if (!MeshComponent)
	{
		UE_LOG(LogGameScript, Error, TEXT("MeshComponent is null"));
		return nullptr;
	}

	if (!Montage)
	{
		UE_LOG(LogGameScript, Error, TEXT("Montage is null"));
		return nullptr;
	}

	UGameplayTasksComponent* TaskOwner = Context->GetTaskOwner();
	if (!TaskOwner)
	{
		UE_LOG(LogGameScript, Error, TEXT("No task owner available"));
		return nullptr;
	}

	// Use proper UGameplayTask factory pattern
	UDialogueAction_PlayAnim* Task = UGameplayTask::NewTask<UDialogueAction_PlayAnim>(TaskOwner);
	Task->TargetMesh = MeshComponent;
	Task->MontageToPlay = Montage;
	return Task;
}

void UDialogueAction_PlayAnim::Activate()
{
	Super::Activate();

	if (!TargetMesh || !MontageToPlay)
	{
		UE_LOG(LogGameScript, Error, TEXT("Missing TargetMesh or MontageToPlay"));
		CompleteTask();
		return;
	}

	UAnimInstance* AnimInstance = TargetMesh->GetAnimInstance();
	if (!AnimInstance)
	{
		UE_LOG(LogGameScript, Error, TEXT("No AnimInstance on mesh"));
		CompleteTask();
		return;
	}

	// Play the montage
	float MontageLength = AnimInstance->Montage_Play(MontageToPlay);
	if (MontageLength <= 0.0f)
	{
		UE_LOG(LogGameScript, Warning, TEXT("Failed to play montage"));
		CompleteTask();
		return;
	}

	// Set up blend out delegate (for interruption or natural completion)
	FOnMontageBlendingOutStarted BlendOutDelegate;
	BlendOutDelegate.BindUObject(this, &UDialogueAction_PlayAnim::OnMontageBlendOut);
	AnimInstance->Montage_SetBlendingOutDelegate(BlendOutDelegate, MontageToPlay);

	// Set timer for expected completion time as a backup
	UWorld* World = GetWorld();
	if (World)
	{
		FTimerDelegate TimerDelegate;
		TimerDelegate.BindUObject(this, &UDialogueAction_PlayAnim::OnMontageComplete);

		World->GetTimerManager().SetTimer(
			TimerHandle,
			TimerDelegate,
			MontageLength,
			false); // Don't loop
	}
}

void UDialogueAction_PlayAnim::OnDestroy(bool bInOwnerFinished)
{
	// Stop the montage if cancelled
	if (!bInOwnerFinished && TargetMesh)
	{
		UAnimInstance* AnimInstance = TargetMesh->GetAnimInstance();
		if (AnimInstance && MontageToPlay)
		{
			AnimInstance->Montage_Stop(0.2f, MontageToPlay);
		}
	}

	// Clear timer
	UWorld* World = GetWorld();
	if (World && TimerHandle.IsValid())
	{
		World->GetTimerManager().ClearTimer(TimerHandle);
		TimerHandle.Invalidate();
	}

	Super::OnDestroy(bInOwnerFinished);
}

void UDialogueAction_PlayAnim::OnMontageComplete()
{
	if (bCompleted)
	{
		return; // Already completed via blend out
	}

	bCompleted = true;
	TimerHandle.Invalidate();
	CompleteTask();
}

void UDialogueAction_PlayAnim::OnMontageBlendOut(UAnimMontage* Montage, bool bInterrupted)
{
	if (bCompleted)
	{
		return; // Already completed
	}

	// Check if this is our montage
	if (Montage != MontageToPlay)
	{
		return;
	}

	bCompleted = true;

	// Clear timer if still active
	UWorld* World = GetWorld();
	if (World && TimerHandle.IsValid())
	{
		World->GetTimerManager().ClearTimer(TimerHandle);
		TimerHandle.Invalidate();
	}

	// Complete the task (whether interrupted or not - the montage played)
	CompleteTask();
}
