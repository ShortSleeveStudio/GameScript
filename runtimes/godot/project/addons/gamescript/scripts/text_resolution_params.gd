class_name _GameScriptTextResolutionParams
## Types for controlling how localization text is resolved.
##
## Contains enums (as constant classes), PluralArg, Arg, and TextResolutionParams.
## Zero-initializable — safe to pass defaults everywhere.


## Selects whether CLDR cardinal or ordinal plural rules are applied.
class PluralType:
	const CARDINAL = 0
	const ORDINAL = 1


## Determines how an Arg value is formatted during template substitution.
class ArgType:
	const STRING = 0
	const INT = 1
	const DECIMAL = 2
	const PERCENT = 3
	const CURRENCY = 4
	const RAW_INT = 5


## Gender category for variant selection.
class GenderCategory:
	const OTHER = 0
	const MASCULINE = 1
	const FEMININE = 2
	const NEUTER = 3


## Grammatical gender assigned to actors/localizations.
class GrammaticalGender:
	const OTHER = 0
	const MASCULINE = 1
	const FEMININE = 2
	const NEUTER = 3
	const DYNAMIC = 4


## CLDR plural category.
class PluralCategory:
	const ZERO = 0
	const ONE = 1
	const TWO = 2
	const FEW = 3
	const MANY = 4
	const OTHER = 5


## A named numeric argument that drives plural-category selection AND template substitution.
## For integers (precision=0): value is substituted with locale-aware integer grouping.
## For decimals (precision>0): the represented number is value / 10^precision.
class PluralArg:
	var name: String
	## When precision=0, this is the integer value.
	## When precision>0, this is the unscaled value (e.g., 150 with precision=1 represents 15.0).
	var value: int
	## Number of decimal places. 0 = integer, >0 = decimal places.
	var precision: int
	## PluralType.CARDINAL or PluralType.ORDINAL.
	var type: int

	func _init(p_name: String = "", p_value: int = 0, p_precision: int = 0, p_type: int = PluralType.CARDINAL):
		name = p_name
		value = p_value
		precision = p_precision
		type = p_type

	## Creates a cardinal integer PluralArg.
	static func cardinal(p_name: String, p_value: int) -> PluralArg:
		return PluralArg.new(p_name, p_value, 0, PluralType.CARDINAL)

	## Creates a cardinal decimal PluralArg.
	## The represented number is p_value / 10^p_precision.
	static func cardinal_decimal(p_name: String, p_value: int, p_precision: int) -> PluralArg:
		return PluralArg.new(p_name, p_value, p_precision, PluralType.CARDINAL)

	## Creates an ordinal integer PluralArg.
	static func ordinal(p_name: String, p_value: int) -> PluralArg:
		return PluralArg.new(p_name, p_value, 0, PluralType.ORDINAL)

	## Creates a decimal PluralArg with an explicit plural type.
	static func decimal_typed(p_name: String, p_value: int, p_precision: int, p_type: int) -> PluralArg:
		return PluralArg.new(p_name, p_value, p_precision, p_type)


## A named typed substitution argument. Affects template output only -- never form selection.
## Use the static factory methods to create arguments of the desired type.
class Arg:
	## The placeholder name used in templates, e.g. "player".
	var name: String
	## Determines how the value is formatted during substitution. See ArgType constants.
	var type: int
	## String value. Used when type is ArgType.STRING.
	var string_value: String
	## Numeric value. Interpretation depends on type:
	## INT/RAW_INT: the integer value.
	## DECIMAL/PERCENT: value in minor units (e.g., 314 with precision 2 = 3.14).
	## CURRENCY: value in minor currency units (e.g., 1999 for $19.99 USD).
	var numeric_value: int
	## Number of decimal places for DECIMAL and PERCENT. Ignored for other types.
	## For CURRENCY, decimal places come from ISO 4217.
	var precision: int
	## ISO 4217 currency code (e.g., "USD", "EUR", "JPY").
	## Only used when type is ArgType.CURRENCY.
	var currency_code: String

	## Creates a plain string substitution argument.
	static func string_arg(p_name: String, p_value: String) -> Arg:
		var arg = Arg.new()
		arg.name = p_name
		arg.type = ArgType.STRING
		arg.string_value = p_value
		return arg

	## Creates a locale-aware integer argument with grouping separators (e.g., "1,000").
	static func int_arg(p_name: String, p_value: int) -> Arg:
		var arg = Arg.new()
		arg.name = p_name
		arg.type = ArgType.INT
		arg.numeric_value = p_value
		return arg

	## Creates a locale-aware decimal argument (e.g., 314 with precision 2 -> "3.14").
	static func decimal_arg(p_name: String, p_value: int, p_precision: int) -> Arg:
		var arg = Arg.new()
		arg.name = p_name
		arg.type = ArgType.DECIMAL
		arg.numeric_value = p_value
		arg.precision = p_precision
		return arg

	## Creates a locale-aware percentage argument (e.g., 155 with precision 1 -> "15.5%").
	static func percent_arg(p_name: String, p_value: int, p_precision: int) -> Arg:
		var arg = Arg.new()
		arg.name = p_name
		arg.type = ArgType.PERCENT
		arg.numeric_value = p_value
		arg.precision = p_precision
		return arg

	## Creates a locale-aware currency argument (e.g., 1999 with "USD" -> "$19.99").
	## Decimal places are determined by ISO 4217 for the given currency code.
	static func currency_arg(p_name: String, p_minor_units: int, p_currency_code: String) -> Arg:
		var arg = Arg.new()
		arg.name = p_name
		arg.type = ArgType.CURRENCY
		arg.numeric_value = p_minor_units
		arg.currency_code = p_currency_code
		return arg

	## Creates a raw integer argument with no formatting (e.g., "1000").
	static func raw_int_arg(p_name: String, p_value: int) -> Arg:
		var arg = Arg.new()
		arg.name = p_name
		arg.type = ArgType.RAW_INT
		arg.numeric_value = p_value
		return arg


## Parameters controlling how a localization entry's text is resolved.
## Zero-initializable -- safe to pass default everywhere.
class TextResolutionParams:
	## Explicit gender to use for variant selection.
	## When has_gender_override is false, auto-resolve from the snapshot.
	var has_gender_override: bool = false
	var gender_override: int = GenderCategory.OTHER

	## Named numeric argument that drives plural-category selection and template substitution.
	## When has_plural is false, use PluralCategory.OTHER with no numeric substitution.
	var has_plural: bool = false
	var plural: PluralArg = null

	## Named typed substitution arguments. Applied to the template text after variant
	## selection. Never affect form selection.
	var args: Array = []  # Array[Arg]

	## Sets an explicit gender override for variant selection.
	func set_gender_override(gender: int) -> void:
		has_gender_override = true
		gender_override = gender

	## Sets the plural argument for plural-category selection.
	func set_plural(p_plural: PluralArg) -> void:
		has_plural = true
		plural = p_plural
