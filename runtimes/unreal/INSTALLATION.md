# GameScript Unreal Runtime - Installation Guide

## Installation Methods

### Method 1: Install Pre-Built Plugin (Recommended)

1. **Download/Copy the built plugin:**
   ```
   GameScript/runtimes/unreal/Build/
   ```

2. **Add to your Unreal project:**
   - Navigate to your Unreal project root
   - Create a `Plugins` folder if it doesn't exist
   - Copy the entire `Build` folder contents to `YourProject/Plugins/GameScript/`

   Your project structure should look like:
   ```
   YourProject/
   ├── Content/
   ├── Plugins/
   │   └── GameScript/
   │       ├── Binaries/
   │       ├── Config/
   │       ├── Content/
   │       ├── Resources/
   │       ├── Source/
   │       └── GameScript.uplugin
   └── YourProject.uproject
   ```

3. **Regenerate project files:**
   - Right-click on `YourProject.uproject`
   - Select "Generate Visual Studio project files" (or "Switch Unreal Engine version..." and regenerate)

4. **Enable the plugin:**
   - Open your project in Unreal Editor
   - Go to Edit → Plugins
   - Search for "GameScript"
   - Check the enabled box
   - Restart the editor when prompted

5. **Verify installation:**
   - Create a new C++ class or Blueprint
   - You should see GameScript types in autocomplete (e.g., `UGameScriptLoader`, `IGameScriptListener`)

### Method 2: Build from Source

If you want to modify the plugin or build for different platforms:

1. **Prerequisites:**
   - Unreal Engine 5.7+ installed
   - Xcode (macOS) or Visual Studio (Windows)
   - Git (for FlatBuffers dependency)

2. **Fetch FlatBuffers dependency:**
   ```bash
   cd GameScript/runtimes/unreal
   ./setup_flatbuffers.sh
   ```

3. **Build the plugin:**
   ```bash
   "/Path/To/UE_5.7/Engine/Build/BatchFiles/RunUAT.sh" BuildPlugin \
     -Plugin="$(pwd)/GameScript.uplugin" \
     -Package="$(pwd)/Build" \
     -TargetPlatforms=Mac \
     -Rocket
   ```

   For Windows, use `RunUAT.bat` instead.

4. **Follow Method 1 steps 2-5** to install the built plugin

---

## Project Setup

### 1. Add GameScript Data to Your Project

Place your GameScript snapshot files in your project:
```
YourProject/Content/GameScript/
├── manifest.json
└── locales/
    ├── en_US.gsb
    └── es_ES.gsb
```

### 2. Configure GameScript Settings

In your project settings:
1. Go to Project Settings → Game → GameScript
2. Set the base path to your GameScript data:
   - Editor: `Content/GameScript`
   - Runtime: Will use packaged path automatically

---

## VSCode Setup (For Code Preview)

When using VSCode with the GameScript editor, the **code preview feature** requires a C++ language server to parse your dialogue files. Without proper configuration, you'll see errors on the `NODE_CONDITION`/`NODE_ACTION` macros.

### Prerequisites

Install the [clangd](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd) extension (recommended over Microsoft C/C++ for Unreal projects).

### Setup Steps

#### 1. Generate UBT Compile Commands

First, generate Unreal's compile commands database:

```bash
# macOS
"/Users/Shared/Epic Games/UE_5.7/Engine/Build/BatchFiles/Mac/GenerateProjectFiles.sh" \
    -project="/path/to/YourProject.uproject" \
    -game

# Windows
"C:\Program Files\Epic Games\UE_5.7\Engine\Build\BatchFiles\GenerateProjectFiles.bat" ^
    -project="C:\path\to\YourProject.uproject" ^
    -game
```

This creates `.vscode/compileCommands_*.json` files in your project.

#### 2. Create .clangd Configuration

Dialogue files (`Dialogue/conv_*.cpp`) aren't part of any Unreal module, so they need special handling. Create a `.clangd` file in your **project root** (next to `YourProject.uproject`):

