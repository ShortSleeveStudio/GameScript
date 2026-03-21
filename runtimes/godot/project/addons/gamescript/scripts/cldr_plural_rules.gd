class_name _GameScriptCldrPluralRules
## Maps IETF locale codes to CLDR plural categories for integer and decimal quantities.
## Derived from the Unicode CLDR plurals.json rules.
##
## Locale lookup order:
## 1. Exact match (e.g., "pt-PT")
## 2. Separator swap: replace _ with - or vice-versa
## 3. Language subtag only (first segment before - or _)
## 4. Default: PluralCategory.Other


const PluralCategory = _GameScriptTextResolutionParams.PluralCategory


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

## Resolves the CLDR cardinal plural category for the given locale and integer count.
static func resolve(locale_code: String, count: int) -> int:
	var rule := _lookup_rule(_get_cardinal_map(), locale_code)
	return _apply_rule(rule, absi(count))


## Resolves the CLDR cardinal plural category with full decimal operand support.
## When precision is 0, produces identical results to resolve().
## value: unscaled value (e.g., 150 with precision=1 represents 15.0).
## precision: number of decimal places. 0 = integer.
static func resolve_decimal(locale_code: String, value: int, precision: int) -> int:
	var rule := _lookup_rule(_get_cardinal_map(), locale_code)
	return apply_rule(rule, value, precision)


## Resolves the CLDR ordinal plural category for the given locale and integer count.
static func resolve_ordinal(locale_code: String, count: int) -> int:
	var rule := _lookup_rule(_get_ordinal_map(), locale_code)
	return _apply_ordinal_rule(rule, absi(count))


## Returns the cardinal rule index for the given locale code. Cache this value and
## pass it to apply_rule() to avoid per-call locale normalization.
static func lookup_cardinal_rule(locale_code: String) -> int:
	return _lookup_rule(_get_cardinal_map(), locale_code)


## Returns the ordinal rule index for the given locale code. Cache this value and
## pass it to apply_ordinal_rule() to avoid per-call locale normalization.
static func lookup_ordinal_rule(locale_code: String) -> int:
	return _lookup_rule(_get_ordinal_map(), locale_code)


## Applies a cardinal plural rule with full decimal operand support.
## When precision is 0, delegates to the integer-only path.
static func apply_rule(rule: int, value: int, precision: int = 0) -> int:
	if precision <= 0:
		return _apply_rule(rule, absi(value))
	# Decimal path -- full CLDR operands
	var op := _derive_operands(value, precision)
	return _apply_decimal_cardinal(rule, op)


## Applies an ordinal plural rule to the given integer count.
static func apply_ordinal_rule(rule: int, n: int) -> int:
	return _apply_ordinal_rule(rule, absi(n))


# ─────────────────────────────────────────────────────────────────────────────
# Locale Lookup
# ─────────────────────────────────────────────────────────────────────────────

# Shared locale -> rule-index lookup: exact -> separator swap -> language subtag -> 0.
static func _lookup_rule(map: Dictionary, locale_code: String) -> int:
	if locale_code.is_empty():
		return 0

	# 1. Exact lookup
	if map.has(locale_code):
		return map[locale_code]

	# 2. Separator swap (underscore <-> hyphen)
	var swapped := _swap_separator(locale_code)
	if not swapped.is_empty() and map.has(swapped):
		return map[swapped]

	# 3. Language subtag only
	var subtag := _language_subtag(locale_code)
	if not subtag.is_empty() and map.has(subtag):
		return map[subtag]

	# 4. Default
	return 0


# Swaps the first occurrence of _ with - or vice-versa.
# Returns empty string if the input contains neither separator.
static func _swap_separator(code: String) -> String:
	var idx := code.find("_")
	if idx >= 0:
		return code.substr(0, idx) + "-" + code.substr(idx + 1)
	idx = code.find("-")
	if idx >= 0:
		return code.substr(0, idx) + "_" + code.substr(idx + 1)
	return ""


# Returns the language subtag (text before the first - or _).
# Returns empty string if the code contains no separator.
static func _language_subtag(code: String) -> String:
	for i in range(code.length()):
		var c := code[i]
		if c == "-" or c == "_":
			return code.substr(0, i)
	return ""


# ─────────────────────────────────────────────────────────────────────────────
# Cardinal Rule Dispatch (29 rules, 0..28)
# ─────────────────────────────────────────────────────────────────────────────

