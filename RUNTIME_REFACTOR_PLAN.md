# GameScript Runtime Refactor Plan

This document outlines the migration from Google FlatBuffers to FlatSharp and restructuring for multi-engine support (Unity + Godot).

## Goals

1. **Migrate to FlatSharp** - 2-4x faster, less memory allocation, idiomatic C# API
2. **Share FlatSharp types between engines** - Single core library with generated types
3. **Hide FlatSharp from consumers** - Each engine runtime uses ILRepack to internalize dependencies
4. **Engine-specific runtimes** - Each engine implements its own async patterns and APIs

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         core/schema/snapshot.fbs                     │
│                    (FlatBuffers schema - shared by all)              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Source: runtimes/unity/Packages/.../Runtime/ & Editor/             │
│  (Single source of truth - Unity package contains all .cs files)   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      runtimes/csharp/                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  GameScript.Core/                                            │    │
│  │    - FlatSharp-generated types: Snapshot, Node, Actor, etc. │    │
│  │    - Attributes.cs: NodeCondition, NodeAction               │    │
│  │    - Manifest.cs: Plain C# manifest model                   │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │  GameScript.Unity/                                           │    │
│  │    - References source from Unity package via <Compile>     │    │
│  │    - No duplicate .cs files here                            │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │  GameScript.Unity.Editor/                                    │    │
│  │    - References source from Unity package via <Compile>     │    │
│  │    - No duplicate .cs files here                            │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │  Dependencies/Unity/                                         │    │
│  │    - Unity reference assemblies for compilation             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Build Output (ILRepack via build.sh / pnpm run build:csharp):     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ dist/GameScript.Unity.dll (~1MB)                              │   │
│  │   - GameScript.Core (internalized)                            │   │
│  │   - FlatSharp.Runtime (internalized)                          │   │
│  │   - Unity runtime code                                        │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ dist/GameScript.Unity.Editor.dll (~28KB)                      │   │
│  │   - Editor code (references GameScript.Unity.dll)             │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insights**:
- Source files live in Unity package (single source of truth)
- csproj files reference Unity package source via `<Compile Include="..\..\unity\...">`
- Build happens outside Unity using reference assemblies
- ILRepack merges everything into distribution DLLs with FlatSharp internalized

---

## Project Structure

```
core/
└── schema/
    └── snapshot.fbs                        # Shared schema (all languages)
                                            # Contains fs_serializer attribute for FlatSharp

runtimes/
├── csharp/                                 # Build infrastructure (csproj files only)
│   ├── GameScript.Core/                    # Core library (.NET Standard 2.1)
│   │   ├── GameScript.Core.csproj
│   │   ├── Attributes.cs                   # NodeCondition, NodeAction attributes
│   │   └── Manifest.cs                     # manifest.json model (plain C#)
│   │
│   ├── GameScript.Unity/                   # Unity runtime build config
│   │   └── GameScript.Unity.csproj         # References source from Unity package
│   │
│   ├── GameScript.Unity.Editor/            # Unity editor build config
│   │   └── GameScript.Unity.Editor.csproj  # References source from Unity package
│   │
│   ├── Dependencies/Unity/                 # Unity reference assemblies (from Unity 6000.x)
│   │   ├── UnityEngine.dll
│   │   ├── UnityEngine.CoreModule.dll
│   │   ├── UnityEditor.dll
│   │   ├── UnityEditor.CoreModule.dll
│   │   ├── UnityEngine.UIElementsModule.dll
│   │   ├── UnityEngine.IMGUIModule.dll
│   │   ├── UnityEngine.JSONSerializeModule.dll
│   │   └── UnityEngine.TextRenderingModule.dll
│   │
│   ├── .config/dotnet-tools.json           # dotnet-ilrepack tool manifest
│   ├── build.sh                            # Builds all + ILRepack merge
│   └── dist/                               # Build output
│       ├── GameScript.Unity.dll            # ~1MB merged DLL
│       └── GameScript.Unity.Editor.dll     # ~28KB editor DLL
│
├── unity/                                  # Unity project (SOURCE OF TRUTH for .cs)
│   ├── Packages/studio.shortsleeve.gamescriptunity/
│   │   ├── Runtime/                        # Runtime source files
│   │   │   ├── Execution/
│   │   │   │   ├── GameScriptRunner.cs
│   │   │   │   ├── GameScriptDatabase.cs
│   │   │   │   ├── RunnerContext.cs
│   │   │   │   └── ...
│   │   │   ├── JumpTableBuilder.cs
│   │   │   ├── IDialogueContext.cs
│   │   │   ├── Refs.cs
│   │   │   ├── Ids.cs
│   │   │   └── Plugins/                    # For distribution: merged DLL goes here
│   │   ├── Editor/                         # Editor source files
│   │   │   ├── Build/
│   │   │   ├── Menu/
│   │   │   ├── Pickers/
│   │   │   ├── PropertyDrawers/
│   │   │   └── Plugins/                    # For distribution: editor DLL goes here
│   │   └── package.json
│   └── Assets/TestRig/                     # Development test scene
│
└── godot/                                  # Future - Godot-specific runtime
    └── addons/gamescript/
        └── ...
```

