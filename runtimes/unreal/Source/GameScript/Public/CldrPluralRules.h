#pragma once

#include "CoreMinimal.h"
#include "TextResolutionParams.h"

/**
 * Maps IETF locale codes to CLDR plural categories for integer quantities.
 * Derived from the Unicode CLDR plurals.json integer rules.
 *
 * Locale lookup order:
 *   1. Exact match (e.g., "pt-PT")
 *   2. Separator swap: replace '_' with '-' or vice-versa
 *   3. Language subtag only (first segment before '-' or '_')
 *   4. Default: EGSPluralCategory::Other
 *
 * Pure C++ utility class — no UObject, no reflection.
 */
class GAMESCRIPT_API FCldrPluralRules
{
public:
	FCldrPluralRules() = delete;

	/**
	 * Resolves the CLDR cardinal plural category for the given locale and integer count.
	 * Performs locale lookup + rule application in one call.
	 */
	static EGSPluralCategory Resolve(const FString& LocaleCode, int32 Count);

	/**
	 * Resolves the CLDR ordinal plural category for the given locale and integer count.
	 * Performs locale lookup + rule application in one call.
	 */
	static EGSPluralCategory ResolveOrdinal(const FString& LocaleCode, int32 Count);

	/**
	 * Returns the cardinal rule index for the given locale code. Cache this value and
	 * pass it to ApplyRule to avoid per-call locale normalization.
	 */
	static uint8 LookupCardinalRule(const FString& LocaleCode);

	/**
	 * Returns the ordinal rule index for the given locale code. Cache this value and
	 * pass it to ApplyOrdinalRule to avoid per-call locale normalization.
	 */
	static uint8 LookupOrdinalRule(const FString& LocaleCode);

	/**
	 * Applies a cardinal plural rule (identified by index from LookupCardinalRule)
	 * to the given integer count.
	 */
	static EGSPluralCategory ApplyRule(uint8 Rule, int32 N);

	/**
	 * Applies an ordinal plural rule (identified by index from LookupOrdinalRule)
	 * to the given integer count.
	 */
	static EGSPluralCategory ApplyOrdinalRule(uint8 Rule, int32 N);

	/** Applies a cardinal plural rule with full decimal operand support. */
	static EGSPluralCategory ApplyRule(uint8 Rule, int64 Value, int32 Precision);

	/** Resolves cardinal plural category with decimal support. */
	static EGSPluralCategory Resolve(const FString& LocaleCode, int64 Value, int32 Precision);

private:
	/** Shared locale -> rule-index lookup: exact -> separator swap -> language subtag -> 0. */
	static uint8 LookupRule(const TMap<FString, uint8>& Map, const FString& LocaleCode);

	/** Swaps first '_' with '-' or vice-versa. Returns empty string if no separator found. */
	static FString SwapSeparator(const FString& Code);

	/** Returns the language subtag (text before first '-' or '_'). Returns empty string if no separator. */
	static FString LanguageSubtag(const FString& Code);

	/** CLDR plural operands derived from (value, precision). */
	struct FOperands { int64 i; int32 v; int32 w; int64 f; int64 t; };

	/** Derives CLDR plural operands from a scaled integer value and precision. */
	static FOperands DeriveOperands(int64 Value, int32 Precision);

	/** Returns 10^Exponent as int64. */
	static int64 Pow10Long(int32 Exponent);

	/** Applies CLDR cardinal plural rules for decimal values (v > 0). */
	static EGSPluralCategory ApplyDecimalCardinal(uint8 Rule, const FOperands& Op);

	/** Lazily initialized cardinal locale map. */
	static const TMap<FString, uint8>& GetLocaleMap();

	/** Lazily initialized ordinal locale map. */
	static const TMap<FString, uint8>& GetOrdinalLocaleMap();
};
