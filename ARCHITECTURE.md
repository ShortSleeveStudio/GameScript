# GameScript V2 Architecture

## Overview

GameScript is a cross-platform, IDE-centric dialogue authoring and runtime system:

1. **Authoring Layer**: Web-based visual graph editor embedded in IDEs (VS Code, Rider, Visual Studio). The IDE acts as the authoritative backend.
2. **Source of Truth**: Shared SQL database (PostgreSQL/SQLite) storing dialogue, nodes, actors, localizations.
3. **Runtime Layer**: Lightweight C#/C++ packages for Unity, Unreal, Godot consuming binary snapshots.

---

## Part 1: Architecture

### 1. The V2 Pivot: Native Code First

**V1 Problem**: Code was authored in Monaco (Electron), transpiled to C#. No IDE support for autocomplete, debugging, or refactoring.

**V2 Solution**:
- Conditions/actions written in native language (C#, C++, GDScript) in the developer's IDE
- Methods marked with attributes: `[NodeCondition(nodeId)]`, `[NodeAction(nodeId)]`
- Runtime reflection builds jump tables for O(1) function dispatch
- Graph editor shows read-only code previews

**What lives where**:

| Database | Code Files (Git) |
|----------|------------------|
| Graph structure (conversations, nodes, edges) | Action implementations |
| Localizations (key, locale, text) | Condition implementations |
| Boolean flags (`has_condition`, `has_action`) | Game-specific integrations |
| Actor definitions | |
| Node metadata (positions, UI hints) | |

**Code structure**:
```csharp
// Assets/Scripts/Dialogue/conv_123.cs
public static class Conversation_123
{
    [NodeCondition(456, 123)]
    public static bool Node_456_Condition(IDialogueContext ctx)
        => GameState.PlayerGold >= 10;

    [NodeAction(456, 123)]
    public static async Awaitable Node_456_Action(IDialogueContext ctx)
    {
        GameState.PlayerGold -= 10;
        await AnimationManager.Play("hand_over_gold");
        // ctx provides node data (actor, text, properties) if needed
    }
}
```

`IDialogueContext` provides read-only access to node data (actor, text, properties, flags). Game-specific logic (inventory, animations) lives in your own systems.

### 2. IDE Integration

**Workflow**:
1. Enable condition/action → IDE generates method stub, opens file
2. Write implementation with full IDE support
3. Inspector shows read-only preview (fetched via symbol provider)
4. Click to jump to method in IDE
5. Disable → confirmation with diff preview → method deleted

**File watcher**: Extension watches `conv_*.cs` and updates previews on change.

### 3. Function Binding (Jump Tables)

At runtime startup, the engine builds jump tables via reflection:

1. Load snapshot, find max `node.Id` across all nodes
2. Allocate arrays sized `maxNodeId + 1`: `Func<IDialogueContext, bool>[]` for conditions, `Func<IDialogueContext, Awaitable>[]` for actions
3. Scan assemblies for methods with `[NodeCondition(nodeId, conversationId)]`, `[NodeAction(nodeId, conversationId)]` attributes
4. Place function pointers at their `nodeId` index

**Dispatch**: `conditions[node.Id](ctx)` / `actions[node.Id](ctx)`. O(1), cache-friendly.

**Build-time validation**: Same jump table generation runs at build. If a node has `has_condition=true` or `has_action=true` but no corresponding method exists, fail the build.

### 4. Binary Snapshot System

**Format: FlatBuffers (.gsb)**
- Zero-copy: engines map snapshot into memory without parsing
- Minimal heap: data accessed directly from buffer
- Random access: O(1) lookups for nodes/conversations

**Distribution: Loose-File Bundle**
```
/GameScript/
  manifest.json          # Version, locales (id + code), primaryLocale, hashes
  /locales/*.gsb         # Per-locale snapshots (dialogue, actors, localizations)
```

**Update Strategy: Reactive Full Export**
- Trigger: IDE Focus Loss (Alt-Tab) or manual "Export Now" button
- Configuration: Settings panel in Inspector (snapshot output path, auto-export toggle)
- Smart writing: Hash comparison, only write if changed (clean Git history)
- Atomic swaps: Write to temp file, then rename

**Memory**: Load entire locale snapshot at startup/locale-swap. "Loading" = reading file into byte array.

### 5. UI Architecture

**Single Webview with Golden Layout** (same as V1):
- Avoids multiple heap complexity
- IDE plugins replace Electron OS access

| Panel | Purpose |
|-------|---------|
| Graph Editor | Visual node/edge editing (Svelte Flow) |
| Inspector | Properties of selected items + project settings |
| Conversation Finder | List/search conversations |
| Localization Editor | Edit localized strings |
| Actor Manager | Manage characters |
| Locale Manager | Manage languages |
| Search | Global content search |

**Inspector Panel Layout**:
- Top bar: Connection button (left) + Settings button (right)
- Connection accordion: Database type tabs, connection form
- Settings accordion: Snapshot output path, auto-export toggle, code workspace path, Export Now button
- Inspector content: Properties of selected graph items

**Supported IDEs**:
- VS Code (primary): `vscode.window.createWebviewPanel()`
- Rider (future): JCEF tool window
- Visual Studio (future): WebView2 tool window

### 6. Reactivity System

**Two-layer architecture**:

**Layer 1: In-Memory (DbRowView Stores)**
- Global map: rowId → DbRowView (one per row across entire app)
- Components subscribe via `$rowView` → automatic re-render
- CRUD → `DbRowView.onRowUpdated()` → all subscribers update

**Layer 2: Database Notifications**

| SQLite (single-user) | PostgreSQL (multiplayer) |
|---------------------|-------------------------|
| RETURNING sends rows via `db:changed` | NOTIFY with batched IDs (<8KB) |
| Immediate local update | All clients LISTEN, fetch independently |

**Key classes**:
- `DbRowView<T>` - Svelte Readable wrapping single row
- `DbTableView<T>` - Svelte Readable wrapping filtered/sorted rows
- `DbRowViewContainer<T>` - Manages ownership for row view sets
- `RowViewCache` - Singleton ensuring one DbRowView per row

### 7. Undo/Redo

Command pattern with multiplayer resilience:
- `Undoable` captures undo/redo functions + description
- `UndoManager` maintains stacks (max 100)
- On failure: remove from stack, notify user
- Reactive state: `canUndo`, `canRedo`, `nextUndoDescription`, `isBusy`

### 8. Notifications

Route through native IDE APIs:
- **Errors/Warnings**: `vscode.window.showErrorMessage/showWarningMessage`
- **Info/Success**: `vscode.window.setStatusBarMessage`

### 9. Localizations

- Export as CSV
- (future) Cloud spreadsheet sync
- (future) Engine plugin port for localization updates


### Reactivity Guidelines

**Reactivity follows meaning, not structure.** Ask: "What meaningful change requires this work?"

**Layers**:
1. **Row**: `rowView.data` / `rowView.id` → fine-grained
2. **Table**: `tableView.rows` → structural (added/removed/reordered)
3. **Domain**: Only relevant fields trigger work

**Pattern**:
```typescript
// Define semantic signals for meaningful changes
const nodeIds = $derived(() => tableView.rows.map(r => r.id).join(','));
const nodeGeometryKey = $derived(() =>
  tableView.rows.map(r => `${r.data.id}:${r.data.x}:${r.data.y}:${r.data.width}:${r.data.height}`).join('|')
);
const edgeTopologyKey = $derived(() =>
  tableView.rows.map(r => `${r.data.id}:${r.data.sourceId}:${r.data.targetId}:${r.data.type}`).join('|')
);

// Effects depend only on signals
function effectOn(signal: unknown, fn: () => void) {
    $effect(() => { signal; untrack(fn); });
}
effectOn(nodeIds, () => reconcileNodeMembership());
effectOn(nodeGeometryKey, () => reconcileNodeGeometry());
effectOn(edgeTopologyKey, () => reconcileEdgeTopology());

// Use snapshots inside effects
const snapshot = tableView.getRowsById(activeNodeIds);
```

**Benefits**: Explicit, minimal, composable, debuggable, performant.

---

## Developer Workflow Summary

1. **Write**: Native functions in IDE + design flow in GameScript Graph
2. **Sync**: On Save → update SQL → export .gsb
3. **Play**: Engine detects update, hot-reloads snapshot. Runtime uses jump table (nodeIndex → delegate) for dispatch
4. **Edit**: In-engine localization edits refocus IDE to specific node/line
