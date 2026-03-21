#pragma once

#include "CoreMinimal.h"
#include "TextResolutionParams.generated.h"

/**
 * Plural rule type — selects cardinal or ordinal CLDR rules.
 */
UENUM(BlueprintType)
enum class EGSPluralType : uint8
{
	/** Cardinal ("5 items"). Default. */
	Cardinal = 0,

	/** Ordinal ("3rd place"). */
	Ordinal = 1,
};

/**
 * Plural categories from Unicode CLDR.
 */
UENUM(BlueprintType)
enum class EGSPluralCategory : uint8
{
	Zero = 0,
	One = 1,
	Two = 2,
	Few = 3,
	Many = 4,
	Other = 5,
};

/**
 * Gender categories for variant selection.
 */
UENUM(BlueprintType)
enum class EGSGenderCategory : uint8
{
	Other = 0,
	Masculine = 1,
	Feminine = 2,
	Neuter = 3,
};

/**
 * Grammatical gender of an actor (includes Dynamic).
 */
UENUM(BlueprintType)
enum class EGSGrammaticalGender : uint8
{
	Other = 0,
	Masculine = 1,
	Feminine = 2,
	Neuter = 3,
	Dynamic = 4,
};

/**
 * Determines how an FArg value is formatted during template substitution.
 */
UENUM(BlueprintType)
enum class EGSArgType : uint8
{
	/** Plain string substitution. */
	String = 0,

	/** Locale-aware integer with grouping separators (e.g., "1,000"). */
	Int,

	/**
	 * Locale-aware decimal (e.g., "3.14" vs "3,14").
	 * Value is in minor units; Precision controls decimal places.
	 */
	Decimal,

	/**
	 * Locale-aware percentage (e.g., "15%" vs "15 %").
	 * Value is the percentage x 10^Precision (e.g., value=155, precision=1 -> "15.5%").
	 */
	Percent,

	/**
	 * Locale-aware currency (e.g., "$19.99" vs "19,99 EUR").
	 * Value is in minor units; decimal places come from ISO 4217 via CurrencyCode.
	 */
	Currency,

	/** Raw integer string with no formatting (e.g., "1000"). */
	RawInt,
};

/**
 * A named numeric argument that drives plural-category selection AND template substitution.
 * The Type field selects cardinal (default) or ordinal CLDR rules.
 *
 * For integers (Precision=0): the value is substituted with locale-aware integer grouping.
 * For decimals (Precision>0): the represented number is Value / 10^Precision,
 * substituted with locale-aware decimal formatting. Full CLDR operands (i, v, w, f, t) are
 * derived from Value and Precision for correct plural category selection.
 */
USTRUCT(BlueprintType)
struct GAMESCRIPT_API FGSPluralArg
{
	GENERATED_BODY()

	/** The placeholder name used in templates, e.g. "count". */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	FString Name;

	/**
	 * The numeric value. When Precision is 0, this is the integer value.
	 * When Precision > 0, this is the unscaled value (e.g., 150 with Precision=1 represents 15.0).
	 */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	int64 Value = 0;

	/**
	 * Number of decimal places. 0 = integer (default).
	 * When > 0, the represented number is Value / 10^Precision and full CLDR
	 * operands are used for plural category selection.
	 */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	int32 Precision = 0;

	/** Selects cardinal or ordinal CLDR plural rules. */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	EGSPluralType Type = EGSPluralType::Cardinal;

	FGSPluralArg() = default;

	/** Creates a cardinal integer plural arg. */
	FGSPluralArg(const FString& InName, int32 InValue)
		: Name(InName), Value(InValue), Precision(0), Type(EGSPluralType::Cardinal) {}

	/** Creates an integer plural arg with an explicit type. */
	FGSPluralArg(const FString& InName, int32 InValue, EGSPluralType InType)
		: Name(InName), Value(InValue), Precision(0), Type(InType) {}

	/** Creates a cardinal decimal plural arg. Represented number = InValue / 10^InPrecision. */
	FGSPluralArg(const FString& InName, int64 InValue, int32 InPrecision)
		: Name(InName), Value(InValue), Precision(InPrecision), Type(EGSPluralType::Cardinal) {}

	/** Creates a decimal plural arg with an explicit type. Represented number = InValue / 10^InPrecision. */
	FGSPluralArg(const FString& InName, int64 InValue, int32 InPrecision, EGSPluralType InType)
		: Name(InName), Value(InValue), Precision(InPrecision), Type(InType) {}
};

/**
 * A named typed substitution argument. Affects template output only — never form selection.
 * Use the static factory methods to create arguments of the desired type.
 */
USTRUCT(BlueprintType)
struct GAMESCRIPT_API FGSArg
{
	GENERATED_BODY()

	/** The placeholder name used in templates, e.g. "player". */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	FString Name;

	/** Determines how the value is formatted during substitution. */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	EGSArgType Type = EGSArgType::String;

