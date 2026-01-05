# Rider Plugin Debug Session - January 5, 2026

## Problem Summary

When C++ is configured as the code language in GameScript settings, the UI is incorrectly sending a **second request** for `.cs` files after the C++ request succeeds. This causes the error message "Code file not found" to appear even though the C++ operation worked.

## Evidence from Logs

When clicking "Enable" on a condition/action with C++ configured:

```
# First request - C++ - SUCCEEDS
CppCodeHelper: Searching for 'Node_15_Condition' in conv_4.cpp (430 chars)
CppCodeHelper: Found 'Node_15_Condition' at offset 310
CppCodeHelper: Function start at offset 298
CppCodeHelper: Returning leaf element at offset 298

# Second request - C# - FAILS (this shouldn't happen!)
handleGetMethod: Looking for file at /Users/eric/Work/GameScript/runtimes/unity/Assets/GameScript/conv_4.cs (extension: .cs)
handleGetMethod: findFileByPath returned null
handleGetMethod: File not found or doesn't exist
```

## Settings Configuration

The user has:
- Code output path: `Assets/GameScript` (same folder for both)
- C++ enabled with `.cpp` extension
- C# file does NOT exist at this path (only .cpp)

---

## Fix 1: UI Not Passing codeTemplate (FIXED ✅)

**Root cause**: The bridge functions (`getMethodBody`, `deleteMethod`, `openMethod`, etc.) all defaulted to `template = 'unity'` which uses `.cs` extension. The UI components were calling these functions without passing the current `codeTemplate` from settings.

**Files fixed**:

1. **ui/src/lib/components/common/CodeMethod.svelte**
   - Added `codeTemplate` to all bridge calls: `getMethodBody`, `deleteMethod`, `openMethod`

2. **ui/src/lib/crud/crud-code-methods.ts**
   - Added `codeTemplate` parameter to `DisableMethodParams` interface
   - Updated undo/redo callbacks to pass `codeTemplate` to `deleteMethodsSilent` and `restoreMethod`

3. **ui/src/lib/crud/crud-graph.ts**
   - Added `codeTemplate` parameter to `deleteGraphSelection` function
   - Updated all `deleteMethodsSilent` and `restoreMethod` calls

4. **ui/src/lib/crud/crud-conversations.ts**
   - Added `codeTemplate` parameter to `permanentlyDelete` function
   - Updated `deleteCodeFile` call

5. **ui/src/lib/components/graph/Graph.svelte**
   - Added code template derived state
   - Pass `codeTemplate` to `deleteGraphSelection`

6. **ui/src/lib/components/panels/ConversationFinder.svelte**
   - Added code template derived state
   - Pass `codeTemplate` to `permanentlyDelete`

7. **ui/src/lib/api/bridge.ts**
   - Fixed type mismatch in `getMethodBody` request type (added `fullText` field)

---

## Fix 2: Rider's "Dummy PSI" Problem (FIXED ✅)

**Root cause**: Rider's C# and C++ PSI in the Kotlin frontend uses "dummy" elements. The PSI tree is so shallow that:
- `PsiNamedElement.name` returns null
- `findElementAt(offset)` returns a leaf token (e.g., just "bool"), not the whole function
- Calling `element.delete()` only deletes that single token

**Solution**: Created `RiderFunctionWrapper` - a synthetic PSI element that:
1. Uses text-based parsing to find complete function boundaries
2. Returns accurate `getText()` covering the full function (including UFUNCTION macros, attributes)
3. Implements `delete()` using Document API directly (bypasses broken PSI deletion)

**New file created**:
- `plugins/rider/src/main/kotlin/com/shortsleevestudio/gamescript/handlers/RiderFunctionWrapper.kt`
  - `RiderFunctionWrapper` class - wraps a text range as a PSI element
  - `FunctionParsingUtils` object - shared brace-matching with comment/string handling

**Files updated**:

1. **CSharpCodeHelper.kt**
   - Now returns `RiderFunctionWrapper` instead of leaf PSI element
   - Uses `FunctionParsingUtils.findFunctionEnd()` for accurate range

