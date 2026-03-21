using System.Collections.Generic;

namespace GameScript
{
    /// <summary>
    /// Selects the best-matching <see cref="TextVariant"/> from a <see cref="Localization"/> entry
    /// for a given gender and plural category.
    /// </summary>
    /// <remarks>
    /// All methods are allocation-free and IL2CPP-safe. No LINQ is used.
    ///
    /// Selection uses a three-pass fallback scan:
    /// <list type="number">
    ///   <item><b>Exact</b> — variant.Plural == plural &amp;&amp; variant.Gender == gender</item>
    ///   <item><b>Gender fallback</b> — variant.Plural == plural &amp;&amp; variant.Gender == <see cref="GenderCategory.Other"/></item>
    ///   <item><b>Catch-all</b> — variant.Plural == <see cref="PluralCategory.Other"/> &amp;&amp; variant.Gender == <see cref="GenderCategory.Other"/></item>
    /// </list>
    /// Returns <c>null</c> if the localization has no variants or no variant matches the
    /// fallback chain. Note: returns the first match's text even if it is <c>null</c>.
    /// </remarks>
    public static class VariantResolver
    {
        /// <summary>
        /// Resolves the best-matching text for the given gender and plural category.
        /// </summary>
        /// <param name="localization">The localization entry containing variants.</param>
        /// <param name="gender">The desired gender category.</param>
        /// <param name="plural">The desired plural category.</param>
        /// <returns>
        /// The resolved text string, or <c>null</c> if no matching variant has text.
        /// </returns>
        public static string Resolve(Localization localization, GenderCategory gender, PluralCategory plural)
        {
            IList<TextVariant> variants = localization.Variants;
            if (variants == null)
                return null;

            int count = variants.Count;
            if (count == 0)
                return null;

            // Pass 1 — Exact: plural AND gender both match
            for (int i = 0; i < count; i++)
            {
                TextVariant v = variants[i];
                if (v.Plural == plural && v.Gender == gender)
                    return v.Text;
            }

            // Pass 2 — Gender fallback: plural matches, gender falls back to Other
            if (gender != GenderCategory.Other)
            {
                for (int i = 0; i < count; i++)
                {
                    TextVariant v = variants[i];
                    if (v.Plural == plural && v.Gender == GenderCategory.Other)
                        return v.Text;
                }
            }

            // Pass 3 — Catch-all: PluralCategory.Other AND GenderCategory.Other
            // Only needed when plural != Other. When plural IS Other, Pass 2 already
            // searched for (Other, Other) — which is the catch-all — so repeating is redundant.
            if (plural != PluralCategory.Other)
            {
                for (int i = 0; i < count; i++)
                {
                    TextVariant v = variants[i];
                    if (v.Plural == PluralCategory.Other && v.Gender == GenderCategory.Other)
                        return v.Text;
                }
            }

            return null;
        }
    }
}
