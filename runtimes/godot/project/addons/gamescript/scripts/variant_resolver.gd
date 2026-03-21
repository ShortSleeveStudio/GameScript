class_name _GameScriptVariantResolver
## Selects the best-matching text variant from a localization entry
## for a given gender and plural category.
##
## Selection uses a three-pass fallback scan:
## 1. Exact -- variant.plural == plural AND variant.gender == gender
## 2. Gender fallback -- variant.plural == plural AND variant.gender == Other
## 3. Catch-all -- variant.plural == Other AND variant.gender == Other
##
## Returns empty string if no matching variant is found.


## Resolves the best-matching text for the given gender and plural category.
## localization: a LocalizationRef (GDExtension) that exposes variant accessors.
## gender: GenderCategory constant (from _GameScriptTextResolutionParams.GenderCategory).
## plural: PluralCategory constant (from _GameScriptTextResolutionParams.PluralCategory).
static func resolve(localization: LocalizationRef, gender: int, plural: int) -> String:
	var count: int = localization.get_variant_count()
	if count == 0:
		return ""

	var PluralCategory = _GameScriptTextResolutionParams.PluralCategory
	var GenderCategory = _GameScriptTextResolutionParams.GenderCategory

	# Pass 1 -- Exact: plural AND gender both match
	for i in range(count):
		if localization.get_variant_plural(i) == plural and localization.get_variant_gender(i) == gender:
			return localization.get_variant_text(i)

	# Pass 2 -- Gender fallback: plural matches, gender falls back to Other
	if gender != GenderCategory.OTHER:
		for i in range(count):
			if localization.get_variant_plural(i) == plural and localization.get_variant_gender(i) == GenderCategory.OTHER:
				return localization.get_variant_text(i)

	# Pass 3 -- Catch-all: PluralCategory.Other AND GenderCategory.Other
	# Only needed when plural != Other. When plural IS Other, Pass 2 already
	# searched for (Other, Other) -- which is the catch-all -- so repeating is redundant.
	if plural != PluralCategory.OTHER:
		for i in range(count):
			if localization.get_variant_plural(i) == PluralCategory.OTHER and localization.get_variant_gender(i) == GenderCategory.OTHER:
				return localization.get_variant_text(i)

	return ""