2. **CppCodeHelper.kt**
   - Now returns `RiderFunctionWrapper` instead of leaf PSI element
   - Uses `FunctionParsingUtils.findFunctionEnd()` for accurate range
   - Removed duplicate `CppFunctionWrapper` class

3. **CodeHandlers.kt - handleDeleteMethodsSilent**
   - Collects all method ranges FIRST before any deletions
   - Sorts by offset descending (delete from end to start to preserve offsets)
   - Deletes via Document API in single WriteCommandAction
   - Commits document after all deletions

**Key implementation details**:

```kotlin
// FunctionParsingUtils.findFunctionEnd handles:
// - Brace matching { }
// - Line comments //
// - Block comments /* */
// - String literals "..."
// - Char literals '...'
// - C# verbatim strings @"..."
```

---

## Fix 3: Undo/Redo Conflict (FIXED ✅)

**Problem**: Two undo/redo systems were fighting each other:
1. **UI's undo system** - The webview has its own undo stack that calls `createMethod`/`deleteMethodsSilent`/`restoreMethod`
2. **Rider's native undo system** - Tracks document changes via UndoManager

When user pressed Cmd+Z, both systems responded.

**Why CefKeyboardHandler doesn't work**:
- CefKeyboardHandler runs **inside Chromium**
- By the time it fires, the IDE has **already decided** to run $Undo, $Redo, $Save
- Returning `true` from `onKeyEvent()` only prevents Chromium's default behavior
- It does NOT prevent IDE actions

**Why SwingUtilities.isDescendingFrom() doesn't work with JCEF**:
- JCEF's focus bypasses Swing entirely
- The actual focused component is often a native peer or hidden component
- `FocusListener` on `browser.component` never fires

**Solution implemented**:
1. Use `IdeEventQueue.addDispatcher()` to intercept at the AWT level, BEFORE the Action System
2. Use `CefFocusHandler` (not Swing `FocusListener`) to track focus at the CEF level

**Implementation in GameScriptBrowserPanel.kt**:

```kotlin
// Explicit focus tracking flag
@Volatile
private var webviewHasFocus = false

// CefFocusHandler hooks into Chromium's native focus system
browser.jbCefClient.addFocusHandler(object : org.cef.handler.CefFocusHandler {
    override fun onTakeFocus(cefBrowser: CefBrowser?, next: Boolean) {
        webviewHasFocus = false
    }

    override fun onSetFocus(cefBrowser: CefBrowser?, source: FocusSource?): Boolean {
        webviewHasFocus = true
        return false // Allow focus to be set
    }

    override fun onGotFocus(cefBrowser: CefBrowser?) {
        webviewHasFocus = true
    }
}, browser.cefBrowser)

// IdeEventQueue dispatcher - intercepts BEFORE Action System
val keyboardDispatcher = IdeEventQueue.EventDispatcher { event ->
    if (event !is KeyEvent || event.id != KeyEvent.KEY_PRESSED) {
        return@EventDispatcher false
    }

    if (!webviewHasFocus) {
        return@EventDispatcher false
    }

    val isCommand = if (SystemInfo.isMac) event.isMetaDown else event.isControlDown
    val isShift = event.isShiftDown

    when {
        isCommand && !isShift && event.keyCode == KeyEvent.VK_Z -> {
            messageBridge.postToUI("edit:undo", emptyMap())
            event.consume()
            true // Fully consumed - stops IDE from processing
        }
        isCommand && isShift && event.keyCode == KeyEvent.VK_Z -> {
            messageBridge.postToUI("edit:redo", emptyMap())
            event.consume()
            true
        }
        isCommand && !isShift && event.keyCode == KeyEvent.VK_Y -> {
            messageBridge.postToUI("edit:redo", emptyMap())
            event.consume()
            true
        }
        isCommand && !isShift && event.keyCode == KeyEvent.VK_S -> {
            messageBridge.postToUI("edit:save", emptyMap())
            event.consume()
            true
        }
        else -> false
    }
}
IdeEventQueue.getInstance().addDispatcher(keyboardDispatcher, this)
```

---

## Fix 4: C# Attribute Deletion Bug (FIXED ✅)