---

## Phase 1: Create C# Core Library ✅ COMPLETE

### 1.1 Project Setup ✅
- [x] Create `runtimes/csharp/GameScript.Core/GameScript.Core.csproj` targeting .NET Standard 2.1
- [x] Add NuGet reference to `FlatSharp.Runtime` 7.9.0
- [x] Add NuGet reference to `FlatSharp.Compiler` 7.9.0 (build-time code gen)
- [x] Configure FlatSharp to generate from `../../../core/schema/snapshot.fbs`

### 1.2 Schema Updates ✅
- [x] Add `attribute "fs_serializer"` to snapshot.fbs
- [x] Add `(fs_serializer)` attribute to Snapshot table for serializer generation

### 1.3 Core Library Contents ✅
- [x] FlatSharp-generated types (Snapshot, Node, Actor, Edge, etc.)
- [x] `Attributes.cs` - NodeCondition, NodeAction attributes
- [x] `Manifest.cs` - Plain C# manifest model (no Unity attributes)

---

## Phase 2: Unity Runtime ✅ COMPLETE (Build System)

### 2.1 Project Structure ✅
- [x] Create `runtimes/csharp/GameScript.Unity/` project (csproj only, no source)
- [x] Create `runtimes/csharp/GameScript.Unity.Editor/` project (csproj only, no source)
- [x] Create `runtimes/csharp/Dependencies/Unity/` with reference assemblies
- [x] Configure csproj files to reference source from Unity package

### 2.2 Unity Reference Assemblies ✅
- [x] Copy `UnityEngine.dll`, `UnityEngine.CoreModule.dll` from Unity 6000.x
- [x] Copy `UnityEditor.dll`, `UnityEditor.CoreModule.dll`
- [x] Copy `UnityEngine.UIElementsModule.dll`, `UnityEngine.IMGUIModule.dll`
- [x] Copy `UnityEngine.JSONSerializeModule.dll`, `UnityEngine.TextRenderingModule.dll`

### 2.3 Update Code for FlatSharp API ✅
- [x] Update `Refs.cs` - Change `.Nodes(i).Value` to `.Nodes[i]`
- [x] Update `RunnerContext.cs` - FlatSharp types and API
- [x] Update `JumpTableBuilder.cs` - FlatSharp types and API
- [x] Update `GameScriptDatabase.cs` - Use `Snapshot.Serializer.Parse()`
- [x] Update all picker windows for FlatSharp API
- [x] Update `GameScriptBuildProcessor.cs` for FlatSharp API
- [x] Add `using UnityEditor.UIElements` to BasePickerWindow.cs

### 2.4 Build System ✅
- [x] Create `build.sh` that:
  - Builds GameScript.Unity.Editor.csproj (which builds Core and Unity)
  - Uses ILRepack to merge Core + FlatSharp.Runtime + Unity → `dist/GameScript.Unity.dll`
  - Creates `dist/GameScript.Unity.Editor.dll`
- [x] Configure `/internalize` to hide FlatSharp types from consumers
- [x] Add npm script: `pnpm run build:csharp`

### 2.5 Testing ✅
- [x] Update TestRig to use FlatSharp API (fixed `Tester.cs` collection access)
- [ ] Copy dist DLLs to Unity package Plugins folders (distribution mode only)
- [ ] Verify TestRig works with built DLLs (distribution mode)
- [ ] Test hot-reload functionality

