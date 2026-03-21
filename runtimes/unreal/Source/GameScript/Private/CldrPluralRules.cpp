#include "CldrPluralRules.h"

// ─────────────────────────────────────────────────────────────────────────────
// Locale Maps (lazy-initialized)
// ─────────────────────────────────────────────────────────────────────────────

const TMap<FString, uint8>& FCldrPluralRules::GetLocaleMap()
{
	static TMap<FString, uint8> Map;
	if (Map.Num() == 0)
	{
		// ── Rule 0: always Other ──────────────────────────────────────────────
		Map.Add(TEXT("bm"),       0); Map.Add(TEXT("bo"),       0); Map.Add(TEXT("dz"),       0); Map.Add(TEXT("hnj"),      0);
		Map.Add(TEXT("id"),       0); Map.Add(TEXT("ig"),       0); Map.Add(TEXT("ii"),       0); Map.Add(TEXT("ja"),       0);
		Map.Add(TEXT("jbo"),      0); Map.Add(TEXT("jv"),       0); Map.Add(TEXT("jw"),       0); Map.Add(TEXT("kde"),      0);
		Map.Add(TEXT("kea"),      0); Map.Add(TEXT("km"),       0); Map.Add(TEXT("ko"),       0); Map.Add(TEXT("lkt"),      0);
		Map.Add(TEXT("lo"),       0); Map.Add(TEXT("ms"),       0); Map.Add(TEXT("my"),       0); Map.Add(TEXT("nqo"),      0);
		Map.Add(TEXT("osa"),      0); Map.Add(TEXT("sah"),      0); Map.Add(TEXT("ses"),      0); Map.Add(TEXT("sg"),       0);
		Map.Add(TEXT("su"),       0); Map.Add(TEXT("th"),       0); Map.Add(TEXT("to"),       0); Map.Add(TEXT("tpi"),      0);
		Map.Add(TEXT("und"),      0); Map.Add(TEXT("vi"),       0); Map.Add(TEXT("wo"),       0); Map.Add(TEXT("yo"),       0);
		Map.Add(TEXT("yue"),      0); Map.Add(TEXT("zh"),       0);

		// ── Rule 1: n==1 → One; else Other ────────────────────────────────────
		Map.Add(TEXT("af"),       1); Map.Add(TEXT("an"),       1); Map.Add(TEXT("asa"),      1); Map.Add(TEXT("az"),       1);
		Map.Add(TEXT("bal"),      1); Map.Add(TEXT("bem"),      1); Map.Add(TEXT("bez"),      1); Map.Add(TEXT("bg"),       1);
		Map.Add(TEXT("brx"),      1); Map.Add(TEXT("ce"),       1); Map.Add(TEXT("cgg"),      1); Map.Add(TEXT("chr"),      1);
		Map.Add(TEXT("ckb"),      1); Map.Add(TEXT("dv"),       1); Map.Add(TEXT("ee"),       1); Map.Add(TEXT("el"),       1);
		Map.Add(TEXT("eo"),       1); Map.Add(TEXT("eu"),       1); Map.Add(TEXT("fo"),       1); Map.Add(TEXT("fur"),      1);
		Map.Add(TEXT("gsw"),      1); Map.Add(TEXT("ha"),       1); Map.Add(TEXT("haw"),      1); Map.Add(TEXT("hu"),       1);
		Map.Add(TEXT("jgo"),      1); Map.Add(TEXT("jmc"),      1); Map.Add(TEXT("ka"),       1); Map.Add(TEXT("kaj"),      1);
		Map.Add(TEXT("kcg"),      1); Map.Add(TEXT("kk"),       1); Map.Add(TEXT("kkj"),      1); Map.Add(TEXT("kl"),       1);
		Map.Add(TEXT("ks"),       1); Map.Add(TEXT("ksb"),      1); Map.Add(TEXT("ku"),       1); Map.Add(TEXT("ky"),       1);
		Map.Add(TEXT("lb"),       1); Map.Add(TEXT("lg"),       1); Map.Add(TEXT("mas"),      1); Map.Add(TEXT("mgo"),      1);
		Map.Add(TEXT("ml"),       1); Map.Add(TEXT("mn"),       1); Map.Add(TEXT("mr"),       1); Map.Add(TEXT("nah"),      1);
		Map.Add(TEXT("nb"),       1); Map.Add(TEXT("nd"),       1); Map.Add(TEXT("ne"),       1); Map.Add(TEXT("nn"),       1);
		Map.Add(TEXT("nnh"),      1); Map.Add(TEXT("no"),       1); Map.Add(TEXT("nr"),       1); Map.Add(TEXT("ny"),       1);
		Map.Add(TEXT("nyn"),      1); Map.Add(TEXT("om"),       1); Map.Add(TEXT("or"),       1); Map.Add(TEXT("os"),       1);
		Map.Add(TEXT("pap"),      1); Map.Add(TEXT("ps"),       1); Map.Add(TEXT("rm"),       1); Map.Add(TEXT("rof"),      1);
		Map.Add(TEXT("rwk"),      1); Map.Add(TEXT("saq"),      1); Map.Add(TEXT("sd"),       1); Map.Add(TEXT("sdh"),      1);
		Map.Add(TEXT("seh"),      1); Map.Add(TEXT("sn"),       1); Map.Add(TEXT("so"),       1); Map.Add(TEXT("sq"),       1);
		Map.Add(TEXT("ss"),       1); Map.Add(TEXT("ssy"),      1); Map.Add(TEXT("st"),       1); Map.Add(TEXT("syr"),      1);
		Map.Add(TEXT("ta"),       1); Map.Add(TEXT("te"),       1); Map.Add(TEXT("teo"),      1); Map.Add(TEXT("tig"),      1);
		Map.Add(TEXT("tk"),       1); Map.Add(TEXT("tn"),       1); Map.Add(TEXT("tr"),       1); Map.Add(TEXT("ts"),       1);
		Map.Add(TEXT("ug"),       1); Map.Add(TEXT("uz"),       1); Map.Add(TEXT("ve"),       1); Map.Add(TEXT("vo"),       1);
		Map.Add(TEXT("vun"),      1); Map.Add(TEXT("wae"),      1); Map.Add(TEXT("xh"),       1); Map.Add(TEXT("xog"),      1);
		// Group 3 (same rule, European languages)
		Map.Add(TEXT("ast"),      1); Map.Add(TEXT("de"),       1); Map.Add(TEXT("en"),       1); Map.Add(TEXT("et"),       1);
		Map.Add(TEXT("fi"),       1); Map.Add(TEXT("fy"),       1); Map.Add(TEXT("gl"),       1); Map.Add(TEXT("ia"),       1);
		Map.Add(TEXT("ie"),       1); Map.Add(TEXT("io"),       1); Map.Add(TEXT("lij"),      1); Map.Add(TEXT("nl"),       1);
		Map.Add(TEXT("sc"),       1); Map.Add(TEXT("sv"),       1); Map.Add(TEXT("sw"),       1); Map.Add(TEXT("ur"),       1);
		Map.Add(TEXT("yi"),       1);
		// da: n==1→One (CLDR: "n = 1 or t != 0 and i = 0,1"; integers: n==1)
		Map.Add(TEXT("da"),       1);

		// ── Rule 2: (n==0 || n==1) → One; else Other ─────────────────────────
		Map.Add(TEXT("am"),       2); Map.Add(TEXT("as"),       2); Map.Add(TEXT("ak"),       2); Map.Add(TEXT("bho"),      2);
		Map.Add(TEXT("bn"),       2); Map.Add(TEXT("csw"),      2); Map.Add(TEXT("doi"),      2); Map.Add(TEXT("fa"),       2);
		Map.Add(TEXT("ff"),       2); Map.Add(TEXT("gu"),       2); Map.Add(TEXT("guw"),      2); Map.Add(TEXT("hi"),       2);
		Map.Add(TEXT("hy"),       2); Map.Add(TEXT("kab"),      2); Map.Add(TEXT("kn"),       2); Map.Add(TEXT("kok"),      2);
		Map.Add(TEXT("kok-Latn"), 2); Map.Add(TEXT("ln"),       2); Map.Add(TEXT("mg"),       2); Map.Add(TEXT("nso"),      2);
		Map.Add(TEXT("pa"),       2); Map.Add(TEXT("pcm"),      2); Map.Add(TEXT("si"),       2); Map.Add(TEXT("ti"),       2);
		Map.Add(TEXT("wa"),       2); Map.Add(TEXT("zu"),       2);

		// ── Rule 3: n==1→One; n==2→Two; else Other ───────────────────────────
		Map.Add(TEXT("iu"),       3); Map.Add(TEXT("naq"),      3); Map.Add(TEXT("sat"),      3); Map.Add(TEXT("se"),       3);
		Map.Add(TEXT("sma"),      3); Map.Add(TEXT("smi"),      3); Map.Add(TEXT("smj"),      3); Map.Add(TEXT("smn"),      3);
		Map.Add(TEXT("sms"),      3); Map.Add(TEXT("he"),       3);

		// ── Rule 4: n==1→One; n%1000000==0 && n!=0→Many; else Other (Italian) ─
		Map.Add(TEXT("ca"),       4); Map.Add(TEXT("es"),       4); Map.Add(TEXT("it"),       4); Map.Add(TEXT("lld"),      4);
		Map.Add(TEXT("pt-PT"),    4); Map.Add(TEXT("scn"),      4); Map.Add(TEXT("vec"),      4);

		// ── Rule 5: Serbo-Croatian ────────────────────────────────────────────
		Map.Add(TEXT("bs"),       5); Map.Add(TEXT("hr"),       5); Map.Add(TEXT("sh"),       5); Map.Add(TEXT("sr"),       5);

		// ── Rule 6: n==0→Zero; n==1→One; else Other ──────────────────────────
		Map.Add(TEXT("blo"),      6); Map.Add(TEXT("cv"),       6); Map.Add(TEXT("ksh"),      6); Map.Add(TEXT("lag"),      6);

		// ── Rule 7: Filipino ──────────────────────────────────────────────────
		Map.Add(TEXT("ceb"),      7); Map.Add(TEXT("fil"),      7); Map.Add(TEXT("tl"),       7);

		// ── Rule 8: Arabic ────────────────────────────────────────────────────
		Map.Add(TEXT("ar"),       8); Map.Add(TEXT("ars"),      8);

		// ── Rule 9: Czech/Slovak ──────────────────────────────────────────────
		Map.Add(TEXT("cs"),       9); Map.Add(TEXT("sk"),       9);

		// ── Rule 10: Sorbian/Slovenian ────────────────────────────────────────
		Map.Add(TEXT("dsb"),     10); Map.Add(TEXT("hsb"),     10); Map.Add(TEXT("sl"),      10);

		// ── Rule 11: Latvian ──────────────────────────────────────────────────
		Map.Add(TEXT("lv"),      11); Map.Add(TEXT("prg"),     11);

		// ── Rule 12: Romanian ─────────────────────────────────────────────────
		Map.Add(TEXT("mo"),      12); Map.Add(TEXT("ro"),      12);

		// ── Rule 13: Russian/Ukrainian/Belarusian ─────────────────────────────
		Map.Add(TEXT("ru"),      13); Map.Add(TEXT("uk"),      13); Map.Add(TEXT("be"),      13);

		// ── Rule 14: Breton ───────────────────────────────────────────────────
		Map.Add(TEXT("br"),      14);

		// ── Rule 15: Welsh ────────────────────────────────────────────────────
		Map.Add(TEXT("cy"),      15);

		// ── Rule 16: French ───────────────────────────────────────────────────
		Map.Add(TEXT("fr"),      16);

		// ── Rule 17: Irish ────────────────────────────────────────────────────
		Map.Add(TEXT("ga"),      17);

		// ── Rule 18: Scottish Gaelic ──────────────────────────────────────────
		Map.Add(TEXT("gd"),      18);

		// ── Rule 19: Manx ─────────────────────────────────────────────────────
		Map.Add(TEXT("gv"),      19);

		// ── Rule 20: Icelandic/Macedonian ─────────────────────────────────────
		Map.Add(TEXT("is"),      20); Map.Add(TEXT("mk"),      20);

		// ── Rule 21: Cornish ──────────────────────────────────────────────────
		Map.Add(TEXT("kw"),      21);

		// ── Rule 22: Lithuanian ───────────────────────────────────────────────
		Map.Add(TEXT("lt"),      22);

		// ── Rule 23: Maltese ──────────────────────────────────────────────────
		Map.Add(TEXT("mt"),      23);

		// ── Rule 24: Polish ───────────────────────────────────────────────────
		Map.Add(TEXT("pl"),      24);

		// ── Rule 25: Portuguese (Brazil + default) ────────────────────────────
		Map.Add(TEXT("pt"),      25);

		// ── Rule 26: Samogitian ───────────────────────────────────────────────
		Map.Add(TEXT("sgs"),     26);

		// ── Rule 27: Tachelhit ────────────────────────────────────────────────
		Map.Add(TEXT("shi"),     27);

		// ── Rule 28: Tamazight ────────────────────────────────────────────────
		Map.Add(TEXT("tzm"),     28);
	}
	return Map;
}