**Problem**: When undoing the creation of a C# condition/action, the `[NodeCondition(...)]` attribute was left behind - only the method body was deleted.

**Root cause**: The `findMethodStart()` function in `CSharpCodeHelper.kt` had a bug where it didn't properly walk backwards through attribute lines. It was recursively calling itself with the wrong position.

**Solution**: Rewrote `findMethodStart()` to use an iterative approach:
1. Find the start of the method's signature line
2. Walk backwards through preceding lines
3. Include any line that starts with `[` and contains `]` (C# attribute syntax)
4. Handle empty lines between attributes
5. Stop when hitting a non-attribute, non-empty line

```kotlin
private fun findMethodStart(text: String, methodNameOffset: Int): Int {
    // Find start of method signature line
    var pos = methodNameOffset
    while (pos > 0 && text[pos - 1] != '\n' && text[pos - 1] != '}' && text[pos - 1] != '{' && text[pos - 1] != ';') {
        pos--
    }

    // Walk backwards to include attribute lines
    var resultStart = pos
    var checkPos = pos

    while (checkPos > 0) {
        if (text[checkPos - 1] != '\n') break
        val prevLineEnd = checkPos - 1

        var prevLineStart = prevLineEnd
        while (prevLineStart > 0 && text[prevLineStart - 1] != '\n') {
            prevLineStart--
        }

        val prevLine = text.substring(prevLineStart, prevLineEnd).trim()

        when {
            prevLine.isEmpty() -> {
                checkPos = prevLineStart
                continue
            }
            prevLine.startsWith("[") && prevLine.contains("]") -> {
                resultStart = prevLineStart
                checkPos = prevLineStart
            }
            else -> break
        }
    }

    return resultStart
}
```

---

## Fix 5: ELK Layout Race Condition (FIXED ✅)

**Problem**: When pressing Cmd+Z/Cmd+Shift+Z rapidly, the following error appeared:
```
[GameScript] Unhandled rejection: org.eclipse.elk.graph.json.JsonImportException: Referenced shape does not exist: 43.11
```

**Root cause**: Race condition in the ELK layout engine. When undo/redo happened quickly:
1. `scheduleLayout()` queued a layout via `requestAnimationFrame`
2. While `await elk.layout(...)` was processing, undo/redo modified the graph
3. ELK returned results referencing nodes that no longer exist

**Solution**: Added a `layoutVersion` counter to detect stale layout computations:

```typescript
let layoutVersion = 0;

function scheduleLayout(): void {
    if (layoutScheduled) return;
    layoutScheduled = true;
    layoutVersion++;

    const currentVersion = layoutVersion;
    requestAnimationFrame(() => {
        layoutScheduled = false;
        void processLayout(currentVersion);
    });
}

async function processLayout(version: number): Promise<void> {
    // Check if superseded at start
    if (version !== layoutVersion) return;

    // ... layout computation ...

    const laidOut = await elk.layout({ ... });

    // Check if superseded after async operation
    if (version !== layoutVersion) return;

    // ... apply results ...
}
```

---

## Fix 6: Kotlin Code Cleanup (FIXED ✅)

**Removed all debug LOG statements** from:
- `CSharpCodeHelper.kt` - Removed Logger import and all LOG.info calls
- `CppCodeHelper.kt` - Removed Logger import and all LOG.info calls
- `CodeHandlers.kt` - Removed excessive LOG.info calls (kept LOG.error for actual errors)
- `GameScriptBrowserPanel.kt` - Removed LOG.info from focus/keyboard handlers
- `RiderFunctionWrapper.kt` - Removed Logger import and LOG.info call

**Code is now production-ready** with only essential error logging remaining.

---

## Completed Work

### Task 1: VSCode Undo/Redo/Save Bindings (FIXED ✅)

**Problem**: VSCode extension didn't intercept Cmd+Z/Cmd+Shift+Z/Cmd+S when the GameScript panel was focused, causing conflicts with VSCode's native undo/redo.

**Solution implemented**:

1. **plugins/vscode/package.json** - Added keybinding commands:
   - `gamescript.undo` (Cmd+Z / Ctrl+Z)
   - `gamescript.redo` (Cmd+Shift+Z / Ctrl+Shift+Z / Cmd+Y / Ctrl+Y)
   - `gamescript.save` (Cmd+S / Ctrl+S)
   - All bound with `"when": "gamescriptPanelFocused"` context

2. **plugins/vscode/src/extension.ts** - Registered command handlers that send messages to webview:
   ```typescript
   vscode.commands.registerCommand('gamescript.undo', () => {
     GameScriptPanel.sendToPanel({ type: 'edit:undo' });
   })
   ```

3. **ui/src/lib/components/app/App.svelte** - Cleaned up:
   - Removed empty `handleKeydown` function
   - Removed `window.addEventListener('keydown', handleKeydown)` call
   - Kept bridge event subscriptions (`editUndo`, `editRedo`, `editSave`)

### Task 2: VSCode File Watcher Patterns (FIXED ✅)

**Problem**: VSCode's file watcher was hardcoded to `.cs` files, preventing C++ file change detection for Unreal projects.

**Solution implemented**:

1. **shared/src/types/messages.ts** - Added `fileExtension` field to `CodeWatchFolderMessage`

2. **ui/src/lib/api/bridge.ts** - Updated `watchCodeFolder` to accept and send `fileExtension`

3. **ui/src/lib/components/app/App.svelte** - Now sends `codeFileExtension` derived from code template setting

4. **plugins/vscode/src/handlers/code/index.ts** - Extracts `fileExtension` from message and passes to panel

5. **plugins/vscode/src/panel.ts** - Dynamic file patterns:
   - Removed hardcoded `CONVERSATION_FILE_PATTERN` and `CONVERSATION_FILE_REGEX`
   - Added `createConversationFilePattern(ext)` and `createConversationFileRegex(ext)` functions
   - `setupCodeFileWatcher` now accepts `fileExtension` parameter

### Task 3: Compare VSCode vs Rider Code Handler Architecture (ANALYZED ✅)

**Question**: Rider has bifurcated architecture with `CSharpCodeHelper` and `CppCodeHelper`. Does VSCode need the same?

**Analysis**:

| Feature | Rider | VSCode |
|---------|-------|--------|
| Method finding | Text-based search + RiderFunctionWrapper (PSI is dummy) | `vscode.executeDocumentSymbolProvider` |
| Symbol resolution | Manual regex matching | Language server provides symbols |
| Attribute handling | Manual backward search | Language server includes attributes in range |
| Method deletion | Document API (PSI deletion broken) | WorkspaceEdit (standard VSCode API) |

**Conclusion**: VSCode does NOT need bifurcated helpers because:
1. VSCode's Document Symbol Provider works consistently across languages
2. Language servers (OmniSharp for C#, clangd for C++) properly handle attributes/macros
3. VSCode's WorkspaceEdit handles deletion correctly regardless of language

---

## Key Architecture Notes

- IDE plugins (VSCode, Rider) act as the backend
- UI runs in a webview and communicates via message passing
- Settings include `fileExtension` which should be `.cs` or `.cpp`
- Each node can have a condition and/or action method
- Methods are stored in `conv_{conversationId}{extension}` files

## Important PSI/Document Sync Rules (Rider only)

1. **Before reading PSI**: Call `PsiDocumentManager.commitDocument(document)`
2. **After Document modifications**: Call `PsiDocumentManager.commitDocument(document)`
3. **For batch deletions**: Collect all ranges first, sort descending, delete in one WriteCommandAction
4. **Always use Document API for C++/C#**: PSI-based deletion is unreliable in Rider's frontend

## Key Learnings

1. **JCEF focus bypasses Swing** - Use `CefFocusHandler`, not `FocusListener`
2. **IdeEventQueue is the only way** to intercept before IDE actions
3. **Rider's PSI is "dummy"** - Use text-based parsing with `RiderFunctionWrapper`
4. **VSCode's symbol provider is reliable** - No bifurcation needed
5. **Undo transparency requires both**:
   - `CommandProcessor.runUndoTransparentAction { }`
   - `DocumentEx.setInBulkUpdate(true)` for extra safety
6. **Layout race conditions** - Use version counters to detect stale async results
