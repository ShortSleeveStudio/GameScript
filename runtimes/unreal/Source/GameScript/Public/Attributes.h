#pragma once

#include "CoreMinimal.h"

// Forward declarations
class IDialogueContext;
class UGameplayTask;

/**
 * Delegate types for node conditions and actions.
 * Conditions: Synchronous, return bool
 * Actions: Return nullptr (instant) or UGameplayTask* (latent)
 */
typedef bool (*ConditionDelegate)(const IDialogueContext* Context);
typedef UGameplayTask* (*ActionDelegate)(const IDialogueContext* Context);

/**
 * Registration structures for compile-time discovery.
 * Static instances are created by macros and registered before main().
 */
struct GAMESCRIPT_API FNodeConditionRegistration
{
	int32 NodeId;
	ConditionDelegate Function;

	FNodeConditionRegistration(int32 InNodeId, ConditionDelegate InFunction);
};

struct GAMESCRIPT_API FNodeActionRegistration
{
	int32 NodeId;
	ActionDelegate Function;

	FNodeActionRegistration(int32 InNodeId, ActionDelegate InFunction);
};

/**
 * Global registries populated at static initialization time.
 * Read by JumpTableBuilder to construct indexed jump tables.
 */
extern GAMESCRIPT_API TArray<FNodeConditionRegistration*> GConditionRegistrations;
extern GAMESCRIPT_API TArray<FNodeActionRegistration*> GActionRegistrations;

/**
 * Macro: NODE_CONDITION(NodeId)
 *
 * Usage:
 *   NODE_CONDITION(456)
 *   bool HasGold(const IDialogueContext* Context)
 *   {
 *       return GameState->PlayerGold >= 10;
 *   }
 *
 * Generates:
 * - Static implementation function
 * - Static registration object (constructor runs at static init)
 *
 * Complete Examples:
 *
 * \code
 * // Example 1: Simple state check
 * NODE_CONDITION(123)
 * bool PlayerHasKey(const IDialogueContext* Context)
 * {
 *     AMyGameMode* GameMode = Cast<AMyGameMode>(GetWorld()->GetAuthGameMode());
 *     return GameMode->Inventory->HasItem("Key");
 * }
 *
 * // Example 2: Using context data
 * NODE_CONDITION(456)
 * bool IsCorrectActor(const IDialogueContext* Context)
 * {
 *     FActorRef Actor = Context->GetActor();
 *     FString ActorName = Actor.GetName();
 *     return ActorName == "Merchant";
 * }
 *
 * // Example 3: Complex logic with properties
 * NODE_CONDITION(789)
 * bool HasRequiredGold(const IDialogueContext* Context)
 * {
 *     // Get custom property "required_gold" from node
 *     int32 RequiredGold = 0;
 *     for (int32 i = 0; i < Context->GetPropertyCount(); ++i)
 *     {
 *         FNodePropertyRef Prop = Context->GetProperty(i);
 *         if (Prop.GetKey() == "required_gold")
 *         {
 *             RequiredGold = FCString::Atoi(*Prop.GetValue());
 *             break;
 *         }
 *     }
 *
 *     AMyGameState* GameState = GetGameState();
 *     return GameState->PlayerGold >= RequiredGold;
 * }
 * \endcode
 */
#define NODE_CONDITION(NodeId) \
	static bool __NodeCondition_##NodeId##_Impl(const IDialogueContext* Context); \
	static FNodeConditionRegistration __NodeCondition_##NodeId##_Registration( \
		NodeId, &__NodeCondition_##NodeId##_Impl); \
	static bool __NodeCondition_##NodeId##_Impl(const IDialogueContext* Context)

