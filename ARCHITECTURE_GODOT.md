# GameScript Godot Runtime Architecture

Godot 4.x-specific implementation of the GameScript V2 runtime.

## Overview

The Godot runtime consumes FlatBuffers snapshots (.gsb) and executes dialogue with native GDScript conditions/actions. No build step required between authoring and play.

**Architecture:** Hybrid C++/GDScript design
- **C++ GDExtension**: FlatBuffers parsing and Ref wrapper classes (data access layer)
- **GDScript**: Runner, state machine, listener signals, jump tables (execution layer)

**Key components:**
- **GameScriptLoader**: Static entry point for loading manifests (GDScript)
- **GameScriptManifest**: Handle for querying locales and creating databases (C++)
- **GameScriptDatabase**: Snapshot data access layer (C++)
- **GameScriptRunner**: GDScript dialogue execution engine
- **RunnerContext**: State machine for individual conversation execution (GDScript)
- **Jump Tables**: Array-based dispatch for conditions/actions (GDScript)
- **Ref Classes**: Lightweight wrappers for snapshot entities (C++)

---

## 1. Initialization Flow

The runtime uses a Manifest-as-Handle pattern that eliminates partial states and double-loading:

```gdscript
# 1. Load the manifest (lightweight, contains locale list)
var manifest := GameScriptLoader.load_manifest()

# 2. Query available locales
var locale: LocaleRef
if manifest.has_locale(saved_locale_id):
    locale = manifest.find_locale(saved_locale_id)
else:
    locale = manifest.get_primary_locale()

# 3. Load the database for a specific locale
var database := manifest.load_database(locale)

# 4. Create the runner
var runner := GameScriptRunner.new(database, settings)
```

**Convenience methods** combine steps when you don't need fine-grained control:

```gdscript
# Load manifest + database + create runner in one call
var runner := GameScriptLoader.create_runner(settings)

# Or with specific locale
var runner := GameScriptLoader.create_runner_with_locale(manifest, locale, settings)
```

### Why This Pattern?

- **No partial states**: You cannot have a Runner without a Database, or a Database without a Manifest
- **No double-loading**: If you have a saved locale ID, load directly into it
- **Locale picker support**: Query `manifest.get_locale_count()` and `manifest.get_locale(i)` before committing
- **Testability**: Pure classes can be tested without a running scene

---

## 2. Snapshot Loading

### Runtime (Builds)
The manifest handles path construction and snapshot loading:

```gdscript
# Manifest caches paths on construction
var manifest := GameScriptLoader.load_manifest()

# Database loads the locale's snapshot
var database := manifest.load_database(locale)
```

FlatBuffers (via C++) provides zero-copy access - data is read directly from the buffer.

### Editor (Hot-Reload)
`_GameScriptEditorDatabase` provides lazy loading with staleness check for Inspector plugins:

```gdscript
# Automatically checks manifest hash and reloads if changed (every 1 second)
var database := _GameScriptEditorDatabase.get_database()
```

The manifest.json contains per-locale `hashes` updated on each export. This enables instant iteration - edit in GameScript, alt-tab to Godot, data is fresh.

### Locale Changes at Runtime
```gdscript
# Database supports live locale switching
database.change_locale(new_locale)

# Subscribe to locale changes
database.locale_changed.connect(_on_locale_changed)
```

---

## 3. Condition/Action System

### GDScript Methods with Naming Conventions
Developers write conditions and actions in their IDE with full GDScript tooling:

```gdscript
# res://dialogue_logic/tavern.gd
extends RefCounted

# Condition: cond_{node_id} - must return bool
func cond_456(ctx: RunnerContext) -> bool:
    return GameState.player_gold >= 10

# Action: act_{node_id} - can be async with await, receives CancellationToken
func act_456(ctx: RunnerContext, token: CancellationToken) -> void:
    GameState.player_gold -= 10

    # Connect to cancellation for cleanup
    var tween := create_tween()
    token.cancelled.connect(tween.kill)
    await AnimationManager.play("hand_over_gold")

    # Can access node data if needed
    var actor_name := ctx.get_actor().get_name()
```

**Conditions**: Synchronous, return `bool`. Called during edge traversal.
**Actions**: Can use `await`, receive `CancellationToken` for cooperative cancellation. Called when entering a node. Actions should connect to `token.cancelled` or check `token.is_cancelled` to handle early termination.

Game-specific logic (inventory, animations, etc.) is accessed through your own systems. The RunnerContext provides read-only access to the current node's data.

### Jump Table Construction
On runner creation, folder scanning discovers methods and builds jump tables:

```gdscript
# Naming conventions identify methods
# cond_{node_id} -> condition for that node
# act_{node_id} -> action for that node

# At construction:
# 1. Load snapshot, size arrays to node count
# 2. Scan logic folders for .gd files
# 3. Instantiate scripts, scan get_method_list()
# 4. Parse method names, map node_id to node_index
# 5. Store Callable at the node's array index

# At runtime:
if node_ref.get_has_condition():
    var result: bool = _conditions[node_index].call(self)
if node_ref.get_has_action():
    await _actions[node_index].call(self, cancellation_token)
```

**Why arrays, not dictionaries:**
- O(1) lookup with no hashing overhead
- Cache-friendly
- Node indices are dense (unlike IDs which may be sparse)

### RunnerContext as IDialogueContext
Read-only access to the current node's data:

```gdscript
# In RunnerContext - available to conditions/actions
var cancellation_token: CancellationToken  # For cooperative cancellation

func get_node_id() -> int
func get_conversation_id() -> int
func get_actor() -> ActorRef
func get_voice_text() -> String
func get_ui_response_text() -> String
func get_property_count() -> int
func get_property(index: int) -> NodePropertyRef
```

The context provides node data and cancellation support - game-specific logic lives in your own code.

---

## 4. Dialogue State Machine

The RunnerContext implements a state machine for conversation flow:

```
ConversationEnter
    ↓ (on_conversation_enter callback)
    ↓ (await ReadyNotifier.ready signal)
NodeEnter
    ↓ (on_node_enter callback)
    ↓ (await ReadyNotifier.ready signal)
ActionAndSpeech
    ↓ (Logic nodes: action only)
    ↓ (Dialogue nodes: action + on_speech concurrent)
    ↓ (await both complete)
EvaluateEdges
    ↓ (check conditions on outgoing edges)
    ├→ No valid edges? → ConversationExit
    ├→ Decision required? → on_decision, await DecisionNotifier
    └→ Auto-advance? → on_auto_decision, select node
NodeExit
    ↓ (on_node_exit callback)
    ↓ (await ReadyNotifier.ready signal)
    → Loop back to NodeEnter
ConversationExit
    ↓ (on_conversation_exit callback)
    ↓ (await ReadyNotifier.ready signal)
Cleanup
    ↓ (on_cleanup callback - synchronous)
    → Context returned to pool
```

### Edge Traversal
Outgoing edges are pre-sorted by priority in the snapshot. Traversal:

```gdscript
var edge_count := node_ref.get_outgoing_edge_count()
for i in range(edge_count):
    var edge := node_ref.get_outgoing_edge(i)
    var target_node := edge.get_target()

    # Check condition if present
    var condition_passed := true
    if target_node.get_has_condition():
        var condition: Callable = _conditions[target_node.get_index()]
        if condition.is_valid():
            condition_passed = condition.call(self)

    if condition_passed:
        _choices.append(target_node)
```

---

## 5. Public API

### Programmatic Setup (Recommended)
```gdscript
# Full control over initialization
var manifest := GameScriptLoader.load_manifest()
var locale := manifest.find_locale(saved_id) if manifest.has_locale(saved_id) else manifest.get_primary_locale()
var database := manifest.load_database(locale)
var runner := GameScriptRunner.new(database, settings)

# Start conversations
var handle: ActiveConversation = runner.start_conversation(conversation_id, listener)

# Manage conversations
var is_running: bool = runner.is_active(handle)
runner.stop_conversation(handle)
runner.stop_all_conversations()
```

### GameScriptSettings Resource
Configure runtime behavior via exported Resource:

```gdscript
class_name GameScriptSettings
extends Resource

@export var game_data_path: String = "GameScript"
@export var logic_folder_path: String = "dialogue_logic"
@export_range(1, 10) var initial_conversation_pool: int = 1
@export var prevent_single_node_choices: bool = false
```

### GameScriptListener
Extend to handle dialogue events:

```gdscript
class_name MyDialogueUI
extends GameScriptListener

func on_conversation_enter(conversation: ConversationRef, notifier: ReadyNotifier) -> void:
    # Show dialogue UI
    notifier.on_ready()

func on_speech(node: NodeRef, notifier: ReadyNotifier) -> void:
    # Display dialogue text
    dialogue_label.text = node.get_voice_text()
    await get_tree().create_timer(2.0).timeout
    notifier.on_ready()

func on_decision(choices: Array[NodeRef], notifier: DecisionNotifier) -> void:
    # Show choice buttons
    for choice in choices:
        var button := Button.new()
        button.text = choice.get_ui_response_text()
        button.pressed.connect(func(): notifier.on_decision_made(choice))
        choice_container.add_child(button)

func on_auto_decision(choices: Array[NodeRef]) -> NodeRef:
    # Auto-select highest priority (or custom logic)
    return choices[0]

func on_conversation_exit(conversation: ConversationRef, notifier: ReadyNotifier) -> void:
    # Hide dialogue UI
    notifier.on_ready()

func on_cleanup(conversation: ConversationRef) -> void:
    # Final cleanup (synchronous)
    pass

func on_error(conversation: ConversationRef, error: String) -> void:
    push_error("Dialogue error: " + error)

func on_conversation_cancelled(conversation: ConversationRef) -> void:
    # Called when stop_conversation() forcibly stops the conversation
    # Use for immediate cleanup (hiding UI, cancelling animations)
    pass
```

### Notifiers
Signal-based async coordination between runtime and game:

```gdscript
# Signal ready to proceed
notifier.on_ready()

# Signal player's choice (pass the selected NodeRef)
decision_notifier.on_decision_made(selected_node)
```

---

## 6. Editor Integration

### EditorInspectorPlugin Pattern
Custom Inspector UI for ID types with searchable picker dialogs:

```gdscript
# Usage in game code
@export var conversation: ConversationId
@export var starting_actor: ActorId
@export var target_locale: LocaleId
@export var dialogue_key: LocalizationId

func start_dialogue() -> void:
    if conversation and conversation.is_valid():
        runner.start_conversation(conversation.value, listener)
```

### ID Resource Types
Resource wrappers for type-safe ID references:

```gdscript
@tool
class_name ConversationId
extends Resource

@export var value: int = 0

func is_valid() -> bool:
    return value > 0
```

### Property Inspector UI
Each ID property shows three buttons:
- **Edit (✎)**: Opens the entity in GameScript editor (visible when value selected)
- **Picker (...)**: Opens searchable selection dialog (visible when no value)
- **Clear (x)**: Resets to no selection (visible when value selected)

### Picker Dialogs
ConfirmationDialog-based pickers with:
- Search field with real-time filtering
- ItemList with (None) option
- Keyboard navigation (Up/Down/Enter/Escape)
- Double-click to select
- Positioned near the picker button

### IPC with GameScript Editor
Clicking the Edit button writes a command file for the GameScript editor to read:

```gdscript
# _GameScriptCommand.navigate() writes to {GameDataPath}/command.tmp
# JSON format:
# {"action":"navigate","type":"conversation","id":42}

# Entity types:
_GameScriptCommand.EntityType.CONVERSATION  # "conversation"
_GameScriptCommand.EntityType.ACTOR         # "actor"
_GameScriptCommand.EntityType.LOCALIZATION  # "localization"
_GameScriptCommand.EntityType.LOCALE        # "locale"
```

The GameScript editor watches for this file and navigates to the specified entity, enabling seamless bidirectional editing between Godot and GameScript.

### Hot-Reload
Property drawers automatically reload when the snapshot changes:
1. Edit dialogue in GameScript
2. Alt-tab away (triggers export)
3. Return to Godot - Inspector plugins detect hash change
4. Run scene - runtime loads fresh snapshot

---

## 7. Data Access

### Via Database Ref Types
```gdscript
# Conversations
var conv: ConversationRef = database.find_conversation(conversation_id)
var name: String = conv.get_name()
var root: NodeRef = conv.get_root_node()

# Nodes
var node: NodeRef = database.find_node(node_id)
var voice_text: String = node.get_voice_text()
var actor: ActorRef = node.get_actor()

# Traverse edges
for i in range(node.get_outgoing_edge_count()):
    var edge: EdgeRef = node.get_outgoing_edge(i)
    var target: NodeRef = edge.get_target()

# All entity types supported
var actor: ActorRef = database.find_actor(actor_id)
var loc: LocalizationRef = database.find_localization(localization_id)
var locale: LocaleRef = manifest.find_locale(locale_id)
var edge: EdgeRef = database.find_edge(edge_id)
```

### Ref Ownership Model
All Ref classes store raw pointers to their parent (Database or Manifest). They are designed to be:
1. Created on-demand by queries
2. Used immediately
3. Not stored long-term

If you need to reference an entity across frames, store the ID and re-query:

```gdscript
# Don't do this - ref may become invalid
var cached_actor: ActorRef = node.get_actor()  # Dangerous if stored

# Do this instead
var cached_actor_id: int = node.get_actor().get_id()
# Later...
var actor: ActorRef = database.find_actor(cached_actor_id)
```

---

## 8. Project Structure

