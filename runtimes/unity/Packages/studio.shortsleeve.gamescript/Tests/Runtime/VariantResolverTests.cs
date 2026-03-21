using System.Collections.Generic;
using NUnit.Framework;

namespace GameScript.Tests
{
    public class VariantResolverTests
    {
        static Localization MakeLoc(params (PluralCategory p, GenderCategory g, string t)[] variants)
        {
            var loc = new Localization();
            var list = new List<TextVariant>();
            foreach (var (p, g, t) in variants)
            {
                list.Add(new TextVariant { Plural = p, Gender = g, Text = t });
            }
            loc.Variants = list;
            return loc;
        }

        [Test]
        public void Resolve_ExactMatch()
        {
            var loc = MakeLoc(
                (PluralCategory.One, GenderCategory.Feminine, "one-fem"),
                (PluralCategory.Other, GenderCategory.Other, "catch-all")
            );
            Assert.AreEqual("one-fem", VariantResolver.Resolve(loc, GenderCategory.Feminine, PluralCategory.One));
        }

        [Test]
        public void Resolve_GenderFallback()
        {
            // Request (One, Feminine) but only (One, Other) exists → gender fallback
            var loc = MakeLoc(
                (PluralCategory.One, GenderCategory.Other, "one-other"),
                (PluralCategory.Other, GenderCategory.Other, "catch-all")
            );
            Assert.AreEqual("one-other", VariantResolver.Resolve(loc, GenderCategory.Feminine, PluralCategory.One));
        }

        [Test]
        public void Resolve_CatchAllFallback()
        {
            // Request (One, Feminine) but only (Other, Other) exists → catch-all
            var loc = MakeLoc(
                (PluralCategory.Other, GenderCategory.Other, "catch-all")
            );
            Assert.AreEqual("catch-all", VariantResolver.Resolve(loc, GenderCategory.Feminine, PluralCategory.One));
        }

        [Test]
        public void Resolve_OtherOther_DirectHit()
        {
            // Request (Other, Other) → Pass 1 exact match
            var loc = MakeLoc(
                (PluralCategory.Other, GenderCategory.Other, "catch-all")
            );
            Assert.AreEqual("catch-all", VariantResolver.Resolve(loc, GenderCategory.Other, PluralCategory.Other));
        }

        [Test]
        public void Resolve_OtherGender_FallsBackToOtherOther()
        {
            // Request (Other, Masculine) → Pass 1 miss → Pass 2 finds (Other, Other)
            var loc = MakeLoc(
                (PluralCategory.Other, GenderCategory.Other, "catch-all")
            );
            Assert.AreEqual("catch-all", VariantResolver.Resolve(loc, GenderCategory.Masculine, PluralCategory.Other));
        }

        [Test]
        public void Resolve_NoVariants_ReturnsNull()
        {
            var loc = new Localization();
            loc.Variants = null;
            Assert.IsNull(VariantResolver.Resolve(loc, GenderCategory.Other, PluralCategory.Other));
        }

        [Test]
        public void Resolve_EmptyVariants_ReturnsNull()
        {
            var loc = new Localization();
            loc.Variants = new List<TextVariant>();
            Assert.IsNull(VariantResolver.Resolve(loc, GenderCategory.Other, PluralCategory.Other));
        }

        [Test]
        public void Resolve_NoMatchAtAll_ReturnsNull()
        {
            // Only (One, Masculine) exists, request (Few, Feminine) — no fallback matches
            var loc = MakeLoc(
                (PluralCategory.One, GenderCategory.Masculine, "one-masc")
            );
            Assert.IsNull(VariantResolver.Resolve(loc, GenderCategory.Feminine, PluralCategory.Few));
        }

        [Test]
        public void Resolve_GenderOther_SkipsPass2()
        {
            // Request (One, Other) — gender IS Other, so Pass 2 is skipped.
            // If exact match fails, goes straight to Pass 3 catch-all.
            var loc = MakeLoc(
                (PluralCategory.One, GenderCategory.Masculine, "one-masc"),
                (PluralCategory.Other, GenderCategory.Other, "catch-all")
            );
            Assert.AreEqual("catch-all", VariantResolver.Resolve(loc, GenderCategory.Other, PluralCategory.One));
        }

        [Test]
        public void Resolve_PluralOther_Pass3NotNeeded()
        {
            // Request (Other, Feminine) → Pass 1 miss → Pass 2 finds (Other, Other)
            // Pass 3 is not reached because plural IS Other and Pass 2 handles the fallback
            var loc = MakeLoc(
                (PluralCategory.Other, GenderCategory.Masculine, "other-masc"),
                (PluralCategory.Other, GenderCategory.Other, "catch-all")
            );
            Assert.AreEqual("catch-all", VariantResolver.Resolve(loc, GenderCategory.Feminine, PluralCategory.Other));
        }

        [Test]
        public void Resolve_ExactPreferredOverFallback()
        {
            // Both exact and catch-all exist — exact wins
            var loc = MakeLoc(
                (PluralCategory.One, GenderCategory.Feminine, "exact"),
                (PluralCategory.One, GenderCategory.Other, "gender-fallback"),
                (PluralCategory.Other, GenderCategory.Other, "catch-all")
            );
            Assert.AreEqual("exact", VariantResolver.Resolve(loc, GenderCategory.Feminine, PluralCategory.One));
        }

        [Test]
        public void Resolve_GenderFallbackPreferredOverCatchAll()
        {
            // Gender fallback and catch-all both exist — gender fallback wins
            var loc = MakeLoc(
                (PluralCategory.One, GenderCategory.Other, "gender-fallback"),
                (PluralCategory.Other, GenderCategory.Other, "catch-all")
            );
            Assert.AreEqual("gender-fallback", VariantResolver.Resolve(loc, GenderCategory.Masculine, PluralCategory.One));
        }

        [Test]
        public void Resolve_AllFourGenders()
        {
            var loc = MakeLoc(
                (PluralCategory.Other, GenderCategory.Other, "other"),
                (PluralCategory.Other, GenderCategory.Masculine, "masc"),
                (PluralCategory.Other, GenderCategory.Feminine, "fem"),
                (PluralCategory.Other, GenderCategory.Neuter, "neut")
            );
            Assert.AreEqual("masc", VariantResolver.Resolve(loc, GenderCategory.Masculine, PluralCategory.Other));
            Assert.AreEqual("fem", VariantResolver.Resolve(loc, GenderCategory.Feminine, PluralCategory.Other));
            Assert.AreEqual("neut", VariantResolver.Resolve(loc, GenderCategory.Neuter, PluralCategory.Other));
            Assert.AreEqual("other", VariantResolver.Resolve(loc, GenderCategory.Other, PluralCategory.Other));
        }
    }
}
