---
name: Chunk 8B Editor UI
description: Localization inspector rewrite, AG Grid column groups, derived gender visibility, FormMatrixToggles removal, node text preview, x-source in locale manager
type: project
status: complete
---

# Chunk 8B: Editor UI

## What This Chunk Does
Rewrites the localization inspector and grid to reflect the new authoring model: source text (= x-source) + is_templated at the top; per-locale matrices in an accordion, each with a Subject dropdown. Removes FormMatrixToggles. Derives gender column visibility from subject. Updates node text previews.

Depends on Chunk 8A being complete (schema, FlatBuffers, export pipeline).

## Design Decisions (Resolved)

### Authoring Surface
The author's visible surface per localization (in any context — inspector, node, actor name):
1. **Source text** — one textarea, always visible. This IS the x-source `other/other` form. x-source has no accordion entry.
2. **is_templated** — checkbox, inline next to source text or immediately below

Everything else lives in an accordion below. x-source does not appear as an accordion section.

### Subject Dropdown
Subject is a **translator concern** — it lives inside each real locale's accordion section, not at the top level. It is a single field on the localization row (`subject_actor` / `subject_gender`), shown in every locale accordion for convenience so a translator never has to leave their section to set it.

Single dropdown labeled "Subject" with two option groups:
```
── Actors ──────────────────
  Elara          (feminine)
  PlayerCharacter (dynamic)
  ...
── Gender ──────────────────
  Masculine
  Feminine
  Neuter
  Other
```
- Null/blank default — placeholder text "None", resolves to Other at runtime
- Selecting an actor sets `subject_actor`, clears `subject_gender`
- Selecting a gender sets `subject_gender`, clears `subject_actor`
- Actor entries show grammatical gender as secondary text for translator context
- Writing from any locale's section updates the same single DB field; all open accordions reflect the change immediately

### Gender Column Visibility (Derived, Not Manual)
Gender columns shown in the per-locale form fields are fully derived from the subject — no manual toggles:

| Subject | Gender columns shown |
|---|---|
| None (null) | Other only |
| Actor — static masculine | Masculine + Other |
| Actor — static feminine | Feminine + Other |
| Actor — static neuter | Neuter + Other |
| Actor — static other | Other only |
| Actor — dynamic | All four (Masculine, Feminine, Neuter, Other) |
| subject_gender = masculine | Masculine + Other |
| subject_gender = feminine | Feminine + Other |
| subject_gender = neuter | Neuter + Other |
| subject_gender = other | Other only |

**FormMatrixToggles.svelte is removed entirely.** Gender visibility is automatic. Plural form rows remain in the accordion and are always available (all CLDR categories shown, not filtered).

### Inspector Structure
Same localization component used everywhere (node inspector, standalone localization inspector, actor name). Structure:

```
[ Source text textarea        ]   ← x-source other/other
[ ☐ Templated                ]

▼ French (primary locale)
  Subject: [dropdown          ]
  [ plural × gender text areas — visible columns per derived gender ]

▶ Japanese
  Subject: [dropdown          ]
  [ plural × gender text areas ]

▶ ...
```

- x-source has NO accordion entry — its content is the top-level source textarea
- Primary real locale accordion is expanded by default
- Other locale accordions collapsed by default
- The `other × other` cell is always the first/most prominent field within each accordion
- Plural form rows shown for all CLDR-relevant categories for that locale (not gated by is_templated)
- Gender columns shown per derived visibility rules above
- Coverage badge per locale: `3/4` green when complete, amber when partial, gray when empty. Tooltip: "X of Y expected forms filled."

### AG Grid — Localization Editor Panel
- **Source column** — always visible, left-anchored, labeled "Source"
- **Locale column groups** — one collapsible column group per real locale (not x-source)
  - Collapsed: shows Other/Other cell only
  - Expanded: shows full plural × gender matrix, with column sub-groups matching the existing gender/plural distinction (column groups were already an ergonomics win — keep them)
