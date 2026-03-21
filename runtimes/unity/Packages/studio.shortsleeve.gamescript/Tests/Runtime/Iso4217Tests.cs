using System.Globalization;
using NUnit.Framework;

namespace GameScript.Tests
{
    public class Iso4217Tests
    {
        // Default is 2 decimal places
        [TestCase("USD", 2)]
        [TestCase("EUR", 2)]
        [TestCase("GBP", 2)]
        [TestCase("CNY", 2)]
        // 0 decimal places
        [TestCase("JPY", 0)]
        [TestCase("KRW", 0)]
        [TestCase("VND", 0)]
        // 3 decimal places
        [TestCase("KWD", 3)]
        [TestCase("BHD", 3)]
        [TestCase("OMR", 3)]
        // 4 decimal places
        [TestCase("CLF", 4)]
        // Unknown defaults to 2
        [TestCase("XYZ", 2)]
        public void GetMinorUnitDigits_ReturnsCorrectValue(string code, int expected)
        {
            Assert.AreEqual(expected, Iso4217.GetMinorUnitDigits(code));
        }

        [Test]
        public void GetMinorUnitDigits_NullCode_Returns2()
        {
            Assert.AreEqual(2, Iso4217.GetMinorUnitDigits(null));
        }

        [Test]
        public void GetMinorUnitDigits_EmptyCode_Returns2()
        {
            Assert.AreEqual(2, Iso4217.GetMinorUnitDigits(""));
        }

        [Test]
        public void GetMinorUnitDigits_CaseInsensitive()
        {
            Assert.AreEqual(0, Iso4217.GetMinorUnitDigits("jpy"));
            Assert.AreEqual(0, Iso4217.GetMinorUnitDigits("Jpy"));
        }

        // Symbol tests
        [TestCase("USD", "$")]
        [TestCase("EUR", "€")]
        [TestCase("GBP", "£")]
        [TestCase("JPY", "¥")]
        [TestCase("KRW", "₩")]
        public void GetSymbol_CommonCurrencies(string code, string expected)
        {
            // Use InvariantCulture so we always hit the fallback switch
            Assert.AreEqual(expected, Iso4217.GetSymbol(code, CultureInfo.InvariantCulture));
        }

        [Test]
        public void GetSymbol_NativeCulture_UsesNativeSymbol()
        {
            // en-US culture with USD → should use the culture's own currency symbol
            var enUs = new CultureInfo("en-US");
            string symbol = Iso4217.GetSymbol("USD", enUs);
            Assert.AreEqual(enUs.NumberFormat.CurrencySymbol, symbol);
        }

        [Test]
        public void GetSymbol_UnknownCode_ReturnsCode()
        {
            Assert.AreEqual("XYZ", Iso4217.GetSymbol("XYZ", CultureInfo.InvariantCulture));
        }

        [Test]
        public void GetSymbol_NullCode_ReturnsEmpty()
        {
            Assert.AreEqual("", Iso4217.GetSymbol(null, CultureInfo.InvariantCulture));
        }
    }
}