---

## Phase 3: Godot Runtime (Future)

### 3.1 Project Setup
- [ ] Create `runtimes/csharp/GameScript.Godot/` project
- [ ] Reference GameScript.Core project
- [ ] Add Godot reference assemblies

### 3.2 Implement Godot Runtime
- [ ] Create `GodotRunner` (Node-derived entry point)
- [ ] Create `DialogueExecutor` using async/await with Tasks
- [ ] Create `JumpTableBuilder` with Godot logging
- [ ] Create signal-based listener pattern (Godot idiomatic)

### 3.3 Create Distribution Build
- [ ] Update build.sh to also build Godot
- [ ] Merge all dependencies into single `GameScript.Godot.dll`

---

## API Changes Summary

### FlatSharp vs Google FlatBuffers

| Aspect | Google FlatBuffers | FlatSharp |
|--------|-------------------|-----------|
| Object Type | `struct` wrapping ByteBuffer | Real C# `class` |
| Field Access | Methods: `node.Name()` | Properties: `node.Name` |
| Nullability | `node.HasValue`, `node.Value` | Direct nullable: `node?.Name` |
| Collections | `node.Edges(i)`, `node.EdgesLength` | `IList<Edge>`, `.Count` |
| Root Access | `Snapshot.GetRootAsSnapshot(new ByteBuffer(buffer))` | `Snapshot.Serializer.Parse(new ArrayInputBuffer(buffer))` |

### Code Migration Examples

**Before (Google FlatBuffers):**
```csharp
using Google.FlatBuffers;

byte[] data = File.ReadAllBytes("snapshot.gsb");
Snapshot snapshot = Snapshot.GetRootAsSnapshot(new ByteBuffer(data));

for (int i = 0; i < snapshot.NodesLength; i++)
{
    Node? node = snapshot.Nodes(i);
    if (node.HasValue)
    {
        string text = node.Value.VoiceText;
        int actorIdx = node.Value.ActorIdx;
    }
}
```

**After (FlatSharp):**
```csharp
using FlatSharp;

byte[] data = File.ReadAllBytes("snapshot.gsb");
Snapshot snapshot = Snapshot.Serializer.Parse(new ArrayInputBuffer(data));

foreach (Node node in snapshot.Nodes)
{
    string? text = node.VoiceText;
    int actorIdx = node.ActorIdx;
}
```

---

## Build & CI

### Full Build (Core + Unity + Editor)
```bash
# From repository root
pnpm run build:csharp

# Or directly
cd runtimes/csharp
./build.sh
```

Output:
- `dist/GameScript.Unity.dll` (~1MB) - Merged runtime with FlatSharp internalized
- `dist/GameScript.Unity.Editor.dll` (~28KB) - Editor code

### What the build does:
1. Restores dotnet tools (ILRepack)
2. Builds `GameScript.Unity.Editor.csproj` (which builds Core and Unity as dependencies)
   - Source files are referenced from `runtimes/unity/Packages/.../Runtime/` and `Editor/`
3. Uses ILRepack to merge:
   - `GameScript.Unity.dll`
   - `GameScript.Core.dll`
   - `FlatSharp.Runtime.dll`
   - `System.Buffers.dll`, `System.Memory.dll`, etc.
4. Creates separate `GameScript.Unity.Editor.dll`

---

## Development vs Distribution

### Development Mode
- Unity loads source `.cs` files directly from the package
- Edit code, Unity recompiles automatically
- Full debugging with line numbers

### Distribution Mode
- Copy `dist/GameScript.Unity.dll` to `Runtime/Plugins/`
- Copy `dist/GameScript.Unity.Editor.dll` to `Editor/Plugins/`
- Remove or exclude source files
- FlatSharp types are hidden from consumers

---

## Current Status

- [x] Phase 1: Create Core Library - **COMPLETE**
- [x] Phase 2: Unity Runtime - **COMPLETE** (source mode ready, distribution mode pending DLL copy)
- [ ] Phase 3: Godot Runtime - NOT STARTED

### Next Steps
1. Open Unity and test TestRig with source files (development mode)
2. For distribution: copy `dist/*.dll` to Unity package `Plugins/` folders
3. Update package.json if needed
