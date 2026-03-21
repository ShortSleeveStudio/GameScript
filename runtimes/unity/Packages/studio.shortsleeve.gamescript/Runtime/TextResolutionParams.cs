namespace GameScript
{
    /// <summary>
    /// Selects whether CLDR cardinal or ordinal plural rules are applied.
    /// </summary>
    public enum PluralType : byte
    {
        /// <summary>Cardinal ("5 items"). Default.</summary>
        Cardinal = 0,

        /// <summary>Ordinal ("3rd place").</summary>
        Ordinal = 1,
    }

    /// <summary>
    /// Determines how an <see cref="Arg"/> value is formatted during template substitution.
    /// </summary>
    public enum ArgType : byte
    {
        /// <summary>Plain string substitution.</summary>
        String = 0,

        /// <summary>Locale-aware integer with grouping separators (e.g., "1,000").</summary>
        Int,

        /// <summary>
        /// Locale-aware decimal (e.g., "3.14" vs "3,14").
        /// Value is in minor units; <see cref="Arg.Precision"/> controls decimal places.
        /// </summary>
        Decimal,

        /// <summary>
        /// Locale-aware percentage (e.g., "15%" vs "15 %").
        /// Value is the percentage × 10^Precision (e.g., value=155, precision=1 → "15.5%").
        /// </summary>
        Percent,

        /// <summary>
        /// Locale-aware currency (e.g., "$19.99" vs "19,99 €").
        /// Value is in minor units; decimal places come from ISO 4217 via <see cref="Arg.CurrencyCode"/>.
        /// </summary>
        Currency,

        /// <summary>Raw integer string with no formatting (e.g., "1000").</summary>
        RawInt,
    }

    /// <summary>
    /// Parameters controlling how a localization entry's text is resolved.
    /// Zero-initializable — safe to pass <c>default</c> everywhere.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <b>GenderOverride</b>: when <c>null</c> the runner auto-resolves gender from the snapshot
    /// (subject actor's grammatical gender, or the localization's own gender override flag).
    /// </para>
    /// <para>
    /// <b>Plural</b>: when <c>null</c> the runner defaults to <see cref="PluralCategory.Other"/>.
    /// When set, the named integer value drives CLDR plural category selection and is substituted
    /// into template placeholders with locale-aware integer grouping.
    /// </para>
    /// <para>
    /// <b>Args</b>: named typed substitutions applied to the resolved template text.
    /// These never affect form (gender / plural) selection. Each arg carries an
    /// <see cref="ArgType"/> that controls locale-aware formatting during substitution.
    /// </para>
    /// </remarks>
    public struct TextResolutionParams
    {
        /// <summary>
        /// Explicit gender to use for variant selection.
        /// <c>null</c> means auto-resolve from the snapshot.
        /// </summary>
        public GenderCategory? GenderOverride;

        /// <summary>
        /// Named integer that drives plural-category selection and template substitution.
        /// <c>null</c> means use <see cref="PluralCategory.Other"/> with no numeric substitution.
        /// </summary>
        public PluralArg? Plural;

        /// <summary>
        /// Named typed substitution arguments. Applied to the template text after variant
        /// selection. Never affect form selection. Use static factory methods on <see cref="Arg"/>
        /// to create typed arguments (string, int, decimal, percent, currency, raw int).
        /// </summary>
        public Arg[] Args;
    }

    /// <summary>
    /// A named numeric argument that drives plural-category selection AND template substitution.
    /// The <see cref="Type"/> field selects cardinal (default) or ordinal CLDR rules.
    /// <para>
    /// For integers (Precision=0): the value is substituted with locale-aware integer grouping.
    /// For decimals (Precision&gt;0): the represented number is <c>Value / 10^Precision</c>,
    /// substituted with locale-aware decimal formatting. Full CLDR operands (i, v, w, f, t) are
    /// derived from Value and Precision for correct plural category selection.
    /// </para>
    /// </summary>
    public readonly struct PluralArg
    {
        /// <summary>The placeholder name used in templates, e.g. <c>"count"</c>.</summary>
        public readonly string Name;

        /// <summary>
        /// The numeric value. When <see cref="Precision"/> is 0, this is the integer value.
        /// When Precision &gt; 0, this is the unscaled value (e.g., 150 with Precision=1 represents 15.0).
        /// </summary>
        public readonly long Value;

        /// <summary>
        /// Number of decimal places. 0 = integer (default, zero-init safe).
        /// When &gt; 0, the represented number is <c>Value / 10^Precision</c> and full CLDR
        /// operands are used for plural category selection.
        /// </summary>
        public readonly int Precision;

        /// <summary>
        /// Selects cardinal or ordinal CLDR plural rules.
        /// Defaults to <see cref="PluralType.Cardinal"/> (zero-init safe).
        /// </summary>
        public readonly PluralType Type;

        /// <summary>
        /// Creates a cardinal integer <see cref="PluralArg"/>.
        /// </summary>
        /// <param name="name">Placeholder name used in templates.</param>
        /// <param name="value">Integer value for plural resolution and substitution.</param>
        public PluralArg(string name, int value)
        {
            Name = name;
            Value = value;
            Precision = 0;
            Type = PluralType.Cardinal;
        }

        /// <summary>
        /// Creates an integer <see cref="PluralArg"/> with an explicit plural type.
        /// </summary>
        /// <param name="name">Placeholder name used in templates.</param>
        /// <param name="value">Integer value for plural resolution and substitution.</param>
        /// <param name="type">Cardinal or ordinal rule selection.</param>
        public PluralArg(string name, int value, PluralType type)
        {
            Name = name;
            Value = value;
            Precision = 0;
            Type = type;
        }

        /// <summary>
        /// Creates a cardinal decimal <see cref="PluralArg"/>.
        /// The represented number is <c>value / 10^precision</c>.
        /// </summary>
        /// <param name="name">Placeholder name used in templates.</param>
        /// <param name="value">Unscaled value (e.g., 150 for 15.0 with precision=1).</param>
        /// <param name="precision">Number of decimal places.</param>
        public PluralArg(string name, long value, int precision)
        {
            Name = name;
            Value = value;
            Precision = precision;
            Type = PluralType.Cardinal;
        }

        /// <summary>
        /// Creates a decimal <see cref="PluralArg"/> with an explicit plural type.
        /// The represented number is <c>value / 10^precision</c>.
        /// </summary>
        /// <param name="name">Placeholder name used in templates.</param>
        /// <param name="value">Unscaled value (e.g., 150 for 15.0 with precision=1).</param>
        /// <param name="precision">Number of decimal places.</param>
        /// <param name="type">Cardinal or ordinal rule selection.</param>
        public PluralArg(string name, long value, int precision, PluralType type)
        {
            Name = name;
            Value = value;
            Precision = precision;
            Type = type;
        }
    }

    /// <summary>
    /// A named typed substitution argument. Affects template output only — never form selection.
    /// Use the static factory methods to create arguments of the desired type.
    /// </summary>
    public readonly struct Arg
    {
        /// <summary>The placeholder name used in templates, e.g. <c>"player"</c>.</summary>
        public readonly string Name;

        /// <summary>Determines how the value is formatted during substitution.</summary>
        public readonly ArgType Type;

        /// <summary>String value. Used when <see cref="Type"/> is <see cref="ArgType.String"/>.</summary>
        public readonly string StringValue;

        /// <summary>
        /// Numeric value. Interpretation depends on <see cref="Type"/>:
        /// <see cref="ArgType.Int"/>/<see cref="ArgType.RawInt"/>: the integer value.
        /// <see cref="ArgType.Decimal"/>/<see cref="ArgType.Percent"/>: value in minor units
        /// (e.g., 314 with precision 2 = 3.14).
        /// <see cref="ArgType.Currency"/>: value in minor currency units
        /// (e.g., 1999 for $19.99 USD).
        /// </summary>
        public readonly long NumericValue;

        /// <summary>
        /// Number of decimal places for <see cref="ArgType.Decimal"/> and
        /// <see cref="ArgType.Percent"/>. Ignored for other types.
        /// For <see cref="ArgType.Currency"/>, decimal places come from ISO 4217.
        /// </summary>
        public readonly int Precision;

        /// <summary>
        /// ISO 4217 currency code (e.g., "USD", "EUR", "JPY").
        /// Only used when <see cref="Type"/> is <see cref="ArgType.Currency"/>.
        /// </summary>
        public readonly string CurrencyCode;

        Arg(string name, ArgType type, string stringValue, long numericValue, int precision, string currencyCode)
        {
            Name = name;
            Type = type;
            StringValue = stringValue;
            NumericValue = numericValue;
            Precision = precision;
            CurrencyCode = currencyCode;
        }

        /// <summary>Creates a plain string substitution argument.</summary>
        /// <param name="name">Placeholder name in the template.</param>
        /// <param name="value">String value to substitute.</param>
        public static Arg String(string name, string value)
            => new Arg(name, ArgType.String, value, 0, 0, null);

        /// <summary>Creates a locale-aware integer argument with grouping separators (e.g., "1,000").</summary>
        /// <param name="name">Placeholder name in the template.</param>
        /// <param name="value">Integer value.</param>
        public static Arg Int(string name, long value)
            => new Arg(name, ArgType.Int, null, value, 0, null);

        /// <summary>
        /// Creates a locale-aware decimal argument (e.g., 314 with precision 2 → "3.14").
        /// </summary>
        /// <param name="name">Placeholder name in the template.</param>
        /// <param name="value">Value in minor units (e.g., 314 for 3.14 with precision 2).</param>
        /// <param name="precision">Number of decimal places.</param>
        public static Arg Decimal(string name, long value, int precision)
            => new Arg(name, ArgType.Decimal, null, value, precision, null);

        /// <summary>
        /// Creates a locale-aware percentage argument (e.g., 155 with precision 1 → "15.5%").
        /// The value represents the percentage multiplied by 10^precision.
        /// </summary>
        /// <param name="name">Placeholder name in the template.</param>
        /// <param name="value">Percentage value × 10^precision (e.g., 155 for 15.5%).</param>
        /// <param name="precision">Number of decimal places in the percentage display.</param>
        public static Arg Percent(string name, long value, int precision)
            => new Arg(name, ArgType.Percent, null, value, precision, null);

        /// <summary>
        /// Creates a locale-aware currency argument (e.g., 1999 with "USD" → "$19.99").
        /// Decimal places are determined by ISO 4217 for the given currency code.
        /// </summary>
        /// <param name="name">Placeholder name in the template.</param>
        /// <param name="minorUnits">Value in minor currency units (e.g., 1999 cents for $19.99).</param>
        /// <param name="currencyCode">ISO 4217 currency code (e.g., "USD", "EUR", "JPY").</param>
        public static Arg Currency(string name, long minorUnits, string currencyCode)
            => new Arg(name, ArgType.Currency, null, minorUnits, 0, currencyCode);

        /// <summary>Creates a raw integer argument with no formatting (e.g., "1000").</summary>
        /// <param name="name">Placeholder name in the template.</param>
        /// <param name="value">Integer value, displayed as-is with no grouping separators.</param>
        public static Arg RawInt(string name, long value)
            => new Arg(name, ArgType.RawInt, null, value, 0, null);
    }
}
