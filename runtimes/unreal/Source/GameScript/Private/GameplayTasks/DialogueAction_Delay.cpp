#include "GameplayTasks/DialogueAction_Delay.h"
#include "IDialogueContext.h"
#include "GameplayTasksComponent.h"
#include "GameScript.h"
#include "TimerManager.h"
#include "Engine/World.h"

UDialogueAction_Delay* UDialogueAction_Delay::CreateTask(
	const IDialogueContext* Context,
	float Duration)
{
	if (!Context)
	{
		UE_LOG(LogGameScript, Error, TEXT("Context is null"));
		return nullptr;
	}

	UGameplayTasksComponent* TaskOwner = Context->GetTaskOwner();
	if (!TaskOwner)
	{
		UE_LOG(LogGameScript, Error, TEXT("No task owner available"));
		return nullptr;
	}

	// Use proper UGameplayTask factory pattern
	UDialogueAction_Delay* Task = UGameplayTask::NewTask<UDialogueAction_Delay>(TaskOwner);
	Task->WaitDuration = Duration;
	return Task;
}

void UDialogueAction_Delay::Activate()
{
	Super::Activate();

	UWorld* World = GetWorld();
	if (!World)
	{
		UE_LOG(LogGameScript, Error, TEXT("No World found"));
		CompleteTask();
		return;
	}

	if (WaitDuration <= 0.0f)
	{
		// Zero or negative duration, complete immediately
		CompleteTask();
		return;
	}

	// Set timer for completion
	FTimerDelegate TimerDelegate;
	TimerDelegate.BindUObject(this, &UDialogueAction_Delay::OnTimerComplete);

	World->GetTimerManager().SetTimer(
		TimerHandle,
		TimerDelegate,
		WaitDuration,
		false); // Don't loop
}

void UDialogueAction_Delay::OnDestroy(bool bInOwnerFinished)
{
	// Clear timer if still active
	UWorld* World = GetWorld();
	if (World && TimerHandle.IsValid())
	{
		World->GetTimerManager().ClearTimer(TimerHandle);
		TimerHandle.Invalidate();
	}

	Super::OnDestroy(bInOwnerFinished);
}

void UDialogueAction_Delay::OnTimerComplete()
{
	TimerHandle.Invalidate();
	CompleteTask();
}