static func _apply_rule(rule: int, n: int) -> int:
	match rule:
		# ── 0: always Other ──────────────────────────────────────────────
		0:
			return PluralCategory.OTHER

		# ── 1: n==1 -> One; else Other ───────────────────────────────────
		1:
			return PluralCategory.ONE if n == 1 else PluralCategory.OTHER

		# ── 2: (n==0 || n==1) -> One; else Other ────────────────────────
		2:
			return PluralCategory.ONE if (n == 0 or n == 1) else PluralCategory.OTHER

		# ── 3: n==1 -> One; n==2 -> Two; else Other ─────────────────────
		3:
			if n == 1: return PluralCategory.ONE
			if n == 2: return PluralCategory.TWO
			return PluralCategory.OTHER

		# ── 4: Italian-style (n==1 -> One; n!=0 && n%1000000==0 -> Many) ─
		4:
			if n == 1: return PluralCategory.ONE
			if n != 0 and n % 1000000 == 0: return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 5: Serbo-Croatian ─────────────────────────────────────────────
		5:
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 == 1 and mod100 != 11:
				return PluralCategory.ONE
			if mod10 >= 2 and mod10 <= 4 and not (mod100 >= 12 and mod100 <= 14):
				return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 6: n==0 -> Zero; n==1 -> One; else Other ─────────────────────
		6:
			if n == 0: return PluralCategory.ZERO
			if n == 1: return PluralCategory.ONE
			return PluralCategory.OTHER

		# ── 7: Filipino ───────────────────────────────────────────────────
		# One: n in {1,2,3} || n%10 not in {4,6,9}
		7:
			if n == 1 or n == 2 or n == 3:
				return PluralCategory.ONE
			var mod10 := n % 10
			if mod10 != 4 and mod10 != 6 and mod10 != 9:
				return PluralCategory.ONE
			return PluralCategory.OTHER

		# ── 8: Arabic ─────────────────────────────────────────────────────
		8:
			if n == 0: return PluralCategory.ZERO
			if n == 1: return PluralCategory.ONE
			if n == 2: return PluralCategory.TWO
			var mod100 := n % 100
			if mod100 >= 3 and mod100 <= 10: return PluralCategory.FEW
			if mod100 >= 11 and mod100 <= 99: return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 9: Czech/Slovak ───────────────────────────────────────────────
		9:
			if n == 1: return PluralCategory.ONE
			if n >= 2 and n <= 4: return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 10: Sorbian/Slovenian ─────────────────────────────────────────
		10:
			var mod100 := n % 100
			if mod100 == 1: return PluralCategory.ONE
			if mod100 == 2: return PluralCategory.TWO
			if mod100 == 3 or mod100 == 4: return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 11: Latvian ───────────────────────────────────────────────────
		11:
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 == 0 or (mod100 >= 11 and mod100 <= 19):
				return PluralCategory.ZERO
			if mod10 == 1 and mod100 != 11:
				return PluralCategory.ONE
			return PluralCategory.OTHER

		# ── 12: Romanian ──────────────────────────────────────────────────
		12:
			if n == 1: return PluralCategory.ONE
			var mod100 := n % 100
			if n == 0 or (mod100 >= 1 and mod100 <= 19):
				return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 13: Russian/Ukrainian/Belarusian ──────────────────────────────
		13:
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 == 1 and mod100 != 11:
				return PluralCategory.ONE
			if mod10 >= 2 and mod10 <= 4 and not (mod100 >= 12 and mod100 <= 14):
				return PluralCategory.FEW
			return PluralCategory.MANY

		# ── 14: Breton ────────────────────────────────────────────────────
		14:
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 == 1 and mod100 != 11 and mod100 != 71 and mod100 != 91:
				return PluralCategory.ONE
			if mod10 == 2 and mod100 != 12 and mod100 != 72 and mod100 != 92:
				return PluralCategory.TWO
			if (mod10 >= 3 and mod10 <= 4) or mod10 == 9:
				if not (mod100 >= 10 and mod100 <= 19) and \
				   not (mod100 >= 70 and mod100 <= 79) and \
				   not (mod100 >= 90 and mod100 <= 99):
					return PluralCategory.FEW
			if n != 0 and n % 1000000 == 0:
				return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 15: Welsh ─────────────────────────────────────────────────────
		15:
			if n == 0: return PluralCategory.ZERO
			if n == 1: return PluralCategory.ONE
			if n == 2: return PluralCategory.TWO
			if n == 3: return PluralCategory.FEW
			if n == 6: return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 16: French ────────────────────────────────────────────────────
		16:
			if n == 0 or n == 1: return PluralCategory.ONE
			if n != 0 and n % 1000000 == 0: return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 17: Irish ─────────────────────────────────────────────────────
		17:
			if n == 1: return PluralCategory.ONE
			if n == 2: return PluralCategory.TWO
			if n >= 3 and n <= 6: return PluralCategory.FEW
			if n >= 7 and n <= 10: return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 18: Scottish Gaelic ───────────────────────────────────────────
		18:
			if n == 1 or n == 11: return PluralCategory.ONE
			if n == 2 or n == 12: return PluralCategory.TWO
			if (n >= 3 and n <= 10) or (n >= 13 and n <= 19): return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 19: Manx ──────────────────────────────────────────────────────
		19:
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 == 1: return PluralCategory.ONE
			if mod10 == 2: return PluralCategory.TWO
			if mod100 == 0 or mod100 == 20 or mod100 == 40 or \
			   mod100 == 60 or mod100 == 80:
				return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 20: Icelandic/Macedonian ──────────────────────────────────────
		20:
			var mod10 := n % 10
			var mod100 := n % 100
			return PluralCategory.ONE if (mod10 == 1 and mod100 != 11) else PluralCategory.OTHER

		# ── 21: Cornish ───────────────────────────────────────────────────
		21:
			if n == 0: return PluralCategory.ZERO
			if n == 1: return PluralCategory.ONE

			var mod100 := n % 100
			var mod1000 := n % 1000
			var mod100000 := n % 100000
			var mod1000000 := n % 1000000

			# Two: n%100 in {2,22,42,62,82}
			#   || (n%1000==0 && (n%100000 in 1000..20000 || in {40000,60000,80000}))
			#   || (n!=0 && n%1000000==100000)
			if mod100 == 2 or mod100 == 22 or mod100 == 42 or \
			   mod100 == 62 or mod100 == 82:
				return PluralCategory.TWO
			if mod1000 == 0 and \
			   ((mod100000 >= 1000 and mod100000 <= 20000) or \
				mod100000 == 40000 or mod100000 == 60000 or mod100000 == 80000):
				return PluralCategory.TWO
			if n != 0 and mod1000000 == 100000:
				return PluralCategory.TWO

			# Few: n%100 in {3,23,43,63,83}
			if mod100 == 3 or mod100 == 23 or mod100 == 43 or \
			   mod100 == 63 or mod100 == 83:
				return PluralCategory.FEW

			# Many: n%100 in {1,21,41,61,81}
			if mod100 == 1 or mod100 == 21 or mod100 == 41 or \
			   mod100 == 61 or mod100 == 81:
				return PluralCategory.MANY

			return PluralCategory.OTHER

		# ── 22: Lithuanian ────────────────────────────────────────────────
		22:
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 == 1 and not (mod100 >= 11 and mod100 <= 19):
				return PluralCategory.ONE
			if mod10 >= 2 and mod10 <= 9 and not (mod100 >= 11 and mod100 <= 19):
				return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 23: Maltese ───────────────────────────────────────────────────
		23:
			if n == 1: return PluralCategory.ONE
			if n == 2: return PluralCategory.TWO
			var mod100 := n % 100
			if n == 0 or (mod100 >= 3 and mod100 <= 10):
				return PluralCategory.FEW
			if mod100 >= 11 and mod100 <= 19:
				return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 24: Polish ────────────────────────────────────────────────────
		24:
			if n == 1: return PluralCategory.ONE
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 >= 2 and mod10 <= 4 and not (mod100 >= 12 and mod100 <= 14):
				return PluralCategory.FEW
			return PluralCategory.MANY

		# ── 25: Portuguese (Brazil) ───────────────────────────────────────
		25:
			if n == 0 or n == 1: return PluralCategory.ONE
			if n != 0 and n % 1000000 == 0: return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 26: Samogitian ────────────────────────────────────────────────
		26:
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 == 1 and mod100 != 11:
				return PluralCategory.ONE
			if n == 2:
				return PluralCategory.TWO
			if n != 2 and mod10 >= 2 and mod10 <= 9 and not (mod100 >= 11 and mod100 <= 19):
				return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 27: Tachelhit ─────────────────────────────────────────────────
		27:
			if n == 0 or n == 1: return PluralCategory.ONE
			if n >= 2 and n <= 10: return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 28: Tamazight ─────────────────────────────────────────────────
		28:
			if (n >= 0 and n <= 1) or (n >= 11 and n <= 99):
				return PluralCategory.ONE
			return PluralCategory.OTHER

		_:
			return PluralCategory.OTHER

	# Unreachable, but GDScript requires return outside match
	return PluralCategory.OTHER