const TMap<FString, uint8>& FCldrPluralRules::GetOrdinalLocaleMap()
{
	static TMap<FString, uint8> Map;
	if (Map.Num() == 0)
	{
		// ── Ordinal Rule 0: always Other ──────────────────────────────────────
		Map.Add(TEXT("af"),   0); Map.Add(TEXT("am"),   0); Map.Add(TEXT("an"),   0); Map.Add(TEXT("ar"),   0); Map.Add(TEXT("ast"),  0);
		Map.Add(TEXT("bg"),   0); Map.Add(TEXT("bs"),   0); Map.Add(TEXT("ce"),   0); Map.Add(TEXT("cs"),   0); Map.Add(TEXT("cv"),   0);
		Map.Add(TEXT("da"),   0); Map.Add(TEXT("de"),   0); Map.Add(TEXT("dsb"),  0); Map.Add(TEXT("el"),   0); Map.Add(TEXT("es"),   0);
		Map.Add(TEXT("et"),   0); Map.Add(TEXT("eu"),   0); Map.Add(TEXT("fa"),   0); Map.Add(TEXT("fi"),   0); Map.Add(TEXT("fy"),   0);
		Map.Add(TEXT("gl"),   0); Map.Add(TEXT("gsw"),  0); Map.Add(TEXT("he"),   0); Map.Add(TEXT("hr"),   0); Map.Add(TEXT("hsb"),  0);
		Map.Add(TEXT("ia"),   0); Map.Add(TEXT("id"),   0); Map.Add(TEXT("ie"),   0); Map.Add(TEXT("is"),   0); Map.Add(TEXT("ja"),   0);
		Map.Add(TEXT("km"),   0); Map.Add(TEXT("kn"),   0); Map.Add(TEXT("ko"),   0); Map.Add(TEXT("ky"),   0); Map.Add(TEXT("lt"),   0);
		Map.Add(TEXT("lv"),   0); Map.Add(TEXT("ml"),   0); Map.Add(TEXT("mn"),   0); Map.Add(TEXT("my"),   0); Map.Add(TEXT("nb"),   0);
		Map.Add(TEXT("nl"),   0); Map.Add(TEXT("no"),   0); Map.Add(TEXT("pa"),   0); Map.Add(TEXT("pl"),   0); Map.Add(TEXT("prg"),  0);
		Map.Add(TEXT("ps"),   0); Map.Add(TEXT("pt"),   0); Map.Add(TEXT("ru"),   0); Map.Add(TEXT("sd"),   0); Map.Add(TEXT("sh"),   0);
		Map.Add(TEXT("si"),   0); Map.Add(TEXT("sk"),   0); Map.Add(TEXT("sl"),   0); Map.Add(TEXT("sr"),   0); Map.Add(TEXT("sw"),   0);
		Map.Add(TEXT("ta"),   0); Map.Add(TEXT("te"),   0); Map.Add(TEXT("th"),   0); Map.Add(TEXT("tpi"),  0); Map.Add(TEXT("tr"),   0);
		Map.Add(TEXT("und"),  0); Map.Add(TEXT("ur"),   0); Map.Add(TEXT("uz"),   0); Map.Add(TEXT("yue"),  0); Map.Add(TEXT("zh"),   0);
		Map.Add(TEXT("zu"),   0);

		// ── Ordinal Rule 1: n==1→One; else Other ──────────────────────────────
		Map.Add(TEXT("bal"),  1); Map.Add(TEXT("fil"),  1); Map.Add(TEXT("fr"),   1); Map.Add(TEXT("ga"),   1); Map.Add(TEXT("hy"),   1);
		Map.Add(TEXT("lo"),   1); Map.Add(TEXT("mo"),   1); Map.Add(TEXT("ms"),   1); Map.Add(TEXT("ro"),   1); Map.Add(TEXT("tl"),   1);
		Map.Add(TEXT("vi"),   1);

		// ── Ordinal Rule 2: Italian — n∈{11,8,80,800}→Many; else Other ───────
		Map.Add(TEXT("it"),   2); Map.Add(TEXT("lld"),  2); Map.Add(TEXT("sc"),   2); Map.Add(TEXT("vec"),  2);

		// ── Ordinal Rule 3: Marathi — n==1→One; n∈{2,3}→Two; n==4→Few ────────
		Map.Add(TEXT("kok"),       3); Map.Add(TEXT("kok-Latn"), 3); Map.Add(TEXT("mr"),  3);

		// ── Ordinal Rule 4: Bengali — complex ─────────────────────────────────
		Map.Add(TEXT("as"),   4); Map.Add(TEXT("bn"),   4);

		// ── Ordinal Rule 5: Hindi/Gujarati ────────────────────────────────────
		Map.Add(TEXT("gu"),   5); Map.Add(TEXT("hi"),   5);

		// ── Ordinal Rule 6: Ligurian ──────────────────────────────────────────
		Map.Add(TEXT("lij"),  6); Map.Add(TEXT("scn"),  6);

		// ── Ordinal Rule 7: Azerbaijani ───────────────────────────────────────
		Map.Add(TEXT("az"),   7);

		// ── Ordinal Rule 8: Belarusian ────────────────────────────────────────
		Map.Add(TEXT("be"),   8);

		// ── Ordinal Rule 9: Blo ───────────────────────────────────────────────
		Map.Add(TEXT("blo"),  9);

		// ── Ordinal Rule 10: Catalan ──────────────────────────────────────────
		Map.Add(TEXT("ca"),  10);

		// ── Ordinal Rule 11: Welsh ────────────────────────────────────────────
		Map.Add(TEXT("cy"),  11);

		// ── Ordinal Rule 12: English ──────────────────────────────────────────
		Map.Add(TEXT("en"),  12);

		// ── Ordinal Rule 13: Scottish Gaelic ──────────────────────────────────
		Map.Add(TEXT("gd"),  13);

		// ── Ordinal Rule 14: Hungarian ────────────────────────────────────────
		Map.Add(TEXT("hu"),  14);

		// ── Ordinal Rule 15: Georgian ─────────────────────────────────────────
		Map.Add(TEXT("ka"),  15);

		// ── Ordinal Rule 16: Kazakh ───────────────────────────────────────────
		Map.Add(TEXT("kk"),  16);

		// ── Ordinal Rule 17: Cornish ──────────────────────────────────────────
		Map.Add(TEXT("kw"),  17);

		// ── Ordinal Rule 18: Macedonian ───────────────────────────────────────
		Map.Add(TEXT("mk"),  18);

		// ── Ordinal Rule 19: Nepali ───────────────────────────────────────────
		Map.Add(TEXT("ne"),  19);

		// ── Ordinal Rule 20: Odia ─────────────────────────────────────────────
		Map.Add(TEXT("or"),  20);

		// ── Ordinal Rule 21: Albanian ─────────────────────────────────────────
		Map.Add(TEXT("sq"),  21);

		// ── Ordinal Rule 22: Swedish ──────────────────────────────────────────
		Map.Add(TEXT("sv"),  22);

		// ── Ordinal Rule 23: Turkmen ──────────────────────────────────────────
		Map.Add(TEXT("tk"),  23);

		// ── Ordinal Rule 24: Ukrainian ────────────────────────────────────────
		Map.Add(TEXT("uk"),  24);
	}
	return Map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

EGSPluralCategory FCldrPluralRules::Resolve(const FString& LocaleCode, int32 Count)
{
	const uint8 Rule = LookupRule(GetLocaleMap(), LocaleCode);
	return ApplyRule(Rule, Count);
}

EGSPluralCategory FCldrPluralRules::ResolveOrdinal(const FString& LocaleCode, int32 Count)
{
	const uint8 Rule = LookupRule(GetOrdinalLocaleMap(), LocaleCode);
	return ApplyOrdinalRule(Rule, Count);
}

uint8 FCldrPluralRules::LookupCardinalRule(const FString& LocaleCode)
{
	return LookupRule(GetLocaleMap(), LocaleCode);
}

uint8 FCldrPluralRules::LookupOrdinalRule(const FString& LocaleCode)
{
	return LookupRule(GetOrdinalLocaleMap(), LocaleCode);
}

// ─────────────────────────────────────────────────────────────────────────────
// Locale Lookup
// ─────────────────────────────────────────────────────────────────────────────

uint8 FCldrPluralRules::LookupRule(const TMap<FString, uint8>& Map, const FString& LocaleCode)
{
	if (LocaleCode.IsEmpty())
	{
		return 0;
	}

	// 1. Exact lookup
	if (const uint8* Found = Map.Find(LocaleCode))
	{
		return *Found;
	}

	// 2. Separator swap (underscore <-> hyphen)
	const FString Swapped = SwapSeparator(LocaleCode);
	if (!Swapped.IsEmpty())
	{
		if (const uint8* Found = Map.Find(Swapped))
		{
			return *Found;
		}
	}

	// 3. Language subtag only
	const FString Subtag = LanguageSubtag(LocaleCode);
	if (!Subtag.IsEmpty())
	{
		if (const uint8* Found = Map.Find(Subtag))
		{
			return *Found;
		}
	}

	// 4. Default
	return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cardinal Rule Dispatch
// ─────────────────────────────────────────────────────────────────────────────

EGSPluralCategory FCldrPluralRules::ApplyRule(uint8 Rule, int32 n)
{
	// CLDR rules assume non-negative operands.
	if (n < 0) n = (n == INT32_MIN) ? INT32_MAX : -n;

	switch (Rule)
	{
	// ── 0: always Other ───────────────────────────────────────────────────
	case 0:
		return EGSPluralCategory::Other;

	// ── 1: n==1→One; else Other ───────────────────────────────────────────
	case 1:
		return n == 1 ? EGSPluralCategory::One : EGSPluralCategory::Other;

	// ── 2: (n==0||n==1)→One; else Other ───────────────────────────────────
	case 2:
		return (n == 0 || n == 1) ? EGSPluralCategory::One : EGSPluralCategory::Other;

	// ── 3: n==1→One; n==2→Two; else Other ─────────────────────────────────
	case 3:
		if (n == 1) return EGSPluralCategory::One;
		if (n == 2) return EGSPluralCategory::Two;
		return EGSPluralCategory::Other;

	// ── 4: Italian-style (n==1→One; n!=0&&n%1000000==0→Many; else Other) ──
	case 4:
		if (n == 1) return EGSPluralCategory::One;
		if (n != 0 && n % 1000000 == 0) return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 5: Serbo-Croatian ─────────────────────────────────────────────────
	case 5:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 == 1 && mod100 != 11)
			return EGSPluralCategory::One;
		if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14))
			return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;
	}

	// ── 6: n==0→Zero; n==1→One; else Other ────────────────────────────────
	case 6:
		if (n == 0) return EGSPluralCategory::Zero;
		if (n == 1) return EGSPluralCategory::One;
		return EGSPluralCategory::Other;

	// ── 7: Filipino ───────────────────────────────────────────────────────
	case 7:
	{
		if (n == 1 || n == 2 || n == 3)
			return EGSPluralCategory::One;
		const int32 mod10 = n % 10;
		if (mod10 != 4 && mod10 != 6 && mod10 != 9)
			return EGSPluralCategory::One;
		return EGSPluralCategory::Other;
	}

	// ── 8: Arabic ─────────────────────────────────────────────────────────
	case 8:
	{
		if (n == 0) return EGSPluralCategory::Zero;
		if (n == 1) return EGSPluralCategory::One;
		if (n == 2) return EGSPluralCategory::Two;
		const int32 mod100 = n % 100;
		if (mod100 >= 3  && mod100 <= 10) return EGSPluralCategory::Few;
		if (mod100 >= 11 && mod100 <= 99) return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;
	}

	// ── 9: Czech/Slovak ───────────────────────────────────────────────────
	case 9:
		if (n == 1) return EGSPluralCategory::One;
		if (n >= 2 && n <= 4) return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;

	// ── 10: Sorbian/Slovenian ─────────────────────────────────────────────
	case 10:
	{
		const int32 mod100 = n % 100;
		if (mod100 == 1) return EGSPluralCategory::One;
		if (mod100 == 2) return EGSPluralCategory::Two;
		if (mod100 == 3 || mod100 == 4) return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;
	}

	// ── 11: Latvian ───────────────────────────────────────────────────────
	case 11:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 == 0 || (mod100 >= 11 && mod100 <= 19))
			return EGSPluralCategory::Zero;
		if (mod10 == 1 && mod100 != 11)
			return EGSPluralCategory::One;
		return EGSPluralCategory::Other;
	}

	// ── 12: Romanian ──────────────────────────────────────────────────────
	case 12:
	{
		if (n == 1) return EGSPluralCategory::One;
		const int32 mod100 = n % 100;
		if (n == 0 || (mod100 >= 1 && mod100 <= 19))
			return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;
	}

	// ── 13: Russian/Ukrainian/Belarusian ──────────────────────────────────
	case 13:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 == 1 && mod100 != 11)
			return EGSPluralCategory::One;
		if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14))
			return EGSPluralCategory::Few;
		return EGSPluralCategory::Many;
	}

	// ── 14: Breton ────────────────────────────────────────────────────────
	case 14:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 == 1 && mod100 != 11 && mod100 != 71 && mod100 != 91)
			return EGSPluralCategory::One;
		if (mod10 == 2 && mod100 != 12 && mod100 != 72 && mod100 != 92)
			return EGSPluralCategory::Two;
		if ((mod10 >= 3 && mod10 <= 4) || mod10 == 9)
		{
			if (!(mod100 >= 10 && mod100 <= 19) &&
				!(mod100 >= 70 && mod100 <= 79) &&
				!(mod100 >= 90 && mod100 <= 99))
				return EGSPluralCategory::Few;
		}
		if (n != 0 && n % 1000000 == 0)
			return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;
	}

	// ── 15: Welsh ─────────────────────────────────────────────────────────
	case 15:
		if (n == 0) return EGSPluralCategory::Zero;
		if (n == 1) return EGSPluralCategory::One;
		if (n == 2) return EGSPluralCategory::Two;
		if (n == 3) return EGSPluralCategory::Few;
		if (n == 6) return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 16: French ────────────────────────────────────────────────────────
	case 16:
		if (n == 0 || n == 1) return EGSPluralCategory::One;
		if (n != 0 && n % 1000000 == 0) return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 17: Irish ─────────────────────────────────────────────────────────
	case 17:
		if (n == 1) return EGSPluralCategory::One;
		if (n == 2) return EGSPluralCategory::Two;
		if (n >= 3 && n <= 6) return EGSPluralCategory::Few;
		if (n >= 7 && n <= 10) return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 18: Scottish Gaelic ───────────────────────────────────────────────
	case 18:
		if (n == 1 || n == 11) return EGSPluralCategory::One;
		if (n == 2 || n == 12) return EGSPluralCategory::Two;
		if ((n >= 3 && n <= 10) || (n >= 13 && n <= 19)) return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;

	// ── 19: Manx ──────────────────────────────────────────────────────────
	case 19:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 == 1) return EGSPluralCategory::One;
		if (mod10 == 2) return EGSPluralCategory::Two;
		if (mod100 == 0 || mod100 == 20 || mod100 == 40 ||
			mod100 == 60 || mod100 == 80)
			return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;
	}

	// ── 20: Icelandic/Macedonian ──────────────────────────────────────────
	case 20:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		return (mod10 == 1 && mod100 != 11)
			? EGSPluralCategory::One
			: EGSPluralCategory::Other;
	}

	// ── 21: Cornish ───────────────────────────────────────────────────────
	case 21:
	{
		if (n == 0) return EGSPluralCategory::Zero;
		if (n == 1) return EGSPluralCategory::One;

		const int32 mod100     = n % 100;
		const int32 mod1000    = n % 1000;
		const int32 mod100000  = n % 100000;
		const int32 mod1000000 = n % 1000000;

		// Two: n%100∈{2,22,42,62,82}
		//   || (n%1000==0 && (n%100000∈1000..20000||∈{40000,60000,80000}))
		//   || (n!=0 && n%1000000==100000)
		if (mod100 == 2  || mod100 == 22 || mod100 == 42 ||
			mod100 == 62 || mod100 == 82)
			return EGSPluralCategory::Two;
		if (mod1000 == 0 &&
			((mod100000 >= 1000 && mod100000 <= 20000) ||
			 mod100000 == 40000 || mod100000 == 60000 || mod100000 == 80000))
			return EGSPluralCategory::Two;
		if (n != 0 && mod1000000 == 100000)
			return EGSPluralCategory::Two;

		// Few: n%100∈{3,23,43,63,83}
		if (mod100 == 3  || mod100 == 23 || mod100 == 43 ||
			mod100 == 63 || mod100 == 83)
			return EGSPluralCategory::Few;

		// Many: n%100∈{1,21,41,61,81}
		if (mod100 == 1  || mod100 == 21 || mod100 == 41 ||
			mod100 == 61 || mod100 == 81)
			return EGSPluralCategory::Many;

		return EGSPluralCategory::Other;
	}

	// ── 22: Lithuanian ────────────────────────────────────────────────────
	case 22:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 == 1 && !(mod100 >= 11 && mod100 <= 19))
			return EGSPluralCategory::One;
		if (mod10 >= 2 && mod10 <= 9 && !(mod100 >= 11 && mod100 <= 19))
			return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;
	}

	// ── 23: Maltese ───────────────────────────────────────────────────────
	case 23:
	{
		if (n == 1) return EGSPluralCategory::One;
		if (n == 2) return EGSPluralCategory::Two;
		const int32 mod100 = n % 100;
		if (n == 0 || (mod100 >= 3 && mod100 <= 10))
			return EGSPluralCategory::Few;
		if (mod100 >= 11 && mod100 <= 19)
			return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;
	}

	// ── 24: Polish ────────────────────────────────────────────────────────
	case 24:
	{
		if (n == 1) return EGSPluralCategory::One;
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14))
			return EGSPluralCategory::Few;
		return EGSPluralCategory::Many;
	}

	// ── 25: Portuguese (Brazil) ───────────────────────────────────────────
	case 25:
		if (n == 0 || n == 1) return EGSPluralCategory::One;
		if (n != 0 && n % 1000000 == 0) return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 26: Samogitian ────────────────────────────────────────────────────
	case 26:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 == 1 && mod100 != 11)
			return EGSPluralCategory::One;
		if (n == 2)
			return EGSPluralCategory::Two;
		if (n != 2 && mod10 >= 2 && mod10 <= 9 && !(mod100 >= 11 && mod100 <= 19))
			return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;
	}

	// ── 27: Tachelhit ─────────────────────────────────────────────────────
	case 27:
		if (n == 0 || n == 1) return EGSPluralCategory::One;
		if (n >= 2 && n <= 10) return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;

	// ── 28: Tamazight ─────────────────────────────────────────────────────
	case 28:
		if ((n >= 0 && n <= 1) || (n >= 11 && n <= 99))
			return EGSPluralCategory::One;
		return EGSPluralCategory::Other;

	default:
		return EGSPluralCategory::Other;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Decimal Operands
