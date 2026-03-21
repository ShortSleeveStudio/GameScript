---
name: Chunk 8A Schema Export Runtime
description: Subject field collapse, is_templated, x-source locale (locale 1 renamed), FlatBuffers GSP3, export pipeline and runtime updates
type: project
status: complete
---

# Chunk 8A: Schema, Export, Runtime

## What This Chunk Does

Three changes to localizations and one locale rename, cascading through schema → CRUD → export → runtime:

1. **Subject field collapse** — drop three-column `(subject_actor, is_gender_override, gender_override)`. Replace with two mutually exclusive nullable columns: `subject_actor` (kept) and `subject_gender` (new, replaces `gender_override`). `is_gender_override` is dropped — presence of `subject_gender` IS the discriminator. Both null → resolves to GenderCategory.Other at runtime.

2. **is_templated** — new boolean on localizations. Author sets it when the localization uses `{placeholder}` syntax. Runtime uses it to skip template substitution entirely (replacing the `IndexOf('{')` heuristic). Does NOT gate OnSpeechParams calls.

3. **x-source = locale 1** — locale 1 (the system-created locale) IS the source locale. On migration, rename it to `'x-source'`. On initialization, create it as `'x-source'` from the start. No new column on the locales table. CRUD protection via `is_system_created = true` (locale 1 already has this). UI locks it to other/other only. Export treats it identically to any other locale.

4. **FlatBuffers GSP2 → GSP3** — removing `is_gender_override` shifts vtable offsets; hard binary break. Also add `is_templated: bool` and rename `gender_override` → `subject_gender`.

---

## Design Decisions (Resolved)

### x-source = Locale 1
- Locale 1 (the system-created locale, `is_system_created = true`) IS the source locale
- Named `'x-source'` — in initialization, created with `name='x-source'`; in migration, renamed via `UPDATE locales SET name = 'x-source' WHERE is_system_created = 1`
- No new `is_system` column on locales — `is_system_created` is sufficient as the lock discriminator
- CRUD protection: `remove()` throws if `locale.is_system_created`; `updateMany()` throws if any locale being updated has `is_system_created = true`
- Export: x-source goes through the identical export pipeline — same schema, same locale_N columns, same `fetchForLocale()` path — producing `x-source.gsb`. No special-casing anywhere.
- UI: when `locale.is_system_created` is true, lock the form matrix to other/other only (source text is convention: neutral gender, no plural variants)
- Authors fill x-source's form columns directly; it is the canonical source-text reference by convention

### Subject Field Collapse
| Old | New |
|---|---|
| `subject_actor` INTEGER nullable | `subject_actor` INTEGER nullable (kept) |
| `is_gender_override` BOOLEAN NOT NULL | **dropped** |
| `gender_override` TEXT nullable | renamed → `subject_gender` TEXT nullable |

- `subject_actor` and `subject_gender` are mutually exclusive — at most one is set
- Null default on both → resolves to GenderCategory.Other at runtime
- Migration CASE expression: `SET subject_gender = CASE WHEN is_gender_override = 1 THEN gender_override ELSE NULL END` — **not** a plain copy; rows with `is_gender_override = 0` may have stale `gender_override` values

### is_templated
- New `is_templated BOOLEAN NOT NULL DEFAULT 0` on localizations
- Author sets it when text uses `{placeholder}` syntax
- Snapshot: `is_templated: bool` on Localization table
- Runtime: gates template substitution — `if (loc.IsTemplated && (hasPlural || hasArgs)) text = ApplyTemplate(...)`
- OnSpeechParams/OnDecisionParams are called unconditionally — `is_templated` does not gate them

### FlatBuffers
- Bump `"GSP2"` → `"GSP3"` — mandatory, vtable offsets shift when `is_gender_override` is removed
- Do not use `deprecated` — field is gone semantically and structurally

---

## Implementation Steps

### Step 1 — shared/src/types/entities.ts

Update `Localization` interface:
- Drop `is_gender_override: boolean`
- Drop `gender_override: string | null`
- Add `subject_gender: string | null`
- Add `is_templated: boolean`

No changes to `Locale` interface (no new column on locales table).

### Step 2 — shared/src/schema/tables.ts

Update `localizationsTable`:
- Remove `{ name: 'is_gender_override', type: 'BOOLEAN', notNull: true, defaultValue: false }`
- Remove `{ name: 'gender_override', type: 'TEXT' }`
- Add `{ name: 'subject_gender', type: 'TEXT' }`
- Add `{ name: 'is_templated', type: 'BOOLEAN', notNull: true, defaultValue: false }`

No changes to `localesTable`.

### Step 3 — shared/src/schema/migration.ts

**Fix existing function:** `generateMigrationSQL_0_0_0_to_0_1_0` currently uses `CURRENT_SCHEMA_VERSION` in its version bump. After this chunk that constant becomes `'0.2.0'`, which would be wrong. Change the params to hardcode `'0.1.0'`.

