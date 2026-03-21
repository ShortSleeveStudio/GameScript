using System;
using System.Collections.Generic;
using System.Globalization;

namespace GameScript
{
    /// <summary>
    /// ISO 4217 currency utilities for locale-aware currency formatting.
    /// Provides minor unit digit counts and currency symbols.
    /// </summary>
    internal static class Iso4217
    {
        // Minor unit digits (decimal places) per ISO 4217 currency code.
        // Only currencies that differ from the default of 2 are listed.
        static readonly Dictionary<string, int> s_MinorUnitOverrides =
            new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            // 0 decimal places
            { "BIF", 0 }, { "BYR", 0 }, { "CLP", 0 }, { "DJF", 0 },
            { "GNF", 0 }, { "ISK", 0 }, { "JPY", 0 }, { "KMF", 0 },
            { "KRW", 0 }, { "PYG", 0 }, { "RWF", 0 }, { "UGX", 0 },
            { "UYI", 0 }, { "VND", 0 }, { "VUV", 0 }, { "XAF", 0 },
            { "XOF", 0 }, { "XPF", 0 },

            // 3 decimal places
            { "BHD", 3 }, { "IQD", 3 }, { "JOD", 3 }, { "KWD", 3 },
            { "LYD", 3 }, { "OMR", 3 }, { "TND", 3 },

            // 4 decimal places
            { "CLF", 4 }, { "UYW", 4 },
        };

        /// <summary>
        /// Returns the number of minor unit digits (decimal places) for the given ISO 4217
        /// currency code. Defaults to 2 for unknown codes (the most common case).
        /// </summary>
        /// <param name="currencyCode">ISO 4217 code (e.g., "USD", "JPY", "KWD").</param>
        /// <returns>Number of decimal places (0, 2, 3, or 4).</returns>
        internal static int GetMinorUnitDigits(string currencyCode)
        {
            if (string.IsNullOrEmpty(currencyCode))
                return 2;

            return s_MinorUnitOverrides.TryGetValue(currencyCode, out int digits) ? digits : 2;
        }

        /// <summary>
        /// Returns the currency symbol for the given ISO 4217 code and culture.
        /// Falls back to the code itself (e.g., "USD") if no symbol is available.
        /// </summary>
        /// <param name="currencyCode">ISO 4217 code (e.g., "USD", "EUR").</param>
        /// <param name="culture">The culture to use for symbol resolution.</param>
        /// <returns>The currency symbol string.</returns>
        internal static string GetSymbol(string currencyCode, CultureInfo culture)
        {
            if (string.IsNullOrEmpty(currencyCode))
                return "";

            // If the culture's own currency matches, use its native symbol
            try
            {
                RegionInfo region = new RegionInfo(culture.Name);
                if (string.Equals(region.ISOCurrencySymbol, currencyCode, StringComparison.OrdinalIgnoreCase))
                    return culture.NumberFormat.CurrencySymbol;
            }
            catch
            {
                // InvariantCulture or unknown culture — fall through
            }

            // For foreign currencies, try to find a culture that uses this currency
            // to get the canonical symbol. Common cases handled inline for performance.
            switch (currencyCode.ToUpperInvariant())
            {
                case "USD": return "$";
                case "EUR": return "€";
                case "GBP": return "£";
                case "JPY": return "¥";
                case "CNY": return "¥";
                case "KRW": return "₩";
                case "INR": return "₹";
                case "RUB": return "₽";
                case "BRL": return "R$";
                case "TRY": return "₺";
                case "THB": return "฿";
                case "PLN": return "zł";
                case "SEK": return "kr";
                case "NOK": return "kr";
                case "DKK": return "kr";
                case "CHF": return "CHF";
                case "CAD": return "CA$";
                case "AUD": return "A$";
                case "NZD": return "NZ$";
                case "MXN": return "MX$";
                case "SGD": return "S$";
                case "HKD": return "HK$";
                case "TWD": return "NT$";
                default:    return currencyCode;
            }
        }
    }
}