```yaml
# Use UBT-generated compile commands for normal project files
CompileFlags:
  CompilationDatabase: .vscode

---
# Special configuration for Dialogue folder (conv_*.cpp files)
# These files aren't part of any Unreal module, so use GameScript's headers directly
If:
  PathMatch: Dialogue/.*\.cpp
CompileFlags:
  CompilationDatabase: None
  Add:
    # Force-include the Definitions header (contains Unreal defines and forward declarations)
    - "-include"
    - "/path/to/YourProject/Plugins/GameScript/Intermediate/Build/Mac/arm64/UnrealEditor/Development/GameScript/Definitions.GameScript.h"
    # Force-include the PCH (contains all Unreal headers)
    - "-include"
    - "/path/to/YourProject/Intermediate/Build/Mac/arm64/YourProjectEditor/Development/UnrealEd/SharedPCH.UnrealEd.Project.ValApi.ValExpApi.Cpp20.h"
    # Include paths
    - "-I/path/to/YourProject/Intermediate/Build/Mac/arm64/YourProjectEditor/Development/UnrealEd"
    - "-I/Users/Shared/Epic Games/UE_5.7/Engine/Source"
    - "-I/path/to/YourProject/Plugins/GameScript/Source/GameScript/Public"
    - "-I/path/to/YourProject/Plugins/GameScript/Source"
    - "-I/Users/Shared/Epic Games/UE_5.7/Engine/Source/Runtime/Core/Public"
    - "-I/Users/Shared/Epic Games/UE_5.7/Engine/Source/Runtime/CoreUObject/Public"
    - "-I/Users/Shared/Epic Games/UE_5.7/Engine/Source/Runtime/Engine/Classes"
    - "-I/Users/Shared/Epic Games/UE_5.7/Engine/Source/Runtime/Engine/Public"
    - "-I/Users/Shared/Epic Games/UE_5.7/Engine/Intermediate/Build/Mac/UnrealEditor/Inc/Core/UHT"
    - "-I/Users/Shared/Epic Games/UE_5.7/Engine/Intermediate/Build/Mac/UnrealEditor/Inc/CoreUObject/UHT"
    - "-I/Users/Shared/Epic Games/UE_5.7/Engine/Intermediate/Build/Mac/UnrealEditor/Inc/Engine/UHT"
    - "-I/path/to/YourProject/Plugins/GameScript/Intermediate/Build/Mac/UnrealEditor/Inc/GameScript/UHT"
    - "-std=c++20"
```

**Important:** Replace all paths:
- `/path/to/YourProject/` → Your actual project path
- `YourProjectEditor` → Your project name + "Editor"
- `Mac/arm64` → `Win64` on Windows
- `/Users/Shared/Epic Games/UE_5.7/` → Your Unreal Engine installation path

#### 3. Build Once to Generate Headers

The force-included headers (`Definitions.GameScript.h` and the PCH) are generated during compilation:

```bash
# Build the project once (Editor target)
"/Users/Shared/Epic Games/UE_5.7/Engine/Build/BatchFiles/Mac/Build.sh" \
    YourProjectEditor Mac Development \
    -project="/path/to/YourProject.uproject"
```

Or simply open the project in Unreal Editor (which triggers a build).

#### 4. Restart clangd

Run "clangd: Restart language server" from the Command Palette (Cmd+Shift+P / Ctrl+Shift+P).

### Verify Setup

1. Open a dialogue file (e.g., `Dialogue/conv_1.cpp`)
2. The `#include` lines should have no red squiggles
3. The `NODE_CONDITION` and `NODE_ACTION` macros should be recognized
4. Hover over `IDialogueContext` - you should see type information

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Red squiggles on `NODE_CONDITION`/`NODE_ACTION` | `Attributes.h` not found | Check the GameScript Public include path |
| "A type specifier is required" errors | Force-included headers not found | Build the project once to generate headers |
| "Base class has incomplete type" for `UObject` | PCH not loading | Verify the PCH path exists after building |
| No errors but no IntelliSense either | clangd not using .clangd config | Ensure `.clangd` is in project root, restart clangd |

**Tip:** Check clangd output in View → Output → clangd for detailed error messages

---

## Quick Start Usage

### C++ Example

