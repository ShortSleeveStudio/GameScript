using System;
using System.Collections.Generic;

namespace GameScript
{
    /// <summary>
    /// Maps IETF locale codes to CLDR plural categories for integer and decimal quantities.
    /// Derived from the Unicode CLDR <c>plurals.json</c> rules.
    /// </summary>
    /// <remarks>
    /// Locale lookup order:
    /// <list type="number">
    ///   <item>Exact match (e.g., <c>"pt-PT"</c>)</item>
    ///   <item>Separator swap: replace <c>_</c> with <c>-</c> or vice-versa</item>
    ///   <item>Language subtag only (first segment before <c>-</c> or <c>_</c>)</item>
    ///   <item>Default: <see cref="PluralCategory.Other"/></item>
    /// </list>
    /// All dispatch is via a <c>switch</c> on a byte rule index — IL2CPP-safe, no delegates,
    /// no <c>Func&lt;&gt;</c>.
    /// </remarks>
    public static class CldrPluralRules
    {
        #region Locale Map
        // Maps locale code → rule index (byte).
        // Uses StringComparer.Ordinal for fast, allocation-free lookups.
        static readonly Dictionary<string, byte> s_LocaleMap =
            new Dictionary<string, byte>(StringComparer.Ordinal)
        {
            // ── Rule 0: always Other ──────────────────────────────────────────────────
            { "bm",      0 }, { "bo",      0 }, { "dz",      0 }, { "hnj",     0 },
            { "id",      0 }, { "ig",      0 }, { "ii",      0 }, { "ja",      0 },
            { "jbo",     0 }, { "jv",      0 }, { "jw",      0 }, { "kde",     0 },
            { "kea",     0 }, { "km",      0 }, { "ko",      0 }, { "lkt",     0 },
            { "lo",      0 }, { "ms",      0 }, { "my",      0 }, { "nqo",     0 },
            { "osa",     0 }, { "sah",     0 }, { "ses",     0 }, { "sg",      0 },
            { "su",      0 }, { "th",      0 }, { "to",      0 }, { "tpi",     0 },
            { "und",     0 }, { "vi",      0 }, { "wo",      0 }, { "yo",      0 },
            { "yue",     0 }, { "zh",      0 },

            // ── Rule 1: n==1 → One; else Other ───────────────────────────────────────
            // Group 1 (no grammatical plural distinction at 0, strong singular at 1)
            { "af",      1 }, { "an",      1 }, { "asa",     1 }, { "az",      1 },
            { "bal",     1 }, { "bem",     1 }, { "bez",     1 }, { "bg",      1 },
            { "brx",     1 }, { "ce",      1 }, { "cgg",     1 }, { "chr",     1 },
            { "ckb",     1 }, { "dv",      1 }, { "ee",      1 }, { "el",      1 },
            { "eo",      1 }, { "eu",      1 }, { "fo",      1 }, { "fur",     1 },
            { "gsw",     1 }, { "ha",      1 }, { "haw",     1 }, { "hu",      1 },
            { "jgo",     1 }, { "jmc",     1 }, { "ka",      1 }, { "kaj",     1 },
            { "kcg",     1 }, { "kk",      1 }, { "kkj",     1 }, { "kl",      1 },
            { "ks",      1 }, { "ksb",     1 }, { "ku",      1 }, { "ky",      1 },
            { "lb",      1 }, { "lg",      1 }, { "mas",     1 }, { "mgo",     1 },
            { "ml",      1 }, { "mn",      1 }, { "mr",      1 }, { "nah",     1 },
            { "nb",      1 }, { "nd",      1 }, { "ne",      1 }, { "nn",      1 },
            { "nnh",     1 }, { "no",      1 }, { "nr",      1 }, { "ny",      1 },
            { "nyn",     1 }, { "om",      1 }, { "or",      1 }, { "os",      1 },
            { "pap",     1 }, { "ps",      1 }, { "rm",      1 }, { "rof",     1 },
            { "rwk",     1 }, { "saq",     1 }, { "sd",      1 }, { "sdh",     1 },
            { "seh",     1 }, { "sn",      1 }, { "so",      1 }, { "sq",      1 },
            { "ss",      1 }, { "ssy",     1 }, { "st",      1 }, { "syr",     1 },
            { "ta",      1 }, { "te",      1 }, { "teo",     1 }, { "tig",     1 },
            { "tk",      1 }, { "tn",      1 }, { "tr",      1 }, { "ts",      1 },
            { "ug",      1 }, { "uz",      1 }, { "ve",      1 }, { "vo",      1 },
            { "vun",     1 }, { "wae",     1 }, { "xh",      1 }, { "xog",     1 },
            // Group 3 (same rule, European languages)
            { "ast",     1 }, { "de",      1 }, { "en",      1 }, { "et",      1 },
            { "fi",      1 }, { "fy",      1 }, { "gl",      1 }, { "ia",      1 },
            { "ie",      1 }, { "io",      1 }, { "lij",     1 }, { "nl",      1 },
            { "sc",      1 }, { "sv",      1 }, { "sw",      1 }, { "ur",      1 },
            { "yi",      1 },
            // da: n==1→One (CLDR: "n = 1 or t != 0 and i = 0,1"; integers: n==1)
            { "da",      1 },

            // ── Rule 2: (n==0 || n==1) → One; else Other ─────────────────────────────
            { "am",      2 }, { "as",      2 }, { "ak",      2 }, { "bho",     2 },
            { "bn",      2 }, { "csw",     2 }, { "doi",     2 }, { "fa",      2 },
            { "ff",      2 }, { "gu",      2 }, { "guw",     2 }, { "hi",      2 },
            { "hy",      2 }, { "kab",     2 }, { "kn",      2 }, { "kok",     2 },
            { "kok-Latn",2 }, { "ln",      2 }, { "mg",      2 }, { "nso",     2 },
            { "pa",      2 }, { "pcm",     2 }, { "si",      2 }, { "ti",      2 },
            { "wa",      2 }, { "zu",      2 },

            // ── Rule 3: n==1→One; n==2→Two; else Other ───────────────────────────────
            { "iu",      3 }, { "naq",     3 }, { "sat",     3 }, { "se",      3 },
            { "sma",     3 }, { "smi",     3 }, { "smj",     3 }, { "smn",     3 },
            { "sms",     3 }, { "he",      3 },

            // ── Rule 4: n==1→One; n%1000000==0 && n!=0→Many; else Other (Italian) ────
            { "ca",      4 }, { "es",      4 }, { "it",      4 }, { "lld",     4 },
            { "pt-PT",   4 }, { "scn",     4 }, { "vec",     4 },

            // ── Rule 5: Serbo-Croatian ────────────────────────────────────────────────
            // n%10==1 && n%100!=11 → One
            // n%10∈2..4 && n%100∉12..14 → Few
            // else Other
            { "bs",      5 }, { "hr",      5 }, { "sh",      5 }, { "sr",      5 },

            // ── Rule 6: n==0→Zero; n==1→One; else Other ──────────────────────────────
            { "blo",     6 }, { "cv",      6 }, { "ksh",     6 }, { "lag",     6 },

            // ── Rule 7: Filipino ──────────────────────────────────────────────────────
            // n∈{1,2,3} || n%10∉{4,6,9} → One; else Other
            { "ceb",     7 }, { "fil",     7 }, { "tl",      7 },

            // ── Rule 8: Arabic ────────────────────────────────────────────────────────
            // n==0→Zero; n==1→One; n==2→Two; n%100∈3..10→Few; n%100∈11..99→Many; else Other
            { "ar",      8 }, { "ars",     8 },

            // ── Rule 9: Czech/Slovak ──────────────────────────────────────────────────
            // n==1→One; n∈2..4→Few; else Other
            { "cs",      9 }, { "sk",      9 },

            // ── Rule 10: Sorbian/Slovenian ────────────────────────────────────────────
            // n%100==1→One; n%100==2→Two; n%100∈3..4→Few; else Other
            { "dsb",    10 }, { "hsb",    10 }, { "sl",     10 },

            // ── Rule 11: Latvian ──────────────────────────────────────────────────────
            // n%10==0 || n%100∈11..19 → Zero
            // n%10==1 && n%100!=11 → One
            // else Other
            { "lv",     11 }, { "prg",    11 },

            // ── Rule 12: Romanian ─────────────────────────────────────────────────────
            // n==1→One; n==0 || n%100∈1..19→Few; else Other
            { "mo",     12 }, { "ro",     12 },

            // ── Rule 13: Russian/Ukrainian/Belarusian ─────────────────────────────────
            // n%10==1 && n%100!=11 → One
            // n%10∈2..4 && n%100∉12..14 → Few
            // else Many   (Other only for fractions — integers always hit One/Few/Many)
            { "ru",     13 }, { "uk",     13 }, { "be",     13 },

            // ── Rule 14: Breton ───────────────────────────────────────────────────────
            // n%10==1 && n%100∉{11,71,91} → One
            // n%10==2 && n%100∉{12,72,92} → Two
            // (n%10∈3..4||n%10==9) && n%100∉10..19 && ∉70..79 && ∉90..99 → Few
            // n!=0 && n%1000000==0 → Many
            // else Other
            { "br",     14 },

            // ── Rule 15: Welsh ────────────────────────────────────────────────────────
            // n==0→Zero; n==1→One; n==2→Two; n==3→Few; n==6→Many; else Other
            { "cy",     15 },

            // ── Rule 16: French ───────────────────────────────────────────────────────
            // n==0||n==1→One; n!=0 && n%1000000==0→Many; else Other
            { "fr",     16 },

            // ── Rule 17: Irish ────────────────────────────────────────────────────────
            // n==1→One; n==2→Two; n∈3..6→Few; n∈7..10→Many; else Other
            { "ga",     17 },

            // ── Rule 18: Scottish Gaelic ──────────────────────────────────────────────
            // n∈{1,11}→One; n∈{2,12}→Two; n∈3..10||13..19→Few; else Other
            { "gd",     18 },

            // ── Rule 19: Manx ─────────────────────────────────────────────────────────
            // n%10==1→One; n%10==2→Two; n%100∈{0,20,40,60,80}→Few; else Other
            { "gv",     19 },

            // ── Rule 20: Icelandic/Macedonian ─────────────────────────────────────────
            // n%10==1 && n%100!=11 → One; else Other
            { "is",     20 }, { "mk",     20 },

            // ── Rule 21: Cornish ──────────────────────────────────────────────────────
            { "kw",     21 },

            // ── Rule 22: Lithuanian ───────────────────────────────────────────────────
            // n%10==1 && n%100∉11..19 → One
            // n%10∈2..9 && n%100∉11..19 → Few
            // else Other
            { "lt",     22 },

            // ── Rule 23: Maltese ──────────────────────────────────────────────────────
            // n==1→One; n==2→Two; n==0||n%100∈3..10→Few; n%100∈11..19→Many; else Other
            { "mt",     23 },

            // ── Rule 24: Polish ───────────────────────────────────────────────────────
            // n==1→One; n%10∈2..4 && n%100∉12..14→Few; else Many
            { "pl",     24 },

            // ── Rule 25: Portuguese (Brazil + default) ────────────────────────────────
            // n==0||n==1→One; n!=0 && n%1000000==0→Many; else Other
            { "pt",     25 },

            // ── Rule 26: Samogitian ───────────────────────────────────────────────────
            // n%10==1 && n%100!=11→One; n==2→Two; n!=2 && n%10∈2..9 && n%100∉11..19→Few; else Other
            { "sgs",    26 },

            // ── Rule 27: Tachelhit ────────────────────────────────────────────────────
            // n==0||n==1→One; n∈2..10→Few; else Other
            { "shi",    27 },

            // ── Rule 28: Tamazight ────────────────────────────────────────────────────
            // n∈0..1 || n∈11..99 → One; else Other
            { "tzm",    28 },
        };
        #endregion