```
runtimes/godot/
├── project/                          # Test Godot project
│   ├── project.godot
│   ├── addons/
│   │   └── gamescript/
│   │       ├── plugin.cfg
│   │       ├── plugin.gd            # Editor plugin entry point
│   │       ├── gamescript.gdextension
│   │       ├── bin/                 # Compiled GDExtension binaries
│   │       ├── scripts/             # GDScript runtime
│   │       │   ├── game_script_loader.gd
│   │       │   ├── game_script_runner.gd
│   │       │   ├── runner_context.gd
│   │       │   ├── runner_listener.gd
│   │       │   ├── settings.gd
│   │       │   ├── active_conversation.gd
│   │       │   ├── notifiers.gd
│   │       │   ├── cancellation_token.gd  # Cooperative cancellation
│   │       │   └── signal_race.gd         # Await multiple signals
│   │       ├── resources/           # ID wrapper resources
│   │       │   ├── conversation_id.gd
│   │       │   ├── actor_id.gd
│   │       │   ├── locale_id.gd
│   │       │   └── localization_id.gd
│   │       └── editor/              # Editor-only scripts
│   │           ├── editor_database.gd
│   │           ├── game_script_command.gd  # IPC with GameScript editor
│   │           ├── base_id_inspector.gd
│   │           ├── conversation_inspector.gd
│   │           ├── actor_inspector.gd
│   │           ├── locale_inspector.gd
│   │           ├── localization_inspector.gd
│   │           ├── base_picker_dialog.gd
│   │           └── *_picker_dialog.gd
│   └── GameScript/                  # Snapshot output location
│       ├── manifest.json
│       └── locales/*.gsb
├── gdextension/                     # C++ source
│   ├── SConstruct                   # Build script
│   ├── src/
│   │   ├── register_types.cpp/h
│   │   ├── game_script_manifest.cpp/h
│   │   ├── game_script_database.cpp/h
│   │   ├── refs/
│   │   │   ├── node_ref.cpp/h
│   │   │   ├── conversation_ref.cpp/h
│   │   │   ├── actor_ref.cpp/h
│   │   │   ├── edge_ref.cpp/h
│   │   │   ├── locale_ref.cpp/h
│   │   │   ├── localization_ref.cpp/h
│   │   │   └── property_ref.cpp/h
│   │   └── generated/
│   │       └── snapshot_generated.h  # FlatBuffers generated
│   ├── godot-cpp/                   # Auto-fetched at build time
│   └── flatbuffers/                 # Auto-fetched at build time
└── README.md
```

---

## 9. Performance Considerations

- **Object pooling**: RunnerContext instances pooled and reused
- **Jump tables**: Array-based O(1) dispatch with Callable, no dictionary overhead
- **Zero-copy data**: FlatBuffers (C++) reads directly from buffer
- **Lazy editor reload**: Hash comparison only when data accessed, not every frame
- **Minimal allocations**: Edge evaluation arrays pre-allocated and reused
- **Hybrid architecture**: Performance-critical parsing in C++, flexibility in GDScript

---

## 10. Comparison with Unity Runtime

| Feature | Unity (C#) | Godot (GDScript/C++) |
|---------|------------|----------------------|
| Logic marker | `[NodeCondition(id)]` attribute | Method prefix `cond_id` |
| Logic discovery | Assembly reflection | `get_method_list()` on scripts |
| Storage | `Delegate[]` | `Array[Callable]` |
| Dispatch | `funcPtr(ctx)` | `callable.call(ctx)` |
| Async | `async Awaitable` | `await` / Signal |
| Data access | C# FlatSharp | C++ FlatBuffers |
| Editor singleton | `GameScriptDatabase.EditorInstance` | `_GameScriptEditorDatabase` |
| Property drawer | `CustomPropertyDrawer` | `EditorInspectorPlugin` |
| Picker popup | `EditorWindow` | `ConfirmationDialog` |
| Settings | `ScriptableObject` | `Resource` |
| Hot-reload | Hash comparison | Hash comparison |

---

## 11. Building the GDExtension

### First-Time Setup
Dependencies are fetched automatically on first build:

```bash
cd runtimes/godot/gdextension
scons platform=<platform>  # macos, linux, or windows
```

The SConstruct will:
1. Clone godot-cpp (4.3 branch) if missing
2. Download FlatBuffers headers if missing
3. Build the extension

### Regenerating FlatBuffers
If the snapshot schema changes:

```bash
flatc --cpp -o src/generated/ ../../../core/schema/snapshot.fbs
```

The generated header is committed so builds don't require the `flatc` compiler.