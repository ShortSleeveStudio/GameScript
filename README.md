# GameScript

A cross-platform dialogue authoring system for games. GameScript provides a visual graph editor embedded in IDEs (VS Code, Rider), with runtime packages for Unity, Unreal, and Godot.

## What is GameScript?

GameScript is a complete dialogue middleware solution that lets game developers:

- **Design dialogue flows** using a visual node-based graph editor
- **Write game logic** in native code (C#, C++, GDScript) with full IDE support
- **Collaborate** using PostgreSQL for team projects or SQLite for solo development
- **Deploy** high-performance binary snapshots to game engines

Unlike traditional dialogue tools that use embedded scripting languages, GameScript keeps all game logic in native code files. Actions and conditions are regular functions that get full IDE support: autocomplete, debugging, refactoring, and type checking.

## Features

- **Visual Graph Editor** - Node-based dialogue authoring with drag-and-drop
- **Multi-IDE Support** - VS Code and JetBrains Rider plugins
- **Native Code Integration** - Conditions and actions written in C#/C++/GDScript
- **Database-Backed** - PostgreSQL for teams, SQLite for individuals
- **Localization** - Built-in multi-language support with CSV export
- **Binary Snapshots** - FlatBuffers format for zero-copy runtime access
- **Hot Reload** - Automatic export on save, instant updates in-engine
- **Undo/Redo** - Full history with multiplayer resilience
- **Golden Layout UI** - Customizable panel arrangement

## Repository Structure

```
gamescript/
├── core/                       # Core schemas and generated code
│   ├── schema/                 # FlatBuffer schemas (.fbs)
│   └── generated/              # Auto-generated code
│       ├── ts/                 # TypeScript (UI, IDE plugins)
│       ├── csharp/             # C# (Unity, .NET IDEs)
│       └── cpp/                # C++ (Unreal)
│
├── shared/                     # Shared TypeScript package
│   └── src/                    # Types, query builders, utilities
│
├── ui/                         # Svelte web UI (graph editor)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api/            # Bridge to IDE plugins
│   │   │   ├── components/     # Svelte components
│   │   │   ├── db/             # Database abstraction layer
│   │   │   └── stores/         # Svelte stores
│   │   └── routes/             # SvelteKit routes
│   └── dist/                   # Built assets
│
├── plugins/
│   ├── vscode/                 # VS Code extension
│   │   └── src/
│   │       ├── database.ts     # SQLite/PostgreSQL connections
│   │       ├── panel.ts        # Webview panel management
│   │       └── handlers/       # Message handlers
│   ├── rider/                  # JetBrains Rider plugin (Kotlin)
│   │   └── src/main/kotlin/
│   └── dotnet/                 # Shared .NET code (future)
│
├── runtimes/
│   ├── unity/                  # Unity package
│   │   └── Packages/studio.shortsleeve.gamescript/
│   ├── csharp/                 # Shared C# runtime code
│   ├── unreal/                 # Unreal plugin (planned)
│   └── godot/                  # Godot addon (planned)
│
└── tools/                      # CLI tools (planned)
```

## Component Overview

### UI (`ui/`)

The web-based graph editor built with:
- **Svelte 5** - Reactive UI framework
- **SvelteKit** - Build tooling and routing
- **@xyflow/svelte** - Node graph visualization
- **Golden Layout** - Dockable panel system
- **ELK** - Automatic graph layout

The UI is embedded in IDE plugins via webview and communicates through a message bridge.

### Shared (`shared/`)

TypeScript package containing:
- Database schema types
- SQL query builders
- FlatBuffer type definitions
- Shared utilities

### VS Code Plugin (`plugins/vscode/`)

Extension providing:
- Webview panel hosting the UI
- SQLite and PostgreSQL database connections
- File system access for code generation
- Binary snapshot export

### Rider Plugin (`plugins/rider/`)

Kotlin-based plugin for JetBrains Rider:
- JCEF browser hosting the UI
- Same database and file system capabilities as VS Code
- Native IDE integration

### Unity Runtime (`runtimes/unity/`)

Unity package providing:
- FlatBuffer snapshot loading
- Dialogue state machine
- Attribute-based function binding
- Editor tooling

## Prerequisites

- **Node.js** 18+
- **pnpm** 8+
- **JDK** 17+ (for Rider plugin)

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Build Everything

```bash
pnpm build
```

Builds in dependency order:
1. `shared/` - TypeScript utilities
2. `ui/` - Svelte web UI
3. `plugins/vscode/` - VS Code extension

### Development Mode

```bash
pnpm dev
```

Runs all packages in watch mode with hot reload.

### Build Rider Plugin

```bash
pnpm build:rider
```

Or manually:
```bash
cd plugins/rider
./gradlew buildPlugin
```

The built plugin ZIP will be in `plugins/rider/build/distributions/`.

## Testing

### Run All Tests

```bash
pnpm test
```

### Test Individual Packages

```bash
# UI tests
pnpm --filter @gamescript/ui test

# Shared package tests
pnpm --filter @gamescript/shared test
```

### Testing VS Code Extension

1. Open the repository root in VS Code
2. Run `pnpm build`
3. Press **F5** to launch Extension Development Host
4. Click the GameScript icon in the Activity Bar

### Testing Rider Plugin

```bash
pnpm dev:rider
```

This builds the UI and launches a sandboxed Rider instance with the plugin.

## Packaging

### VS Code Extension

```bash
pnpm package:vscode
```

Creates `.vsix` file in `plugins/vscode/`.

### Rider Plugin

```bash
pnpm package:rider
```

Creates plugin ZIP in `plugins/rider/build/distributions/`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm build` | Build all packages |
| `pnpm build:rider` | Build Rider plugin |
| `pnpm dev` | Run all packages in watch mode |
| `pnpm dev:rider` | Build UI and run Rider sandbox |
| `pnpm test` | Run all tests |
| `pnpm lint` | Run linters |
| `pnpm format` | Format code with Prettier |
| `pnpm clean` | Remove build artifacts |
| `pnpm package:vscode` | Package VS Code extension |
| `pnpm package:rider` | Package Rider plugin |

## Architecture

### Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Graph UI   │ ──▶ │   Database   │ ──▶ │  .gsb File  │
│  (Svelte)   │     │ (SQL/Postgres)│     │ (FlatBuffer)│
└─────────────┘     └──────────────┘     └─────────────┘
       │                                        │
       │ Messages                               │ Load
       ▼                                        ▼
┌─────────────┐                          ┌─────────────┐
│ IDE Plugin  │                          │   Engine    │
│(VSCode/Rider)│                          │   Runtime   │
└─────────────┘                          └─────────────┘
```

### Native Code Integration

Actions and conditions are written in native code with attribute markers:

```csharp
// Unity C# example
[NodeCondition(456)]
public static bool HasEnoughGold(IDialogueContext ctx)
{
    return GameState.PlayerGold >= 10;
}

[NodeAction(456)]
public static async Awaitable HandOverGold(IDialogueContext ctx)
{
    GameState.PlayerGold -= 10;
    await AnimationManager.Play("hand_over_gold");
}
```

At runtime, the engine builds jump tables for O(1) function dispatch.

### Database

- **SQLite** - Single-user, file-based, no setup required
- **PostgreSQL** - Multi-user, real-time collaboration via LISTEN/NOTIFY

Both support the same schema and UI. Switch between them in the connection panel.

### Binary Snapshots

Export format uses FlatBuffers for:
- Zero-copy memory mapping
- O(1) random access
- Minimal memory footprint
- Per-locale bundles

## Troubleshooting

### Rider Plugin: Slow/Jerky Scrolling

If you experience slow or jerky scrolling in the Rider plugin, disable out-of-process JCEF:

1. Go to **Help → Find Action** (or press `Ctrl+Shift+A` / `Cmd+Shift+A`)
2. Search for "Registry..."
3. Find `ide.browser.jcef.out-of-process.enabled`
4. Uncheck it
5. Restart Rider

## Versioning

See [VERSIONING.md](VERSIONING.md) for the list of files that need version bumps.

## Architecture Details

See [ARCHITECTURE.md](ARCHITECTURE.md) for in-depth technical documentation.

## License

See [LICENSE.md](LICENSE.md).
