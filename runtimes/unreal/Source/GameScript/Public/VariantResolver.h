#pragma once

#include "CoreMinimal.h"
#include "TextResolutionParams.h"

namespace GameScript { struct Localization; }

/**
 * Selects the best-matching TextVariant from a Localization entry
 * for a given gender and plural category.
 *
 * Selection uses a three-pass fallback scan:
 *   1. Exact      - variant.Plural == plural AND variant.Gender == gender
 *   2. Gender fb  - variant.Plural == plural AND variant.Gender == Other
 *   3. Catch-all  - PluralCategory::Other AND GenderCategory::Other
 *
 * Returns an empty FString if the localization is null, has no variants,
 * or no variant matches the fallback chain.
 */
class FVariantResolver
{
public:
	FVariantResolver() = delete;

	/**
	 * Resolves the best-matching text for the given gender and plural category.
	 *
	 * @param Localization  The localization entry containing variants.
	 * @param Gender        The desired gender category.
	 * @param Plural        The desired plural category.
	 * @return The resolved text string, or an empty FString if no match is found.
	 */
	static FString Resolve(
		const GameScript::Localization* Localization,
		EGSGenderCategory Gender,
		EGSPluralCategory Plural);
};
