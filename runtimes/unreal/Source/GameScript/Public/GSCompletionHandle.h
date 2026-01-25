#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "Refs.h"
#include "GSCompletionHandle.generated.h"

class URunnerContext;

/**
 * Completion handle for async listener callbacks.
 * Acts as a "return address" - listener calls methods on this to signal completion.
 *
 * Pattern: Each URunnerContext owns one handle (allocated once, reused).
 * Before firing listener event, context calls Initialize() to set up the handle.
 * Listener receives handle and calls NotifyReady() or SelectChoice() when done.
 *
 * Safety:
 * - TWeakObjectPtr prevents crashes if context is destroyed
 * - ContextID validation prevents stale completions
 * - Invalidates after use to prevent double-signals
 */
UCLASS(BlueprintType)
class GAMESCRIPT_API UGSCompletionHandle : public UObject
{
	GENERATED_BODY()

public:
	/**
	 * Signal that async work is complete and runner should proceed.
	 * Called by listener at the end of OnSpeech, OnNodeEnter, etc.
	 */
	UFUNCTION(BlueprintCallable, Category = "GameScript")
	void NotifyReady();

	/**
	 * Select a choice and proceed to the selected node.
	 * Called by listener in response to OnDecision.
	 *
	 * @param Choice - The node to proceed to
	 */
	UFUNCTION(BlueprintCallable, Category = "GameScript")
	void SelectChoice(FNodeRef Choice);

	/**
	 * Select a choice by index and proceed.
	 * Alternative to SelectChoice for Blueprint convenience.
	 *
	 * @param ChoiceIndex - Index into the choices array passed to OnDecision
	 */
	UFUNCTION(BlueprintCallable, Category = "GameScript")
	void SelectChoiceByIndex(int32 ChoiceIndex);

	/**
	 * Initialize handle for a new lifecycle event.
	 * Called by RunnerContext before firing listener callback.
	 */
	void Initialize(URunnerContext* InOwner, int32 InContextID);

	/**
	 * Invalidate the handle (called after use or on cancellation).
	 */
	void Invalidate();

	/**
	 * Check if this handle is still valid.
	 */
	UFUNCTION(BlueprintPure, Category = "GameScript")
	bool IsValid() const;

private:
	TWeakObjectPtr<URunnerContext> OwnerContext;
	int32 ContextID = -1;
};