// ─────────────────────────────────────────────────────────────────────────────

int64 FCldrPluralRules::Pow10Long(int32 Exponent)
{
	int64 Result = 1;
	for (int32 Idx = 0; Idx < Exponent; Idx++) Result *= 10;
	return Result;
}

FCldrPluralRules::FOperands FCldrPluralRules::DeriveOperands(int64 Value, int32 Precision)
{
	if (Precision <= 0)
	{
		const int64 Abs = (Value < 0) ? -Value : Value;
		return FOperands{ Abs, 0, 0, 0, 0 };
	}

	const int64 Abs = (Value < 0) ? -Value : Value;
	const int64 Pow = Pow10Long(Precision);
	const int64 IntPart = Abs / Pow;
	const int64 FracPart = Abs % Pow;

	// Derive t (f with trailing zeros stripped) and w (digit count of t)
	int64 T = FracPart;
	int32 W = Precision;
	if (T > 0)
	{
		while (T % 10 == 0) { T /= 10; W--; }
	}
	else
	{
		W = 0;
	}

	return FOperands{ IntPart, Precision, W, FracPart, T };
}

EGSPluralCategory FCldrPluralRules::ApplyRule(uint8 Rule, int64 Value, int32 Precision)
{
	// Integer fast path — delegate to existing proven implementation
	if (Precision <= 0)
	{
		int32 N;
		if (Value < 0)
			N = (Value == INT64_MIN) ? INT32_MAX : static_cast<int32>(FMath::Min(-Value, static_cast<int64>(INT32_MAX)));
		else
			N = static_cast<int32>(FMath::Min(Value, static_cast<int64>(INT32_MAX)));
		return ApplyRule(Rule, N);
	}

	// Decimal path — full CLDR operands
	const FOperands Op = DeriveOperands(Value, Precision);
	return ApplyDecimalCardinal(Rule, Op);
}

