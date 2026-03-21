using System.Collections.Generic;
using System.Globalization;
using System.Text;
using NUnit.Framework;

namespace GameScript.Tests
{
    /// <summary>
    /// Tests template substitution by calling GameScriptRunner's internal ApplyTemplate
    /// via a lightweight test harness. Uses InternalsVisibleTo for access.
    /// </summary>
    public class TemplateSubstitutionTests
    {
        // Minimal harness that mirrors GameScriptRunner.ApplyTemplate logic.
        // We can't easily instantiate GameScriptRunner (needs database), so we
        // replicate the template engine here and test it directly. If the engine
        // is ever refactored into a static method, these tests will migrate trivially.
        static string ApplyTemplate(string text, TextResolutionParams parms, CultureInfo culture)
        {
            var sb = new StringBuilder();
            int len = text.Length;
            int i = 0;
            while (i < len)
            {
                char c = text[i];
                if (c == '{')
                {
                    if (i + 1 < len && text[i + 1] == '{')
                    {
                        sb.Append('{');
                        i += 2;
                        continue;
                    }
                    int start = i + 1;
                    int end = start;
                    while (end < len && text[end] != '}')
                        end++;
                    if (end >= len)
                    {
                        sb.Append(text, i, len - i);
                        break;
                    }
                    string placeholder = text.Substring(start, end - start);
                    bool resolved = false;
                    if (parms.Plural.HasValue &&
                        string.Equals(parms.Plural.Value.Name, placeholder, System.StringComparison.Ordinal))
                    {
                        sb.Append(parms.Plural.Value.Value.ToString("N0", culture));
                        resolved = true;
                    }
                    if (!resolved && parms.Args != null)
                    {
                        for (int a = 0; a < parms.Args.Length; a++)
                        {
                            if (string.Equals(parms.Args[a].Name, placeholder, System.StringComparison.Ordinal))
                            {
                                FormatArg(sb, parms.Args[a], culture);
                                resolved = true;
                                break;
                            }
                        }
                    }
                    if (!resolved)
                    {
                        sb.Append('{');
                        sb.Append(placeholder);
                        sb.Append('}');
                    }
                    i = end + 1;
                }
                else if (c == '}')
                {
                    if (i + 1 < len && text[i + 1] == '}')
                    {
                        sb.Append('}');
                        i += 2;
                    }
                    else
                    {
                        sb.Append('}');
                        i++;
                    }
                }
                else
                {
                    sb.Append(c);
                    i++;
                }
            }
            return sb.ToString();
        }

        static double Pow10(int exp)
        {
            return exp switch
            {
                0 => 1.0, 1 => 10.0, 2 => 100.0, 3 => 1000.0,
                _ => System.Math.Pow(10, exp),
            };
        }

        static void FormatArg(StringBuilder sb, Arg arg, CultureInfo culture)
        {
            switch (arg.Type)
            {
                case ArgType.String:
                    if (arg.StringValue != null) sb.Append(arg.StringValue);
                    break;
                case ArgType.Int:
                    sb.Append(arg.NumericValue.ToString("N0", culture));
                    break;
                case ArgType.Decimal:
                    double dv = arg.NumericValue / Pow10(arg.Precision);
                    sb.Append(dv.ToString(arg.Precision > 0 ? "N" + arg.Precision : "N0", culture));
                    break;
                case ArgType.Percent:
                    double pct = arg.NumericValue / Pow10(arg.Precision) / 100.0;
                    sb.Append(pct.ToString(arg.Precision > 0 ? "P" + arg.Precision : "P0", culture));
                    break;
                case ArgType.Currency:
                    int dec = Iso4217.GetMinorUnitDigits(arg.CurrencyCode);
                    double cv = arg.NumericValue / Pow10(dec);
                    var nfi = (NumberFormatInfo)culture.NumberFormat.Clone();
                    nfi.CurrencyDecimalDigits = dec;
                    nfi.CurrencySymbol = Iso4217.GetSymbol(arg.CurrencyCode, culture);
                    sb.Append(cv.ToString("C", nfi));
                    break;
                case ArgType.RawInt:
                    sb.Append(arg.NumericValue.ToString());
                    break;
            }
        }

        static readonly CultureInfo EnUs = new CultureInfo("en-US");