**Add new function:** `generateMigrationSQL_0_1_0_to_0_2_0(): InitializationStatement[]` — no parameters needed.

Steps in strict order:
1. `ALTER TABLE localizations ADD COLUMN is_templated INTEGER NOT NULL DEFAULT 0`
2. `ALTER TABLE localizations ADD COLUMN subject_gender TEXT`
3. `UPDATE localizations SET subject_gender = CASE WHEN is_gender_override = 1 THEN gender_override ELSE NULL END`
4. `ALTER TABLE localizations DROP COLUMN is_gender_override`
5. `ALTER TABLE localizations DROP COLUMN gender_override`
6. `UPDATE locales SET name = 'x-source' WHERE is_system_created = 1`
7. `UPDATE version SET version = '0.2.0' WHERE id = 1`

### Step 4 — shared/src/schema/initialization.ts

- Bump `CURRENT_SCHEMA_VERSION` to `'0.2.0'`
- Change `DEFAULT_LOCALE_CODE` from `'en_US'` to `'x-source'`
- Change `DEFAULT_LOCALE_DISPLAY_NAME` from `'English'` to `'Source Text'`
- Update all `INSERT INTO localizations` statements to use new column names: drop `is_gender_override`/`gender_override`, add `subject_gender`/`is_templated`
- Update `getInitialData()` to reflect new columns and new locale name

### Step 5 — ui/src/lib/crud/crud-localizations.ts

Update `CreateLocalizationParams`:
- Drop `is_gender_override?: boolean`
- Drop `gender_override?: GenderCategory | null`
- Add `subject_gender?: GenderCategory | null`
- Add `is_templated?: boolean`

Update `create()` to write the new fields.

### Step 6 — ui/src/lib/crud/crud-locales.ts

Add system locale guards using `is_system_created`:
- `remove(localeId)`: fetch locale first; throw `Error('Cannot delete a system locale')` if `locale.is_system_created`
- `updateMany()`: throw `Error('Cannot update a system locale')` if any locale being updated has `is_system_created = true`

No changes to `create()` — user-created locales always have `is_system_created = false`.
No changes to `deleteInternal()` — guarded before it is called.

### Step 7 — ui/src/lib/crud/crud-actors.ts

No changes needed. The `SET NULL subject_actor` logic already references the correct column name.

### Step 8 — core/schema/snapshot.fbs

Bump file identifier: `"GSP2"` → `"GSP3"`

Replace the `table Localization` definition:

```
table Localization {
  id: int32;
  name: string;
  subject_actor_idx: int32;     // Always written explicitly (default 0 ≠ -1)
  subject_gender: GenderCategory;
  is_templated: bool;
  variants: [TextVariant];
  tag_indices: [int32];
}
```

After editing snapshot.fbs, run from the repo root:
```
pnpm build:flatbuffers
```

This regenerates all four targets: TypeScript flatbuffers code, FlatSharp.generated.cs, Godot snapshot_generated.h, Unreal snapshot_generated.h. Do not hand-edit the generated files.

### Step 9 — ui/src/lib/crud/crud-export.ts

Update `LocalizationExportData`:
- Drop `isGenderOverride: boolean`
- Drop `genderOverride: string | null`
- Add `subjectGender: string | null`
- Add `isTemplated: boolean`

Update `getLocalizationFormsForLocale()`:
- Replace `'is_gender_override'` and `'gender_override'` column selects with `'subject_gender'`
- Update result mapping: populate `subjectGender` from `row.subject_gender`, `isTemplated` from `Boolean(row.is_templated)`

### Step 10 — ui/src/lib/export/types.ts

Update `ExportLocalization`:
- Drop `isGenderOverride: boolean`
- Drop `genderOverride: string | null`
- Add `subjectGender: string | null`
- Add `isTemplated: boolean`

### Step 11 — ui/src/lib/export/snapshot-data-fetcher.ts

Update `transformLocalizations()`:
- Drop `isGenderOverride`/`genderOverride` assignments
- Add `subjectGender: formData?.subjectGender ?? null`
- Add `isTemplated: formData?.isTemplated ?? false`

### Step 12 — ui/src/lib/export/snapshot-serializer.ts

Update `buildLocalization()`:
- Drop `Localization.addIsGenderOverride(...)`
- Replace `Localization.addGenderOverride(builder, genderCategoryToEnum(loc.genderOverride))` with:
  `if (loc.subjectGender !== null) { Localization.addSubjectGender(builder, genderCategoryToEnum(loc.subjectGender)); }`
- Add `Localization.addIsTemplated(builder, loc.isTemplated)`

Note: FlatBuffers default for enums is 0 = Other, which is correct when subjectGender is null — skip the add call rather than writing the default.

### Step 13 — ui/src/lib/components/common/SubjectActorSelector.svelte

