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
- Methods marked with attributes: `[NodeCondition(id)]`, `[NodeAction(id)]`
- Build-time source generator assigns integer IDs for O(1) function pointer lookup
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
    [NodeCondition(456)]
    public static bool Node_456_Condition(IDialogueContext ctx)
        => ctx.HasItem("gold", 10);

    [NodeAction(456)]
    public static async ValueTask Node_456_Action(IDialogueContext ctx)
    {
        ctx.RemoveItem("gold", 10);
        await ctx.PlayAnimation("hand_over_gold");
    }
}
```

### 2. IDE Integration

**Workflow**:
1. Enable condition/action → IDE generates method stub, opens file
2. Write implementation with full IDE support
3. Inspector shows read-only preview (fetched via symbol provider)
4. Click to jump to method in IDE
5. Disable → confirmation with diff preview → method deleted

**File watcher**: Extension watches `conv_*.cs` and updates previews on change.

### 3. Build-Time Validation

1. Source generator scans for `[NodeCondition]`, `[NodeAction]` attributes
2. Validates nodes with `has_condition=true`/`has_action=true` have methods
3. Assigns stable integer IDs
4. Generates `DialogueRegistry.cs` with lookup tables

**Runtime**: Array-based dispatch. Cost: one array index + one delegate call.

*Note: Consider pre-build generation during authoring for in-editor dialogue playback.*

### 4. Binary Snapshot System

**Format: FlatBuffers (.gsb)**
- Zero-copy: engines map snapshot into memory without parsing
- Minimal heap: data accessed directly from buffer
- Random access: O(1) lookups for nodes/conversations

**Distribution: Loose-File Bundle**
```
/GameScript/
  manifest.json          # Version, locale list, chunk offsets
  /locales/*.gsb         # Per-language dialogue/strings
  /common/*.gsb          # Actors, variables
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

---

## Part 2: Way of Work

### Non-Negotiable Principles

0. **Don't make decisions without me.** No unilateral functionality changes. Don't ignore prior decisions.

1. **Never lose reactivity.** Every change must maintain identical reactive behavior.

2. **Never change functionality without approval.** Stop and discuss behavioral changes first.

3. **Investigate downstream effects.** Trace all consumers before changing code.

4. **Never take the easy way out.** Choose architecturally correct over quick fix.

5. **First principles thinking.** Design as if building fresh with Svelte 5.

6. **Incremental and testable.** Each phase = working, testable application.

7. **Always improving.** Surface improvement opportunities.

8. **Assume nothing.** Deep-dive diff functions with same names for feature parity.

9. **Let the user know.** Use notification helpers:
```typescript
import { toastError, toastWarning, notifyError, notifyWarning } from '$lib/stores/notifications.js';
```

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
2. **Sync**: On Save → update SQL → export .gsb + function pointer table
3. **Play**: Engine detects update, hot-reloads snapshot. Runtime uses `function_id` → lookup table → native call
4. **Edit**: In-engine localization edits refocus IDE to specific node/line