/**
 * Macro: NODE_ACTION(NodeId)
 *
 * Usage (instant action):
 *   NODE_ACTION(456)
 *   UGameplayTask* PayGold(const IDialogueContext* Context)
 *   {
 *       GameState->PlayerGold -= 10;
 *       return nullptr;  // Instant - no waiting
 *   }
 *
 * Usage (latent action):
 *   NODE_ACTION(789)
 *   UGameplayTask* PlayAnimation(const IDialogueContext* Context)
 *   {
 *       return UDialogueAction_PlayAnim::CreateTask(Context, AnimAsset);
 *   }
 *
 * Generates:
 * - Static implementation function
 * - Static registration object (constructor runs at static init)
 *
 * Complete Examples:
 *
 * \code
 * // Example 1: Instant action - modify game state
 * NODE_ACTION(123)
 * UGameplayTask* GiveReward(const IDialogueContext* Context)
 * {
 *     AMyGameMode* GameMode = Cast<AMyGameMode>(GetWorld()->GetAuthGameMode());
 *     GameMode->Inventory->AddItem("Sword", 1);
 *     GameMode->PlayerGold += 100;
 *     return nullptr;  // Completes immediately
 * }
 *
 * // Example 2: Instant action - trigger Blueprint event
 * NODE_ACTION(456)
 * UGameplayTask* TriggerQuestEvent(const IDialogueContext* Context)
 * {
 *     AMyGameMode* GameMode = Cast<AMyGameMode>(GetWorld()->GetAuthGameMode());
 *     GameMode->OnQuestCompleted.Broadcast(Context->GetNodeId());
 *     return nullptr;
 * }
 *
 * // Example 3: Latent action - wait for animation
 * NODE_ACTION(789)
 * UGameplayTask* PlayHandoverAnimation(const IDialogueContext* Context)
 * {
 *     UAnimMontage* HandoverMontage = LoadObject<UAnimMontage>(
 *         nullptr,
 *         TEXT("/Game/Animations/Handover.Handover")
 *     );
 *
 *     return UDialogueAction_PlayAnim::CreateTask(Context, HandoverMontage);
 *     // Conversation waits until animation completes
 * }
 *
 * // Example 4: Latent action - custom delay with cancellation
 * NODE_ACTION(999)
 * UGameplayTask* WaitBeforeReply(const IDialogueContext* Context)
 * {
 *     // NPC thinks for 2 seconds before responding
 *     return UDialogueAction_Delay::CreateTask(Context, 2.0f);
 * }
 *
 * // Example 5: Using context properties
 * NODE_ACTION(1011)
 * UGameplayTask* AwardDynamicReward(const IDialogueContext* Context)
 * {
 *     // Get reward amount from node property
 *     int32 GoldReward = 50;  // Default
 *     for (int32 i = 0; i < Context->GetPropertyCount(); ++i)
 *     {
 *         FNodePropertyRef Prop = Context->GetProperty(i);
 *         if (Prop.GetKey() == "gold_amount")
 *         {
 *             GoldReward = FCString::Atoi(*Prop.GetValue());
 *             break;
 *         }
 *     }
 *
 *     AMyGameState* GameState = GetGameState();
 *     GameState->PlayerGold += GoldReward;
 *
 *     return nullptr;
 * }
 *
 * // Example 6: Checking cancellation (for long-running actions)
 * NODE_ACTION(1213)
 * UGameplayTask* ComplexOperation(const IDialogueContext* Context)
 * {
 *     // For instant actions that need to check cancellation
 *     if (Context->IsCancelled())
 *     {
 *         return nullptr;  // Early exit
 *     }
 *
 *     // Do work...
 *     PerformOperation();
 *
 *     return nullptr;
 * }
 * \endcode
 */
#define NODE_ACTION(NodeId) \
	static UGameplayTask* __NodeAction_##NodeId##_Impl(const IDialogueContext* Context); \
	static FNodeActionRegistration __NodeAction_##NodeId##_Registration( \
		NodeId, &__NodeAction_##NodeId##_Impl); \
	static UGameplayTask* __NodeAction_##NodeId##_Impl(const IDialogueContext* Context)
