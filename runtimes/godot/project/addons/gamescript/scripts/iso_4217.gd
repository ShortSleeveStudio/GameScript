class_name _GameScriptIso4217
## ISO 4217 currency utilities for locale-aware currency formatting.
## Provides minor unit digit counts and currency symbols.


## Returns the number of minor unit digits (decimal places) for the given ISO 4217
## currency code. Defaults to 2 for unknown codes (the most common case).
static func get_minor_unit_digits(currency_code: String) -> int:
	if currency_code.is_empty():
		return 2
	var upper := currency_code.to_upper()
	if _OVERRIDES.has(upper):
		return _OVERRIDES[upper]
	return 2


## Returns the currency symbol for the given ISO 4217 code.
## Falls back to the code itself (e.g., "USD") if no symbol is available.
## locale_code is reserved for future locale-aware symbol resolution.
static func get_symbol(currency_code: String, _locale_code: String = "") -> String:
	if currency_code.is_empty():
		return ""
	var upper := currency_code.to_upper()
	if _SYMBOLS.has(upper):
		return _SYMBOLS[upper]
	return currency_code


# Minor unit digits (decimal places) per ISO 4217 currency code.
# Only currencies that differ from the default of 2 are listed.
const _OVERRIDES := {
	# 0 decimal places
	"BIF": 0, "BYR": 0, "CLP": 0, "DJF": 0,
	"GNF": 0, "ISK": 0, "JPY": 0, "KMF": 0,
	"KRW": 0, "PYG": 0, "RWF": 0, "UGX": 0,
	"UYI": 0, "VND": 0, "VUV": 0, "XAF": 0,
	"XOF": 0, "XPF": 0,
	# 3 decimal places
	"BHD": 3, "IQD": 3, "JOD": 3, "KWD": 3,
	"LYD": 3, "OMR": 3, "TND": 3,
	# 4 decimal places
	"CLF": 4, "UYW": 4,
}


# Common currency symbols. For foreign currencies this provides a best-effort
# canonical symbol. Matches Unity's fallback table.
const _SYMBOLS := {
	"USD": "$", "EUR": "\u20ac", "GBP": "\u00a3", "JPY": "\u00a5", "CNY": "\u00a5",
	"KRW": "\u20a9", "INR": "\u20b9", "RUB": "\u20bd", "BRL": "R$", "TRY": "\u20ba",
	"THB": "\u0e3f", "PLN": "z\u0142", "SEK": "kr", "NOK": "kr", "DKK": "kr",
	"CHF": "CHF", "CAD": "CA$", "AUD": "A$", "NZD": "NZ$", "MXN": "MX$",
	"SGD": "S$", "HKD": "HK$", "TWD": "NT$",
}