        #region Ordinal Locale Map
        // Maps locale code → ordinal rule index (byte).
        static readonly Dictionary<string, byte> s_OrdinalLocaleMap =
            new Dictionary<string, byte>(StringComparer.Ordinal)
        {
            // ── Ordinal Rule 0: always Other ────────────────────────────────────────
            { "af",  0 }, { "am",  0 }, { "an",  0 }, { "ar",  0 }, { "ast", 0 },
            { "bg",  0 }, { "bs",  0 }, { "ce",  0 }, { "cs",  0 }, { "cv",  0 },
            { "da",  0 }, { "de",  0 }, { "dsb", 0 }, { "el",  0 }, { "es",  0 },
            { "et",  0 }, { "eu",  0 }, { "fa",  0 }, { "fi",  0 }, { "fy",  0 },
            { "gl",  0 }, { "gsw", 0 }, { "he",  0 }, { "hr",  0 }, { "hsb", 0 },
            { "ia",  0 }, { "id",  0 }, { "ie",  0 }, { "is",  0 }, { "ja",  0 },
            { "km",  0 }, { "kn",  0 }, { "ko",  0 }, { "ky",  0 }, { "lt",  0 },
            { "lv",  0 }, { "ml",  0 }, { "mn",  0 }, { "my",  0 }, { "nb",  0 },
            { "nl",  0 }, { "no",  0 }, { "pa",  0 }, { "pl",  0 }, { "prg", 0 },
            { "ps",  0 }, { "pt",  0 }, { "ru",  0 }, { "sd",  0 }, { "sh",  0 },
            { "si",  0 }, { "sk",  0 }, { "sl",  0 }, { "sr",  0 }, { "sw",  0 },
            { "ta",  0 }, { "te",  0 }, { "th",  0 }, { "tpi", 0 }, { "tr",  0 },
            { "und", 0 }, { "ur",  0 }, { "uz",  0 }, { "yue", 0 }, { "zh",  0 },
            { "zu",  0 },

            // ── Ordinal Rule 1: n==1→One; else Other ────────────────────────────────
            { "bal", 1 }, { "fil", 1 }, { "fr",  1 }, { "ga",  1 }, { "hy",  1 },
            { "lo",  1 }, { "mo",  1 }, { "ms",  1 }, { "ro",  1 }, { "tl",  1 },
            { "vi",  1 },

            // ── Ordinal Rule 2: Italian — n∈{11,8,80,800}→Many; else Other ─────────
            { "it",  2 }, { "lld", 2 }, { "sc",  2 }, { "vec", 2 },

            // ── Ordinal Rule 3: Marathi — n==1→One; n∈{2,3}→Two; n==4→Few ──────────
            { "kok",      3 }, { "kok-Latn", 3 }, { "mr", 3 },

            // ── Ordinal Rule 4: Bengali — complex (1,5,7-10→One; 2,3→Two; 4→Few; 6→Many)
            { "as",  4 }, { "bn",  4 },

            // ── Ordinal Rule 5: Hindi/Gujarati — n==1→One; n∈{2,3}→Two; n==4→Few; n==6→Many
            { "gu",  5 }, { "hi",  5 },

            // ── Ordinal Rule 6: Ligurian — n∈{11,8,80..89,800..899}→Many ───────────
            { "lij", 6 }, { "scn", 6 },

            // ── Ordinal Rule 7: Azerbaijani ─────────────────────────────────────────
            { "az",  7 },

            // ── Ordinal Rule 8: Belarusian ──────────────────────────────────────────
            { "be",  8 },

            // ── Ordinal Rule 9: Blo ──────────────────────────────────────────────────
            { "blo", 9 },

            // ── Ordinal Rule 10: Catalan ─────────────────────────────────────────────
            { "ca", 10 },

            // ── Ordinal Rule 11: Welsh ───────────────────────────────────────────────
            { "cy", 11 },

            // ── Ordinal Rule 12: English ─────────────────────────────────────────────
            { "en", 12 },

            // ── Ordinal Rule 13: Scottish Gaelic ─────────────────────────────────────
            { "gd", 13 },

            // ── Ordinal Rule 14: Hungarian ───────────────────────────────────────────
            { "hu", 14 },

            // ── Ordinal Rule 15: Georgian ────────────────────────────────────────────
            { "ka", 15 },

            // ── Ordinal Rule 16: Kazakh ──────────────────────────────────────────────
            { "kk", 16 },

            // ── Ordinal Rule 17: Cornish ─────────────────────────────────────────────
            { "kw", 17 },

            // ── Ordinal Rule 18: Macedonian ──────────────────────────────────────────
            { "mk", 18 },

            // ── Ordinal Rule 19: Nepali ──────────────────────────────────────────────
            { "ne", 19 },

            // ── Ordinal Rule 20: Odia ────────────────────────────────────────────────
            { "or", 20 },

            // ── Ordinal Rule 21: Albanian ────────────────────────────────────────────
            { "sq", 21 },

            // ── Ordinal Rule 22: Swedish ─────────────────────────────────────────────
            { "sv", 22 },

            // ── Ordinal Rule 23: Turkmen ─────────────────────────────────────────────
            { "tk", 23 },

            // ── Ordinal Rule 24: Ukrainian ───────────────────────────────────────────
            { "uk", 24 },
        };
        #endregion