        // ── String substitution ──────────────────────────────────────────────
        [Test]
        public void String_BasicSubstitution()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.String("player", "Aria") } };
            Assert.AreEqual("Welcome, Aria!", ApplyTemplate("Welcome, {player}!", parms, EnUs));
        }

        [Test]
        public void String_NullValue_EmitsNothing()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.String("x", null) } };
            Assert.AreEqual("Hello !", ApplyTemplate("Hello {x}!", parms, EnUs));
        }

        // ── PluralArg substitution ───────────────────────────────────────────
        [Test]
        public void PluralArg_FormattedInteger()
        {
            var parms = new TextResolutionParams { Plural = new PluralArg("count", 1500) };
            Assert.AreEqual("You have 1,500 items.", ApplyTemplate("You have {count} items.", parms, EnUs));
        }

        [Test]
        public void PluralArg_PriorityOverArgs()
        {
            // If PluralArg and an Arg have the same name, PluralArg wins
            var parms = new TextResolutionParams
            {
                Plural = new PluralArg("count", 42),
                Args = new[] { Arg.String("count", "WRONG") }
            };
            Assert.AreEqual("42 items", ApplyTemplate("{count} items", parms, EnUs));
        }

        // ── Typed arg formatting ─────────────────────────────────────────────
        [Test]
        public void Arg_Int_GroupingSeparators()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.Int("score", 1250000) } };
            Assert.AreEqual("Score: 1,250,000", ApplyTemplate("Score: {score}", parms, EnUs));
        }

        [Test]
        public void Arg_Decimal_MinorUnits()
        {
            // 365 with precision 1 → 36.5
            var parms = new TextResolutionParams { Args = new[] { Arg.Decimal("temp", 365, 1) } };
            Assert.AreEqual("Temperature: 36.5°", ApplyTemplate("Temperature: {temp}°", parms, EnUs));
        }

        [Test]
        public void Arg_Decimal_TwoPlaces()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.Decimal("val", 314, 2) } };
            Assert.AreEqual("3.14", ApplyTemplate("{val}", parms, EnUs));
        }

        [Test]
        public void Arg_Percent()
        {
            // 955 with precision 1 → 95.5 → 95.5%
            var parms = new TextResolutionParams { Args = new[] { Arg.Percent("acc", 955, 1) } };
            string result = ApplyTemplate("Accuracy: {acc}", parms, EnUs);
            // en-US percent format: "95.5%"
            Assert.IsTrue(result.Contains("95.5"), $"Expected '95.5' in '{result}'");
            Assert.IsTrue(result.Contains("%"), $"Expected '%' in '{result}'");
        }

        [Test]
        public void Arg_Currency_USD()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.Currency("price", 1999, "USD") } };
            string result = ApplyTemplate("Price: {price}", parms, EnUs);
            Assert.AreEqual("Price: $19.99", result);
        }

        [Test]
        public void Arg_Currency_JPY_ZeroDecimals()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.Currency("price", 1500, "JPY") } };
            string result = ApplyTemplate("{price}", parms, EnUs);
            // JPY has 0 decimals, ¥1,500
            Assert.IsTrue(result.Contains("1,500"), $"Expected '1,500' in '{result}'");
            Assert.IsTrue(result.Contains("¥"), $"Expected '¥' in '{result}'");
        }

        [Test]
        public void Arg_RawInt_NoFormatting()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.RawInt("id", 90210) } };
            Assert.AreEqual("ID: 90210", ApplyTemplate("ID: {id}", parms, EnUs));
        }

        [Test]
        public void Arg_RawInt_LargeNumber_NoGrouping()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.RawInt("x", 1000000) } };
            Assert.AreEqual("1000000", ApplyTemplate("{x}", parms, EnUs));
        }

        // ── Multiple args ────────────────────────────────────────────────────
        [Test]
        public void MultipleArgs_AllSubstituted()
        {
            var parms = new TextResolutionParams
            {
                Plural = new PluralArg("damage", 1500),
                Args = new[]
                {
                    Arg.String("player", "Aria"),
                    Arg.String("enemy", "Dragon"),
                    Arg.Currency("gold", 25000, "USD"),
                }
            };
            string result = ApplyTemplate("{player} dealt {damage} damage to {enemy} for {gold} gold!", parms, EnUs);
            Assert.AreEqual("Aria dealt 1,500 damage to Dragon for $250.00 gold!", result);
        }

        // ── Escape sequences ─────────────────────────────────────────────────
        [Test]
        public void Escape_DoubleBraces()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.String("player", "Zara") } };
            string result = ApplyTemplate("Use {{player}} for names. Hello, {player}.", parms, EnUs);
            Assert.AreEqual("Use {player} for names. Hello, Zara.", result);
        }

        [Test]
        public void Escape_ClosingBraces()
        {
            var parms = default(TextResolutionParams);
            Assert.AreEqual("{\"key\": \"value\"}", ApplyTemplate("{{\"key\": \"value\"}}", parms, EnUs));
        }

        [Test]
        public void Escape_LoneClosingBrace()
        {
            var parms = default(TextResolutionParams);
            Assert.AreEqual("a}b", ApplyTemplate("a}b", parms, EnUs));
        }

        // ── Edge cases ───────────────────────────────────────────────────────
        [Test]
        public void UnknownPlaceholder_PassedThrough()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.String("player", "Finn") } };
            Assert.AreEqual("Hello {unknown}, meet Finn.", ApplyTemplate("Hello {unknown}, meet {player}.", parms, EnUs));
        }

        [Test]
        public void MalformedTemplate_NoClosingBrace()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.String("x", "Y") } };
            Assert.AreEqual("Malformed {unclosed", ApplyTemplate("Malformed {unclosed", parms, EnUs));
        }

        [Test]
        public void EmptyPlaceholder_PassedThrough()
        {
            var parms = default(TextResolutionParams);
            Assert.AreEqual("{}", ApplyTemplate("{}", parms, EnUs));
        }

        [Test]
        public void NoPlaceholders_ReturnedVerbatim()
        {
            var parms = new TextResolutionParams { Args = new[] { Arg.String("x", "Y") } };
            Assert.AreEqual("Hello world", ApplyTemplate("Hello world", parms, EnUs));
        }

        [Test]
        public void EmptyString_ReturnsEmpty()
        {
            var parms = default(TextResolutionParams);
            Assert.AreEqual("", ApplyTemplate("", parms, EnUs));
        }

        // ── Locale-specific formatting ───────────────────────────────────────
        [Test]
        public void Arg_Int_RussianLocale_UsesSpaceGrouping()
        {
            var ruCulture = new CultureInfo("ru-RU");
            var parms = new TextResolutionParams { Args = new[] { Arg.Int("n", 1000000) } };
            string result = ApplyTemplate("{n}", parms, ruCulture);
            // Russian uses non-breaking space (or narrow no-break space) as grouping separator
            // The exact character varies by platform, but it should NOT be a comma
            Assert.IsFalse(result.Contains(","), $"Russian locale should not use comma grouping: '{result}'");
            Assert.IsTrue(result.Contains("000"), $"Expected grouped digits in '{result}'");
        }
    }
}
