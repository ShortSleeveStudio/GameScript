# GameScript FlatBuffers Snapshot Schema

This document describes the binary snapshot format (.gsb) used by game engine runtimes to consume dialogue and localization data exported from GameScript.

## Overview

- **Format**: FlatBuffers (.gsb files)
- **Distribution**: Per-locale snapshots in `/GameScript/locales/*.gsb`
- **Design principle**: Index-based references, zero-copy, O(1) traversal

**Key design decisions:**
- All localized text is resolved at export time. Each locale gets its own snapshot with text baked in.
- All entity references use **array indices** instead of database IDs. This enables O(1) lookups without dictionaries.
- Original database IDs are preserved for code/condition/action lookups (e.g., `Node_123_Condition`).

---

## Schema Definition

### Root Table

```fbs
table Snapshot {
  // Conversation tags (for editor organization/filtering)
  conversation_tag_names: [string];
  conversation_tag_values: [[string]];

  // Dialogue data
  conversations: [Conversation];
  nodes: [Node];
  edges: [Edge];
  actors: [Actor];

  // Localization tags (for editor organization/filtering)
  localization_tag_names: [string];
  localization_tag_values: [[string]];

  // Localizations (non-dialogue strings)
  localizations: [Localization];

  // Property system
  property_templates: [PropertyTemplate];
}

root_type Snapshot;
```

### Tag System

Tags provide organizational structure for both conversations and localizations. Each entity type has its own independent tag system.

**Conversation tags** might include categories like: Act, Location, Quest, Emotion, Character
**Localization tags** might include categories like: Category (UI, Items), System (Inventory, Combat), Priority

The tag data is stored as:
- `*_tag_names`: Array of category names, e.g., `["Act", "Location", "Quest"]`
- `*_tag_values`: Array of arrays, one per category, e.g., `[["Act One", "Act Two"], ["The Docks", "Castle"], ["Main", "Side"]]`

Each entity stores indices into these arrays via `tag_indices`.

### Conversations

```fbs
table Conversation {
  id: int32;                    // Original database ID (for code lookups)
  name: string;
  notes: string;
  is_layout_auto: bool;
  is_layout_vertical: bool;
  tag_indices: [int32];         // Indices into conversation_tag_values arrays, -1 = untagged

  // Quick access to conversation's nodes and edges
  node_indices: [int32];        // INDICES into Snapshot.nodes array
  edge_indices: [int32];        // INDICES into Snapshot.edges array
  root_node_idx: int32;         // INDEX into Snapshot.nodes array (-1 = no root)
}
```

**Notes:**
- `is_deleted` and `is_system_created` are not exported (filtered at export time)
- `tag_indices` array length matches `conversation_tag_names` length
- Each index points into the corresponding `conversation_tag_values[i]` array
- Value of `-1` means untagged for that category
- `node_indices` and `edge_indices` provide O(1) access to a conversation's contents
- `root_node_idx` points to the root node for quick dialogue start

### Nodes

```fbs
enum NodeType : byte {
  Root = 0,
  Dialogue = 1,
}

table Node {
  id: int32;                    // Original database ID (for code lookups)
  conversation_idx: int32;      // INDEX into Snapshot.conversations array
  type: NodeType;
  actor_idx: int32;             // INDEX into Snapshot.actors array (-1 = no actor)
  voice_text: string;           // Resolved localized text for this locale
  ui_response_text: string;     // Resolved localized text for this locale
  has_condition: bool;
  has_action: bool;
  is_prevent_response: bool;
  position_x: float;
  position_y: float;
  notes: string;
  properties: [NodeProperty];

  // Graph traversal (indices into Snapshot.edges array)
  outgoing_edge_indices: [int32];  // Edges where this node is source, sorted by priority
  incoming_edge_indices: [int32];  // Edges where this node is target
}
```

**Notes:**
- `voice_text` and `ui_response_text` are resolved from localizations at export time
- Position data included for potential in-engine visualization/debugging
- `is_system_created` not exported
- `outgoing_edge_indices` enables O(1) graph traversal without building dictionaries
- `actor_idx` is -1 when the node has no actor assigned

### Edges

