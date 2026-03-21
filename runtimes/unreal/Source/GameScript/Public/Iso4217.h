#pragma once

#include "CoreMinimal.h"

/**
 * ISO 4217 currency utilities for locale-aware currency formatting.
 * Provides minor unit digit counts and currency symbols.
 */
class GAMESCRIPT_API FIso4217
{
public:
	FIso4217() = delete;

	/**
	 * Returns the number of minor unit digits (decimal places) for the given ISO 4217
	 * currency code. Defaults to 2 for unknown codes (the most common case).
	 *
	 * @param CurrencyCode ISO 4217 code (e.g., "USD", "JPY", "KWD").
	 * @return Number of decimal places (0, 2, 3, or 4).
	 */
	static int32 GetMinorUnitDigits(const FString& CurrencyCode);

	/**
	 * Returns the currency symbol for the given ISO 4217 code and locale.
	 * Falls back to the code itself (e.g., "USD") if no symbol is available.
	 *
	 * @param CurrencyCode ISO 4217 code (e.g., "USD", "EUR").
	 * @param LocaleCode The locale to use for symbol resolution.
	 * @return The currency symbol string.
	 */
	static FString GetSymbol(const FString& CurrencyCode, const FString& LocaleCode);

private:
	/** Lazily initialized map of currency codes to minor unit digit counts. */
	static const TMap<FString, int32>& GetMinorUnitOverrides();
};
