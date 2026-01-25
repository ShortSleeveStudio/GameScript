#pragma once

#include "CoreMinimal.h"

/**
 * Opaque handle for an active conversation.
 * Used to query/stop conversations from GameScriptRunner.
 *
 * Contains:
 * - Context ID (unique identifier for the RunnerContext)
 * - Sequence number (prevents stale access after context reuse)
 *
 * This ID-based design (matching Unity) ensures handles remain valid even when
 * other conversations end, unlike index-based approaches that break when arrays shift.
 */
struct GAMESCRIPT_API FActiveConversation
{
	int32 ContextId = -1;
	int32 Sequence = 0;

	constexpr FActiveConversation() = default;
	constexpr FActiveConversation(int32 InContextId, int32 InSequence)
		: ContextId(InContextId), Sequence(InSequence) {}

	constexpr bool IsValid() const { return ContextId >= 0; }

	constexpr bool operator==(const FActiveConversation& Other) const
	{
		return ContextId == Other.ContextId && Sequence == Other.Sequence;
	}

	constexpr bool operator!=(const FActiveConversation& Other) const
	{
		return !(*this == Other);
	}
};