```fbs
enum EdgeType : byte {
  Default = 0,
  Hidden = 1,
}

table Edge {
  id: int32;                    // Original database ID (for reference)
  conversation_idx: int32;      // INDEX into Snapshot.conversations array
  source_idx: int32;            // INDEX into Snapshot.nodes array
  target_idx: int32;            // INDEX into Snapshot.nodes array
  priority: int32;
  type: EdgeType;
}
```

**Notes:**
- `notes` excluded (authoring-only metadata)
- `source_idx` and `target_idx` are array indices, enabling O(1) node access
- Edges in `Node.outgoing_edge_indices` are sorted by priority

### Actors

```fbs
table Actor {
  id: int32;
  name: string;
  localized_name: string;  // Resolved localized text
  color: string;           // Hex color, e.g., "#808080"
}
```

**Notes:**
- `is_system_created` and `notes` not exported
- `color` included for potential runtime use (dialogue UI theming)

### Localizations (Non-Dialogue Strings)

```fbs
table Localization {
  id: int32;
  name: string;        // Key, e.g., "menu.start", "item.sword.name"
  text: string;        // Resolved localized text for this locale
  tag_indices: [int32]; // Indices into localization_tag_values arrays, -1 = untagged
}
```

**Notes:**
- Only non-system-created localizations are included here
- System-created localizations are denormalized into nodes (voice_text, ui_response_text)
- Tags provide organizational structure (replaces the old group concept)

### Node Properties

```fbs
table PropertyTemplate {
  id: int32;              // Original database ID (for reference)
  name: string;
  type: PropertyType;
}

enum PropertyType : byte {
  String = 0,
  Integer = 1,
  Decimal = 2,
  Boolean = 3,
}

union PropertyValue {
  string_val: string,
  int_val: Int32Value,
  decimal_val: FloatValue,
  bool_val: BoolValue,
}

// Wrapper tables needed for union scalars in FlatBuffers
table Int32Value { value: int32; }
table FloatValue { value: float; }
table BoolValue { value: bool; }

table NodeProperty {
  template_idx: int32;    // INDEX into Snapshot.property_templates array
  value: PropertyValue;
}
```

**Notes:**
- Properties are embedded in Node.properties array
- Union ensures only one value type is stored per property
- `template_idx` is an array index, not a database ID

---

## Export Strategy

### Per-Locale Snapshots

```
/GameScript/
  manifest.json
  /locales/
    en.gsb
    fr.gsb
    de.gsb
    ja.gsb
```

Each `.gsb` contains the complete snapshot with all text resolved to that locale.

### Export Trigger

- File Save (Ctrl+S) or Focus Loss (Alt-Tab)
- Smart writing: Hash comparison, only write if content changed
- Atomic swaps: Write to temp file, then rename

### What Gets Exported

| Included | Excluded |
|----------|----------|
| Active conversations | Deleted conversations (`is_deleted = true`) |
| All nodes for active conversations | System-created metadata rows |
| All edges for active conversations | Authoring-only fields (notes on edges) |
| All actors | |
| Non-system-created localizations | |
| Tag categories and values | |
| Property templates and values | |

---

## Runtime Usage

### Loading

```csharp
// Load snapshot for current locale
byte[] buffer = File.ReadAllBytes($"GameScript/locales/{locale}.gsb");
Snapshot snapshot = Snapshot.GetRootAsSnapshot(new ByteBuffer(buffer));
```

### Graph Traversal (Zero Post-Processing)

Since all references are array indices, you can traverse the graph immediately:

```csharp
// Get a conversation and start at root
var conversation = snapshot.Conversations(0);
var rootNode = snapshot.Nodes(conversation.RootNodeIdx);

// Walk the graph
void WalkDialogue(Node node) {
    // Get actor (if any)
    if (node.ActorIdx >= 0) {
        var actor = snapshot.Actors(node.ActorIdx);
        Debug.Log($"{actor.LocalizedName}: {node.VoiceText}");
    }

    // Evaluate outgoing edges
    for (int i = 0; i < node.OutgoingEdgeIndicesLength; i++) {
        int edgeIdx = node.OutgoingEdgeIndices(i);
        var edge = snapshot.Edges(edgeIdx);

        // Check condition on target node
        var targetNode = snapshot.Nodes(edge.TargetIdx);
        if (!targetNode.HasCondition || EvaluateCondition(targetNode.Id)) {
            WalkDialogue(targetNode);
            break;  // Take first valid path
        }
    }
}
```

