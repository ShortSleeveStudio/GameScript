# GameScript Memory Index

## Project
- [project_chunk5_design.md](project_chunk5_design.md) — Chunk 5 Unity runtime agreed design: OnSpeechParams/OnDecisionParams, TextResolutionParams with typed args (String/Int/Decimal/Percent/Currency/RawInt), cardinal+ordinal CLDR rules, ISO 4217 currency, allocation strategy, caching

## Project (Complete)
- [project_chunk8a_schema_export_runtime.md](project_chunk8a_schema_export_runtime.md) — Chunk 8A ✅: subject field collapse (drop is_gender_override/gender_override → subject_gender), is_templated, x-source locale rename (locale 1 = system-created), FlatBuffers GSP2→GSP3, Unity runtime ResolveGender/ResolveText rewrite
- [project_chunk8b_editor_ui.md](project_chunk8b_editor_ui.md) — Chunk 8B ✅: localization inspector rewrite (x-source textarea + is_templated + per-locale accordions with Subject dropdown), FormMatrixToggles removed, gender visibility derived from subject, collapsible AG Grid locale column groups, node text preview resolved gender, x-source lock in LocaleManager

## Reference
- [reference_localekit.md](reference_localekit.md) — LocaleKit spec at ~/Desktop/ENGINE/LocaleKit.md is the design reference for GameScript's arg type system and plural/ordinal approach
