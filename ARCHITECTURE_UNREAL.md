# GameScript Unreal Runtime Architecture

Unreal-specific implementation of the GameScript V3 runtime.

## Overview

The Unreal runtime consumes FlatBuffers snapshots (.gsb) and executes dialogue with native C++ conditions/actions. No build step required between authoring and play.

**Key components:**
- **UGameScriptLoader**: Static entry point for loading manifests
- **UGameScriptManifest**: Handle for querying locales and creating databases/runners
- **UGameScriptDatabase**: Snapshot data access layer
- **UGameScriptRunner**: Pure C++ dialogue execution engine
- **URunnerContext**: State machine for individual conversation execution
- **Jump Tables**: Array-based dispatch for conditions/actions

**Platform Support:** Unreal Engine 5.5+

---

## 1. Initialization Flow

The runtime uses a Manifest-as-Handle pattern that eliminates partial states and double-loading:

```cpp
// 1. Load the manifest (lightweight, contains locale list)
UGameScriptManifest* Manifest = UGameScriptLoader::LoadManifest();

// 2. Query available locales
FLocaleRef Locale = Manifest->TryFindLocale(SavedLocaleId, Found)
    ? Found
    : Manifest->GetPrimaryLocale();

// 3. Load the database for a specific locale
UGameScriptDatabase* Database = Manifest->LoadDatabase(Locale);

// 4. Create the runner (pure C++ class, no partial state possible)
UGameScriptRunner* Runner = NewObject<UGameScriptRunner>(this);
Runner->Initialize(Database, Settings);
```

**Convenience methods** combine steps when you don't need fine-grained control:

```cpp
// Load manifest + database + create runner in one call
UGameScriptRunner* Runner = Manifest->CreateRunner(Locale, Settings);

// Or load everything with primary locale
UGameScriptRunner* Runner = Manifest->CreateRunnerWithPrimaryLocale(Settings);
```

### Why This Pattern?

- **No partial states**: You cannot have a Runner without a Database, or a Database without a Manifest
- **No double-loading**: If you have a saved locale ID, load directly into it
- **Locale picker support**: Query `Manifest->GetLocaleCount()` and `Manifest->GetLocale(i)` before committing to a locale
- **Testability**: Pure C++ classes can be unit tested without Unreal

---

## 2. Snapshot Loading

### Runtime (Builds)
The manifest handles path construction and snapshot loading:

```cpp
// Manifest caches paths on construction
UGameScriptManifest* Manifest = UGameScriptLoader::LoadManifest();

// Database loads the locale's snapshot
UGameScriptDatabase* Database = Manifest->LoadDatabase(Locale);
```

FlatBuffers provides zero-copy access - data is read directly from the buffer.

### Editor (Hot-Reload)
`UGameScriptDatabase::EditorInstance` provides lazy loading with staleness check for property drawers:

```cpp
// Automatically checks manifest hash and reloads if changed
UGameScriptDatabase* Database = UGameScriptDatabase::EditorInstance;
```

The manifest.json contains per-locale `hashes` updated on each export. This enables instant iteration - edit in GameScript, alt-tab to Unreal, data is fresh.

### Locale Changes at Runtime
```cpp
// Database supports live locale switching
Database->ChangeLocale(NewLocale);

// Subscribe to locale changes
Database->OnLocaleChanged.AddDynamic(this, &UMyClass::RefreshUI);
```

---

## 3. Condition/Action System

### Native C++ Methods
Developers write conditions and actions in their IDE with full tooling support:

```cpp
// Conditions: Synchronous, return bool
NODE_CONDITION(456)
bool HasGold(const IDialogueContext* Context)
{
    return GameState->PlayerGold >= 10;
}

// Actions: Return nullptr (instant) or UGameplayTask* (latent)
NODE_ACTION(456)
UGameplayTask* PayGold(const IDialogueContext* Context)
{
    GameState->PlayerGold -= 10;
    return nullptr;  // Instant action
}

NODE_ACTION(789)
UGameplayTask* PlayAnimation(const IDialogueContext* Context)
{
    // Latent action - return task for async work
    return UDialogueAction_PlayAnim::CreateTask(Context, HandOverGoldAnim);
}
```