        #region Public API
        /// <summary>
        /// Resolves the CLDR cardinal plural category for the given locale and integer count.
        /// Performs locale lookup + rule application in one call. For repeated calls with the
        /// same locale, prefer <see cref="LookupCardinalRule"/> + <see cref="ApplyRule"/> to
        /// avoid per-call locale normalization allocations.
        /// </summary>
        /// <param name="localeCode">
        /// IETF locale code (e.g., <c>"en"</c>, <c>"en_US"</c>, <c>"pt-PT"</c>).
        /// Lookup is exact-first, then separator-swapped, then language subtag only.
        /// </param>
        /// <param name="count">The integer quantity to categorise. Negative values are treated as their absolute value.</param>
        /// <returns>The matching <see cref="PluralCategory"/>.</returns>
        public static PluralCategory Resolve(string localeCode, int count)
        {
            byte rule = LookupRule(s_LocaleMap, localeCode);
            return ApplyRule(rule, count);
        }

        /// <summary>
        /// Resolves the CLDR cardinal plural category for the given locale with full decimal
        /// operand support. When <paramref name="precision"/> is 0, produces identical results
        /// to <see cref="Resolve(string, int)"/>.
        /// </summary>
        /// <param name="localeCode">IETF locale code.</param>
        /// <param name="value">
        /// The unscaled numeric value. When <paramref name="precision"/> is 0, this is the
        /// integer value. When precision &gt; 0, the represented number is
        /// <c>value / 10^precision</c> (e.g., 150 with precision=1 represents 15.0).
        /// </param>
        /// <param name="precision">
        /// Number of decimal places. 0 = integer (delegates to the integer-only path).
        /// </param>
        /// <returns>The matching <see cref="PluralCategory"/>.</returns>
        public static PluralCategory Resolve(string localeCode, long value, int precision)
        {
            byte rule = LookupRule(s_LocaleMap, localeCode);
            return ApplyRule(rule, value, precision);
        }

