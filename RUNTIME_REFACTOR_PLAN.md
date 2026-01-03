# GameScript Runtime Refactor Plan

This document tracks the Unity runtime V2 implementation progress.

## Current Status

- [x] Phase 1: FlatSharp Migration - **COMPLETE**
- [x] Phase 2: Unity Runtime Build System - **COMPLETE**
- [x] Phase 3: Unity Editor UI Polish - **COMPLETE**
- [x] Phase 4: Edit Button Integration - **COMPLETE**
- [ ] Phase 5: Memory Verification - **NEEDS TESTING**
- [ ] Phase 6: Godot Runtime - NOT STARTED

---

## Phase 5: Memory Verification

Need to verify that when `ChangeLocale()` is called, the old snapshot is properly garbage collected and doesn't remain in memory.

### Testing Required

1. Start a conversation
2. Note memory usage
3. Call `ChangeLocale()` to switch to a different locale
4. Force GC and verify old snapshot is released
5. Repeat locale switches and verify memory doesn't grow unboundedly

### Implementation Notes

- `RunnerContext` now accesses snapshot through `GameScriptDatabase.Snapshot` property (not a stored reference)
- This enables live locale switching during conversations
- Old snapshot should be eligible for GC once `SetSnapshot()` replaces the reference

---

## Open Discussions

### Locale Change Reactivity

**Question:** When a locale changes during a running conversation, how should the UI react?

Current behavior:
- `RunnerContext` accesses `Snapshot` property on each text retrieval
- When `ChangeLocale()` is called, `_snapshot` is replaced
- Running conversations immediately see new locale text on next property access

Considerations:
- Should the listener be notified when locale changes?
- Should there be an event/callback for UI to refresh displayed text?
- How to handle text that was already retrieved and displayed?

### V1 to V2 Migration Guide

**TODO:** Document the migration path for applications using GameScript V1.

Topics to cover:
- API changes between V1 and V2
- Database schema differences (if any)
- Snapshot format changes
- Breaking changes in listener interface
- Property drawer attribute changes
- Recommended migration strategy

---

## Architecture Reference

```
core/schema/snapshot.fbs          # FlatBuffers schema (shared)
        │
        ▼
runtimes/csharp/
├── GameScript.Core/              # FlatSharp types + Manifest.cs + Attributes.cs
├── GameScript.Unity/             # References Unity package source
├── GameScript.Unity.Editor/      # References Unity package source
├── build.sh                      # Builds + ILRepack merge
└── dist/                         # Output DLLs (gitignored)

runtimes/unity/Packages/studio.shortsleeve.gamescript/
├── Runtime/
│   ├── Execution/                # Runner, Database, Context
│   ├── Refs.cs, Ids.cs           # Wrapper types
│   └── Plugins/                  # FlatSharp.Runtime.dll, GameScript.Core.dll
└── Editor/
    ├── Pickers/                  # Conversation, Actor, Locale, Localization pickers
    ├── PropertyDrawers/          # Inspector UI for ID types
    └── Styles/                   # gamescript-picker.uss
```

---

## Future: Phase 6 - Godot Runtime

- Create `runtimes/csharp/GameScript.Godot/` project
- Implement `GodotRunner` with signal-based listener pattern
- ILRepack into `GameScript.Godot.dll`