**Conditions**: Synchronous, return `bool`. Called during edge traversal.
**Actions**: Return `nullptr` for instant completion, or `UGameplayTask*` for latent operations. Actions with tasks check the cancellation token and exit early when cancelled.

Game-specific logic (inventory, animations, etc.) is accessed through your own systems. The `IDialogueContext` provides read-only access to the current node's data.

### Jump Table Construction
On runner creation, reflection scans for attributed methods and builds jump tables:

```cpp
// Attributes specify nodeId
[NODE_CONDITION(nodeId)]
[NODE_ACTION(nodeId)]

// At construction:
// 1. Load snapshot, build ID-to-index map
// 2. Allocate arrays parallel to snapshot.Nodes
// 3. Scan assemblies for attributed methods via static registration
// 4. Place function pointers at their node's array index

// At runtime:
if (Node->HasCondition())
    bool Result = Conditions[NodeIndex](Context);
if (Node->HasAction())
    UGameplayTask* Task = Actions[NodeIndex](Context);
```

**Why arrays, not dictionaries:**
- O(1) lookup with no hashing overhead
- Cache-friendly
- Node IDs may be sparse, but memory overhead is minimal

### IDialogueContext
Read-only access to the current node's data:

```cpp
interface IDialogueContext
{
    // Cancellation support
    FCancellationToken GetCancellationToken() const;

    // Current node data (from FlatBuffers snapshot)
    int32 GetNodeId() const;
    int32 GetConversationId() const;
    FActorRef GetActor() const;                    // Who's speaking
    FString GetVoiceText() const;                  // Runner-resolved voice text (gender/plural/template applied)
    FString GetUIResponseText() const;             // Runner-resolved UI response text
    int32 GetVoiceTextLocalizationIdx() const;     // Index into snapshot Localizations (-1 if none)
    int32 GetUIResponseTextLocalizationIdx() const; // Index into snapshot Localizations (-1 if none)
    int32 GetPropertyCount() const;
    FNodePropertyRef GetProperty(int32 Index) const;

    // Task ownership for latent actions
    UGameplayTasksComponent* GetTaskOwner() const;
};
```

The context provides node data, cancellation support, and task ownership - game-specific logic lives in your own code. The `GetVoiceText()` and `GetUIResponseText()` methods return fully resolved text (gender, plural, and template substitution have already been applied by the runner).

---

## 4. Dialogue State Machine

The URunnerContext implements a state machine for conversation flow:

```
ConversationEnter
    ↓ (await OnConversationEnter)
CacheNodeTexts
    ↓ (OnSpeechParams → resolve voice text)
    ↓ (OnDecisionParams per choice → resolve UI response texts)
NodeEnter
    ↓ (await OnNodeEnter)
ActionAndSpeech
    ↓ (Logic nodes: action only)
    ↓ (Dialogue nodes: action + OnSpeech(Node, VoiceText) concurrent)
    ↓ (await both complete)
EvaluateEdges
    ↓ (check conditions on outgoing edges)
    ├→ No valid edges? → ConversationExit
    ├→ Decision required? → await OnDecision
    └→ Auto-advance? → OnAutoDecision (sync)
NodeExit
    ↓ (await OnNodeExit)
    → Loop back to NodeEnter
ConversationExit
    ↓ (await OnConversationExit)
Cleanup
    ↓ (await OnCleanup - always called)
Idle (context returned to pool)
```

### Edge Traversal
Outgoing edges are pre-sorted by priority in the snapshot. Traversal:

```cpp
for (int32 i = 0; i < Node->GetOutgoingEdgeCount(); ++i)
{
    FEdgeRef Edge = Node->GetOutgoingEdge(i);
    FNodeRef Target = Edge.GetTarget();

    // Check condition if present
    if (!Target.HasCondition() || EvaluateCondition(Target))
    {
        ValidTargets.Add(Target);
    }
}
```

---

## 5. Public API

### Programmatic Setup (Recommended)
```cpp
// Full control over initialization
UGameScriptManifest* Manifest = UGameScriptLoader::LoadManifest();
FLocaleRef Locale = Manifest->TryFindLocale(SavedId, Found) ? Found : Manifest->GetPrimaryLocale();
UGameScriptDatabase* Database = Manifest->LoadDatabase(Locale);
UGameScriptRunner* Runner = NewObject<UGameScriptRunner>(this);
Runner->Initialize(Database, Settings);

// Start conversations
FActiveConversation Handle = Runner->StartConversation(
    ConversationId,
    Listener,
    TaskOwner
);

// Manage conversations
bool bIsRunning = Runner->IsActive(Handle);
Runner->StopConversation(Handle);
Runner->StopAllConversations();
```

### IGameScriptListener
Implement to handle dialogue events using the **Completion Handle pattern**:

```cpp
class IGameScriptListener
{
    // Async lifecycle methods - receive handle, call methods on it to proceed
    virtual void OnConversationEnter_Implementation(
        FConversationRef Conversation,
        UGSCompletionHandle* Handle);

    virtual void OnNodeEnter_Implementation(
        FNodeRef Node,
        UGSCompletionHandle* Handle);

    // Text resolution params - called before OnSpeech/OnDecision
    // Default: auto-resolve gender, PluralCategory::Other, no template args
    virtual FTextResolutionParams OnSpeechParams_Implementation(
        FLocalizationRef Localization,
        FNodeRef Node);

    virtual FTextResolutionParams OnDecisionParams_Implementation(
        FLocalizationRef Localization,
        FNodeRef Node);

    // Present dialogue - VoiceText is fully resolved (gender/plural/template applied)
    virtual void OnSpeech_Implementation(
        FNodeRef Node,
        const FString& VoiceText,
        UGSCompletionHandle* Handle);

    // Player choice - each FChoiceRef carries pre-resolved UIResponseText
    virtual void OnDecision_Implementation(
        const TArray<FChoiceRef>& Choices,
        UGSCompletionHandle* Handle);

    virtual void OnNodeExit_Implementation(
        FNodeRef Node,
        UGSCompletionHandle* Handle);

    virtual void OnConversationExit_Implementation(
        FConversationRef Conversation,
        UGSCompletionHandle* Handle);

    // Async cleanup methods - receive handle, no cancellation (must complete)
    virtual void OnConversationCancelled_Implementation(
        FConversationRef Conversation,
        UGSCompletionHandle* Handle);

    virtual void OnError_Implementation(
        FConversationRef Conversation,
        const FString& ErrorMessage,
        UGSCompletionHandle* Handle);

    virtual void OnCleanup_Implementation(
        FConversationRef Conversation,
        UGSCompletionHandle* Handle);

    // Sync auto-advance - returns FChoiceRef
    virtual FChoiceRef OnAutoDecision_Implementation(const TArray<FChoiceRef>& Choices);
};
```

**V3 Changes from V2:**
- `OnSpeech` now receives `const FString& VoiceText` (pre-resolved by the runner)
- `OnDecision` now takes `const TArray<FChoiceRef>&` instead of `const TArray<FNodeRef>&`
- New `OnSpeechParams` / `OnDecisionParams` callbacks for providing `FTextResolutionParams`
- `OnAutoDecision` takes and returns `FChoiceRef` instead of `FNodeRef`

