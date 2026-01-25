package model

import com.jetbrains.rd.generator.nova.*
import com.jetbrains.rd.generator.nova.PredefinedType.*
import com.jetbrains.rd.generator.nova.csharp.CSharp50Generator
import com.jetbrains.rd.generator.nova.kotlin.Kotlin11Generator
import java.io.File

/**
 * RdGen protocol model for GameScript Rider plugin.
 *
 * This defines the communication protocol between:
 * - Kotlin frontend (IntelliJ Platform side - handles UI, file I/O)
 * - C# backend (ReSharper side - handles semantic analysis)
 *
 * The protocol is bidirectional and type-safe. RdGen generates both
 * Kotlin and C# code from this single definition.
 *
 * Uses the Root pattern with explicit generators. Both sides bind
 * manually using the same RdId ("GameScriptModel").
 *
 * FlowTransform:
 * - Kotlin (AsIs): Caller side - initiates RPC calls
 * - C# (Reversed): Callee side - handles RPC calls and returns results
 *
 * ## Protocol Versioning
 *
 * The protocol includes a version number for compatibility detection.
 * When making breaking changes to the protocol:
 * 1. Increment PROTOCOL_VERSION below
 * 2. Update both Kotlin and C# sides to handle version mismatch
 * 3. Document the breaking change in the version history
 *
 * Version History:
 * - v1: Initial protocol (findSymbol, deleteSymbol, deleteSymbols, createSymbol)
 * - v2: Added getProtocolVersion for compatibility detection
 *
 * ## Null/Success Semantics
 *
 * Response types follow consistent semantics:
 *
 * - `findSymbol`: Returns `null` if symbol not found. If an error occurred, returns
 *   a SymbolLocation with empty filePath/text and the `error` field populated.
 *   This allows callers to distinguish "not found" from "lookup failed".
 *
 * - `deleteSymbol`: Uses `success` + `found` pattern:
 *   - `success=true, found=true`: Symbol existed and was deleted
 *   - `success=true, found=false`: Symbol didn't exist (idempotent success)
 *   - `success=false`: Error occurred (check `error` field)
 *
 * - `deleteSymbols`: Same pattern - individual entries have `found` flag per symbol
 *
 * - `createSymbol`: Uses `success` pattern:
 *   - `success=true`: Symbol was created, `lineNumber` indicates position
 *   - `success=false`: Error occurred (check `error` field)
 */
/**
 * Current protocol version. Increment when making breaking changes.
 * Both Kotlin and C# sides should check this for compatibility.
 */
const val PROTOCOL_VERSION = 2

// Suppressed because rd-gen discovers this object via reflection, not direct usage in code
@Suppress("unused")
object GameScriptModel : Root(
    Kotlin11Generator(
        FlowTransform.AsIs,
        "com.shortsleevestudio.gamescript.protocol",
        File("build/generated/rdgen/kotlin")
    ),
    CSharp50Generator(
        FlowTransform.Reversed,
        "GameScript.Backend.Protocol",
        File("src/dotnet/GameScript.Backend/Generated")
    )
) {

    /**
     * Request to find a symbol's source location.
     *
     * @property symbolName The fully-qualified symbol name to find
     *                      (e.g., "__NodeCondition_7_Impl" for C++ macros,
     *                       "Node_456_Condition" for C# methods)
     * @property filePath Absolute path to the source file to search in
     */
    private val FindSymbolRequest = structdef {
        field("symbolName", string)
        field("filePath", string)
    }

    /**
     * Response containing the symbol's location and text.
     *
     * For C++ macros, this points to the macro invocation (e.g., NODE_CONDITION(7))
     * even though the query was for the expanded name (__NodeCondition_7_Impl).
     *
     * @property filePath Absolute path to the file containing the symbol (empty on error)
     * @property startLine 0-based line number where the symbol starts (used for navigation)
     * @property text The full text of the symbol (function body, etc.) (empty on error)
     * @property error Error message if lookup failed, empty string on success
     */
    private val SymbolLocation = structdef {
        field("filePath", string)
        field("startLine", int)
        field("text", string)
        field("error", string)
    }

    // ============================================================
    // Delete Symbol RPC
    // ============================================================

    /**
     * Request to delete a single symbol from a file.
     *
     * @property symbolName The name of the symbol to delete
     * @property filePath Absolute path to the source file
     */
    private val DeleteSymbolRequest = structdef {
        field("symbolName", string)
        field("filePath", string)
    }

    /**
     * Response from deleting a symbol.
     *
     * @property success Whether the operation completed without errors
     * @property found Whether the symbol was found in the file
     * @property deletedText The text that was deleted (for undo support), empty if not found
     * @property error Error message if deletion failed (empty on success)
     */
    private val DeleteSymbolResponse = structdef {
        field("success", bool)
        field("found", bool)
        field("deletedText", string)
        field("error", string)
    }

    // ============================================================
    // Delete Symbols (Batch) RPC
    // ============================================================

    /**
     * Request to delete multiple symbols from a file (batch operation).
     *
     * @property symbolNames List of symbol names to delete
     * @property filePath Absolute path to the source file
     */
    private val DeleteSymbolsRequest = structdef {
        field("symbolNames", immutableList(string))
        field("filePath", string)
    }

    /**
     * Entry in the deleted methods map.
     *
     * @property symbolName The name of the symbol
     * @property found Whether the symbol was found in the file
     * @property deletedText The text that was deleted (empty if not found)
     */
    private val DeletedSymbolEntry = structdef {
        field("symbolName", string)
        field("found", bool)
        field("deletedText", string)
    }

    /**
     * Response from batch symbol deletion.
     *
     * @property success Whether the operation succeeded
     * @property deletedSymbols Map of symbol name -> deleted text
     * @property error Error message if operation failed
     */
    private val DeleteSymbolsResponse = structdef {
        field("success", bool)
        field("deletedSymbols", immutableList(DeletedSymbolEntry))
        field("error", string)
    }

    // ============================================================
    // Create Symbol RPC
    // ============================================================

    /**
     * Request to create/insert a method into a file.
     *
     * @property methodStub The method code to insert
     * @property filePath Absolute path to the source file
     * @property fileContent Content to use if file doesn't exist (creates new file)
     * @property usesClassWrapper Whether to insert before closing brace (true) or append (false)
     */
    private val CreateSymbolRequest = structdef {
        field("methodStub", string)
        field("filePath", string)
        field("fileContent", string)  // Used when creating new file
        field("usesClassWrapper", bool)
    }

    /**
     * Response from creating a symbol.
     *
     * @property success Whether the creation succeeded
     * @property lineNumber 0-based line number where method was inserted
     * @property error Error message if creation failed
     */
    private val CreateSymbolResponse = structdef {
        field("success", bool)
        field("lineNumber", int)
        field("error", string)
    }

    init {
        // Define the RPC calls: Kotlin frontend calls, C# backend responds

        // Protocol version check - allows detecting version mismatch at runtime
        // Returns the C# backend's protocol version number
        call("getProtocolVersion", void, int)

        // Find a symbol's location (returns null if not found)
        call("findSymbol", FindSymbolRequest, SymbolLocation.nullable)

        // Delete a single symbol
        call("deleteSymbol", DeleteSymbolRequest, DeleteSymbolResponse)

        // Delete multiple symbols (batch)
        call("deleteSymbols", DeleteSymbolsRequest, DeleteSymbolsResponse)

        // Create/insert a method
        call("createSymbol", CreateSymbolRequest, CreateSymbolResponse)
    }
}