# ─────────────────────────────────────────────────────────────────────────────
# Decimal Operands
# ─────────────────────────────────────────────────────────────────────────────

# CLDR plural operands derived from (value, precision).
# See: https://unicode.org/reports/tr35/tr35-numbers.html#Operands
# Fields: i (integer digits), v (visible fraction digit count with trailing zeros),
# w (non-zero fraction digit count), f (visible fraction digits), t (fraction without trailing zeros)

static func _pow10(exponent: int) -> int:
	var result := 1
	for i in range(exponent):
		result *= 10
	return result


static func _derive_operands(value: int, precision: int) -> Dictionary:
	if precision <= 0:
		return { "i": absi(value), "v": 0, "w": 0, "f": 0, "t": 0 }

	var abs_val := absi(value)
	var pow_val := _pow10(precision)
	var i_val := abs_val / pow_val
	var f_val := abs_val % pow_val

	# Derive t (f with trailing zeros stripped) and w (digit count of t)
	var t_val := f_val
	var w_val := precision
	if t_val > 0:
		while t_val % 10 == 0:
			t_val /= 10
			w_val -= 1
	else:
		w_val = 0

	return { "i": i_val, "v": precision, "w": w_val, "f": f_val, "t": t_val }


# Applies CLDR cardinal plural rules for decimal values (v > 0).
# For each rule, conditions that require v = 0 are unreachable for decimals, so those
# categories correctly fall through to Other.
static func _apply_decimal_cardinal(rule: int, op: Dictionary) -> int:
	match rule:
		# ── 0: always Other ───────────────────────────────────────────
		0:
			return PluralCategory.OTHER

		# ── 1: one requires v=0 -> decimals always Other ──────────────
		1:
			return PluralCategory.OTHER

		# ── 2: one: i=0 or n=1 (Hindi, Bangla, etc.) ──────────────────
		# For decimals: i==0 -> One; n==1 means exact 1 (i=1 and f=0) -> One
		2:
			if op["i"] == 0 or (op["i"] == 1 and op["f"] == 0):
				return PluralCategory.ONE
			return PluralCategory.OTHER

		# ── 3: one: n=1; two: n=2 (exact values only) ─────────────────
		3:
			if op["i"] == 1 and op["f"] == 0: return PluralCategory.ONE
			if op["i"] == 2 and op["f"] == 0: return PluralCategory.TWO
			return PluralCategory.OTHER

		# ── 4: Italian -- one requires v=0; many: n!=0 && n%1M==0 ─────
		4:
			if op["f"] == 0 and op["i"] != 0 and op["i"] % 1000000 == 0:
				return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 5: Serbo-Croatian -- one/few require v=0 -> decimals Other ─
		5:
			return PluralCategory.OTHER

		# ── 6: zero: n=0; one: i=0,1 and n!=0 ─────────────────────────
		6:
			if op["i"] == 0 and op["f"] == 0:
				return PluralCategory.ZERO
			if op["i"] == 0 or op["i"] == 1:
				return PluralCategory.ONE
			return PluralCategory.OTHER

		# ── 7: Filipino -- for decimals: f%10 not in {4,6,9} -> One ────
		7:
			var f_mod10: int = op["f"] % 10
			if f_mod10 != 4 and f_mod10 != 6 and f_mod10 != 9:
				return PluralCategory.ONE
			return PluralCategory.OTHER

		# ── 8: Arabic -- complex decimal rules, Other is safe ──────────
		8:
			return PluralCategory.OTHER

		# ── 9: Czech/Slovak -- one/few require v=0 -> decimals Other ───
		9:
			return PluralCategory.OTHER

		# ── 10: Sorbian/Slovenian -- one/two/few require v=0 ───────────
		10:
			return PluralCategory.OTHER

		# ── 11: Latvian -- complex f-based rules, Other is safe ────────
		11:
			return PluralCategory.OTHER

		# ── 12: Romanian -- v!=0 -> always Few ─────────────────────────
		12:
			return PluralCategory.FEW

		# ── 13: Russian/Ukrainian/Belarusian -- one/few/many require v=0
		13:
			return PluralCategory.OTHER

		# ── 14: Breton -- uses n% for integers, Other for decimals ─────
		14:
			return PluralCategory.OTHER

		# ── 15: Welsh -- exact n values, Other for decimals ────────────
		15:
			return PluralCategory.OTHER

		# ── 16: French -- one requires v=0; many requires v=0 ─────────
		16:
			return PluralCategory.OTHER

		# ── 17: Irish -- exact n values, Other for decimals ────────────
		17:
			return PluralCategory.OTHER

		# ── 18: Scottish Gaelic -- exact n values, Other for decimals ──
		18:
			return PluralCategory.OTHER

		# ── 19: Manx -- uses n% for integers, Other for decimals ───────
		19:
			return PluralCategory.OTHER

		# ── 20: Icelandic/Macedonian -- complex t/f rules, Other safe ──
		20:
			return PluralCategory.OTHER

		# ── 21: Cornish -- exact values, Other for decimals ────────────
		21:
			return PluralCategory.OTHER

		# ── 22: Lithuanian -- complex f rules, Other is safe ───────────
		22:
			return PluralCategory.OTHER

		# ── 23: Maltese -- exact values + n%100, Other for decimals ────
		23:
			return PluralCategory.OTHER

		# ── 24: Polish -- one/few/many require v=0 -> decimals Other ───
		24:
			return PluralCategory.OTHER

		# ── 25: Portuguese BR -- one requires v=0 -> decimals Other ────
		25:
			return PluralCategory.OTHER

		# ── 26: Samogitian -- complex f rules, Other is safe ───────────
		26:
			return PluralCategory.OTHER

		# ── 27: Tachelhit -- one: i=0 or n=1; few: n in 2..10 ─────────
		27:
			if op["i"] == 0 or (op["i"] == 1 and op["f"] == 0):
				return PluralCategory.ONE
			if op["f"] == 0 and op["i"] >= 2 and op["i"] <= 10:
				return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 28: Tamazight -- exact ranges, Other for decimals ──────────
		28:
			return PluralCategory.OTHER

		_:
			return PluralCategory.OTHER

	return PluralCategory.OTHER