- Column groups use AG Grid's native collapsible column group feature
- x-source does not appear as a column group in the grid (it's authoring infrastructure, not a translation target)
- `is_templated` column visible in grid (checkbox cell renderer)

### Node Text Preview
The inline text preview in the graph node (NodeDialogueText, NodeDialogueUI) shows the text for the resolved gender, not the raw form matrix:
- Static actor subject → show the variant for that actor's gender (e.g., masculine variant)
- Dynamic actor subject → show Other variant (the fallback)
- subject_gender set → show that gender's variant
- No subject → show Other variant

If the localization has no primary locale data at all, fall back to source_text for the preview.

### x-source in Locale Manager
- Appears in the locale list as a system locale
- Visually distinct — different row style or lock icon
- Cannot be renamed, reordered, or deleted (controls disabled/hidden)
- Tooltip explaining what it is: "Source locale — used for in-game testing during development. Not shipped to players."

### Validation UI
- In the localization editor toolbar: "Validate" button
- Runs CLDR coverage check for all `is_templated = true` localizations across all real locales
- Reports: missing plural forms per locale, missing gender forms per derived gender visibility
- Results shown inline (row highlighting) or in a summary panel

---

## Files Affected

### New Components
- None — FormMatrixToggles.svelte is deleted

### Modified Components
- `ui/src/lib/components/inspector/InspectorLocalization.svelte` — full rewrite: source text, is_templated, subject dropdown, accordion structure
- `ui/src/lib/components/common/LocalizationFormFields.svelte` — derive gender column visibility from subject; remove manual gender toggle logic
- `ui/src/lib/components/common/SubjectActorSelector.svelte` — replace two-mode (actor/override) toggle with single unified dropdown
- `ui/src/lib/components/graph/nodes/NodeDialogueText.svelte` — show resolved gender variant in preview
- `ui/src/lib/components/graph/nodes/NodeDialogueUI.svelte` — same
- `ui/src/lib/components/panels/LocalizationEditor.svelte` — AG Grid column groups, Source column, is_templated column, Validate button
- `ui/src/lib/components/panels/LocaleManager.svelte` — system locale (x-source) display with lock treatment
- `ui/src/lib/components/inspector/InspectorActor.svelte` — no change expected (grammatical gender dropdown already added in earlier chunk)

### Deleted Components
- `ui/src/lib/components/common/FormMatrixToggles.svelte`
- `ui/src/lib/stores/form-matrix-preference.ts`

### Grid
- `ui/src/lib/grid/index.ts` — column group definitions for locale matrix
- `ui/src/lib/grid/cell-editor-locale-code.ts` — may need updates for new column naming
- `ui/src/lib/grid/cell-renderer-locale-code.svelte.ts` — same

### Constants / Settings
- `ui/src/lib/constants/local-storage.ts` — remove form-matrix-preference key
- `ui/src/lib/constants/settings.ts` — any settings related to form matrix toggles

---

## Chunk 8B — Audit Prompt

```
Read the following files in full:
- ui/src/lib/components/inspector/InspectorLocalization.svelte
- ui/src/lib/components/common/LocalizationFormFields.svelte
- ui/src/lib/components/common/SubjectActorSelector.svelte
- ui/src/lib/components/common/FormMatrixToggles.svelte
- ui/src/lib/stores/form-matrix-preference.ts
- ui/src/lib/components/graph/nodes/NodeDialogueText.svelte
- ui/src/lib/components/graph/nodes/NodeDialogueUI.svelte
- ui/src/lib/components/panels/LocalizationEditor.svelte
- ui/src/lib/components/panels/LocaleManager.svelte
- ui/src/lib/components/inspector/InspectorActor.svelte
- ui/src/lib/grid/index.ts
- ui/src/lib/constants/local-storage.ts
- ui/src/lib/constants/settings.ts
- shared/src/types/entities.ts (post Chunk 8A — for updated Localization and Locale interfaces)

Then read memory/project_chunk8b_editor_ui.md (this file).

You are auditing for Chunk 8B: Editor UI.

Quality standard: We are building a gold standard library. It must be bullet proof and better than all its peers. DRY, consistent, well-architected, following best practices, in the BSC/Unix ethos, and bug free. No expedient bandaids — only what is correct. We build as if there is no V2.

Audit for:
1. How does InspectorLocalization currently receive actor data for the subject actor dropdown? Is there an existing pattern to follow?
2. How does NodeDialogueText currently read the localization text for its preview? Does it have access to the full locale data or just a pre-resolved string?
3. Does SubjectActorSelector currently handle the two-mode toggle, or is that split across InspectorLocalization? What's the cleanest refactor path?
4. How are AG Grid column definitions currently structured for locale columns? Are they generated dynamically? Where does that happen?
5. Are there any other components that reference form-matrix-preference or FormMatrixToggles that aren't listed in Files Affected?
6. Does LocaleManager already distinguish system vs. non-system locales in any way, or is that entirely new?
7. For the node text preview, does the node know which locale to show? How is the primary locale currently selected?

Surface any design issues. Flag anything that needs a decision.
```

## Chunk 8B — Implementation Prompt

```
Read the following files in full:
- All files listed in the Chunk 8B audit "Files to Read" section
- The audit findings and resolved design decisions

Then read memory/project_chunk8b_editor_ui.md.

You are implementing Chunk 8B: Editor UI. Chunk 8A (schema, export, runtime) is already complete.

Quality standard: We are building a gold standard library. It must be bullet proof and better than all its peers. DRY, consistent, well-architected, following best practices, in the BSC/Unix ethos, and bug free. No expedient bandaids — only what is correct. We build as if there is no V2.

Implement the following:

1. **InspectorLocalization rewrite**: Source text textarea at top (this is the x-source form — no x-source accordion). is_templated checkbox. Accordion per real locale — primary locale expanded by default, others collapsed. Each accordion section contains: Subject dropdown, then the plural × gender form fields. Coverage badge per locale.

2. **SubjectActorSelector rewrite**: Collapse two-mode toggle into a single dropdown with actor group and gender group (see spec). Selecting actor sets `subject_actor`, clears `subject_gender`. Selecting gender does the reverse. Component is placed inside LocalizationFormFields (each locale's accordion section), not at top level.

3. **LocalizationFormFields**: Derive gender column visibility from subject (see decision table in spec). Remove all manual gender toggle logic.

4. **Delete FormMatrixToggles.svelte and form-matrix-preference.ts**. Remove all references.

5. **Node text preview**: Update NodeDialogueText and NodeDialogueUI to show the variant for the resolved gender. Fall back to source_text if no locale data exists.

6. **AG Grid column groups**: Add Source column (left-anchored). Add collapsible column group per real locale showing Other/Other when collapsed and full matrix when expanded. Add is_templated checkbox column. Add Validate button to toolbar.

7. **LocaleManager**: Show x-source with lock treatment — disabled rename/delete controls, lock icon, explanatory tooltip.

Follow existing code patterns. Test in the editor with the existing test database.
```

**Why:** Depends on Chunk 8A. Rewrites the editor surface: top level = source text (x-source) + is_templated; accordion = one section per real locale, each containing Subject dropdown + form matrix. x-source has no accordion entry — its content is the top-level textarea. Subject is a translator concern and lives inside each locale's accordion. FormMatrixToggles removed — gender visibility is now fully derived from subject. AG Grid gains collapsible column groups.
**How to apply:** Execute after Chunk 8A is complete and tested.
