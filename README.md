# GameScript

A cross-platform dialogue authoring system for games. GameScript provides a visual graph editor embedded in IDEs, with runtime packages for Unity, Unreal, and Godot.

## Architecture Overview

GameScript consists of three layers:

1. **Authoring Layer** - A web-based visual graph editor embedded in IDE plugins (VS Code, Rider, Visual Studio)
2. **Source of Truth** - A shared SQL database (PostgreSQL or SQLite) storing dialogue, nodes, actors, and localizations
3. **Runtime Layer** - Lightweight packages for game engines that consume binary snapshots

### Key Design Principles

- **Code lives in the IDE** - Actions and conditions are written in native code (C#, C++, GDScript) with full IDE support
- **Database is source of truth** - Graph structure and localizations live in SQL; code lives in version-controlled files
- **Binary snapshots** - FlatBuffers format for zero-copy, high-performance runtime access
- **Single web UI** - Same Svelte-based editor across all IDE plugins

## Repository Structure

```
gamescript/
├── core/
│   ├── schema/              # FlatBuffer schemas (.fbs) and SQL migrations
│   └── generated/           # Auto-generated code from schemas
│       ├── ts/              # TypeScript (for UI and IDE plugins)
│       ├── csharp/          # C# (for Unity, VS, Rider)
│       └── cpp/             # C++ (for Unreal)
│
├── ui/                      # Svelte web UI (graph editor)
│   ├── src/
│   └── dist/                # Built assets (copied into IDE plugins)
│
├── shared/                  # Shared TypeScript utilities
│   └── src/                 # Types, helpers, query builders
│
├── plugins/
│   ├── vscode/              # VS Code extension
│   └── dotnet/              # Shared C# logic for .NET IDEs
│       ├── visual-studio/   # Visual Studio extension
│       └── rider/           # JetBrains Rider plugin
│
├── runtimes/
│   ├── unity/               # Unity package
│   ├── unreal/              # Unreal plugin
│   └── godot/               # Godot addon
│
└── tools/                   # CLI tools for CI/CD and headless exports
```

## Prerequisites

- Node.js 18+
- pnpm 8+

## Getting Started

### Install Dependencies

```bash
pnpm install
```

This installs dependencies for all workspace packages (UI, shared, VS Code plugin).

### Build Everything

```bash
pnpm build
```

Builds in order:
1. `shared/` - TypeScript utilities
2. `ui/` - Svelte web UI
3. `plugins/vscode/` - VS Code extension (copies UI dist into plugin)

### Development Mode

```bash
pnpm dev
```

Runs all packages in watch mode with hot reload.

## Testing the VS Code Extension

1. Open `plugins/vscode/` in VS Code
2. Run `pnpm build` from the repository root
3. Press **F5** to launch the Extension Development Host
4. In the new VS Code window, click the GameScript icon in the Activity Bar

Alternatively, use **"Run Extension (No Build)"** launch configuration if you've already built.

## Workspace Packages

| Package | Name | Description |
|---------|------|-------------|
| `ui/` | `@gamescript/ui` | Svelte-based graph editor |
| `shared/` | `@gamescript/shared` | Shared TypeScript types and utilities |
| `plugins/vscode/` | `@gamescript/vscode` | VS Code extension |

Packages reference each other using pnpm workspace protocol:

```json
"dependencies": {
  "@gamescript/shared": "workspace:*"
}
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm build` | Build all packages |
| `pnpm dev` | Run all packages in watch mode |
| `pnpm clean` | Remove all build artifacts |
| `pnpm lint` | Run linters |
| `pnpm test` | Run tests |
| `pnpm format` | Format code with Prettier |

## Runtime Binary Format

GameScript exports dialogue data as FlatBuffer binaries (`.gsb` files):

- **Zero-copy access** - Data is read directly from memory-mapped files
- **Per-locale bundles** - Each language gets its own binary blob
- **Atomic updates** - Files are written atomically to prevent corruption

Export is triggered on save and only writes files when content has changed.

## IDE Plugin Architecture

All IDE plugins embed the same web UI and act as the "backend":

- **VS Code** - Uses `vscode.window.createWebviewPanel()`
- **Rider** - Uses JCEF (Chromium Embedded Framework)
- **Visual Studio** - Uses WebView2

The web UI communicates with the IDE via message passing. The IDE handles:
- Database connections (SQLite/PostgreSQL)
- File system access
- Code generation and symbol lookup
- Binary snapshot export

## Engine Runtime Architecture

Engine runtimes are lightweight consumers of `.gsb` files:

1. Load locale bundle into memory at startup
2. Use generated lookup tables for instant function dispatch
3. Query nodes and edges with O(1) access via FlatBuffers

Actions and conditions are native functions marked with attributes:

```csharp
// Unity example
[NodeCondition(456)]
public static bool Node_456_Condition(IDialogueContext ctx)
{
    return ctx.HasItem("gold", 10);
}

[NodeAction(456)]
public static async ValueTask Node_456_Action(IDialogueContext ctx)
{
    ctx.RemoveItem("gold", 10);
    await ctx.PlayAnimation("hand_over_gold");
}
```

## License

Proprietary - All rights reserved.
