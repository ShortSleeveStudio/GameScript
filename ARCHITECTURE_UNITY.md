# GameScript Unity Runtime Architecture

Unity-specific implementation of the GameScript V2 runtime.

## Overview

The Unity runtime consumes FlatBuffers snapshots (.gsb) and executes dialogue with native C# conditions/actions. No build step required between authoring and play.

**Key components:**
- **GameScriptLoader**: Static entry point for loading manifests
- **GameScriptManifest**: Handle for querying locales and creating databases/runners
- **GameScriptDatabase**: Snapshot data access layer
- **GameScriptRunner**: Pure C# dialogue execution engine
- **GameScriptBehaviour**: Optional MonoBehaviour wrapper for Inspector integration
- **RunnerContext**: State machine for individual conversation execution
- **Jump Tables**: Array-based dispatch for conditions/actions

---

## 1. Initialization Flow

The runtime uses a Manifest-as-Handle pattern that eliminates partial states and double-loading:

```csharp
// 1. Load the manifest (lightweight, contains locale list)
var manifest = await GameScriptLoader.LoadManifest();

// 2. Query available locales
LocaleRef locale = manifest.TryFindLocale(savedLocaleId, out var found)
    ? found
    : manifest.PrimaryLocale;

// 3. Load the database for a specific locale
var database = await manifest.LoadDatabase(locale);

// 4. Create the runner (pure C# class, no partial state possible)
var runner = new GameScriptRunner(database, settings);
```

**Convenience methods** combine steps when you don't need fine-grained control:

```csharp
// Load manifest + database + create runner in one call
var runner = await manifest.CreateRunner(locale, settings);

// Or load everything with primary locale
var runner = await manifest.CreateRunner(settings);
```

### Why This Pattern?

- **No partial states**: You cannot have a Runner without a Database, or a Database without a Manifest
- **No double-loading**: If you have a saved locale ID, load directly into it
- **Locale picker support**: Query `manifest.LocaleCount` and `manifest.GetLocale(i)` before committing to a locale
- **Testability**: Pure C# classes can be unit tested without Unity

---

## 2. Snapshot Loading

### Runtime (Builds)
The manifest handles path construction and snapshot loading:

```csharp
// Manifest caches paths on construction
var manifest = await GameScriptLoader.LoadManifest();

// Database loads the locale's snapshot
var database = await manifest.LoadDatabase(locale);
```

FlatBuffers provides zero-copy access - data is read directly from the buffer.

### Editor (Hot-Reload)
`GameScriptDatabase.EditorInstance` provides lazy loading with staleness check for property drawers:

```csharp
// Automatically checks manifest hash and reloads if changed
var database = GameScriptDatabase.EditorInstance;
```

The manifest.json contains per-locale `hashes` updated on each export. This enables instant iteration - edit in GameScript, alt-tab to Unity, data is fresh.

### Locale Changes at Runtime
```csharp
// Database supports live locale switching
await database.ChangeLocale(newLocale);

// Subscribe to locale changes
database.OnLocaleChanged += () => RefreshUI();
```

---

## 3. Condition/Action System

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
        ActorRef actor = ctx.Actor;  // Who's speaking
    }
}
```

**Conditions**: Synchronous, return `bool`. Called during edge traversal.
**Actions**: Async via `Awaitable`. Called when entering a node.

Game-specific logic (inventory, animations, etc.) is accessed through your own systems. The `IDialogueContext` provides read-only access to the current node's data.

### Jump Table Construction
On runner creation, reflection scans for attributed methods and builds jump tables:

```csharp
// Attributes specify nodeId
[NodeCondition(nodeId)]
[NodeAction(nodeId)]

// At construction:
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
    ActorRef Actor { get; }          // Who's speaking
    string VoiceText { get; }        // Localized dialogue text
    string UIResponseText { get; }   // Localized choice button text
    int PropertyCount { get; }
    NodePropertyRef GetProperty(int index);
}
```

The context provides node data - game-specific logic lives in your own code.

---

## 4. Dialogue State Machine

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
Cleanup
    ↓ (OnCleanup callback - synchronous)
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

## 5. Public API

### Programmatic Setup (Recommended)
```csharp
// Full control over initialization
var manifest = await GameScriptLoader.LoadManifest();
var locale = manifest.TryFindLocale(savedId, out var l) ? l : manifest.PrimaryLocale;
var database = await manifest.LoadDatabase(locale);
var runner = new GameScriptRunner(database, settings);

// Start conversations
ActiveConversation handle = runner.StartConversation(conversationId, listener);

// Manage conversations
bool isRunning = runner.IsActive(handle);
runner.StopConversation(handle);
runner.StopAllConversations();
```

### Inspector Setup (GameScriptBehaviour)
For scene-based setup with Inspector configuration:

```csharp
// Add GameScriptBehaviour to a GameObject
// Configure settings and locale in Inspector
// It initializes automatically on Awake

