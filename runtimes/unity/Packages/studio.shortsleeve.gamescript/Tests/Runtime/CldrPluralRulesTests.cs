using NUnit.Framework;

namespace GameScript.Tests
{
    public class CldrPluralRulesCardinalTests
    {
        // English: n==1 → One; else Other
        [TestCase("en", 0, PluralCategory.Other)]
        [TestCase("en", 1, PluralCategory.One)]
        [TestCase("en", 2, PluralCategory.Other)]
        [TestCase("en", 5, PluralCategory.Other)]
        [TestCase("en", 1000, PluralCategory.Other)]
        // Russian: mod10==1&&mod100!=11→One; mod10∈2..4&&mod100∉12..14→Few; else Many
        [TestCase("ru", 1, PluralCategory.One)]
        [TestCase("ru", 2, PluralCategory.Few)]
        [TestCase("ru", 3, PluralCategory.Few)]
        [TestCase("ru", 4, PluralCategory.Few)]
        [TestCase("ru", 5, PluralCategory.Many)]
        [TestCase("ru", 11, PluralCategory.Many)]
        [TestCase("ru", 12, PluralCategory.Many)]
        [TestCase("ru", 21, PluralCategory.One)]
        [TestCase("ru", 22, PluralCategory.Few)]
        [TestCase("ru", 100, PluralCategory.Many)]
        // Arabic: 0→Zero; 1→One; 2→Two; 3-10→Few; 11-99→Many; else Other
        [TestCase("ar", 0, PluralCategory.Zero)]
        [TestCase("ar", 1, PluralCategory.One)]
        [TestCase("ar", 2, PluralCategory.Two)]
        [TestCase("ar", 3, PluralCategory.Few)]
        [TestCase("ar", 10, PluralCategory.Few)]
        [TestCase("ar", 11, PluralCategory.Many)]
        [TestCase("ar", 99, PluralCategory.Many)]
        [TestCase("ar", 100, PluralCategory.Other)]
        // Japanese: always Other
        [TestCase("ja", 0, PluralCategory.Other)]
        [TestCase("ja", 1, PluralCategory.Other)]
        [TestCase("ja", 1000, PluralCategory.Other)]
        // Polish: 1→One; mod10∈2..4&&mod100∉12..14→Few; else Many
        [TestCase("pl", 1, PluralCategory.One)]
        [TestCase("pl", 2, PluralCategory.Few)]
        [TestCase("pl", 4, PluralCategory.Few)]
        [TestCase("pl", 5, PluralCategory.Many)]
        [TestCase("pl", 12, PluralCategory.Many)]
        [TestCase("pl", 22, PluralCategory.Few)]
        [TestCase("pl", 0, PluralCategory.Many)]
        // French: 0||1→One; n!=0&&n%1000000==0→Many; else Other
        [TestCase("fr", 0, PluralCategory.One)]
        [TestCase("fr", 1, PluralCategory.One)]
        [TestCase("fr", 2, PluralCategory.Other)]
        [TestCase("fr", 1000000, PluralCategory.Many)]
        public void Resolve_ReturnsCorrectCategory(string locale, int count, PluralCategory expected)
        {
            Assert.AreEqual(expected, CldrPluralRules.Resolve(locale, count));
        }

        // Locale normalization: underscore, hyphen, subtag fallback
        [TestCase("en_US", 1, PluralCategory.One)]
        [TestCase("en-US", 1, PluralCategory.One)]
        [TestCase("ru_RU", 21, PluralCategory.One)]
        [TestCase("pt-PT", 1, PluralCategory.One)]   // pt-PT has its own rule (Italian-style)
        [TestCase("pt-BR", 0, PluralCategory.One)]   // pt-BR falls back to "pt" (Brazilian)
        public void Resolve_LocaleNormalization(string locale, int count, PluralCategory expected)
        {
            Assert.AreEqual(expected, CldrPluralRules.Resolve(locale, count));
        }

        [Test]
        public void Resolve_NullLocale_ReturnsOther()
        {
            Assert.AreEqual(PluralCategory.Other, CldrPluralRules.Resolve(null, 1));
        }

        [Test]
        public void Resolve_EmptyLocale_ReturnsOther()
        {
            Assert.AreEqual(PluralCategory.Other, CldrPluralRules.Resolve("", 1));
        }

        [Test]
        public void Resolve_UnknownLocale_ReturnsOther()
        {
            Assert.AreEqual(PluralCategory.Other, CldrPluralRules.Resolve("xx-XX", 1));
        }

