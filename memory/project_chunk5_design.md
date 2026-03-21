---
name: Chunk 5 Unity Runtime Design Decisions
description: Agreed design for variant selection, gender resolution, string templating with typed args, cardinal+ordinal CLDR rules, and IGameScriptListener extensions in Chunk 5
type: project
---

# Chunk 5 Unity Runtime — Agreed Design

## IGameScriptListener — New Lifecycle Methods
Two new methods with default implementations (non-breaking):

```csharp
TextResolutionParams OnSpeechParams(LocalizationRef localization, NodeRef node) => default;
TextResolutionParams OnDecisionParams(LocalizationRef localization, NodeRef choiceNode) => default;
```

- `OnSpeechParams`: called once per node with voice text, before OnSpeech
- `OnDecisionParams`: called once per choice node, before OnDecision (for each choice's UI response text)
- No separate IGenderProvider interface — dynamic gender handled via TextResolutionParams.GenderOverride

## TextResolutionParams Struct
Zero-initializable struct (safe to use `default` everywhere):
- `GenderCategory? GenderOverride` — null = auto-resolve from snapshot
- `PluralArg? Plural` — null = Other category; drives CLDR lookup + template substitution
- `Arg[] Args` — typed substitution args, never affect form selection

## PluralArg — Cardinal + Ordinal
- `string Name`, `int Value`, `PluralType Type`
- `PluralType { Cardinal = 0, Ordinal = 1 }` — defaults to Cardinal (zero-init safe)
- Display: always locale-aware integer grouping ("N0" format)

## Arg — Typed Substitution Values
Static factory methods, mirroring LocaleKit's lk_var types:
- `Arg.String(name, value)` — plain string
- `Arg.Int(name, value)` — locale-grouped integer ("1,000")
- `Arg.Decimal(name, value, precision)` — minor units → decimal ("3.14")
- `Arg.Percent(name, value, precision)` — minor units → percentage ("15.5%")
- `Arg.Currency(name, minorUnits, currencyCode)` — ISO 4217 ("$19.99")
- `Arg.RawInt(name, value)` — unformatted integer ("1000")

Number formatting uses C#'s built-in CultureInfo — no embedded CLDR number data.
Currency decimal places from ISO 4217 via Iso4217.cs helper.

## Resolution Order (in runner)
1. Call OnSpeechParams/OnDecisionParams → get params
2. Resolve gender: params.GenderOverride → localization.IsGenderOverride → actor.GrammaticalGender (static) → Dynamic with no override = Other
3. Resolve plural: params.Plural → CLDR lookup (cardinal OR ordinal per PluralArg.Type) → category; else Other
4. 3-pass variant scan (exact → gender fallback → catch-all)
5. Template substitution via shared StringBuilder on GameScriptRunner

## CLDR Plural Rules
- Cardinal: 29 rule groups covering 224 locales (verified against cldr-core JSON)
- Ordinal: 25 rule groups covering all CLDR ordinal locales
- Locale lookup: exact → separator swap → language subtag → default Other
- IL2CPP-safe: static Dictionary + switch dispatch, no delegates

## Allocation Strategy
- No templates: return FlatSharp string directly — zero allocation
- Templates: one string allocation (StringBuilder.ToString())
- Single StringBuilder field on GameScriptRunner (main-thread-only, reuse/clear)
- FormatArg dispatches on ArgType using CultureInfo.ToString() overloads

## Files Created/Modified (Chunk 5)
- NEW: TextResolutionParams.cs (PluralType, ArgType, PluralArg, Arg, TextResolutionParams)
- NEW: CldrPluralRules.cs (cardinal + ordinal rules, Resolve + ResolveOrdinal)
- NEW: VariantResolver.cs (3-pass variant selection)
- NEW: Iso4217.cs (minor unit digits, currency symbols)
- MODIFIED: RunnerListener.cs (OnSpeechParams, OnDecisionParams)
- MODIFIED: RunnerContext.cs (cached texts, CacheNodeTexts, choice resolution)
- MODIFIED: IDialogueContext.cs (VoiceTextLocalizationIdx, UIResponseTextLocalizationIdx)
- MODIFIED: Refs.cs (all refs updated for new schema)
- MODIFIED: GameScriptRunner.cs (ResolveText, ApplyTemplate with typed args, FormatArg, Iso4217)

**Why:** Design evolved from initial audit (2026-03-18) through discussion on 2026-03-19 to add ordinal plurals, typed arg formatting, and ISO 4217 currency support — aligning with LocaleKit's lk_var type system.
**How to apply:** This is the authoritative reference for Chunks 6 (Unreal) and 7 (Godot) — they must implement identical logic.
