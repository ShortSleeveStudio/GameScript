# GameScript Build Refactor Plan

## Current Status: COMPLETE

All refactoring work is complete.

---

## What Was Done

### 1. Replaced ILRepack with Source Distribution
- Created `runtimes/unity/generate-flatsharp.sh` - generates FlatSharp code and copies Core source files to Unity
- FlatSharp.Runtime.dll is shipped separately (no more merging)
- Core source files (Attributes.cs, Manifest.cs, Command.cs) copied to `Runtime/Generated/`
- Removed the `AssemblyInformationalVersion("7.9.0")` hack from Attributes.cs

### 2. Assembly Isolation (No Extern Alias Needed)
- Unity's asmdef system provides isolation - extern alias was unnecessary
- `GameScriptUnity.asmdef` has `overrideReferences: true` and lists `FlatSharp.Runtime.dll`
- `FlatSharp.Runtime.dll.meta` has `isExplicitlyReferenced: 1` (Auto Referenced unchecked)
- Users cannot access FlatSharp types unless they explicitly reference the DLL

### 3. Nullable Compatibility
- Added `<FlatSharpNullable>false</FlatSharpNullable>` to GameScript.Core.csproj
- Post-processing adds `#nullable disable` and `#pragma warning disable CS8669` to generated code

### 4. ID Structs Updated
- All ID structs (ConversationId, LocalizationId, ActorId, LocaleId) now use 0 as "not set"
- `None = default` and `IsValid => value > 0`
- Works with C# 9's lack of struct field initializers

### 5. FlatSharp Types Hidden from Public API
- `GameScriptDatabase.Snapshot` moved to internal
- `GameScriptDatabase.EditorGetSnapshot()` made internal
- `JumpTableBuilder` class made internal
- `InternalsVisibleTo("GameScript.Editor")` added for Editor assembly access

### 6. Complete FlatSharp Type Encapsulation
All FlatSharp types are now fully encapsulated behind wrapper structs:

- **`ActorRef`**: Wraps FlatSharp `Actor`, exposes `Id`, `Name`, `LocalizedName`, `Color`
- **`NodePropertyRef`**: Wraps FlatSharp `NodeProperty`, exposes `Name`, `Type`, typed value accessors (`StringValue`, `IntValue`, `FloatValue`, `BoolValue`) and `TryGet*` variants
- **`NodePropertyType`**: Public enum mirroring FlatSharp's `PropertyType` (String, Integer, Decimal, Boolean)
- **`LocaleRef`**: Wraps `ManifestLocale`, exposes `Id`, `Name`, `LocalizedName`, `Index`
- **`IDialogueContext.Actor`**: Changed from `Actor` to `ActorRef`
- **`IDialogueContext.Properties`**: Changed from `IReadOnlyList<NodeProperty>` to `PropertyCount` + `GetProperty(int index)` returning `NodePropertyRef`
- **`NodeRef.GetProperty()`**: Now returns `NodePropertyRef` instead of `NodeProperty`

The `NodeType` enum (Root, Dialogue) is left exposed as it's a simple generated enum with no FlatSharp dependencies.

### 7. Consistent Public API
All entity types in `GameScriptDatabase` follow the same pattern:

| Entity | Count | Get by Index | Find by ID |
|--------|-------|--------------|------------|
| Conversation | `ConversationCount` | `GetConversation(int)` → `ConversationRef` | `FindConversation(ConversationId/int)` |
| Actor | `ActorCount` | `GetActor(int)` → `ActorRef` | `FindActor(ActorId/int)` |
| Localization | `LocalizationCount` | `GetLocalization(int)` → `LocalizationRef` | `FindLocalization(LocalizationId/int)` |
| Locale | `LocaleCount` | `GetLocale(int)` → `LocaleRef` | `FindLocale(LocaleId/int)` |

- `Find*` methods are DRY - they use `Get*` internally
- `CurrentLocale` returns `LocaleRef`
- `ChangeLocale(LocaleRef)` accepts `LocaleRef`
- Removed `Manifest` property from public API

### 8. Cleanup Completed

**Deleted (no longer needed):**
- `runtimes/csharp/GameScript.Unity/` - entire directory
- `runtimes/csharp/GameScript.Unity.Editor/` - entire directory
- `runtimes/csharp/build.sh` - old ILRepack script
- `runtimes/csharp/ilrepack-exclude.txt`
- `runtimes/csharp/dist/` - entire directory

**Kept:**
- `runtimes/csharp/GameScript.Core/` - still used for FlatSharp code generation
- `core/schema/snapshot.fbs` - schema source of truth

### 9. Property Type IDs Fixed

Changed `PROPERTY_TYPE_*` constants to start at ID 1 instead of 0:
- `PROPERTY_TYPE_STRING`: 0 → 1
- `PROPERTY_TYPE_INTEGER`: 1 → 2
- `PROPERTY_TYPE_DECIMAL`: 2 → 3
- `PROPERTY_TYPE_BOOLEAN`: 3 → 4
- Removed unused `PROPERTY_TYPE_EMPTY` (was ID 4)

This ensures consistency with the "ID 0 = not set" convention used throughout the codebase.

---

## For Godot (Future)

Godot can use standard NuGet FlatSharp without any aliasing - it doesn't have the same "user pollution" problem because each Godot project manages its own NuGet packages.

The shared `.fbs` schema ensures binary compatibility of the snapshot format across engines.
