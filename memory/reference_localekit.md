---
name: LocaleKit Design Reference
description: LocaleKit spec at ~/Desktop/ENGINE/LocaleKit.md is the design reference for GameScript's typed arg system, plural/ordinal rules, and number formatting approach
type: reference
---

LocaleKit spec lives at `~/Desktop/ENGINE/LocaleKit.md` (v0.5 working draft).

GameScript's TextResolutionParams.Arg types (String, Int, Decimal, Percent, Currency, RawInt) were designed to mirror LocaleKit's `lk_var` / `lk_plural_var` type system. Key alignment:
- PluralArg drives form selection AND gets substituted (like lk_plural_var)
- Args are substitution-only, never drive form selection (like lk_var)
- Currency uses ISO 4217 minor units (like lk_var_currency)
- Cardinal vs ordinal is a per-entry concern (PluralType enum)

GameScript uses each platform's built-in number formatting (C# CultureInfo, Unreal ICU, Godot String) rather than embedding CLDR number formatting data like LocaleKit does (LocaleKit has no platform to lean on — it's a standalone Zig library with C ABI).