	/** String value. Used when Type is String. */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	FString StringValue;

	/**
	 * Numeric value. Interpretation depends on Type:
	 * Int/RawInt: the integer value.
	 * Decimal/Percent: value in minor units (e.g., 314 with precision 2 = 3.14).
	 * Currency: value in minor currency units (e.g., 1999 for $19.99 USD).
	 */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	int64 NumericValue = 0;

	/**
	 * Number of decimal places for Decimal and Percent types.
	 * Ignored for other types. For Currency, decimal places come from ISO 4217.
	 */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	int32 Precision = 0;

	/**
	 * ISO 4217 currency code (e.g., "USD", "EUR", "JPY").
	 * Only used when Type is Currency.
	 */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	FString CurrencyCode;

	FGSArg() = default;

	/** Creates a plain string substitution argument. */
	static FGSArg String(const FString& InName, const FString& InValue)
	{
		FGSArg Arg;
		Arg.Name = InName;
		Arg.Type = EGSArgType::String;
		Arg.StringValue = InValue;
		return Arg;
	}

	/** Creates a locale-aware integer argument with grouping separators (e.g., "1,000"). */
	static FGSArg Int(const FString& InName, int64 InValue)
	{
		FGSArg Arg;
		Arg.Name = InName;
		Arg.Type = EGSArgType::Int;
		Arg.NumericValue = InValue;
		return Arg;
	}

	/** Creates a locale-aware decimal argument (e.g., 314 with precision 2 -> "3.14"). */
	static FGSArg Decimal(const FString& InName, int64 InValue, int32 InPrecision)
	{
		FGSArg Arg;
		Arg.Name = InName;
		Arg.Type = EGSArgType::Decimal;
		Arg.NumericValue = InValue;
		Arg.Precision = InPrecision;
		return Arg;
	}

	/** Creates a locale-aware percentage argument (e.g., 155 with precision 1 -> "15.5%"). */
	static FGSArg Percent(const FString& InName, int64 InValue, int32 InPrecision)
	{
		FGSArg Arg;
		Arg.Name = InName;
		Arg.Type = EGSArgType::Percent;
		Arg.NumericValue = InValue;
		Arg.Precision = InPrecision;
		return Arg;
	}

	/** Creates a locale-aware currency argument (e.g., 1999 with "USD" -> "$19.99"). */
	static FGSArg Currency(const FString& InName, int64 InMinorUnits, const FString& InCurrencyCode)
	{
		FGSArg Arg;
		Arg.Name = InName;
		Arg.Type = EGSArgType::Currency;
		Arg.NumericValue = InMinorUnits;
		Arg.CurrencyCode = InCurrencyCode;
		return Arg;
	}

	/** Creates a raw integer argument with no formatting (e.g., "1000"). */
	static FGSArg RawInt(const FString& InName, int64 InValue)
	{
		FGSArg Arg;
		Arg.Name = InName;
		Arg.Type = EGSArgType::RawInt;
		Arg.NumericValue = InValue;
		return Arg;
	}
};

/**
 * Parameters controlling how a localization entry's text is resolved.
 * Zero-initializable — safe to pass default-constructed everywhere.
 *
 * GenderOverride: when not set, the runner auto-resolves gender from the snapshot
 * (subject actor's grammatical gender, or the localization's own subject_gender).
 *
 * Plural: when not set, the runner defaults to PluralCategory::Other.
 * When set, the named integer value drives CLDR plural category selection and is
 * substituted into template placeholders with locale-aware integer grouping.
 *
 * Args: named typed substitutions applied to the resolved template text.
 * These never affect form (gender / plural) selection.
 */
USTRUCT(BlueprintType)
struct GAMESCRIPT_API FTextResolutionParams
{
	GENERATED_BODY()

	/** Whether GenderOverride is set. */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	bool bHasGenderOverride = false;

	/** Explicit gender to use for variant selection. Only used when bHasGenderOverride is true. */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript", meta = (EditCondition = "bHasGenderOverride"))
	EGSGenderCategory GenderOverride = EGSGenderCategory::Other;

	/** Whether Plural is set. */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	bool bHasPlural = false;

	/** Named integer that drives plural-category selection and template substitution. Only used when bHasPlural is true. */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript", meta = (EditCondition = "bHasPlural"))
	FGSPluralArg Plural;

	/** Named typed substitution arguments. Applied to the template text after variant selection. */
	UPROPERTY(BlueprintReadWrite, Category = "GameScript")
	TArray<FGSArg> Args;

	// Convenience: set gender override
	void SetGenderOverride(EGSGenderCategory InGender)
	{
		bHasGenderOverride = true;
		GenderOverride = InGender;
	}

	// Convenience: set plural arg
	void SetPlural(const FGSPluralArg& InPlural)
	{
		bHasPlural = true;
		Plural = InPlural;
	}
};