# ─────────────────────────────────────────────────────────────────────────────
# Ordinal Rule Dispatch (25 rules, 0..24)
# ─────────────────────────────────────────────────────────────────────────────

static func _apply_ordinal_rule(rule: int, n: int) -> int:
	match rule:
		# ── 0: always Other ──────────────────────────────────────────────
		0:
			return PluralCategory.OTHER

		# ── 1: n==1 -> One; else Other ───────────────────────────────────
		1:
			return PluralCategory.ONE if n == 1 else PluralCategory.OTHER

		# ── 2: Italian -- n in {8,11,80,800} -> Many; else Other ─────────
		2:
			if n == 8 or n == 11 or n == 80 or n == 800:
				return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 3: Marathi -- n==1 -> One; n in {2,3} -> Two; n==4 -> Few ────
		3:
			if n == 1: return PluralCategory.ONE
			if n == 2 or n == 3: return PluralCategory.TWO
			if n == 4: return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 4: Bengali -- n in {1,5,7,8,9,10} -> One; n in {2,3} -> Two;
		#                  n==4 -> Few; n==6 -> Many
		4:
			if n == 1 or n == 5 or (n >= 7 and n <= 10):
				return PluralCategory.ONE
			if n == 2 or n == 3: return PluralCategory.TWO
			if n == 4: return PluralCategory.FEW
			if n == 6: return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 5: Hindi/Gujarati -- n==1 -> One; n in {2,3} -> Two;
		#                         n==4 -> Few; n==6 -> Many
		5:
			if n == 1: return PluralCategory.ONE
			if n == 2 or n == 3: return PluralCategory.TWO
			if n == 4: return PluralCategory.FEW
			if n == 6: return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 6: Ligurian -- n in {8,11,80..89,800..899} -> Many ───────────
		6:
			if n == 8 or n == 11:
				return PluralCategory.MANY
			if n >= 80 and n <= 89:
				return PluralCategory.MANY
			if n >= 800 and n <= 899:
				return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 7: Azerbaijani ────────────────────────────────────────────────
		7:
			var mod10 := n % 10
			var mod100 := n % 100
			var mod1000 := n % 1000
			if mod10 == 1 or mod10 == 2 or mod10 == 5 or mod10 == 7 or mod10 == 8 or \
			   mod100 == 20 or mod100 == 50 or mod100 == 70 or mod100 == 80:
				return PluralCategory.ONE
			if mod10 == 3 or mod10 == 4 or \
			   mod1000 == 100 or mod1000 == 200 or mod1000 == 300 or mod1000 == 400 or \
			   mod1000 == 500 or mod1000 == 600 or mod1000 == 700 or mod1000 == 800 or \
			   mod1000 == 900:
				return PluralCategory.FEW
			if n == 0 or mod10 == 6 or mod100 == 40 or mod100 == 60 or mod100 == 90:
				return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 8: Belarusian -- n%10 in {2,3} && n%100 not in {12,13} -> Few
		8:
			var mod10 := n % 10
			var mod100 := n % 100
			if (mod10 == 2 or mod10 == 3) and mod100 != 12 and mod100 != 13:
				return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 9: Blo -- n==0 -> Zero; n==1 -> One; n in 2..6 -> Few ────────
		9:
			if n == 0: return PluralCategory.ZERO
			if n == 1: return PluralCategory.ONE
			if n >= 2 and n <= 6: return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 10: Catalan -- n in {1,3} -> One; n==2 -> Two; n==4 -> Few ───
		10:
			if n == 1 or n == 3: return PluralCategory.ONE
			if n == 2: return PluralCategory.TWO
			if n == 4: return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 11: Welsh -- n in {0,7,8,9} -> Zero; n==1 -> One; n==2 -> Two;
		#                 n in {3,4} -> Few; n in {5,6} -> Many
		11:
			if n == 0 or n == 7 or n == 8 or n == 9: return PluralCategory.ZERO
			if n == 1: return PluralCategory.ONE
			if n == 2: return PluralCategory.TWO
			if n == 3 or n == 4: return PluralCategory.FEW
			if n == 5 or n == 6: return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 12: English -- n%10==1 && n%100!=11 -> One;
		#                   n%10==2 && n%100!=12 -> Two;
		#                   n%10==3 && n%100!=13 -> Few; else Other
		12:
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 == 1 and mod100 != 11: return PluralCategory.ONE
			if mod10 == 2 and mod100 != 12: return PluralCategory.TWO
			if mod10 == 3 and mod100 != 13: return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 13: Scottish Gaelic -- n in {1,11} -> One; n in {2,12} -> Two;
		#                           n in {3,13} -> Few
		13:
			if n == 1 or n == 11: return PluralCategory.ONE
			if n == 2 or n == 12: return PluralCategory.TWO
			if n == 3 or n == 13: return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 14: Hungarian -- n in {1,5} -> One; else Other ────────────────
		14:
			return PluralCategory.ONE if (n == 1 or n == 5) else PluralCategory.OTHER

		# ── 15: Georgian -- n==1 -> One; n==0 || n%100 in {2..20,40,60,80} -> Many
		15:
			if n == 1: return PluralCategory.ONE
			if n == 0: return PluralCategory.MANY
			var mod100 := n % 100
			if (mod100 >= 2 and mod100 <= 20) or mod100 == 40 or mod100 == 60 or mod100 == 80:
				return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 16: Kazakh -- n%10 in {6,9} || (n%10==0 && n!=0) -> Many ─────
		16:
			var mod10 := n % 10
			if mod10 == 6 or mod10 == 9 or (mod10 == 0 and n != 0):
				return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 17: Cornish -- n in 1..4 || n%100 in {1..4,21..24,41..44,61..64,81..84} -> One;
		#                   n==5 || n%100==5 -> Many; else Other
		17:
			if n >= 1 and n <= 4: return PluralCategory.ONE
			var mod100 := n % 100
			if (mod100 >= 1 and mod100 <= 4) or (mod100 >= 21 and mod100 <= 24) or \
			   (mod100 >= 41 and mod100 <= 44) or (mod100 >= 61 and mod100 <= 64) or \
			   (mod100 >= 81 and mod100 <= 84):
				return PluralCategory.ONE
			if n == 5 or mod100 == 5:
				return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 18: Macedonian -- n%10==1 && n%100!=11 -> One;
		#                      n%10==2 && n%100!=12 -> Two;
		#                      n%10 in {7,8} && n%100 not in {17,18} -> Many
		18:
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 == 1 and mod100 != 11: return PluralCategory.ONE
			if mod10 == 2 and mod100 != 12: return PluralCategory.TWO
			if (mod10 == 7 or mod10 == 8) and mod100 != 17 and mod100 != 18:
				return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 19: Nepali -- n in 1..4 -> One; else Other ────────────────────
		19:
			return PluralCategory.ONE if (n >= 1 and n <= 4) else PluralCategory.OTHER

		# ── 20: Odia -- n in {1,5,7,8,9} -> One; n in {2,3} -> Two;
		#                n==4 -> Few; n==6 -> Many
		20:
			if n == 1 or n == 5 or (n >= 7 and n <= 9):
				return PluralCategory.ONE
			if n == 2 or n == 3: return PluralCategory.TWO
			if n == 4: return PluralCategory.FEW
			if n == 6: return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 21: Albanian -- n==1 -> One; n%10==4 && n%100!=14 -> Many ─────
		21:
			if n == 1: return PluralCategory.ONE
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 == 4 and mod100 != 14: return PluralCategory.MANY
			return PluralCategory.OTHER

		# ── 22: Swedish -- n%10 in {1,2} && n%100 not in {11,12} -> One ──
		22:
			var mod10 := n % 10
			var mod100 := n % 100
			if (mod10 == 1 or mod10 == 2) and mod100 != 11 and mod100 != 12:
				return PluralCategory.ONE
			return PluralCategory.OTHER

		# ── 23: Turkmen -- n%10 in {6,9} || n==10 -> Few; else Other ─────
		23:
			var mod10 := n % 10
			if mod10 == 6 or mod10 == 9 or n == 10:
				return PluralCategory.FEW
			return PluralCategory.OTHER

		# ── 24: Ukrainian -- n%10==3 && n%100!=13 -> Few; else Other ─────
		24:
			var mod10 := n % 10
			var mod100 := n % 100
			if mod10 == 3 and mod100 != 13: return PluralCategory.FEW
			return PluralCategory.OTHER

		_:
			return PluralCategory.OTHER

	return PluralCategory.OTHER