// Access the runner after initialization
if (behaviour.IsInitialized)
{
    behaviour.Runner.StartConversation(conversationId, listener);
}
```

### IGameScriptListener
Implement to handle dialogue events:

```csharp
public interface IGameScriptListener
{
    void OnConversationEnter(ConversationRef conv, ReadyNotifier notifier);
    void OnNodeEnter(NodeRef node, ReadyNotifier notifier);
    void OnNodeExit(List<NodeRef> choices, DecisionNotifier notifier);  // Player choice
    void OnNodeExit(NodeRef node, ReadyNotifier notifier);              // Auto-advance
    void OnConversationExit(ConversationRef conv, ReadyNotifier notifier);
    void OnCleanup(ConversationRef conv);                               // Final cleanup
    void OnError(ConversationRef conv, Exception e);
}
```

### Notifiers
Async coordination between runtime and game:

```csharp
// Signal ready to proceed
notifier.OnReady();

// Signal player's choice
decisionNotifier.OnDecisionMade(selectedNodeIndex);
```

---

## 6. Editor Integration

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
Entity references stored as ID wrapper structs with custom editor UI:

```csharp
[SerializeField] ConversationId conversationId;
[SerializeField] LocalizationId localizationId;
[SerializeField] ActorId actorId;
[SerializeField] LocaleId localeId;
[SerializeField] NodeId nodeId;
[SerializeField] EdgeId edgeId;
```

**Drawer behavior:**
- Loads current snapshot via `GameScriptDatabase.EditorInstance` (with hot-reload check)
- Displays searchable picker popup (UI Toolkit)
- Conversations/Localizations: Tag category filters + search
- Actors/Locales: Simple scrollable list
- Stores only the int ID wrapped in a type-safe struct

### No Build Step
The property drawers read directly from the live snapshot. Workflow:
1. Edit dialogue in GameScript
2. Alt-tab away (triggers export)
3. Return to Unity - property drawers show updated data
4. Enter Play mode - runtime loads fresh snapshot

---

## 7. Data Access

### Via Database Ref Types
```csharp
// Conversations
ConversationRef conv = database.FindConversation(conversationId);
string name = conv.Name;
NodeRef root = conv.RootNode;

// Nodes
NodeRef node = database.FindNode(nodeId);
string voiceText = node.VoiceText;
ActorRef actor = node.Actor;

// Traverse edges
for (int i = 0; i < node.OutgoingEdgeCount; i++)
{
    EdgeRef edge = node.GetOutgoingEdge(i);
    NodeRef target = edge.Target;
}

// All entity types supported
ActorRef actor = database.FindActor(actorId);
LocalizationRef loc = database.FindLocalization(localizationId);
LocaleRef locale = database.FindLocale(localeId);
EdgeRef edge = database.FindEdge(edgeId);
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

## 8. Project Structure

```
Packages/studio.shortsleeve.gamescript/
  Runtime/
    GameScriptLoader.cs       # Static entry point
    Attributes.cs             # NodeCondition, NodeAction attributes
    Command.cs                # IPC command structure for engine-to-editor communication
    Manifest.cs               # JSON manifest deserialization
    Ids.cs                    # ConversationId, ActorId, NodeId, etc.
    Refs.cs                   # NodeRef, ConversationRef, ActorRef, etc.
    IDialogueContext.cs       # Interface for conditions/actions
    JumpTableBuilder.cs       # Reflection-based function binding
    Execution/
      GameScriptManifest.cs   # Manifest handle, creates databases/runners
      GameScriptDatabase.cs   # Snapshot data access
      GameScriptRunner.cs     # Pure C# dialogue execution
      GameScriptBehaviour.cs  # MonoBehaviour wrapper (optional)
      RunnerContext.cs        # Dialogue state machine
      RunnerListener.cs       # Listener interface and base class
      ActiveConversation.cs   # Handle struct
      Settings.cs             # ScriptableObject settings
      WhenAllAwaiter.cs       # Utility for awaiting multiple tasks
    Generated/
      FlatSharp.generated.cs  # Auto-generated FlatBuffers serialization
  Editor/
    GameScriptCommand.cs      # Editor-side command handling
    Build/
      GameScriptBuildProcessor.cs
    Menu/
      Menus.cs
      GameScriptSettingsProvider.cs
    PropertyDrawers/
      BaseIdDrawer.cs
      ConversationIdDrawer.cs
      LocalizationIdDrawer.cs
      ActorIdDrawer.cs
      LocaleIdDrawer.cs
    Pickers/
      BasePickerWindow.cs
      BaseTwoLinePickerWindow.cs
      BaseTaggedPickerWindow.cs
      ConversationPickerWindow.cs
      LocalizationPickerWindow.cs
      ActorPickerWindow.cs
      LocalePickerWindow.cs
    Styles/
      gamescript-picker.uss
```

---

## 9. Performance Considerations

- **Object pooling**: RunnerContext instances pooled and reused
- **Jump tables**: Array-based O(1) dispatch, no dictionary overhead
- **Zero-copy data**: FlatBuffers reads directly from buffer
- **Lazy editor reload**: Only check hash on data access, not every frame
- **Main thread enforcement**: All API calls validated for thread safety
- **No partial states**: Factory pattern ensures objects are fully initialized
