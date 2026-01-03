# GameScript Unity Runtime Architecture

Unity-specific implementation of the GameScript V2 runtime.

## Overview

The Unity runtime consumes FlatBuffers snapshots (.gsb) and executes dialogue with native C# conditions/actions. No build step required between authoring and play.

**Key components:**
- **GameScriptRunner**: MonoBehaviour entry point, manages conversation lifecycle
- **GameScriptDatabase**: Loads snapshots, provides data access, manages hot-reload
- **RunnerContext**: State machine for individual conversation execution
- **Jump Tables**: Array-based dispatch for conditions/actions

---

## 1. Snapshot Loading

### Runtime (Builds)
Load snapshot once at startup or locale change:

```csharp
byte[] buffer = File.ReadAllBytes($"GameScript/locales/{locale}.gsb");
Snapshot snapshot = Snapshot.GetRootAsSnapshot(new ByteBuffer(buffer));
```

FlatBuffers provides zero-copy access - data is read directly from the buffer.

### Editor (Hot-Reload)
Lazy loading with staleness check:

```csharp
public Snapshot GetSnapshot()
{
    string currentHash = ReadManifestHash();
    if (currentHash != _loadedHash)
    {
        ReloadSnapshot();
        _loadedHash = currentHash;
    }
    return _snapshot;
}
```

The manifest.json contains per-locale `hashes` updated on each export. This enables instant iteration - edit in GameScript, alt-tab to Unity, data is fresh.

---

## 2. Condition/Action System

### Native C# Methods
Developers write conditions and actions in their IDE with full tooling support:

```csharp
public static class TavernConversation
{
    [NodeCondition(456)]  // nodeId
    public static bool HasGold(IDialogueContext ctx)
        => GameState.PlayerGold >= 10;

    [NodeAction(456)]
    public static async Awaitable PayGold(IDialogueContext ctx)
    {
        GameState.PlayerGold -= 10;
        await AnimationManager.Play("hand_over_gold");

        // Can access node data if needed
        Actor actor = ctx.Actor;  // Who's speaking
    }
}
```

**Conditions**: Synchronous, return `bool`. Called during edge traversal.
**Actions**: Async via `Awaitable`. Called when entering a node.

Game-specific logic (inventory, animations, etc.) is accessed through your own systems. The `IDialogueContext` provides read-only access to the current node's data.

### Jump Table Construction
On startup, reflection scans for attributed methods and builds jump tables:

```csharp
// Attributes specify nodeId
[NodeCondition(nodeId)]
[NodeAction(nodeId)]

// At startup:
// 1. Load snapshot, build ID-to-index map
// 2. Allocate arrays parallel to snapshot.Nodes
// 3. Scan assemblies for attributed methods
// 4. Place function pointers at their node's array index

// At runtime:
if (node.HasCondition)
    bool result = conditions[nodeIndex](context);
if (node.HasAction)
    await actions[nodeIndex](context);
```

**Why arrays, not dictionaries:**
- O(1) lookup with no hashing overhead
- Cache-friendly
- Node IDs may be sparse, but memory overhead is minimal

### IDialogueContext
Read-only access to the current node's data:

```csharp
public interface IDialogueContext
{
    // Current node data (from FlatBuffers snapshot)
    int NodeId { get; }
    int ConversationId { get; }
    Actor? Actor { get; }              // Who's speaking (null if none)
    string VoiceText { get; }          // Localized dialogue text
    string UIResponseText { get; }     // Localized choice button text
    NodeProperty[] Properties { get; } // Custom metadata

    // Flag system (inter-conversation communication)
    void SetFlag(int flag);
    bool IsFlagSet(int flag);
}
```

The context provides node data - game-specific logic lives in your own code.

---

## 3. Dialogue State Machine

The RunnerContext implements a state machine for conversation flow:

```
ConversationEnter
    ↓ (OnConversationEnter callback)
ConversationEnterWait
    ↓ (wait for ReadyNotifier)
NodeEnter
    ↓ (OnNodeEnter callback)
NodeEnterWait
    ↓ (wait for ReadyNotifier)
NodeExecute
    ↓ (execute action via jump table, await completion)
NodeExit
    ↓ (evaluate conditions on outgoing edges)
    ├→ No valid edges? → ConversationExit
    ├→ Multiple choices? → NodeDecisionWait
    └→ Single valid edge? → NodeEnter (next node)
NodeDecisionWait
    ↓ (OnNodeExit with choices, wait for DecisionNotifier)
ConversationExit
    ↓ (OnConversationExit callback)
ConversationExitWait
    ↓ (wait for ReadyNotifier)
Idle (context returned to pool)
```

### Edge Traversal
Outgoing edges are pre-sorted by priority in the snapshot. Traversal:

```csharp
for (int i = 0; i < node.OutgoingEdgeIndicesLength; i++)
{
    var edge = snapshot.Edges(node.OutgoingEdgeIndices(i));
    var target = snapshot.Nodes(edge.TargetIdx);

    // Check condition if present
    if (!target.HasCondition || EvaluateCondition(target))
    {
        validTargets.Add(target);
    }
}
```

---

## 4. Public API

### GameScriptRunner
Main entry point, added to scene as MonoBehaviour:

```csharp
// Initialize (once at startup)
await runner.Initialize();

// Start conversation by ID
ActiveConversation handle = runner.StartConversation(conversationId, listener);

// Manage conversations
bool isRunning = handle.IsActive;
handle.Stop();
runner.StopAllConversations();

// Inter-conversation communication
handle.SetFlag(flagId);
runner.SetFlagForAll(flagId);
handle.RegisterFlagListener(OnFlagRaised);
```

### IGameScriptListener
Implement to handle dialogue events:

```csharp
public interface IGameScriptListener
{
    void OnConversationEnter(Conversation conv, ReadyNotifier notifier);
    void OnNodeEnter(Node node, ReadyNotifier notifier);
    void OnNodeExit(List<Node> choices, DecisionNotifier notifier);  // Player choice
    void OnNodeExit(Node next, ReadyNotifier notifier);              // Auto-advance
    void OnConversationExit(Conversation conv, ReadyNotifier notifier);
    void OnError(Conversation conv, Exception e);
}
```

### Notifiers
Async coordination between runtime and game:

```csharp
// Signal ready to proceed
notifier.OnReady();

// Signal player's choice
decisionNotifier.OnDecisionMade(selectedNode);
```

---

## 5. Editor Integration

### UI Toolkit (Code-Only)
All editor UI built with UI Toolkit using pure C# (no UXML files). USS stylesheets are allowed for styling.

```csharp
// Example picker structure
public class ConversationPickerWindow : EditorWindow
{
    void CreateGUI()
    {
        var root = rootVisualElement;
        root.styleSheets.Add(AssetDatabase.LoadAssetAtPath<StyleSheet>("...gamescript-picker.uss"));

        var searchField = new ToolbarSearchField();
        var tagFilters = new VisualElement { name = "tag-filters" };
        var listView = new ListView();

        root.Add(searchField);
        root.Add(tagFilters);
        root.Add(listView);
        // ... bind data
    }
}
```

### Custom Property Drawers
Entity references stored as raw int IDs with custom editor UI:

```csharp
[GameScriptConversation]
[SerializeField] int conversationId;

[GameScriptLocalization]
[SerializeField] int localizationId;

[GameScriptActor]
[SerializeField] int actorId;
```

**Drawer behavior:**
- Loads current snapshot (with hot-reload check)
- Displays searchable picker popup (UI Toolkit)
- Conversations/Localizations: Tag category filters + search
- Actors/Locales: Simple scrollable list
- Stores only the int ID

### No Build Step
The property drawers read directly from the live snapshot. Workflow:
1. Edit dialogue in GameScript
2. Alt-tab away (triggers export)
3. Return to Unity - property drawers show updated data
4. Enter Play mode - runtime loads fresh snapshot

---

## 6. Data Access

### Direct FlatBuffers Access
```csharp
var snapshot = database.Snapshot;

// Conversations
var conv = snapshot.Conversations(index);
string name = conv.Name;
int rootIdx = conv.RootNodeIdx;

// Nodes
var node = snapshot.Nodes(index);
string voiceText = node.VoiceText;
int actorIdx = node.ActorIdx;

// Traverse edges
for (int i = 0; i < node.OutgoingEdgeIndicesLength; i++)
{
    int edgeIdx = node.OutgoingEdgeIndices(i);
    var edge = snapshot.Edges(edgeIdx);
    var targetNode = snapshot.Nodes(edge.TargetIdx);
}
```

### Tag Filtering (Editor UI)
```csharp
// Get category names
for (int i = 0; i < snapshot.ConversationTagNamesLength; i++)
{
    string category = snapshot.ConversationTagNames(i);
    // Build dropdown: "Act", "Location", "Quest"
}

// Get values for a category
var values = snapshot.ConversationTagValues(categoryIndex);
// Build dropdown: "All", "Act One", "Act Two", ...

// Filter conversations
bool Matches(Conversation conv, int[] selectedPerCategory)
{
    for (int i = 0; i < selectedPerCategory.Length; i++)
    {
        if (selectedPerCategory[i] == -1) continue;  // "All"
        if (conv.TagIndices(i) != selectedPerCategory[i]) return false;
    }
    return true;
}
```

---

## 7. Project Structure

```
Packages/studio.shortsleeve.gamescript/
  Runtime/
    GameScriptRunner.cs       # MonoBehaviour entry point
    GameScriptDatabase.cs     # Snapshot loading, hot-reload
    RunnerContext.cs          # Dialogue state machine
    JumpTableBuilder.cs       # Reflection-based function binding
    IDialogueContext.cs       # Interface for conditions/actions
    IGameScriptListener.cs    # Callback interface
    Notifiers.cs              # ReadyNotifier, DecisionNotifier
    ActiveConversation.cs     # Handle struct
    Attributes.cs             # NodeCondition, NodeAction
  Editor/
    PropertyDrawers/
      ConversationIdDrawer.cs
      LocalizationIdDrawer.cs
      ActorIdDrawer.cs
    Pickers/
      ConversationPickerWindow.cs
      LocalizationPickerWindow.cs
    Styles/
      gamescript-picker.uss
    GameScriptSettingsProvider.cs
```

---

## 8. Performance Considerations

- **Object pooling**: RunnerContext instances pooled and reused
- **Jump tables**: Array-based O(1) dispatch, no dictionary overhead
- **Zero-copy data**: FlatBuffers reads directly from buffer
- **Lazy editor reload**: Only check hash on data access, not every frame
- **Main thread enforcement**: All API calls validated for thread safety