# ─────────────────────────────────────────────────────────────────────────────
# Locale Maps (lazy-initialized)
# ─────────────────────────────────────────────────────────────────────────────

static var _cardinal_map: Dictionary = {}
static var _ordinal_map: Dictionary = {}


static func _get_cardinal_map() -> Dictionary:
	if _cardinal_map.is_empty():
		_cardinal_map = _build_cardinal_map()
	return _cardinal_map


static func _get_ordinal_map() -> Dictionary:
	if _ordinal_map.is_empty():
		_ordinal_map = _build_ordinal_map()
	return _ordinal_map


static func _build_cardinal_map() -> Dictionary:
	return {
		# ── Rule 0: always Other ─────────────────────────────────────────
		"bm": 0, "bo": 0, "dz": 0, "hnj": 0,
		"id": 0, "ig": 0, "ii": 0, "ja": 0,
		"jbo": 0, "jv": 0, "jw": 0, "kde": 0,
		"kea": 0, "km": 0, "ko": 0, "lkt": 0,
		"lo": 0, "ms": 0, "my": 0, "nqo": 0,
		"osa": 0, "sah": 0, "ses": 0, "sg": 0,
		"su": 0, "th": 0, "to": 0, "tpi": 0,
		"und": 0, "vi": 0, "wo": 0, "yo": 0,
		"yue": 0, "zh": 0,

		# ── Rule 1: n==1 -> One; else Other ──────────────────────────────
		"af": 1, "an": 1, "asa": 1, "az": 1,
		"bal": 1, "bem": 1, "bez": 1, "bg": 1,
		"brx": 1, "ce": 1, "cgg": 1, "chr": 1,
		"ckb": 1, "dv": 1, "ee": 1, "el": 1,
		"eo": 1, "eu": 1, "fo": 1, "fur": 1,
		"gsw": 1, "ha": 1, "haw": 1, "hu": 1,
		"jgo": 1, "jmc": 1, "ka": 1, "kaj": 1,
		"kcg": 1, "kk": 1, "kkj": 1, "kl": 1,
		"ks": 1, "ksb": 1, "ku": 1, "ky": 1,
		"lb": 1, "lg": 1, "mas": 1, "mgo": 1,
		"ml": 1, "mn": 1, "mr": 1, "nah": 1,
		"nb": 1, "nd": 1, "ne": 1, "nn": 1,
		"nnh": 1, "no": 1, "nr": 1, "ny": 1,
		"nyn": 1, "om": 1, "or": 1, "os": 1,
		"pap": 1, "ps": 1, "rm": 1, "rof": 1,
		"rwk": 1, "saq": 1, "sd": 1, "sdh": 1,
		"seh": 1, "sn": 1, "so": 1, "sq": 1,
		"ss": 1, "ssy": 1, "st": 1, "syr": 1,
		"ta": 1, "te": 1, "teo": 1, "tig": 1,
		"tk": 1, "tn": 1, "tr": 1, "ts": 1,
		"ug": 1, "uz": 1, "ve": 1, "vo": 1,
		"vun": 1, "wae": 1, "xh": 1, "xog": 1,
		# Group 3 (same rule, European languages)
		"ast": 1, "de": 1, "en": 1, "et": 1,
		"fi": 1, "fy": 1, "gl": 1, "ia": 1,
		"ie": 1, "io": 1, "lij": 1, "nl": 1,
		"sc": 1, "sv": 1, "sw": 1, "ur": 1,
		"yi": 1,
		# da: n==1 -> One (CLDR: "n = 1 or t != 0 and i = 0,1"; integers: n==1)
		"da": 1,

		# ── Rule 2: (n==0 || n==1) -> One; else Other ───────────────────
		"am": 2, "as": 2, "ak": 2, "bho": 2,
		"bn": 2, "csw": 2, "doi": 2, "fa": 2,
		"ff": 2, "gu": 2, "guw": 2, "hi": 2,
		"hy": 2, "kab": 2, "kn": 2, "kok": 2,
		"kok-Latn": 2, "ln": 2, "mg": 2, "nso": 2,
		"pa": 2, "pcm": 2, "si": 2, "ti": 2,
		"wa": 2, "zu": 2,

		# ── Rule 3: n==1 -> One; n==2 -> Two; else Other ────────────────
		"iu": 3, "naq": 3, "sat": 3, "se": 3,
		"sma": 3, "smi": 3, "smj": 3, "smn": 3,
		"sms": 3, "he": 3,

		# ── Rule 4: Italian (n==1 -> One; n!=0 && n%1000000==0 -> Many) ──
		"ca": 4, "es": 4, "it": 4, "lld": 4,
		"pt-PT": 4, "scn": 4, "vec": 4,

		# ── Rule 5: Serbo-Croatian ────────────────────────────────────────
		"bs": 5, "hr": 5, "sh": 5, "sr": 5,

		# ── Rule 6: n==0 -> Zero; n==1 -> One; else Other ────────────────
		"blo": 6, "cv": 6, "ksh": 6, "lag": 6,

		# ── Rule 7: Filipino ──────────────────────────────────────────────
		"ceb": 7, "fil": 7, "tl": 7,

		# ── Rule 8: Arabic ────────────────────────────────────────────────
		"ar": 8, "ars": 8,

		# ── Rule 9: Czech/Slovak ──────────────────────────────────────────
		"cs": 9, "sk": 9,

		# ── Rule 10: Sorbian/Slovenian ────────────────────────────────────
		"dsb": 10, "hsb": 10, "sl": 10,

		# ── Rule 11: Latvian ──────────────────────────────────────────────
		"lv": 11, "prg": 11,

		# ── Rule 12: Romanian ─────────────────────────────────────────────
		"mo": 12, "ro": 12,

		# ── Rule 13: Russian/Ukrainian/Belarusian ─────────────────────────
		"ru": 13, "uk": 13, "be": 13,

		# ── Rule 14: Breton ───────────────────────────────────────────────
		"br": 14,

		# ── Rule 15: Welsh ────────────────────────────────────────────────
		"cy": 15,

		# ── Rule 16: French ───────────────────────────────────────────────
		"fr": 16,

		# ── Rule 17: Irish ────────────────────────────────────────────────
		"ga": 17,

		# ── Rule 18: Scottish Gaelic ──────────────────────────────────────
		"gd": 18,

		# ── Rule 19: Manx ─────────────────────────────────────────────────
		"gv": 19,

		# ── Rule 20: Icelandic/Macedonian ─────────────────────────────────
		"is": 20, "mk": 20,

		# ── Rule 21: Cornish ──────────────────────────────────────────────
		"kw": 21,

		# ── Rule 22: Lithuanian ───────────────────────────────────────────
		"lt": 22,

		# ── Rule 23: Maltese ──────────────────────────────────────────────
		"mt": 23,

		# ── Rule 24: Polish ───────────────────────────────────────────────
		"pl": 24,

		# ── Rule 25: Portuguese (Brazil + default) ────────────────────────
		"pt": 25,

		# ── Rule 26: Samogitian ───────────────────────────────────────────
		"sgs": 26,

		# ── Rule 27: Tachelhit ────────────────────────────────────────────
		"shi": 27,

		# ── Rule 28: Tamazight ────────────────────────────────────────────
		"tzm": 28,
	}


