using NUnit.Framework;

namespace GameScript.Tests
{
    public class TextResolutionParamsTests
    {
        [Test]
        public void Default_IsZeroInitSafe()
        {
            var parms = default(TextResolutionParams);
            Assert.IsNull(parms.GenderOverride);
            Assert.IsFalse(parms.Plural.HasValue);
            Assert.IsNull(parms.Args);
        }

        // PluralArg
        [Test]
        public void PluralArg_DefaultsToCardinal()
        {
            var pa = new PluralArg("count", 5);
            Assert.AreEqual("count", pa.Name);
            Assert.AreEqual(5, pa.Value);
            Assert.AreEqual(PluralType.Cardinal, pa.Type);
        }

        [Test]
        public void PluralArg_ExplicitOrdinal()
        {
            var pa = new PluralArg("rank", 3, PluralType.Ordinal);
            Assert.AreEqual(PluralType.Ordinal, pa.Type);
            Assert.AreEqual(3, pa.Value);
        }

        [Test]
        public void PluralArg_ZeroInit_IsCardinal()
        {
            var pa = default(PluralArg);
            Assert.AreEqual(PluralType.Cardinal, pa.Type);
            Assert.AreEqual(0, pa.Value);
            Assert.IsNull(pa.Name);
        }

        // Arg factory methods
        [Test]
        public void Arg_String_SetsCorrectFields()
        {
            var a = Arg.String("player", "Aria");
            Assert.AreEqual("player", a.Name);
            Assert.AreEqual(ArgType.String, a.Type);
            Assert.AreEqual("Aria", a.StringValue);
        }

        [Test]
        public void Arg_Int_SetsCorrectFields()
        {
            var a = Arg.Int("score", 1250000);
            Assert.AreEqual(ArgType.Int, a.Type);
            Assert.AreEqual(1250000, a.NumericValue);
        }

        [Test]
        public void Arg_Decimal_SetsCorrectFields()
        {
            var a = Arg.Decimal("temp", 365, 1);
            Assert.AreEqual(ArgType.Decimal, a.Type);
            Assert.AreEqual(365, a.NumericValue);
            Assert.AreEqual(1, a.Precision);
        }

        [Test]
        public void Arg_Percent_SetsCorrectFields()
        {
            var a = Arg.Percent("acc", 955, 1);
            Assert.AreEqual(ArgType.Percent, a.Type);
            Assert.AreEqual(955, a.NumericValue);
            Assert.AreEqual(1, a.Precision);
        }

        [Test]
        public void Arg_Currency_SetsCorrectFields()
        {
            var a = Arg.Currency("price", 1999, "USD");
            Assert.AreEqual(ArgType.Currency, a.Type);
            Assert.AreEqual(1999, a.NumericValue);
            Assert.AreEqual("USD", a.CurrencyCode);
        }

        [Test]
        public void Arg_RawInt_SetsCorrectFields()
        {
            var a = Arg.RawInt("id", 90210);
            Assert.AreEqual(ArgType.RawInt, a.Type);
            Assert.AreEqual(90210, a.NumericValue);
        }

        [Test]
        public void Arg_Default_IsStringWithNulls()
        {
            var a = default(Arg);
            Assert.AreEqual(ArgType.String, a.Type);
            Assert.IsNull(a.Name);
            Assert.IsNull(a.StringValue);
        }
    }
}