### Example Implementation
```cpp
class UMyDialogueUI : public UUserWidget, public IGameScriptListener
{
    // Provide text resolution params for templated speech
    virtual FTextResolutionParams OnSpeechParams_Implementation(
        FLocalizationRef Localization, FNodeRef Node) override
    {
        FTextResolutionParams Params;
        Params.SetPlural(FGSPluralArg(TEXT("count"), GameState->ItemCount));
        Params.Args.Add(FGSArg::String(TEXT("player"), GameState->PlayerName));
        return Params;
    }

    virtual void OnSpeech_Implementation(
        FNodeRef Node, const FString& VoiceText, UGSCompletionHandle* Handle) override
    {
        // VoiceText is already fully resolved by the runner
        DialogueText->SetText(FText::FromString(VoiceText));

        // Store handle for later
        PendingHandle = Handle;

        // After 2 seconds, notify ready
        FTimerHandle TimerHandle;
        GetWorld()->GetTimerManager().SetTimer(
            TimerHandle,
            [Handle]() { Handle->NotifyReady(); },
            2.0f,
            false
        );
    }

    virtual void OnDecision_Implementation(
        const TArray<FChoiceRef>& Choices,
        UGSCompletionHandle* Handle) override
    {
        PendingDecisionHandle = Handle;

        for (int32 i = 0; i < Choices.Num(); ++i)
        {
            // UIResponseText is pre-resolved by the runner
            CreateButton(Choices[i].GetUIResponseText(), i);
        }
    }

    virtual void OnConversationCancelled_Implementation(
        FConversationRef Conversation, UGSCompletionHandle* Handle) override
    {
        // Unblock pending operations
        if (PendingDecisionHandle)
        {
            PendingDecisionHandle->NotifyReady();
        }
        HideUI();
        Handle->NotifyReady();
    }

private:
    UPROPERTY()
    UGSCompletionHandle* PendingHandle;

    UPROPERTY()
    UGSCompletionHandle* PendingDecisionHandle;

    void OnChoiceClicked(int32 ChoiceIndex)
    {
        if (PendingDecisionHandle)
        {
            PendingDecisionHandle->SelectChoiceByIndex(ChoiceIndex);
            PendingDecisionHandle = nullptr;
        }
    }
};
```

### Completion Handle Pattern

The **UGSCompletionHandle** object serves as a "return address" for async operations:

**Benefits:**
- **Multi-Conversation Safe:** Multiple conversations can share the same listener without race conditions
- **Blueprint Ergonomic:** Handle is a simple object reference to call methods on
- **Zero Allocation (Via Pooling):** Each URunnerContext owns one handle, reused for all events
- **Cancellation-Safe:** TWeakObjectPtr prevents crashes if context is destroyed
- **Stale-Completion-Proof:** Context ID validation + weak pointer validation

---

## 6. Text Resolution (V3)

The runner resolves all text before delivering it to listener callbacks. This ensures gender, plural, and template substitution are handled identically across all three runtimes.

### Resolution Flow

1. **OnSpeechParams / OnDecisionParams** — Listener returns `FTextResolutionParams` (gender override, plural arg, typed args). Default: auto-resolve everything.
2. **Gender Resolution** — Priority: `FTextResolutionParams.GenderOverride` > subject actor's `EGSGrammaticalGender` > localization's subject gender > `EGSGenderCategory::Other`. Dynamic actors without an override default to Other.
3. **Plural Resolution** (`CldrPluralRules`) — If `bHasPlural` is true, computes the CLDR plural category (Zero/One/Two/Few/Many/Other) using cardinal or ordinal rules. Supports decimal operands via `FGSPluralArg.Precision`.
4. **Variant Selection** (`VariantResolver`) — Three-pass fallback: exact (plural+gender), gender fallback to Other, catch-all (Other/Other).
5. **Template Substitution** — If `IsTemplated()`, replaces `{name}` placeholders with formatted values.

### FTextResolutionParams