        // Negative counts use absolute value for category selection
        [TestCase("en", -1, PluralCategory.One)]
        [TestCase("en", -5, PluralCategory.Other)]
        [TestCase("ru", -21, PluralCategory.One)]
        [TestCase("ru", -2, PluralCategory.Few)]
        [TestCase("ru", -5, PluralCategory.Many)]
        public void Resolve_NegativeCount_UsesAbsoluteValue(string locale, int count, PluralCategory expected)
        {
            Assert.AreEqual(expected, CldrPluralRules.Resolve(locale, count));
        }

        // Cached rule index path produces same results as direct Resolve
        [TestCase("en", 0)]
        [TestCase("en", 1)]
        [TestCase("en", 5)]
        [TestCase("ru", 1)]
        [TestCase("ru", 2)]
        [TestCase("ru", 5)]
        [TestCase("ru", 21)]
        public void LookupAndApply_MatchesResolve(string locale, int count)
        {
            byte rule = CldrPluralRules.LookupCardinalRule(locale);
            PluralCategory fromCached = CldrPluralRules.ApplyRule(rule, count);
            PluralCategory fromDirect = CldrPluralRules.Resolve(locale, count);
            Assert.AreEqual(fromDirect, fromCached);
        }
    }

    public class CldrPluralRulesDecimalTests
    {
        // English: i=1 AND v=0 → One. Decimals (v>0) ALWAYS → Other.
        [TestCase("en", 10, 1, PluralCategory.Other)]    // 1.0 → Other (not One!)
        [TestCase("en", 100, 2, PluralCategory.Other)]   // 1.00 → Other
        [TestCase("en", 15, 1, PluralCategory.Other)]    // 1.5 → Other
        [TestCase("en", 20, 1, PluralCategory.Other)]    // 2.0 → Other
        [TestCase("en", 0, 1, PluralCategory.Other)]     // 0.0 → Other (not matching any rule)
        // French: i=0,1 AND v=0 → One. Decimals → Other.
        [TestCase("fr", 10, 1, PluralCategory.Other)]    // 1.0 → Other
        [TestCase("fr", 0, 1, PluralCategory.Other)]     // 0.0 → Other
        // Hindi (Rule 2): i=0 OR n=1 → One. 0.x → One (i=0). 1.0 → One (n=1, exact).
        [TestCase("hi", 5, 1, PluralCategory.One)]       // 0.5 → One (i=0)
        [TestCase("hi", 10, 1, PluralCategory.One)]      // 1.0 → One (exact 1)
        [TestCase("hi", 15, 1, PluralCategory.Other)]    // 1.5 → Other (i=1, not exact 1)
        [TestCase("hi", 20, 1, PluralCategory.Other)]    // 2.0 → Other
        [TestCase("hi", 0, 1, PluralCategory.One)]       // 0.0 → One (i=0)
        // Russian (Rule 13): one/few/many all require v=0. Decimals → Other.
        [TestCase("ru", 10, 1, PluralCategory.Other)]    // 1.0 → Other (not One)
        [TestCase("ru", 210, 1, PluralCategory.Other)]   // 21.0 → Other (not One)
        [TestCase("ru", 50, 1, PluralCategory.Other)]    // 5.0 → Other (not Many)
        // Romanian (Rule 12): v!=0 → always Few.
        [TestCase("ro", 10, 1, PluralCategory.Few)]      // 1.0 → Few
        [TestCase("ro", 250, 1, PluralCategory.Few)]     // 25.0 → Few
        [TestCase("ro", 1000, 2, PluralCategory.Few)]    // 10.00 → Few
        // Polish (Rule 24): one/few/many all require v=0. Decimals → Other.
        [TestCase("pl", 10, 1, PluralCategory.Other)]    // 1.0 → Other (not One)
        [TestCase("pl", 20, 1, PluralCategory.Other)]    // 2.0 → Other (not Few)
        // Portuguese BR (Rule 25): one requires v=0. Decimals → Other.
        [TestCase("pt", 10, 1, PluralCategory.Other)]    // 1.0 → Other
        [TestCase("pt", 0, 1, PluralCategory.Other)]     // 0.0 → Other (not One)
        // Integer path via long overload (precision=0) must match existing behavior
        [TestCase("en", 1, 0, PluralCategory.One)]
        [TestCase("en", 5, 0, PluralCategory.Other)]
        [TestCase("ru", 21, 0, PluralCategory.One)]
        [TestCase("ru", 5, 0, PluralCategory.Many)]
        public void Resolve_Decimal_ReturnsCorrectCategory(string locale, long value, int precision, PluralCategory expected)
        {
            Assert.AreEqual(expected, CldrPluralRules.Resolve(locale, value, precision));
        }

