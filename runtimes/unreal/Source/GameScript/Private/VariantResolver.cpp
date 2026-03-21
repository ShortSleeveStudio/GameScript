#include "VariantResolver.h"
#include "Generated/snapshot_generated.h"

FString FVariantResolver::Resolve(
	const GameScript::Localization* Localization,
	EGSGenderCategory Gender,
	EGSPluralCategory Plural)
{
	if (!Localization)
	{
		return FString();
	}

	const auto* Variants = Localization->variants();
	if (!Variants)
	{
		return FString();
	}

	const int32 Count = static_cast<int32>(Variants->size());
	if (Count == 0)
	{
		return FString();
	}

	// Cast our EGS enums to the FlatBuffers enum values.
	// The numeric values are identical so a static_cast is safe.
	const auto FBPlural = static_cast<GameScript::PluralCategory>(Plural);
	const auto FBGender = static_cast<GameScript::GenderCategory>(Gender);

	// Pass 1 -- Exact: plural AND gender both match
	for (int32 i = 0; i < Count; i++)
	{
		const auto* V = Variants->Get(i);
		if (V->plural() == FBPlural && V->gender() == FBGender)
		{
			const auto* Text = V->text();
			return Text ? FString(UTF8_TO_TCHAR(Text->c_str())) : FString();
		}
	}

	// Pass 2 -- Gender fallback: plural matches, gender falls back to Other
	if (Gender != EGSGenderCategory::Other)
	{
		for (int32 i = 0; i < Count; i++)
		{
			const auto* V = Variants->Get(i);
			if (V->plural() == FBPlural && V->gender() == GameScript::GenderCategory_Other)
			{
				const auto* Text = V->text();
				return Text ? FString(UTF8_TO_TCHAR(Text->c_str())) : FString();
			}
		}
	}

	// Pass 3 -- Catch-all: PluralCategory::Other AND GenderCategory::Other
	// Only needed when plural != Other. When plural IS Other, Pass 2 already
	// searched for (Other, Other) -- which is the catch-all -- so repeating is redundant.
	if (Plural != EGSPluralCategory::Other)
	{
		for (int32 i = 0; i < Count; i++)
		{
			const auto* V = Variants->Get(i);
			if (V->plural() == GameScript::PluralCategory_Other && V->gender() == GameScript::GenderCategory_Other)
			{
				const auto* Text = V->text();
				return Text ? FString(UTF8_TO_TCHAR(Text->c_str())) : FString();
			}
		}
	}

	return FString();
}