```cpp
USTRUCT(BlueprintType)
struct FTextResolutionParams
{
    bool bHasGenderOverride = false;
    EGSGenderCategory GenderOverride = EGSGenderCategory::Other;
    bool bHasPlural = false;
    FGSPluralArg Plural;
    TArray<FGSArg> Args;

    void SetGenderOverride(EGSGenderCategory InGender);
    void SetPlural(const FGSPluralArg& InPlural);
};
```

### FGSPluralArg (Decimal Support)

```cpp
// Integer plural
FGSPluralArg(TEXT("count"), 5)                                    // Cardinal, "5 items"
FGSPluralArg(TEXT("place"), 3, EGSPluralType::Ordinal)            // Ordinal, "3rd place"

// Decimal plural (Value / 10^Precision)
FGSPluralArg(TEXT("weight"), 15, 1)                               // 1.5
FGSPluralArg(TEXT("score"), 100, 1, EGSPluralType::Cardinal)      // 10.0
```

### Typed Args (FGSArg)

```cpp
FGSArg::String(TEXT("player"), TEXT("Ada"))         // Plain string
FGSArg::Int(TEXT("count"), 1000)                    // "1,000" (locale-aware)
FGSArg::Decimal(TEXT("rate"), 314, 2)               // "3.14" (locale-aware)
FGSArg::Percent(TEXT("chance"), 155, 1)             // "15.5%" (locale-aware)
FGSArg::Currency(TEXT("price"), 1999, TEXT("USD"))  // "$19.99" (ISO 4217)
FGSArg::RawInt(TEXT("id"), 42)                      // "42" (no formatting)
```

### FLocalizationRef

```cpp
struct FLocalizationRef
{
    int32 GetSubjectActorIdx() const;       // -1 if no subject actor
    EGSGenderCategory GetSubjectGender() const;
    bool IsTemplated() const;
    int32 GetVariantCount() const;
    FString GetText() const;                // Static-gender-resolved, no template substitution
};
```

### FChoiceRef

```cpp
struct FChoiceRef
{
    int32 GetId() const;
    ENodeType GetType() const;
    FActorRef GetActor() const;
    FString GetUIResponseText() const;      // Pre-resolved by runner
    FNodeRef GetNode() const;               // Underlying node
    bool HasCondition() const;
    bool HasAction() const;
    bool IsPreventResponse() const;
    int32 GetPropertyCount() const;
    FNodePropertyRef GetProperty(int32 Index) const;
};
```

### Key Files

| File | Purpose |
|------|---------|
| `TextResolutionParams.h` | FGSPluralArg, FGSArg, FTextResolutionParams, enums |
| `VariantResolver.h/.cpp` | Three-pass variant selection (plural x gender) |
| `CldrPluralRules.h/.cpp` | CLDR cardinal + ordinal rules with decimal operands |
| `Iso4217.h/.cpp` | Currency code to decimal places lookup |
| `Refs.h` | FLocalizationRef, FChoiceRef |

---

## 7. Editor Integration

### Custom Property Drawers
Entity references stored as ID wrapper structs with custom editor UI:

```cpp
UPROPERTY(EditAnywhere)
FGSConversationId ConversationId;

UPROPERTY(EditAnywhere)
FGSActorId ActorId;
```

**Drawer behavior:**
- Loads current snapshot via `UGameScriptDatabase::EditorInstance` (with hot-reload check)
- Displays searchable picker popup (Slate UI)
- Conversations/Localizations: Tag category filters + search
- Actors/Locales: Simple scrollable list
- Stores only the int ID wrapped in a type-safe struct

### No Build Step
The property drawers read directly from the live snapshot. Workflow:
1. Edit dialogue in GameScript
2. Alt-tab away (triggers export)
3. Return to Unreal - property drawers show updated data
4. Enter Play mode - runtime loads fresh snapshot

---

## 8. Data Access