        [Test]
        public void DeriveOperands_Integer_HasZeroFractionFields()
        {
            // Integer (precision=0): v=w=f=t=0
            byte rule = CldrPluralRules.LookupCardinalRule("en");
            // 1 as integer → One
            Assert.AreEqual(PluralCategory.One, CldrPluralRules.ApplyRule(rule, 1L, 0));
            // 1 as decimal 1.0 → Other
            Assert.AreEqual(PluralCategory.Other, CldrPluralRules.ApplyRule(rule, 10L, 1));
        }

        [Test]
        public void DecimalPath_NegativeValue_UsesAbsolute()
        {
            // Negative decimals: -1.0 should behave like 1.0
            Assert.AreEqual(PluralCategory.Other, CldrPluralRules.Resolve("en", -10L, 1));
            Assert.AreEqual(PluralCategory.One, CldrPluralRules.Resolve("hi", -5L, 1));  // -0.5, i=0 → One
        }
    }

    public class CldrPluralRulesOrdinalTests
    {
        // English ordinal: mod10==1&&mod100!=11→One; mod10==2&&mod100!=12→Two;
        //                  mod10==3&&mod100!=13→Few; else Other
        [TestCase("en", 1, PluralCategory.One)]     // 1st
        [TestCase("en", 2, PluralCategory.Two)]      // 2nd
        [TestCase("en", 3, PluralCategory.Few)]      // 3rd
        [TestCase("en", 4, PluralCategory.Other)]    // 4th
        [TestCase("en", 11, PluralCategory.Other)]   // 11th
        [TestCase("en", 12, PluralCategory.Other)]   // 12th
        [TestCase("en", 13, PluralCategory.Other)]   // 13th
        [TestCase("en", 21, PluralCategory.One)]     // 21st
        [TestCase("en", 22, PluralCategory.Two)]     // 22nd
        [TestCase("en", 23, PluralCategory.Few)]     // 23rd
        [TestCase("en", 100, PluralCategory.Other)]  // 100th
        [TestCase("en", 101, PluralCategory.One)]    // 101st
        // Russian ordinal: always Other
        [TestCase("ru", 1, PluralCategory.Other)]
        [TestCase("ru", 2, PluralCategory.Other)]
        [TestCase("ru", 21, PluralCategory.Other)]
        // Japanese ordinal: always Other
        [TestCase("ja", 1, PluralCategory.Other)]
        // Swedish ordinal: mod10∈{1,2}&&mod100∉{11,12}→One; else Other
        [TestCase("sv", 1, PluralCategory.One)]
        [TestCase("sv", 2, PluralCategory.One)]
        [TestCase("sv", 3, PluralCategory.Other)]
        [TestCase("sv", 11, PluralCategory.Other)]
        [TestCase("sv", 12, PluralCategory.Other)]
        [TestCase("sv", 21, PluralCategory.One)]
        public void ResolveOrdinal_ReturnsCorrectCategory(string locale, int count, PluralCategory expected)
        {
            Assert.AreEqual(expected, CldrPluralRules.ResolveOrdinal(locale, count));
        }

        [TestCase("en_US", 1, PluralCategory.One)]
        [TestCase("en-GB", 2, PluralCategory.Two)]
        public void ResolveOrdinal_LocaleNormalization(string locale, int count, PluralCategory expected)
        {
            Assert.AreEqual(expected, CldrPluralRules.ResolveOrdinal(locale, count));
        }

        [TestCase("en", -1, PluralCategory.One)]
        [TestCase("en", -3, PluralCategory.Few)]
        public void ResolveOrdinal_NegativeCount_UsesAbsoluteValue(string locale, int count, PluralCategory expected)
        {
            Assert.AreEqual(expected, CldrPluralRules.ResolveOrdinal(locale, count));
        }

        [TestCase("en", 0)]
        [TestCase("en", 1)]
        [TestCase("en", 3)]
        [TestCase("en", 11)]
        public void LookupAndApplyOrdinal_MatchesResolveOrdinal(string locale, int count)
        {
            byte rule = CldrPluralRules.LookupOrdinalRule(locale);
            PluralCategory fromCached = CldrPluralRules.ApplyOrdinalRule(rule, count);
            PluralCategory fromDirect = CldrPluralRules.ResolveOrdinal(locale, count);
            Assert.AreEqual(fromDirect, fromCached);
        }
    }
}