EGSPluralCategory FCldrPluralRules::Resolve(const FString& LocaleCode, int64 Value, int32 Precision)
{
	const uint8 Rule = LookupRule(GetLocaleMap(), LocaleCode);
	return ApplyRule(Rule, Value, Precision);
}

// Applies CLDR cardinal plural rules for decimal values (v > 0).
// For each rule, conditions that require v = 0 are unreachable for decimals, so those
// categories correctly fall through to Other. The "other" category is always a valid
// fallback in CLDR — VariantResolver's 3-pass scan ensures correct text resolution.
EGSPluralCategory FCldrPluralRules::ApplyDecimalCardinal(uint8 Rule, const FOperands& Op)
{
	switch (Rule)
	{
	// ── 0: always Other ───────────────────────────────────────────────────
	case 0:
		return EGSPluralCategory::Other;

	// ── 1: one requires v=0 → decimals always Other ──────────────────────
	case 1:
		return EGSPluralCategory::Other;

	// ── 2: one: i=0 or n=1 (Hindi, Bangla, etc.) ─────────────────────────
	// For decimals: i==0 → One; n==1 means exact 1 (i=1 and f=0) → One
	case 2:
		if (Op.i == 0 || (Op.i == 1 && Op.f == 0))
			return EGSPluralCategory::One;
		return EGSPluralCategory::Other;

	// ── 3: one: n=1; two: n=2 (exact values only) ────────────────────────
	case 3:
		if (Op.i == 1 && Op.f == 0) return EGSPluralCategory::One;
		if (Op.i == 2 && Op.f == 0) return EGSPluralCategory::Two;
		return EGSPluralCategory::Other;

	// ── 4: Italian — one requires v=0; many: n!=0 && n%1M==0 ─────────────
	// For decimals: one unreachable; many requires exact multiple of 1M
	case 4:
		if (Op.f == 0 && Op.i != 0 && Op.i % 1000000 == 0)
			return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 5: Serbo-Croatian — one/few require v=0 → decimals Other ─────────
	case 5:
		return EGSPluralCategory::Other;

	// ── 6: zero: n=0; one: i=0,1 and n!=0 ────────────────────────────────
	// For decimals: zero when exact 0 (i=0, f=0); one when (i=0 or i=1)
	// and not exact zero
	case 6:
		if (Op.i == 0 && Op.f == 0)
			return EGSPluralCategory::Zero;
		if (Op.i == 0 || Op.i == 1)
			return EGSPluralCategory::One;
		return EGSPluralCategory::Other;

	// ── 7: Filipino — for decimals: f%10 not in {4,6,9} → One ───────────
	case 7:
	{
		const int32 FMod10 = static_cast<int32>(Op.f % 10);
		if (FMod10 != 4 && FMod10 != 6 && FMod10 != 9)
			return EGSPluralCategory::One;
		return EGSPluralCategory::Other;
	}

	// ── 8: Arabic — complex decimal rules, Other is safe ─────────────────
	case 8:
		return EGSPluralCategory::Other;

	// ── 9: Czech/Slovak — one/few require v=0 → decimals Other ───────────
	case 9:
		return EGSPluralCategory::Other;

	// ── 10: Sorbian/Slovenian — one/two/few require v=0 → decimals Other
	case 10:
		return EGSPluralCategory::Other;

	// ── 11: Latvian — complex f-based rules, Other is safe ───────────────
	case 11:
		return EGSPluralCategory::Other;

	// ── 12: Romanian — v!=0 → always Few ─────────────────────────────────
	case 12:
		return EGSPluralCategory::Few;

	// ── 13: Russian/Ukrainian/Belarusian — one/few/many require v=0 ──────
	case 13:
		return EGSPluralCategory::Other;

	// ── 14: Breton — uses n% for integers, Other for decimals ────────────
	case 14:
		return EGSPluralCategory::Other;

	// ── 15: Welsh — exact n values, Other for decimals ────────────────────
	case 15:
		return EGSPluralCategory::Other;

	// ── 16: French — one requires v=0; many requires v=0 → decimals Other
	case 16:
		return EGSPluralCategory::Other;

	// ── 17: Irish — exact n values, Other for decimals ────────────────────
	case 17:
		return EGSPluralCategory::Other;

	// ── 18: Scottish Gaelic — exact n values, Other for decimals ──────────
	case 18:
		return EGSPluralCategory::Other;

	// ── 19: Manx — uses n% for integers, Other for decimals ──────────────
	case 19:
		return EGSPluralCategory::Other;

	// ── 20: Icelandic/Macedonian — complex t/f rules, Other is safe ──────
	case 20:
		return EGSPluralCategory::Other;

	// ── 21: Cornish — exact values, Other for decimals ────────────────────
	case 21:
		return EGSPluralCategory::Other;

	// ── 22: Lithuanian — complex f rules, Other is safe ───────────────────
	case 22:
		return EGSPluralCategory::Other;

	// ── 23: Maltese — exact values + n%100, Other for decimals ───────────
	case 23:
		return EGSPluralCategory::Other;

	// ── 24: Polish — one/few/many require v=0 → decimals Other ───────────
	case 24:
		return EGSPluralCategory::Other;

	// ── 25: Portuguese BR — one requires v=0 → decimals Other ────────────
	case 25:
		return EGSPluralCategory::Other;

	// ── 26: Samogitian — complex f rules, Other is safe ──────────────────
	case 26:
		return EGSPluralCategory::Other;

	// ── 27: Tachelhit — one: i=0 or n=1; few: n in 2..10 ─────────────────
	case 27:
		if (Op.i == 0 || (Op.i == 1 && Op.f == 0))
			return EGSPluralCategory::One;
		if (Op.f == 0 && Op.i >= 2 && Op.i <= 10)
			return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;

	// ── 28: Tamazight — exact ranges, Other for decimals ──────────────────
	case 28:
		return EGSPluralCategory::Other;

	default:
		return EGSPluralCategory::Other;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Ordinal Rule Dispatch
// ─────────────────────────────────────────────────────────────────────────────

EGSPluralCategory FCldrPluralRules::ApplyOrdinalRule(uint8 Rule, int32 n)
{
	// CLDR ordinal rules assume non-negative operands.
	if (n < 0) n = (n == INT32_MIN) ? INT32_MAX : -n;

	switch (Rule)
	{
	// ── 0: always Other ───────────────────────────────────────────────────
	case 0:
		return EGSPluralCategory::Other;

	// ── 1: n==1→One; else Other ───────────────────────────────────────────
	case 1:
		return n == 1 ? EGSPluralCategory::One : EGSPluralCategory::Other;

	// ── 2: Italian — n∈{8,11,80,800}→Many; else Other ────────────────────
	case 2:
		if (n == 8 || n == 11 || n == 80 || n == 800)
			return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 3: Marathi — n==1→One; n∈{2,3}→Two; n==4→Few; else Other ─────────
	case 3:
		if (n == 1) return EGSPluralCategory::One;
		if (n == 2 || n == 3) return EGSPluralCategory::Two;
		if (n == 4) return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;

	// ── 4: Bengali — n∈{1,5,7,8,9,10}→One; n∈{2,3}→Two; n==4→Few; n==6→Many
	case 4:
		if (n == 1 || n == 5 || (n >= 7 && n <= 10))
			return EGSPluralCategory::One;
		if (n == 2 || n == 3) return EGSPluralCategory::Two;
		if (n == 4) return EGSPluralCategory::Few;
		if (n == 6) return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 5: Hindi/Gujarati — n==1→One; n∈{2,3}→Two; n==4→Few; n==6→Many ───
	case 5:
		if (n == 1) return EGSPluralCategory::One;
		if (n == 2 || n == 3) return EGSPluralCategory::Two;
		if (n == 4) return EGSPluralCategory::Few;
		if (n == 6) return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 6: Ligurian — n∈{8,11,80..89,800..899}→Many; else Other ──────────
	case 6:
		if (n == 8 || n == 11)
			return EGSPluralCategory::Many;
		if (n >= 80 && n <= 89)
			return EGSPluralCategory::Many;
		if (n >= 800 && n <= 899)
			return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 7: Azerbaijani ────────────────────────────────────────────────────
	case 7:
	{
		const int32 mod10   = n % 10;
		const int32 mod100  = n % 100;
		const int32 mod1000 = n % 1000;
		if (mod10 == 1 || mod10 == 2 || mod10 == 5 || mod10 == 7 || mod10 == 8 ||
			mod100 == 20 || mod100 == 50 || mod100 == 70 || mod100 == 80)
			return EGSPluralCategory::One;
		if (mod10 == 3 || mod10 == 4 ||
			mod1000 == 100 || mod1000 == 200 || mod1000 == 300 || mod1000 == 400 ||
			mod1000 == 500 || mod1000 == 600 || mod1000 == 700 || mod1000 == 800 ||
			mod1000 == 900)
			return EGSPluralCategory::Few;
		if (n == 0 || mod10 == 6 || mod100 == 40 || mod100 == 60 || mod100 == 90)
			return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;
	}

	// ── 8: Belarusian — n%10∈{2,3} && n%100∉{12,13}→Few; else Other ──────
	case 8:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if ((mod10 == 2 || mod10 == 3) && mod100 != 12 && mod100 != 13)
			return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;
	}

	// ── 9: Blo — n==0→Zero; n==1→One; n∈{2..6}→Few; else Other ──────────
	case 9:
		if (n == 0) return EGSPluralCategory::Zero;
		if (n == 1) return EGSPluralCategory::One;
		if (n >= 2 && n <= 6) return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;

	// ── 10: Catalan — n∈{1,3}→One; n==2→Two; n==4→Few; else Other ────────
	case 10:
		if (n == 1 || n == 3) return EGSPluralCategory::One;
		if (n == 2) return EGSPluralCategory::Two;
		if (n == 4) return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;

	// ── 11: Welsh — n∈{0,7,8,9}→Zero; n==1→One; n==2→Two; n∈{3,4}→Few; n∈{5,6}→Many
	case 11:
		if (n == 0 || n == 7 || n == 8 || n == 9) return EGSPluralCategory::Zero;
		if (n == 1) return EGSPluralCategory::One;
		if (n == 2) return EGSPluralCategory::Two;
		if (n == 3 || n == 4) return EGSPluralCategory::Few;
		if (n == 5 || n == 6) return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 12: English — n%10==1&&n%100!=11→One; n%10==2&&n%100!=12→Two;
	//                  n%10==3&&n%100!=13→Few; else Other
	case 12:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 == 1 && mod100 != 11) return EGSPluralCategory::One;
		if (mod10 == 2 && mod100 != 12) return EGSPluralCategory::Two;
		if (mod10 == 3 && mod100 != 13) return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;
	}

	// ── 13: Scottish Gaelic — n∈{1,11}→One; n∈{2,12}→Two; n∈{3,13}→Few ──
	case 13:
		if (n == 1 || n == 11) return EGSPluralCategory::One;
		if (n == 2 || n == 12) return EGSPluralCategory::Two;
		if (n == 3 || n == 13) return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;

	// ── 14: Hungarian — n∈{1,5}→One; else Other ──────────────────────────
	case 14:
		return (n == 1 || n == 5) ? EGSPluralCategory::One : EGSPluralCategory::Other;

	// ── 15: Georgian — n==1→One; n==0||n%100∈{2..20,40,60,80}→Many ───────
	case 15:
	{
		if (n == 1) return EGSPluralCategory::One;
		if (n == 0) return EGSPluralCategory::Many;
		const int32 mod100 = n % 100;
		if ((mod100 >= 2 && mod100 <= 20) || mod100 == 40 || mod100 == 60 || mod100 == 80)
			return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;
	}

	// ── 16: Kazakh — n%10∈{6,9} || (n%10==0&&n!=0)→Many; else Other ──────
	case 16:
	{
		const int32 mod10 = n % 10;
		if (mod10 == 6 || mod10 == 9 || (mod10 == 0 && n != 0))
			return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;
	}

	// ── 17: Cornish — n∈{1..4}||n%100∈{1..4,21..24,41..44,61..64,81..84}→One;
	//                  n==5||n%100==5→Many; else Other
	case 17:
	{
		if (n >= 1 && n <= 4) return EGSPluralCategory::One;
		const int32 mod100 = n % 100;
		if ((mod100 >= 1  && mod100 <= 4)  || (mod100 >= 21 && mod100 <= 24) ||
			(mod100 >= 41 && mod100 <= 44) || (mod100 >= 61 && mod100 <= 64) ||
			(mod100 >= 81 && mod100 <= 84))
			return EGSPluralCategory::One;
		if (n == 5 || mod100 == 5)
			return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;
	}

	// ── 18: Macedonian — n%10==1&&n%100!=11→One; n%10==2&&n%100!=12→Two;
	//                     n%10∈{7,8}&&n%100∉{17,18}→Many; else Other
	case 18:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 == 1 && mod100 != 11) return EGSPluralCategory::One;
		if (mod10 == 2 && mod100 != 12) return EGSPluralCategory::Two;
		if ((mod10 == 7 || mod10 == 8) && mod100 != 17 && mod100 != 18)
			return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;
	}

	// ── 19: Nepali — n∈{1..4}→One; else Other ────────────────────────────
	case 19:
		return (n >= 1 && n <= 4) ? EGSPluralCategory::One : EGSPluralCategory::Other;

	// ── 20: Odia — n∈{1,5,7,8,9}→One; n∈{2,3}→Two; n==4→Few; n==6→Many ──
	case 20:
		if (n == 1 || n == 5 || (n >= 7 && n <= 9))
			return EGSPluralCategory::One;
		if (n == 2 || n == 3) return EGSPluralCategory::Two;
		if (n == 4) return EGSPluralCategory::Few;
		if (n == 6) return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;

	// ── 21: Albanian — n==1→One; n%10==4&&n%100!=14→Many; else Other ──────
	case 21:
	{
		if (n == 1) return EGSPluralCategory::One;
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 == 4 && mod100 != 14) return EGSPluralCategory::Many;
		return EGSPluralCategory::Other;
	}

	// ── 22: Swedish — n%10∈{1,2}&&n%100∉{11,12}→One; else Other ──────────
	case 22:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if ((mod10 == 1 || mod10 == 2) && mod100 != 11 && mod100 != 12)
			return EGSPluralCategory::One;
		return EGSPluralCategory::Other;
	}

	// ── 23: Turkmen — n%10∈{6,9}||n==10→Few; else Other ──────────────────
	case 23:
	{
		const int32 mod10 = n % 10;
		if (mod10 == 6 || mod10 == 9 || n == 10)
			return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;
	}

	// ── 24: Ukrainian — n%10==3&&n%100!=13→Few; else Other ────────────────
	case 24:
	{
		const int32 mod10  = n % 10;
		const int32 mod100 = n % 100;
		if (mod10 == 3 && mod100 != 13) return EGSPluralCategory::Few;
		return EGSPluralCategory::Other;
	}

	default:
		return EGSPluralCategory::Other;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Locale Normalization Helpers
// ─────────────────────────────────────────────────────────────────────────────

FString FCldrPluralRules::SwapSeparator(const FString& Code)
{
	const int32 Len = Code.Len();
	for (int32 i = 0; i < Len; i++)
	{
		const TCHAR c = Code[i];
		if (c == TEXT('_'))
		{
			FString Result = Code;
			Result[i] = TEXT('-');
			return Result;
		}
		if (c == TEXT('-'))
		{
			FString Result = Code;
			Result[i] = TEXT('_');
			return Result;
		}
	}
	return FString();
}

FString FCldrPluralRules::LanguageSubtag(const FString& Code)
{
	const int32 Len = Code.Len();
	for (int32 i = 0; i < Len; i++)
	{
		const TCHAR c = Code[i];
		if (c == TEXT('-') || c == TEXT('_'))
		{
			return Code.Left(i);
		}
	}
	return FString();
}
