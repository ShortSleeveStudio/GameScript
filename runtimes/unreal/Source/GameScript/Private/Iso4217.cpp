#include "Iso4217.h"

const TMap<FString, int32>& FIso4217::GetMinorUnitOverrides()
{
	static TMap<FString, int32> Overrides;
	if (Overrides.Num() == 0)
	{
		// 0 decimal places
		Overrides.Add(TEXT("BIF"), 0);
		Overrides.Add(TEXT("BYR"), 0);
		Overrides.Add(TEXT("CLP"), 0);
		Overrides.Add(TEXT("DJF"), 0);
		Overrides.Add(TEXT("GNF"), 0);
		Overrides.Add(TEXT("ISK"), 0);
		Overrides.Add(TEXT("JPY"), 0);
		Overrides.Add(TEXT("KMF"), 0);
		Overrides.Add(TEXT("KRW"), 0);
		Overrides.Add(TEXT("PYG"), 0);
		Overrides.Add(TEXT("RWF"), 0);
		Overrides.Add(TEXT("UGX"), 0);
		Overrides.Add(TEXT("UYI"), 0);
		Overrides.Add(TEXT("VND"), 0);
		Overrides.Add(TEXT("VUV"), 0);
		Overrides.Add(TEXT("XAF"), 0);
		Overrides.Add(TEXT("XOF"), 0);
		Overrides.Add(TEXT("XPF"), 0);

		// 3 decimal places
		Overrides.Add(TEXT("BHD"), 3);
		Overrides.Add(TEXT("IQD"), 3);
		Overrides.Add(TEXT("JOD"), 3);
		Overrides.Add(TEXT("KWD"), 3);
		Overrides.Add(TEXT("LYD"), 3);
		Overrides.Add(TEXT("OMR"), 3);
		Overrides.Add(TEXT("TND"), 3);

		// 4 decimal places
		Overrides.Add(TEXT("CLF"), 4);
		Overrides.Add(TEXT("UYW"), 4);
	}
	return Overrides;
}

int32 FIso4217::GetMinorUnitDigits(const FString& CurrencyCode)
{
	if (CurrencyCode.IsEmpty())
	{
		return 2;
	}

	const FString Upper = CurrencyCode.ToUpper();
	const int32* Found = GetMinorUnitOverrides().Find(Upper);
	return Found ? *Found : 2;
}

FString FIso4217::GetSymbol(const FString& CurrencyCode, const FString& LocaleCode)
{
	if (CurrencyCode.IsEmpty())
	{
		return FString();
	}

	const FString Upper = CurrencyCode.ToUpper();

	// Common currency symbols (matching Unity's fallback table)
	if (Upper == TEXT("USD")) return TEXT("$");
	if (Upper == TEXT("EUR")) return TEXT("\u20AC");
	if (Upper == TEXT("GBP")) return TEXT("\u00A3");
	if (Upper == TEXT("JPY")) return TEXT("\u00A5");
	if (Upper == TEXT("CNY")) return TEXT("\u00A5");
	if (Upper == TEXT("KRW")) return TEXT("\u20A9");
	if (Upper == TEXT("INR")) return TEXT("\u20B9");
	if (Upper == TEXT("RUB")) return TEXT("\u20BD");
	if (Upper == TEXT("BRL")) return TEXT("R$");
	if (Upper == TEXT("TRY")) return TEXT("\u20BA");
	if (Upper == TEXT("THB")) return TEXT("\u0E3F");
	if (Upper == TEXT("PLN")) return TEXT("z\u0142");
	if (Upper == TEXT("SEK")) return TEXT("kr");
	if (Upper == TEXT("NOK")) return TEXT("kr");
	if (Upper == TEXT("DKK")) return TEXT("kr");
	if (Upper == TEXT("CHF")) return TEXT("CHF");
	if (Upper == TEXT("CAD")) return TEXT("CA$");
	if (Upper == TEXT("AUD")) return TEXT("A$");
	if (Upper == TEXT("NZD")) return TEXT("NZ$");
	if (Upper == TEXT("MXN")) return TEXT("MX$");
	if (Upper == TEXT("SGD")) return TEXT("S$");
	if (Upper == TEXT("HKD")) return TEXT("HK$");
	if (Upper == TEXT("TWD")) return TEXT("NT$");

	// Unknown currency — return the code itself
	return CurrencyCode;
}