### Via Database Ref Types
```cpp
// Conversations
FConversationRef Conv = Database->FindConversation(ConversationId);
FString Name = Conv.GetName();
FNodeRef Root = Conv.GetRootNode();

// Nodes
FNodeRef Node = Database->FindNode(NodeId);
int32 VoiceLocIdx = Node.GetVoiceTextLocalizationIdx();  // Index into localizations
int32 UILocIdx = Node.GetUIResponseTextLocalizationIdx();
FActorRef Actor = Node.GetActor();

// Localizations (V3 variant-based text)
FLocalizationRef Loc = Database->FindLocalization(LocalizationId);
FString Text = Loc.GetText();                    // Static-gender-resolved, no template substitution
bool bTemplated = Loc.IsTemplated();
int32 SubjectActorIdx = Loc.GetSubjectActorIdx(); // -1 if no subject actor

// Traverse edges
for (int32 i = 0; i < Node.GetOutgoingEdgeCount(); ++i)
{
    FEdgeRef Edge = Node.GetOutgoingEdge(i);
    FNodeRef Target = Edge.GetTarget();
}

// All entity types supported
FActorRef Actor = Database->FindActor(ActorId);
FLocalizationRef Loc = Database->FindLocalization(LocalizationId);
FEdgeRef Edge = Database->FindEdge(EdgeId);
```

---

## 9. Project Structure

```
runtimes/unreal/
├── Source/
│   ├── GameScript/                     # Runtime module
│   │   ├── GameScript.Build.cs
│   │   ├── Public/
│   │   │   ├── GameScriptLoader.h
│   │   │   ├── GameScriptManifest.h
│   │   │   ├── GameScriptDatabase.h
│   │   │   ├── GameScriptRunner.h
│   │   │   ├── GameScriptSettings.h    # UDeveloperSettings
│   │   │   ├── IDialogueContext.h
│   │   │   ├── IGameScriptListener.h
│   │   │   ├── GSCompletionHandle.h
│   │   │   ├── Attributes.h            # NODE_ACTION, NODE_CONDITION macros
│   │   │   ├── Ids.h                   # ID wrapper structs
│   │   │   ├── Refs.h                  # Reference wrapper structs (FLocalizationRef, FChoiceRef, etc.)
│   │   │   ├── TextResolutionParams.h  # FGSPluralArg, FGSArg, FTextResolutionParams, enums
│   │   │   ├── VariantResolver.h       # Three-pass variant selection (plural × gender)
│   │   │   ├── CldrPluralRules.h       # CLDR cardinal + ordinal rules with decimal operands
│   │   │   ├── Iso4217.h              # Currency code → decimal places lookup
│   │   │   ├── JumpTableBuilder.h
│   │   │   └── GameplayTasks/
│   │   │       ├── DialogueActionTask.h
│   │   │       ├── DialogueAction_Delay.h
│   │   │       └── DialogueAction_PlayAnim.h
│   │   └── Private/
│   │       ├── RunnerContext.h/.cpp
│   │       ├── CancellationToken.h/.cpp
│   │       ├── VariantResolver.cpp
│   │       ├── CldrPluralRules.cpp
│   │       ├── Iso4217.cpp
│   │       └── Generated/
│   │           └── snapshot_generated.h
│   │
│   └── GameScriptEditor/               # Editor module
│       ├── GameScriptEditor.Build.cs
│       └── Private/
│           ├── PropertyDrawers/
│           │   ├── BaseIdCustomization.h/.cpp
│           │   ├── ConversationIdCustomization.h/.cpp
│           │   └── ...
│           ├── Pickers/
│           │   ├── SBasePickerWindow.h/.cpp
│           │   ├── SConversationPickerWindow.h/.cpp
│           │   └── ...
│           ├── GameScriptBuildValidation.h/.cpp
│           └── GameScriptCommand.h/.cpp
│
├── ThirdParty/
│   └── flatbuffers/                    # Auto-fetched on first build
│
├── Config/
│   └── FilterPlugin.ini
│
└── GameScript.uplugin
```