static func _build_ordinal_map() -> Dictionary:
	return {
		# ── Ordinal Rule 0: always Other ─────────────────────────────────
		"af": 0, "am": 0, "an": 0, "ar": 0, "ast": 0,
		"bg": 0, "bs": 0, "ce": 0, "cs": 0, "cv": 0,
		"da": 0, "de": 0, "dsb": 0, "el": 0, "es": 0,
		"et": 0, "eu": 0, "fa": 0, "fi": 0, "fy": 0,
		"gl": 0, "gsw": 0, "he": 0, "hr": 0, "hsb": 0,
		"ia": 0, "id": 0, "ie": 0, "is": 0, "ja": 0,
		"km": 0, "kn": 0, "ko": 0, "ky": 0, "lt": 0,
		"lv": 0, "ml": 0, "mn": 0, "my": 0, "nb": 0,
		"nl": 0, "no": 0, "pa": 0, "pl": 0, "prg": 0,
		"ps": 0, "pt": 0, "ru": 0, "sd": 0, "sh": 0,
		"si": 0, "sk": 0, "sl": 0, "sr": 0, "sw": 0,
		"ta": 0, "te": 0, "th": 0, "tpi": 0, "tr": 0,
		"und": 0, "ur": 0, "uz": 0, "yue": 0, "zh": 0,
		"zu": 0,

		# ── Ordinal Rule 1: n==1 -> One; else Other ─────────────────────
		"bal": 1, "fil": 1, "fr": 1, "ga": 1, "hy": 1,
		"lo": 1, "mo": 1, "ms": 1, "ro": 1, "tl": 1,
		"vi": 1,

		# ── Ordinal Rule 2: Italian -- n in {11,8,80,800} -> Many ────────
		"it": 2, "lld": 2, "sc": 2, "vec": 2,

		# ── Ordinal Rule 3: Marathi ──────────────────────────────────────
		"kok": 3, "kok-Latn": 3, "mr": 3,

		# ── Ordinal Rule 4: Bengali ──────────────────────────────────────
		"as": 4, "bn": 4,

		# ── Ordinal Rule 5: Hindi/Gujarati ───────────────────────────────
		"gu": 5, "hi": 5,

		# ── Ordinal Rule 6: Ligurian ─────────────────────────────────────
		"lij": 6, "scn": 6,

		# ── Ordinal Rule 7: Azerbaijani ──────────────────────────────────
		"az": 7,

		# ── Ordinal Rule 8: Belarusian ───────────────────────────────────
		"be": 8,

		# ── Ordinal Rule 9: Blo ──────────────────────────────────────────
		"blo": 9,

		# ── Ordinal Rule 10: Catalan ─────────────────────────────────────
		"ca": 10,

		# ── Ordinal Rule 11: Welsh ───────────────────────────────────────
		"cy": 11,

		# ── Ordinal Rule 12: English ─────────────────────────────────────
		"en": 12,

		# ── Ordinal Rule 13: Scottish Gaelic ─────────────────────────────
		"gd": 13,

		# ── Ordinal Rule 14: Hungarian ───────────────────────────────────
		"hu": 14,

		# ── Ordinal Rule 15: Georgian ────────────────────────────────────
		"ka": 15,

		# ── Ordinal Rule 16: Kazakh ──────────────────────────────────────
		"kk": 16,

		# ── Ordinal Rule 17: Cornish ─────────────────────────────────────
		"kw": 17,

		# ── Ordinal Rule 18: Macedonian ──────────────────────────────────
		"mk": 18,

		# ── Ordinal Rule 19: Nepali ──────────────────────────────────────
		"ne": 19,

		# ── Ordinal Rule 20: Odia ────────────────────────────────────────
		"or": 20,

		# ── Ordinal Rule 21: Albanian ────────────────────────────────────
		"sq": 21,

		# ── Ordinal Rule 22: Swedish ─────────────────────────────────────
		"sv": 22,

		# ── Ordinal Rule 23: Turkmen ─────────────────────────────────────
		"tk": 23,

		# ── Ordinal Rule 24: Ukrainian ───────────────────────────────────
		"uk": 24,
	}
