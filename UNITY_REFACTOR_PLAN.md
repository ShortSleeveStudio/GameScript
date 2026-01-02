# GameScript Unity V2 Refactoring Plan

This document outlines the work required to refactor the V1 Unity plugin to the V2 architecture.

## Summary of Changes

| V1 | V2 |
|----|-----|
| BinaryFormatter + GZip | FlatBuffers (.gsb) |
| Transpiled routines (index-based) | Native C# methods with attributes (ID-based) |
| ScriptableObject references | Raw int IDs + custom property drawers |
| Lease/block async pattern | Unity Awaitables + AwaitableCompletionSource |
| IMGUI property drawers | UI Toolkit (code-only) |
| Binary search lookups | Direct array index access |
| Build step required | No build step (hot-reload) |
| Tick-based state machine | Fully async Run() method |
| Flag system for inter-conversation communication | Removed |

---

## Phase 1: Core Runtime ✅ COMPLETE

### 1.1 FlatBuffers Integration ✅
- [x] Add FlatBuffers DLL to `Runtime/Lib/FlatBuffers/Google.FlatBuffers.dll`
- [x] Generate C# classes from schema (`flatc --csharp --gen-object-api`)
- [x] Created `Runtime/Generated/GameScript/` folder with generated code

### 1.2 Snapshot Loading ✅
- [x] Rewrote `GameScriptDatabase.cs` for FlatBuffers loading
- [x] Created `Manifest.cs` for manifest.json parsing (locales, hashes)
- [x] Implemented per-locale snapshot loading (`locales/{locale}.gsb`)
- [x] Implemented `ChangeLocale(ManifestLocale)` for runtime locale switching
- [x] Implemented editor hot-reload (check hash on Snapshot access, reload if stale)
- [x] Platform-specific loading for Android/WebGL via UnityWebRequest
- [x] Path caching to avoid string allocations

### 1.3 Attribute Definitions ✅
- [x] Created `Runtime/Attributes.cs` with:
  - `NodeConditionAttribute(int nodeId, int conversationId)`
  - `NodeActionAttribute(int nodeId, int conversationId)`

### 1.4 Jump Table Builder ✅
- [x] Created `Runtime/JumpTableBuilder.cs`
- [x] Reflection scan for attributed methods
- [x] Build arrays indexed by node array index (mapped from database ID)
- [x] Signature validation with warning logs

### 1.5 IDialogueContext Interface ✅
- [x] Created `Runtime/IDialogueContext.cs`
- [x] Properties: NodeId, ConversationId, Actor, VoiceText, UIResponseText, Properties

### 1.6 Lightweight Wrappers ✅
- [x] Created `Runtime/Refs.cs` with zero-allocation struct wrappers:
  - `NodeRef`, `ConversationRef`, `ActorRef`, `EdgeRef`, `LocalizationRef`
- [x] Wrappers provide clean API over FlatBuffers data

### 1.7 RunnerContext Refactoring ✅
- [x] Converted from tick-based to fully async `Run()` method
- [x] Replaced `ReadyNotifier`/`DecisionNotifier` with `AwaitableCompletionSource`
- [x] Jump table dispatch for conditions and actions
- [x] Error logging when HasCondition/HasAction is true but method is missing
- [x] Implements `IDialogueContext` interface
- [x] Reusable `List<NodeRef>` for choices (zero allocation)
- [x] Reusable `List<NodeProperty>` for properties (zero allocation)

### 1.8 GameScriptRunner Updates ✅
- [x] Removed Update() tick loop - contexts run themselves via async
- [x] Builds JumpTable on Initialize()
- [x] `StartConversation(int index, listener)` and `StartConversation(ConversationRef, listener)`
- [x] Removed flag-related APIs (SetFlag, RegisterFlagListener, etc.)
- [x] `async void RunConversationAsync()` to fire and forget conversations

### 1.9 Listener Interface Updates ✅
- [x] Updated `IGameScriptListener` to use `NodeRef` and `ConversationRef`
- [x] `OnNodeExit(IReadOnlyList<NodeRef> choices, DecisionNotifier)` for decisions

### 1.10 ActiveConversation Updates ✅
- [x] Removed flag-related methods
- [x] Made struct `readonly`

---

## Phase 1.5: Delete Obsolete V1 Runtime Code 🔄 IN PROGRESS

### Files to Delete
```
Runtime/Data/BaseData.cs
Runtime/Data/Conversation.cs
Runtime/Data/Node.cs
Runtime/Data/Edge.cs
Runtime/Data/Actor.cs
Runtime/Data/Localization.cs
Runtime/Data/Locale.cs
Runtime/Data/GameData.cs
Runtime/Data/Property.cs
Runtime/Execution/RoutineDirectory.cs
Runtime/Execution/RunnerRoutineState.cs
Runtime/Execution/RunnerScheduledBlock.cs
Runtime/Execution/Lease.cs
Runtime/Execution/RuntimeConstants.cs
Runtime/References/ActorReference.cs
Runtime/References/AssetReference.cs
Runtime/References/ConversationReference.cs
Runtime/References/LocaleReference.cs
Runtime/References/LocalizationReference.cs
```