---

## 10. Performance Considerations

- **Object pooling**: URunnerContext instances pooled and reused
- **Jump tables**: Array-based O(1) dispatch, no dictionary overhead
- **Zero-copy data**: FlatBuffers reads directly from buffer
- **Lazy editor reload**: Only check hash on data access, not every frame
- **Main thread enforcement**: All API calls validated for thread safety
- **No partial states**: Factory pattern ensures objects are fully initialized
- **Minimal allocation**: Pooled contexts, handles, and cancellation tokens

---

## 11. Key Differences from Unity/Godot

### Async Pattern: UGameplayTask vs Awaitable/async

**Unity/Godot:** Use language-native async/await
```csharp
// Unity C#
public static async Awaitable Node_456_Action(IDialogueContext ctx, CancellationToken token)
{
    await AnimationManager.Play("animation", token);
}
```

**Unreal:** Use UGameplayTask for latent operations
```cpp
// Unreal C++
NODE_ACTION(456)
UGameplayTask* Node_456_Action(const IDialogueContext* Context)
{
    return UDialogueAction_PlayAnim::CreateTask(Context, Animation);
}
```

**Why?** Unreal's coroutine support is limited. UGameplayTask is the battle-tested pattern used by Gameplay Ability System and provides automatic cleanup on cancellation.

### Listener Pattern: Completion Handle vs Direct Return

**Unity/Godot:** Async methods return values directly
```csharp
// Unity
public async Awaitable<ChoiceRef> OnDecision(IReadOnlyList<ChoiceRef> choices, CancellationToken token)
{
    return await ShowChoicesAndWait(choices);
}
```

**Unreal:** Pass completion handle, call methods on it
```cpp
// Unreal
virtual void OnDecision_Implementation(
    const TArray<FChoiceRef>& Choices,
    UGSCompletionHandle* Handle) override
{
    // Store handle, call SelectChoiceByIndex() later
    PendingHandle = Handle;
    ShowChoices(Choices);
}
```

**Why?** Unreal's UFUNCTION system doesn't support async/await. The completion handle pattern is Blueprint-friendly and prevents race conditions in multi-conversation scenarios.

### Threading: Async() vs AsyncTask()

**Unreal 5.7+** uses `Async(EAsyncExecution::TaskGraphMainThread)` instead of the older `AsyncTask(ENamedThreads::GameThread)` pattern.

---

## 12. Build System

### FlatBuffers Integration
- Pre-build step auto-fetches FlatBuffers headers if missing
- Schema compiled to C++ via `flatc --cpp`
- Zero external dependencies at runtime

### Module Dependencies
```cpp
// Runtime module
PublicDependencyModuleNames.AddRange(new string[]
{
    "Core", "CoreUObject", "Engine",
    "GameplayTasks", "DeveloperSettings", "Json"
});

// Editor module
PrivateDependencyModuleNames.AddRange(new string[]
{
    "GameScript", "Core", "CoreUObject", "Engine",
    "UnrealEd", "Slate", "SlateCore", "EditorStyle",
    "PropertyEditor", "ToolMenus", "JsonUtilities", "InputCore"
});
```

---

## Success Criteria

The Unreal runtime achieves **feature parity with Unity V3**, including the text resolution pipeline:

- ✅ All listener methods (OnSpeech, OnDecision, etc.)
- ✅ Async pattern → UGameplayTask pattern
- ✅ CancellationToken → FCancellationToken (with pooling)
- ✅ Completion handle validation (prevents stale completion bug)
- ✅ All data access (Manifest → Database → Runner)
- ✅ All ref types (NodeRef, ConversationRef, etc.)
- ✅ Node type awareness (Dialogue/Logic/Root)
- ✅ Edge type awareness (Default/Hidden)
- ✅ Property system (templates + values)
- ✅ Editor features: drawers, pickers, hot-reload, IPC commands, build validation