        /// <summary>
        /// Resolves the CLDR ordinal plural category for the given locale and integer count.
        /// Performs locale lookup + rule application in one call. For repeated calls with the
        /// same locale, prefer <see cref="LookupOrdinalRule"/> + <see cref="ApplyOrdinalRule"/>.
        /// </summary>
        /// <param name="localeCode">
        /// IETF locale code (e.g., <c>"en"</c>, <c>"en_US"</c>, <c>"pt-PT"</c>).
        /// Lookup is exact-first, then separator-swapped, then language subtag only.
        /// </param>
        /// <param name="count">The integer ordinal position to categorise. Negative values are treated as their absolute value.</param>
        /// <returns>The matching <see cref="PluralCategory"/>.</returns>
        public static PluralCategory ResolveOrdinal(string localeCode, int count)
        {
            byte rule = LookupRule(s_OrdinalLocaleMap, localeCode);
            return ApplyOrdinalRule(rule, count);
        }

        /// <summary>
        /// Returns the cardinal rule index for the given locale code. Cache this value and
        /// pass it to <see cref="ApplyRule"/> to avoid per-call locale normalization allocations.
        /// </summary>
        /// <param name="localeCode">IETF locale code.</param>
        /// <returns>Cardinal rule index (opaque — only meaningful when passed to <see cref="ApplyRule"/>).</returns>
        public static byte LookupCardinalRule(string localeCode)
        {
            return LookupRule(s_LocaleMap, localeCode);
        }

        /// <summary>
        /// Returns the ordinal rule index for the given locale code. Cache this value and
        /// pass it to <see cref="ApplyOrdinalRule"/> to avoid per-call locale normalization allocations.
        /// </summary>
        /// <param name="localeCode">IETF locale code.</param>
        /// <returns>Ordinal rule index (opaque — only meaningful when passed to <see cref="ApplyOrdinalRule"/>).</returns>
        public static byte LookupOrdinalRule(string localeCode)
        {
            return LookupRule(s_OrdinalLocaleMap, localeCode);
        }

        // Shared locale → rule-index lookup: exact → separator swap → language subtag → 0.
        // May allocate strings during separator normalization — callers that resolve the same
        // locale repeatedly should cache the returned rule index instead.
        static byte LookupRule(Dictionary<string, byte> map, string localeCode)
        {
            if (string.IsNullOrEmpty(localeCode))
                return 0;

            // 1. Exact lookup
            if (map.TryGetValue(localeCode, out byte rule))
                return rule;

            // 2. Separator swap (underscore ↔ hyphen)
            string swapped = SwapSeparator(localeCode);
            if (swapped != null && map.TryGetValue(swapped, out rule))
                return rule;

            // 3. Language subtag only
            string subtag = LanguageSubtag(localeCode);
            if (subtag != null && map.TryGetValue(subtag, out rule))
                return rule;

            // 4. Default
            return 0;
        }
        #endregion