### Files Already Updated
- [x] `Settings.cs` - Removed `MaxFlags` field

---

## Phase 2: Editor Tooling ⏳ NOT STARTED

### 2.1 Delete ScriptableObject System
- [ ] Delete all files in `Runtime/References/`
- [ ] Delete `Editor/Import/ReferenceGenerator.cs`
- [ ] Delete any Reference ScriptableObject assets
- [ ] Delete old IMGUI property drawers in `Editor/Menu/`

### 2.2 Property Drawer Attributes
- [ ] Create `GameScriptConversationAttribute`
- [ ] Create `GameScriptLocalizationAttribute`
- [ ] Create `GameScriptActorAttribute`

### 2.3 Picker Windows (UI Toolkit, code-only)
- [ ] `ConversationPickerWindow.cs` - Tag filters + search + ListView
- [ ] `LocalizationPickerWindow.cs` - Tag filters + search + ListView
- [ ] `ActorPickerWindow.cs` - Search + ListView

### 2.4 Property Drawers (UI Toolkit)
- [ ] `ConversationIdDrawer.cs` - Name display + picker button
- [ ] `LocalizationIdDrawer.cs`
- [ ] `ActorIdDrawer.cs`

### 2.5 Styles
- [ ] `gamescript-picker.uss`

---

## Phase 3: Build-Time Validation ⏳ NOT STARTED

### 3.1 Build Processor
- [ ] Implement `IPreprocessBuildWithReport`
- [ ] Load snapshot, run jump table generation
- [ ] Verify all HasCondition/HasAction nodes have methods
- [ ] Fail build with clear error messages including node/conversation IDs

---

## Phase 4: Delete Editor-Only V1 Code ⏳ NOT STARTED

### 4.1 Remove Transpilation
- [ ] Delete `Editor/Import/Transpiler/`
- [ ] Delete ANTLR-generated parser in `Editor/Generated/Antlr4/`

### 4.2 Remove SQLite Import
- [ ] Delete `Editor/Import/ConversationDataGenerator.cs`
- [ ] Delete `Editor/Import/DatabaseCodeGenerator.cs`
- [ ] Delete `Editor/Import/DatabaseImporter.cs`
- [ ] Delete SQLite models in `Editor/Generated/SQLite/`

### 4.3 Clean Up
- [ ] Remove unused dependencies from `Editor/Lib/`
- [ ] Update assembly definitions
- [ ] Update package.json

---

## Phase 5: Test Rig Updates ⏳ NOT STARTED

### 5.1 Update Example Code
- [ ] Convert example routines to attributed methods
- [ ] Update listener implementation for new API

### 5.2 Create Test Data
- [ ] Create sample .gsb snapshot
- [ ] Create sample manifest.json

---

## Current File Structure (Runtime)

### New V2 Files
```
Runtime/Attributes.cs                    ✅ Created
Runtime/IDialogueContext.cs              ✅ Created
Runtime/JumpTableBuilder.cs              ✅ Created
Runtime/Manifest.cs                      ✅ Created
Runtime/Refs.cs                          ✅ Created
Runtime/Lib/FlatBuffers/Google.FlatBuffers.dll  ✅ Added
Runtime/Generated/GameScript/*.cs        ✅ Generated
```

### Modified V2 Files
```
Runtime/Execution/GameScriptDatabase.cs  ✅ Rewritten
Runtime/Execution/GameScriptRunner.cs    ✅ Rewritten
Runtime/Execution/RunnerContext.cs       ✅ Rewritten
Runtime/Execution/RunnerListener.cs      ✅ Rewritten
Runtime/Execution/ActiveConversation.cs  ✅ Updated
Runtime/Execution/Settings.cs            ✅ Updated (removed MaxFlags)
```

### V1 Files to Delete
```
Runtime/Data/*.cs                        ❌ Delete
Runtime/References/*.cs                  ❌ Delete
Runtime/Execution/RoutineDirectory.cs    ❌ Delete
Runtime/Execution/RunnerRoutineState.cs  ❌ Delete
Runtime/Execution/RunnerScheduledBlock.cs ❌ Delete
Runtime/Execution/Lease.cs               ❌ Delete
Runtime/Execution/RuntimeConstants.cs    ❌ Delete
```

---

## Key Design Decisions Made

1. **Two AwaitableCompletionSources**: One for ready signals, one typed for decisions (returns node index)
2. **Lightweight wrapper structs**: `NodeRef`, `ConversationRef`, etc. hold snapshot + index, zero allocation
3. **Raw FlatBuffers access internally**: RunnerContext uses direct FlatBuffers access for performance, wrappers for public API
4. **Manifest includes locale info**: id, name, localizedName, hash per locale for language picker UI
5. **No flags system**: Removed entirely in V2
6. **Actor consistency check**: Only show player choices when all choice nodes have the same actor