```cpp
#include "GameScriptLoader.h"
#include "GameScriptRunner.h"
#include "IGameScriptListener.h"

// 1. Implement the listener interface
class YOURGAME_API UMyDialogueUI : public UUserWidget, public IGameScriptListener
{
    GENERATED_BODY()

public:
    // Lifecycle events - return when ready to proceed
    virtual void OnConversationEnter_Implementation(
        FConversationRef Conversation,
        UGSCompletionHandle* Handle) override
    {
        // Setup UI
        Handle->NotifyReady();
    }

    virtual void OnSpeech_Implementation(
        FNodeRef Node,
        UGSCompletionHandle* Handle) override
    {
        // Display dialogue
        DialogueText->SetText(FText::FromString(Node.GetVoiceText()));

        // Wait 2 seconds, then notify ready
        FTimerHandle TimerHandle;
        GetWorld()->GetTimerManager().SetTimer(
            TimerHandle,
            [Handle]() { Handle->NotifyReady(); },
            2.0f,
            false
        );
    }

    virtual void OnDecision_Implementation(
        const TArray<FNodeRef>& Choices,
        UGSCompletionHandle* Handle) override
    {
        // Store handle for later
        PendingDecisionHandle = Handle;

        // Display choice buttons
        for (int32 i = 0; i < Choices.Num(); ++i)
        {
            CreateChoiceButton(Choices[i], i);
        }
    }

    // Synchronous events
    virtual void OnConversationCancelled_Implementation(FConversationRef Conversation) override
    {
        // Clean up UI
        if (PendingDecisionHandle)
        {
            PendingDecisionHandle->NotifyReady(); // Unblock
        }
    }

private:
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

// 2. Initialize and start a conversation
void AMyGameMode::StartDialogue()
{
    // Load manifest and database
    UGameScriptManifest* Manifest = UGameScriptLoader::LoadManifest();
    UGameScriptDatabase* Database = Manifest->LoadDatabaseWithPrimaryLocale();

    // Create runner
    UGameScriptRunner* Runner = NewObject<UGameScriptRunner>(this);
    Runner->Initialize(Database, Settings);

    // Start conversation
    TScriptInterface<IGameScriptListener> Listener = MyDialogueUI;
    FActiveConversation Handle = Runner->StartConversation(
        ConversationId.Value,
        Listener,
        PlayerController->GetPawn() // Task owner for latent actions
    );
}
```

### Blueprint Example

1. Create a Blueprint Widget that implements `GameScriptListener` interface
2. Implement the event nodes:
   - `OnSpeech`: Display dialogue, call `NotifyReady` on Handle when done
   - `OnDecision`: Show choice buttons, call `SelectChoiceByIndex` on Handle when clicked
3. In your GameMode, call `LoadManifest` → `LoadDatabase` → Create Runner → `StartConversation`

---

## Writing Actions and Conditions

### Simple Action (Instant)
```cpp
// In any .cpp file
NODE_ACTION(123)
UGameplayTask* AwardGold(const IDialogueContext* Context)
{
    PlayerState->Gold += 10;
    return nullptr; // Instant action
}
```

### Latent Action (Async)
```cpp
NODE_ACTION(456)
UGameplayTask* PlayCutscene(const IDialogueContext* Context)
{
    // Return a task that completes when animation is done
    return UDialogueAction_PlayAnim::CreateTask(Context, MyCutsceneAnim);
}
```

### Condition
```cpp
NODE_CONDITION(789)
bool HasEnoughGold(const IDialogueContext* Context)
{
    return PlayerState->Gold >= 10;
}
```

---

## Troubleshooting

### Plugin won't enable
- Check Output Log for errors
- Ensure all required modules are present (GameplayTasks, Json)
- Regenerate project files

### Missing node implementations error
- Use the `[NODE_ACTION(id)]` and `[NODE_CONDITION(id)]` macros
- Check that node IDs match those in GameScript editor
- Build validation runs automatically before PIE

### Hot-reload not working
- Property drawers cache snapshot data
- Alt-tab from GameScript editor triggers export
- Check manifest.json hash updates

---

## Next Steps

- See `ARCHITECTURE_UNREAL.md` for detailed architecture documentation
- See `IMPLEMENTATION_PLAN.md` for implementation details and design decisions
- Check out the TestRig example project (if available)