### ID Lookups (When Needed)

For code lookups (e.g., finding `Node_123_Condition`), build an ID map once:

```csharp
// Build on load if needed for code lookups
Dictionary<int, int> nodeIdToIndex = new();
for (int i = 0; i < snapshot.NodesLength; i++) {
    nodeIdToIndex[snapshot.Nodes(i).Id] = i;
}

// Then use for condition/action dispatch
int nodeIdx = nodeIdToIndex[nodeId];
var node = snapshot.Nodes(nodeIdx);
```

### Conversation Tag Filtering (Unity Editor)

```csharp
// Build tag filter dropdowns
for (int i = 0; i < snapshot.ConversationTagNamesLength; i++) {
    string categoryName = snapshot.ConversationTagNames(i);
    var values = snapshot.ConversationTagValues(i);  // string array
    // Populate dropdown: "All", values[0], values[1], ...
}

// Filter conversations by tags
bool MatchesTags(Conversation conv, int[] selectedIndices) {
    for (int i = 0; i < selectedIndices.Length; i++) {
        if (selectedIndices[i] == -1) continue;  // "All" selected
        if (conv.TagIndices(i) != selectedIndices[i]) return false;
    }
    return true;
}
```

### Localization Tag Filtering (Unity Editor)

```csharp
// Same pattern for localizations
for (int i = 0; i < snapshot.LocalizationTagNamesLength; i++) {
    string categoryName = snapshot.LocalizationTagNames(i);
    var values = snapshot.LocalizationTagValues(i);
    // Populate dropdown
}

// Filter localizations
bool MatchesTags(Localization loc, int[] selectedIndices) {
    for (int i = 0; i < selectedIndices.Length; i++) {
        if (selectedIndices[i] == -1) continue;
        if (loc.TagIndices(i) != selectedIndices[i]) return false;
    }
    return true;
}
```

### Localization Access

```csharp
// For dialogue: text is on the node
string voiceLine = node.VoiceText;

// For UI/items/etc: lookup by key
var startLabel = localizations.First(l => l.Name == "menu.start").Text;

// Or filter by tag first
int uiCategoryIndex = 0;  // "Category" tag
int uiValueIndex = 0;     // "UI" value
var uiStrings = localizations.Where(l => l.TagIndices(uiCategoryIndex) == uiValueIndex);
```

---

## SQL Schema Requirements

To support this snapshot format, the SQL schema needs tag tables for both entity types.

### Conversation Tags

```sql
CREATE TABLE conversation_tag_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE conversation_tag_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES conversation_tag_categories(id),
  name TEXT NOT NULL
);

-- Dynamic columns added to conversations table:
-- tag_category_1 INTEGER REFERENCES conversation_tag_values(id)
-- tag_category_2 INTEGER REFERENCES conversation_tag_values(id)
-- etc.
```

### Localization Tags

```sql
CREATE TABLE localization_tag_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE localization_tag_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES localization_tag_categories(id),
  name TEXT NOT NULL
);

-- Dynamic columns added to localizations table:
-- tag_category_1 INTEGER REFERENCES localization_tag_values(id)
-- tag_category_2 INTEGER REFERENCES localization_tag_values(id)
-- etc.
```

### Migration Notes

- The existing `filters` table and dynamic filter columns on `conversations` should be migrated to the new tag system
- The `parent` column on `localizations` can be deprecated for non-system localizations (tags replace the grouping function)
- System-created localizations continue to use `parent` for cascade deletion

---

## File Format Details

### FlatBuffers Configuration

```fbs
namespace GameScript;

file_identifier "GSPT";  // GameScript Snapshot
file_extension "gsb";
```

### Versioning

The `manifest.json` file tracks schema version:

```json
{
  "version": "1.0.0",
  "locales": ["en", "fr", "de", "ja"],
  "exported_at": "2025-01-15T10:30:00Z"
}
```

Runtime should validate version compatibility before loading snapshots.