Rewrite to use the new two-column model:
- Drop `isOverride` derived from `rowView.data.is_gender_override`
- New discriminator: `let currentMode = $derived(rowView.data.subject_actor !== null ? 'actor' : 'override')`
- `onModeChange('actor')`: write `{ subject_actor: null, subject_gender: null }` — clear both, user then picks actor from dropdown
- `onModeChange('override')`: write `{ subject_actor: null, subject_gender: oldRow.subject_gender ?? 'other' }`
- `onActorChange(value)`: write `{ subject_actor: newValue, subject_gender: null }`
- `onGenderChange(value)`: write `{ subject_actor: null, subject_gender: value }`

### Step 14 — ui/src/lib/components/common/RowColumnLocalization.svelte

Line ~78: change the `hasVariants` derived expression from:
```ts
return loc.is_gender_override || loc.subject_actor !== null;
```
to:
```ts
return loc.subject_actor !== null || loc.subject_gender !== null;
```

### Step 15 — runtimes/unity/.../Runtime/Execution/GameScriptRunner.cs

Replace `ResolveGender()` entirely:
```csharp
static GenderCategory ResolveGender(Localization loc, GenderCategory? genderOverride, Snapshot snapshot)
{
    if (genderOverride.HasValue)
        return genderOverride.Value;

    int actorIdx = loc.SubjectActorIdx;
    if (actorIdx >= 0)
    {
        GrammaticalGender gg = snapshot.Actors[actorIdx].GrammaticalGender;
        switch (gg)
        {
            case GrammaticalGender.Masculine: return GenderCategory.Masculine;
            case GrammaticalGender.Feminine:  return GenderCategory.Feminine;
            case GrammaticalGender.Neuter:    return GenderCategory.Neuter;
            default:                          return GenderCategory.Other;
        }
    }

    return loc.SubjectGender; // GenderCategory.Other by default when unset
}
```

Replace the template guard in `ResolveText()`:
```csharp
// Replace:
if ((hasPlural || hasArgs) && text.IndexOf('{') >= 0)
    text = ApplyTemplate(text, parms);

// With:
if (loc.IsTemplated && (hasPlural || hasArgs))
    text = ApplyTemplate(text, parms);
```

Remove the `text.IndexOf('{')` heuristic entirely.

### Step 16 — runtimes/unity/.../Runtime/Refs.cs

`LocalizationRef` — replace `IsGenderOverride` and `GenderOverride` properties:
- Drop `public bool IsGenderOverride => _snapshot.Localizations[_index].IsGenderOverride;`
- Drop `public GenderCategory GenderOverride => _snapshot.Localizations[_index].GenderOverride;`
- Add `public GenderCategory SubjectGender => _snapshot.Localizations[_index].SubjectGender;`
- Add `public bool IsTemplated => _snapshot.Localizations[_index].IsTemplated;`

`NodeRef.ResolveStaticGender()` — replace entirely:
```csharp
internal static GenderCategory ResolveStaticGender(Localization loc, Snapshot snapshot)
{
    int actorIdx = loc.SubjectActorIdx;
    if (actorIdx >= 0)
    {
        GrammaticalGender gg = snapshot.Actors[actorIdx].GrammaticalGender;
        switch (gg)
        {
            case GrammaticalGender.Masculine: return GenderCategory.Masculine;
            case GrammaticalGender.Feminine:  return GenderCategory.Feminine;
            case GrammaticalGender.Neuter:    return GenderCategory.Neuter;
            default:                          return GenderCategory.Other;
        }
    }

    return loc.SubjectGender;
}
```

Do NOT rename `TextResolutionParams.GenderOverride` — that is the caller-supplied override, a separate concept.

---

## Key Invariants

- `OnSpeechParams` is called for every node with voice text, unconditionally. `is_templated` only gates template substitution inside `ResolveText`.
- x-source is just another locale in schema and export — same locale_N columns, same export pipeline. The only distinction is `is_system_created = true` which the CRUD layer uses for protection.
- The CASE expression in the migration is not optional — a plain copy would corrupt rows that had stale `gender_override` values with `is_gender_override = 0`.
- FlatBuffers int32 default is 0, not -1. `subject_actor_idx` is always written explicitly (existing code already does this). `subject_gender` enum default is 0 = Other — skip the add call when null.
- After `pnpm build:flatbuffers`, verify the generated C# property names (`SubjectGender`, `IsTemplated`) before editing the runtime C# files.

---

**Why:** Evolved from Chunk 8 ergonomics discussion on 2026-03-19. x-source approach simplified: locale 1 IS the source locale (renamed to 'x-source'), eliminating the need for a new `is_system` column. Subject field collapsed from three columns to two. is_templated replaces the IndexOf heuristic.
**How to apply:** Execute before Chunk 8B (editor UI depends on these schema changes). Independent of Chunks 6/7 (Unreal/Godot runtimes).