        #region Rule Dispatch
        /// <summary>
        /// Applies a cardinal plural rule (identified by index from <see cref="LookupCardinalRule"/>)
        /// to the given integer count. Returns the matching <see cref="PluralCategory"/>.
        /// </summary>
        internal static PluralCategory ApplyRule(byte rule, int n)
        {
            // CLDR rules assume non-negative operands. -3 and 3 share the same plural
            // category in every known language. Display uses the original signed value;
            // category selection uses the absolute value.
            if (n < 0) n = (n == int.MinValue) ? int.MaxValue : -n;

            switch (rule)
            {
                // ── 0: always Other ───────────────────────────────────────────────────
                case 0:
                    return PluralCategory.Other;

                // ── 1: n==1→One; else Other ───────────────────────────────────────────
                case 1:
                    return n == 1 ? PluralCategory.One : PluralCategory.Other;

                // ── 2: (n==0||n==1)→One; else Other ──────────────────────────────────
                case 2:
                    return (n == 0 || n == 1) ? PluralCategory.One : PluralCategory.Other;

                // ── 3: n==1→One; n==2→Two; else Other ────────────────────────────────
                case 3:
                    if (n == 1) return PluralCategory.One;
                    if (n == 2) return PluralCategory.Two;
                    return PluralCategory.Other;

                // ── 4: Italian-style (n==1→One; n!=0&&n%1000000==0→Many; else Other) ──
                case 4:
                    if (n == 1) return PluralCategory.One;
                    if (n != 0 && n % 1000000 == 0) return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 5: Serbo-Croatian ──────────────────────────────────────────────────
                case 5:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 == 1 && mod100 != 11)
                        return PluralCategory.One;
                    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14))
                        return PluralCategory.Few;
                    return PluralCategory.Other;
                }

                // ── 6: n==0→Zero; n==1→One; else Other ────────────────────────────────
                case 6:
                    if (n == 0) return PluralCategory.Zero;
                    if (n == 1) return PluralCategory.One;
                    return PluralCategory.Other;

                // ── 7: Filipino ────────────────────────────────────────────────────────
                // One: n∈{1,2,3} || n%10∉{4,6,9}
                case 7:
                {
                    if (n == 1 || n == 2 || n == 3)
                        return PluralCategory.One;
                    int mod10 = n % 10;
                    if (mod10 != 4 && mod10 != 6 && mod10 != 9)
                        return PluralCategory.One;
                    return PluralCategory.Other;
                }

                // ── 8: Arabic ──────────────────────────────────────────────────────────
                case 8:
                {
                    if (n == 0) return PluralCategory.Zero;
                    if (n == 1) return PluralCategory.One;
                    if (n == 2) return PluralCategory.Two;
                    int mod100 = n % 100;
                    if (mod100 >= 3  && mod100 <= 10) return PluralCategory.Few;
                    if (mod100 >= 11 && mod100 <= 99) return PluralCategory.Many;
                    return PluralCategory.Other;
                }

                // ── 9: Czech/Slovak ────────────────────────────────────────────────────
                case 9:
                    if (n == 1) return PluralCategory.One;
                    if (n >= 2 && n <= 4) return PluralCategory.Few;
                    return PluralCategory.Other;

                // ── 10: Sorbian/Slovenian ──────────────────────────────────────────────
                case 10:
                {
                    int mod100 = n % 100;
                    if (mod100 == 1) return PluralCategory.One;
                    if (mod100 == 2) return PluralCategory.Two;
                    if (mod100 == 3 || mod100 == 4) return PluralCategory.Few;
                    return PluralCategory.Other;
                }

                // ── 11: Latvian ────────────────────────────────────────────────────────
                case 11:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 == 0 || (mod100 >= 11 && mod100 <= 19))
                        return PluralCategory.Zero;
                    if (mod10 == 1 && mod100 != 11)
                        return PluralCategory.One;
                    return PluralCategory.Other;
                }

                // ── 12: Romanian ───────────────────────────────────────────────────────
                case 12:
                {
                    if (n == 1) return PluralCategory.One;
                    int mod100 = n % 100;
                    if (n == 0 || (mod100 >= 1 && mod100 <= 19))
                        return PluralCategory.Few;
                    return PluralCategory.Other;
                }

                // ── 13: Russian/Ukrainian/Belarusian ──────────────────────────────────
                case 13:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 == 1 && mod100 != 11)
                        return PluralCategory.One;
                    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14))
                        return PluralCategory.Few;
                    return PluralCategory.Many;
                }

                // ── 14: Breton ─────────────────────────────────────────────────────────
                case 14:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 == 1 && mod100 != 11 && mod100 != 71 && mod100 != 91)
                        return PluralCategory.One;
                    if (mod10 == 2 && mod100 != 12 && mod100 != 72 && mod100 != 92)
                        return PluralCategory.Two;
                    if ((mod10 >= 3 && mod10 <= 4) || mod10 == 9)
                    {
                        if (!(mod100 >= 10 && mod100 <= 19) &&
                            !(mod100 >= 70 && mod100 <= 79) &&
                            !(mod100 >= 90 && mod100 <= 99))
                            return PluralCategory.Few;
                    }
                    if (n != 0 && n % 1000000 == 0)
                        return PluralCategory.Many;
                    return PluralCategory.Other;
                }

                // ── 15: Welsh ──────────────────────────────────────────────────────────
                case 15:
                    if (n == 0) return PluralCategory.Zero;
                    if (n == 1) return PluralCategory.One;
                    if (n == 2) return PluralCategory.Two;
                    if (n == 3) return PluralCategory.Few;
                    if (n == 6) return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 16: French ─────────────────────────────────────────────────────────
                case 16:
                    if (n == 0 || n == 1) return PluralCategory.One;
                    if (n != 0 && n % 1000000 == 0) return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 17: Irish ──────────────────────────────────────────────────────────
                case 17:
                    if (n == 1) return PluralCategory.One;
                    if (n == 2) return PluralCategory.Two;
                    if (n >= 3 && n <= 6) return PluralCategory.Few;
                    if (n >= 7 && n <= 10) return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 18: Scottish Gaelic ────────────────────────────────────────────────
                case 18:
                    if (n == 1 || n == 11) return PluralCategory.One;
                    if (n == 2 || n == 12) return PluralCategory.Two;
                    if ((n >= 3 && n <= 10) || (n >= 13 && n <= 19)) return PluralCategory.Few;
                    return PluralCategory.Other;

                // ── 19: Manx ───────────────────────────────────────────────────────────
                case 19:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 == 1) return PluralCategory.One;
                    if (mod10 == 2) return PluralCategory.Two;
                    if (mod100 == 0 || mod100 == 20 || mod100 == 40 ||
                        mod100 == 60 || mod100 == 80)
                        return PluralCategory.Few;
                    return PluralCategory.Other;
                }

                // ── 20: Icelandic/Macedonian ───────────────────────────────────────────
                case 20:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    return (mod10 == 1 && mod100 != 11)
                        ? PluralCategory.One
                        : PluralCategory.Other;
                }

                // ── 21: Cornish ────────────────────────────────────────────────────────
                case 21:
                {
                    if (n == 0) return PluralCategory.Zero;
                    if (n == 1) return PluralCategory.One;

                    int mod100     = n % 100;
                    int mod1000    = n % 1000;
                    int mod100000  = n % 100000;
                    int mod1000000 = n % 1000000;

                    // Two: n%100∈{2,22,42,62,82}
                    //   || (n%1000==0 && (n%100000∈1000..20000||∈{40000,60000,80000}))
                    //   || (n!=0 && n%1000000==100000)
                    if (mod100 == 2  || mod100 == 22 || mod100 == 42 ||
                        mod100 == 62 || mod100 == 82)
                        return PluralCategory.Two;
                    if (mod1000 == 0 &&
                        ((mod100000 >= 1000 && mod100000 <= 20000) ||
                         mod100000 == 40000 || mod100000 == 60000 || mod100000 == 80000))
                        return PluralCategory.Two;
                    if (n != 0 && mod1000000 == 100000)
                        return PluralCategory.Two;

                    // Few: n%100∈{3,23,43,63,83}
                    if (mod100 == 3  || mod100 == 23 || mod100 == 43 ||
                        mod100 == 63 || mod100 == 83)
                        return PluralCategory.Few;

                    // Many: n%100∈{1,21,41,61,81}
                    if (mod100 == 1  || mod100 == 21 || mod100 == 41 ||
                        mod100 == 61 || mod100 == 81)
                        return PluralCategory.Many;

                    return PluralCategory.Other;
                }

                // ── 22: Lithuanian ─────────────────────────────────────────────────────
                case 22:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 == 1 && !(mod100 >= 11 && mod100 <= 19))
                        return PluralCategory.One;
                    if (mod10 >= 2 && mod10 <= 9 && !(mod100 >= 11 && mod100 <= 19))
                        return PluralCategory.Few;
                    return PluralCategory.Other;
                }

                // ── 23: Maltese ────────────────────────────────────────────────────────
                case 23:
                {
                    if (n == 1) return PluralCategory.One;
                    if (n == 2) return PluralCategory.Two;
                    int mod100 = n % 100;
                    if (n == 0 || (mod100 >= 3 && mod100 <= 10))
                        return PluralCategory.Few;
                    if (mod100 >= 11 && mod100 <= 19)
                        return PluralCategory.Many;
                    return PluralCategory.Other;
                }

                // ── 24: Polish ─────────────────────────────────────────────────────────
                case 24:
                {
                    if (n == 1) return PluralCategory.One;
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14))
                        return PluralCategory.Few;
                    return PluralCategory.Many;
                }

                // ── 25: Portuguese (Brazil) ────────────────────────────────────────────
                case 25:
                    if (n == 0 || n == 1) return PluralCategory.One;
                    if (n != 0 && n % 1000000 == 0) return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 26: Samogitian ─────────────────────────────────────────────────────
                case 26:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 == 1 && mod100 != 11)
                        return PluralCategory.One;
                    if (n == 2)
                        return PluralCategory.Two;
                    if (n != 2 && mod10 >= 2 && mod10 <= 9 && !(mod100 >= 11 && mod100 <= 19))
                        return PluralCategory.Few;
                    return PluralCategory.Other;
                }

                // ── 27: Tachelhit ──────────────────────────────────────────────────────
                case 27:
                    if (n == 0 || n == 1) return PluralCategory.One;
                    if (n >= 2 && n <= 10) return PluralCategory.Few;
                    return PluralCategory.Other;

                // ── 28: Tamazight ──────────────────────────────────────────────────────
                case 28:
                    if ((n >= 0 && n <= 1) || (n >= 11 && n <= 99))
                        return PluralCategory.One;
                    return PluralCategory.Other;

                default:
                    return PluralCategory.Other;
            }
        }
        #endregion

        #region Decimal Operands
        // CLDR plural operands derived from (value, precision).
        // See: https://unicode.org/reports/tr35/tr35-numbers.html#Operands
        struct Operands
        {
            public long i;  // Integer digits of n
            public int  v;  // Number of visible fraction digits (with trailing zeros)
            public int  w;  // Number of non-zero fraction digits (without trailing zeros)
            public long f;  // Visible fraction digits (with trailing zeros)
            public long t;  // Fraction digits without trailing zeros
        }

        static long Pow10Long(int exponent)
        {
            long result = 1;
            for (int i = 0; i < exponent; i++) result *= 10;
            return result;
        }

        static Operands DeriveOperands(long value, int precision)
        {
            if (precision <= 0)
                return new Operands { i = Math.Abs(value), v = 0, w = 0, f = 0, t = 0 };

            long abs = Math.Abs(value);
            long pow = Pow10Long(precision);
            long i = abs / pow;
            long f = abs % pow;

            // Derive t (f with trailing zeros stripped) and w (digit count of t)
            long t = f;
            int w = precision;
            if (t > 0)
            {
                while (t % 10 == 0) { t /= 10; w--; }
            }
            else
            {
                w = 0;
            }

            return new Operands { i = i, v = precision, w = w, f = f, t = t };
        }

        /// <summary>
        /// Applies a cardinal plural rule with full decimal operand support.
        /// When <paramref name="precision"/> is 0, produces identical results to the
        /// integer-only <see cref="ApplyRule(byte, int)"/> overload.
        /// </summary>
        internal static PluralCategory ApplyRule(byte rule, long value, int precision)
        {
            // Integer fast path — delegate to existing proven implementation
            if (precision <= 0)
            {
                long abs = (value < 0) ? ((value == long.MinValue) ? long.MaxValue : -value) : value;
                int n = (abs > int.MaxValue) ? int.MaxValue : (int)abs;
                return ApplyRule(rule, n);
            }

            // Decimal path — full CLDR operands
            Operands op = DeriveOperands(value, precision);
            return ApplyDecimalCardinal(rule, op);
        }

        // Applies CLDR cardinal plural rules for decimal values (v > 0).
        // For each rule, conditions that require v = 0 are unreachable for decimals, so those
        // categories correctly fall through to Other. The "other" category is always a valid
        // fallback in CLDR — VariantResolver's 3-pass scan ensures correct text resolution.
        static PluralCategory ApplyDecimalCardinal(byte rule, Operands op)
        {
            switch (rule)
            {
                // ── 0: always Other ─────────────────────────────────────────────────
                case 0:
                    return PluralCategory.Other;

                // ── 1: one requires v=0 → decimals always Other ─────────────────────
                case 1:
                    return PluralCategory.Other;

                // ── 2: one: i=0 or n=1 (Hindi, Bangla, etc.) ────────────────────────
                // For decimals: i==0 → One; n==1 means exact 1 (i=1 and f=0) → One
                case 2:
                    if (op.i == 0 || (op.i == 1 && op.f == 0))
                        return PluralCategory.One;
                    return PluralCategory.Other;

                // ── 3: one: n=1; two: n=2 (exact values only) ───────────────────────
                case 3:
                    if (op.i == 1 && op.f == 0) return PluralCategory.One;
                    if (op.i == 2 && op.f == 0) return PluralCategory.Two;
                    return PluralCategory.Other;

                // ── 4: Italian — one requires v=0; many: n!=0 && n%1M==0 ────────────
                // For decimals: one unreachable; many requires exact multiple of 1M
                case 4:
                    if (op.f == 0 && op.i != 0 && op.i % 1000000 == 0)
                        return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 5: Serbo-Croatian — one/few require v=0 → decimals Other ────────
                case 5:
                    return PluralCategory.Other;

                // ── 6: zero: n=0; one: i=0,1 and n!=0 ──────────────────────────────
                // For decimals: zero when exact 0 (i=0, f=0); one when (i=0 or i=1)
                // and not exact zero
                case 6:
                    if (op.i == 0 && op.f == 0)
                        return PluralCategory.Zero;
                    if (op.i == 0 || op.i == 1)
                        return PluralCategory.One;
                    return PluralCategory.Other;

                // ── 7: Filipino — for decimals: f%10 not in {4,6,9} → One ──────────
                case 7:
                {
                    int fMod10 = (int)(op.f % 10);
                    if (fMod10 != 4 && fMod10 != 6 && fMod10 != 9)
                        return PluralCategory.One;
                    return PluralCategory.Other;
                }

                // ── 8: Arabic — complex decimal rules, Other is safe ────────────────
                case 8:
                    return PluralCategory.Other;

                // ── 9: Czech/Slovak — one/few require v=0 → decimals Other ──────────
                case 9:
                    return PluralCategory.Other;

                // ── 10: Sorbian/Slovenian — one/two/few require v=0 → decimals Other
                case 10:
                    return PluralCategory.Other;

                // ── 11: Latvian — complex f-based rules, Other is safe ──────────────
                case 11:
                    return PluralCategory.Other;

                // ── 12: Romanian — v!=0 → always Few ────────────────────────────────
                case 12:
                    return PluralCategory.Few;

                // ── 13: Russian/Ukrainian/Belarusian — one/few/many require v=0 ─────
                case 13:
                    return PluralCategory.Other;

                // ── 14: Breton — uses n% for integers, Other for decimals ───────────
                case 14:
                    return PluralCategory.Other;

                // ── 15: Welsh — exact n values, Other for decimals ───────────────────
                case 15:
                    return PluralCategory.Other;

                // ── 16: French — one requires v=0; many requires v=0 → decimals Other
                case 16:
                    return PluralCategory.Other;

                // ── 17: Irish — exact n values, Other for decimals ───────────────────
                case 17:
                    return PluralCategory.Other;

                // ── 18: Scottish Gaelic — exact n values, Other for decimals ─────────
                case 18:
                    return PluralCategory.Other;

                // ── 19: Manx — uses n% for integers, Other for decimals ─────────────
                case 19:
                    return PluralCategory.Other;

                // ── 20: Icelandic/Macedonian — complex t/f rules, Other is safe ─────
                case 20:
                    return PluralCategory.Other;

                // ── 21: Cornish — exact values, Other for decimals ───────────────────
                case 21:
                    return PluralCategory.Other;

                // ── 22: Lithuanian — complex f rules, Other is safe ──────────────────
                case 22:
                    return PluralCategory.Other;

                // ── 23: Maltese — exact values + n%100, Other for decimals ──────────
                case 23:
                    return PluralCategory.Other;

                // ── 24: Polish — one/few/many require v=0 → decimals Other ──────────
                case 24:
                    return PluralCategory.Other;

                // ── 25: Portuguese BR — one requires v=0 → decimals Other ───────────
                case 25:
                    return PluralCategory.Other;

                // ── 26: Samogitian — complex f rules, Other is safe ─────────────────
                case 26:
                    return PluralCategory.Other;

                // ── 27: Tachelhit — one: i=0 or n=1; few: n in 2..10 ────────────────
                case 27:
                    if (op.i == 0 || (op.i == 1 && op.f == 0))
                        return PluralCategory.One;
                    if (op.f == 0 && op.i >= 2 && op.i <= 10)
                        return PluralCategory.Few;
                    return PluralCategory.Other;

                // ── 28: Tamazight — exact ranges, Other for decimals ────────────────
                case 28:
                    return PluralCategory.Other;

                default:
                    return PluralCategory.Other;
            }
        }
        #endregion

        #region Ordinal Rule Dispatch
        /// <summary>
        /// Applies an ordinal plural rule (identified by index from <see cref="LookupOrdinalRule"/>)
        /// to the given integer count. Returns the matching <see cref="PluralCategory"/>.
        /// </summary>
        internal static PluralCategory ApplyOrdinalRule(byte rule, int n)
        {
            // CLDR ordinal rules assume non-negative operands.
            if (n < 0) n = (n == int.MinValue) ? int.MaxValue : -n;

            switch (rule)
            {
                // ── 0: always Other ──────────────────────────────────────────────────
                case 0:
                    return PluralCategory.Other;

                // ── 1: n==1→One; else Other ──────────────────────────────────────────
                case 1:
                    return n == 1 ? PluralCategory.One : PluralCategory.Other;

                // ── 2: Italian — n∈{8,11,80,800}→Many; else Other ───────────────────
                case 2:
                    if (n == 8 || n == 11 || n == 80 || n == 800)
                        return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 3: Marathi — n==1→One; n∈{2,3}→Two; n==4→Few; else Other ────────
                case 3:
                    if (n == 1) return PluralCategory.One;
                    if (n == 2 || n == 3) return PluralCategory.Two;
                    if (n == 4) return PluralCategory.Few;
                    return PluralCategory.Other;

                // ── 4: Bengali — n∈{1,5,7,8,9,10}→One; n∈{2,3}→Two; n==4→Few; n==6→Many
                case 4:
                    if (n == 1 || n == 5 || (n >= 7 && n <= 10))
                        return PluralCategory.One;
                    if (n == 2 || n == 3) return PluralCategory.Two;
                    if (n == 4) return PluralCategory.Few;
                    if (n == 6) return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 5: Hindi/Gujarati — n==1→One; n∈{2,3}→Two; n==4→Few; n==6→Many ──
                case 5:
                    if (n == 1) return PluralCategory.One;
                    if (n == 2 || n == 3) return PluralCategory.Two;
                    if (n == 4) return PluralCategory.Few;
                    if (n == 6) return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 6: Ligurian — n∈{8,11,80..89,800..899}→Many; else Other ─────────
                case 6:
                    if (n == 8 || n == 11)
                        return PluralCategory.Many;
                    if (n >= 80 && n <= 89)
                        return PluralCategory.Many;
                    if (n >= 800 && n <= 899)
                        return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 7: Azerbaijani ───────────────────────────────────────────────────
                case 7:
                {
                    int mod10   = n % 10;
                    int mod100  = n % 100;
                    int mod1000 = n % 1000;
                    if (mod10 == 1 || mod10 == 2 || mod10 == 5 || mod10 == 7 || mod10 == 8 ||
                        mod100 == 20 || mod100 == 50 || mod100 == 70 || mod100 == 80)
                        return PluralCategory.One;
                    if (mod10 == 3 || mod10 == 4 ||
                        mod1000 == 100 || mod1000 == 200 || mod1000 == 300 || mod1000 == 400 ||
                        mod1000 == 500 || mod1000 == 600 || mod1000 == 700 || mod1000 == 800 ||
                        mod1000 == 900)
                        return PluralCategory.Few;
                    if (n == 0 || mod10 == 6 || mod100 == 40 || mod100 == 60 || mod100 == 90)
                        return PluralCategory.Many;
                    return PluralCategory.Other;
                }

                // ── 8: Belarusian — n%10∈{2,3} && n%100∉{12,13}→Few; else Other ────
                case 8:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if ((mod10 == 2 || mod10 == 3) && mod100 != 12 && mod100 != 13)
                        return PluralCategory.Few;
                    return PluralCategory.Other;
                }

                // ── 9: Blo — n==0→Zero; n==1→One; n∈{2..6}→Few; else Other ─────────
                case 9:
                    if (n == 0) return PluralCategory.Zero;
                    if (n == 1) return PluralCategory.One;
                    if (n >= 2 && n <= 6) return PluralCategory.Few;
                    return PluralCategory.Other;

                // ── 10: Catalan — n∈{1,3}→One; n==2→Two; n==4→Few; else Other ───────
                case 10:
                    if (n == 1 || n == 3) return PluralCategory.One;
                    if (n == 2) return PluralCategory.Two;
                    if (n == 4) return PluralCategory.Few;
                    return PluralCategory.Other;

                // ── 11: Welsh — n∈{0,7,8,9}→Zero; n==1→One; n==2→Two; n∈{3,4}→Few; n∈{5,6}→Many
                case 11:
                    if (n == 0 || n == 7 || n == 8 || n == 9) return PluralCategory.Zero;
                    if (n == 1) return PluralCategory.One;
                    if (n == 2) return PluralCategory.Two;
                    if (n == 3 || n == 4) return PluralCategory.Few;
                    if (n == 5 || n == 6) return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 12: English — n%10==1&&n%100!=11→One; n%10==2&&n%100!=12→Two;
                //                  n%10==3&&n%100!=13→Few; else Other
                case 12:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 == 1 && mod100 != 11) return PluralCategory.One;
                    if (mod10 == 2 && mod100 != 12) return PluralCategory.Two;
                    if (mod10 == 3 && mod100 != 13) return PluralCategory.Few;
                    return PluralCategory.Other;
                }

                // ── 13: Scottish Gaelic — n∈{1,11}→One; n∈{2,12}→Two; n∈{3,13}→Few ─
                case 13:
                    if (n == 1 || n == 11) return PluralCategory.One;
                    if (n == 2 || n == 12) return PluralCategory.Two;
                    if (n == 3 || n == 13) return PluralCategory.Few;
                    return PluralCategory.Other;

                // ── 14: Hungarian — n∈{1,5}→One; else Other ─────────────────────────
                case 14:
                    return (n == 1 || n == 5) ? PluralCategory.One : PluralCategory.Other;

                // ── 15: Georgian — n==1→One; n==0||n%100∈{2..20,40,60,80}→Many ─────
                case 15:
                {
                    if (n == 1) return PluralCategory.One;
                    if (n == 0) return PluralCategory.Many;
                    int mod100 = n % 100;
                    if ((mod100 >= 2 && mod100 <= 20) || mod100 == 40 || mod100 == 60 || mod100 == 80)
                        return PluralCategory.Many;
                    return PluralCategory.Other;
                }

                // ── 16: Kazakh — n%10∈{6,9} || (n%10==0&&n!=0)→Many; else Other ────
                case 16:
                {
                    int mod10 = n % 10;
                    if (mod10 == 6 || mod10 == 9 || (mod10 == 0 && n != 0))
                        return PluralCategory.Many;
                    return PluralCategory.Other;
                }

                // ── 17: Cornish — n∈{1..4}||n%100∈{1..4,21..24,41..44,61..64,81..84}→One;
                //                  n==5||n%100==5→Many; else Other
                case 17:
                {
                    if (n >= 1 && n <= 4) return PluralCategory.One;
                    int mod100 = n % 100;
                    if ((mod100 >= 1  && mod100 <= 4)  || (mod100 >= 21 && mod100 <= 24) ||
                        (mod100 >= 41 && mod100 <= 44) || (mod100 >= 61 && mod100 <= 64) ||
                        (mod100 >= 81 && mod100 <= 84))
                        return PluralCategory.One;
                    if (n == 5 || mod100 == 5)
                        return PluralCategory.Many;
                    return PluralCategory.Other;
                }

                // ── 18: Macedonian — n%10==1&&n%100!=11→One; n%10==2&&n%100!=12→Two;
                //                     n%10∈{7,8}&&n%100∉{17,18}→Many; else Other
                case 18:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 == 1 && mod100 != 11) return PluralCategory.One;
                    if (mod10 == 2 && mod100 != 12) return PluralCategory.Two;
                    if ((mod10 == 7 || mod10 == 8) && mod100 != 17 && mod100 != 18)
                        return PluralCategory.Many;
                    return PluralCategory.Other;
                }

                // ── 19: Nepali — n∈{1..4}→One; else Other ──────────────────────────
                case 19:
                    return (n >= 1 && n <= 4) ? PluralCategory.One : PluralCategory.Other;

                // ── 20: Odia — n∈{1,5,7,8,9}→One; n∈{2,3}→Two; n==4→Few; n==6→Many ─
                case 20:
                    if (n == 1 || n == 5 || (n >= 7 && n <= 9))
                        return PluralCategory.One;
                    if (n == 2 || n == 3) return PluralCategory.Two;
                    if (n == 4) return PluralCategory.Few;
                    if (n == 6) return PluralCategory.Many;
                    return PluralCategory.Other;

                // ── 21: Albanian — n==1→One; n%10==4&&n%100!=14→Many; else Other ────
                case 21:
                {
                    if (n == 1) return PluralCategory.One;
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 == 4 && mod100 != 14) return PluralCategory.Many;
                    return PluralCategory.Other;
                }

                // ── 22: Swedish — n%10∈{1,2}&&n%100∉{11,12}→One; else Other ────────
                case 22:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if ((mod10 == 1 || mod10 == 2) && mod100 != 11 && mod100 != 12)
                        return PluralCategory.One;
                    return PluralCategory.Other;
                }

                // ── 23: Turkmen — n%10∈{6,9}||n==10→Few; else Other ─────────────────
                case 23:
                {
                    int mod10 = n % 10;
                    if (mod10 == 6 || mod10 == 9 || n == 10)
                        return PluralCategory.Few;
                    return PluralCategory.Other;
                }

                // ── 24: Ukrainian — n%10==3&&n%100!=13→Few; else Other ──────────────
                case 24:
                {
                    int mod10  = n % 10;
                    int mod100 = n % 100;
                    if (mod10 == 3 && mod100 != 13) return PluralCategory.Few;
                    return PluralCategory.Other;
                }

                default:
                    return PluralCategory.Other;
            }
        }
        #endregion

        #region Locale Normalization Helpers
        /// <summary>
        /// Swaps the first occurrence of <c>_</c> with <c>-</c> or vice-versa.
        /// Returns <c>null</c> if the input contains neither separator.
        /// Allocation-free for codes that do not match; allocates one string when a swap occurs.
        /// </summary>
        static string SwapSeparator(string code)
        {
            for (int i = 0; i < code.Length; i++)
            {
                char c = code[i];
                if (c == '_')
                {
                    char[] chars = code.ToCharArray();
                    chars[i] = '-';
                    return new string(chars);
                }
                if (c == '-')
                {
                    char[] chars = code.ToCharArray();
                    chars[i] = '_';
                    return new string(chars);
                }
            }
            return null;
        }

        /// <summary>
        /// Returns the language subtag (text before the first <c>-</c> or <c>_</c>).
        /// Returns <c>null</c> if the code contains no separator (already a subtag).
        /// </summary>
        static string LanguageSubtag(string code)
        {
            for (int i = 0; i < code.Length; i++)
            {
                char c = code[i];
                if (c == '-' || c == '_')
                    return code.Substring(0, i);
            }
            return null;
        }
        #endregion
    }
}
