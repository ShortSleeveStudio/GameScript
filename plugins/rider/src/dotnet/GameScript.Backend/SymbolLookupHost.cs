using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using GameScript.Backend.Protocol;
using JetBrains.Annotations;
using JetBrains.Application.Parts;
using System.Diagnostics;
using JetBrains.Diagnostics;
using JetBrains.DocumentModel;
using JetBrains.Lifetimes;
using JetBrains.ProjectModel;
using JetBrains.Rd;
using JetBrains.Rd.Base;
using JetBrains.Rd.Tasks;
using JetBrains.ReSharper.Feature.Services.Protocol;
using JetBrains.ReSharper.Psi;
using JetBrains.ReSharper.Psi.CSharp;
using JetBrains.ReSharper.Psi.CSharp.Tree;
using JetBrains.ReSharper.Psi.Files;
using JetBrains.ReSharper.Psi.Tree;
using JetBrains.Application.Threading;
using JetBrains.Util;

namespace GameScript.Backend
{
    /// <summary>
    /// Helper for matching braces in C++ code, handling strings, chars, and comments.
    /// Used by multiple methods that need to find function body boundaries.
    /// </summary>
    internal static class BraceMatchingHelper
    {
        /// <summary>
        /// Check if a character at a given position is escaped by preceding backslashes.
        /// Counts consecutive backslashes before the position - odd count means escaped.
        /// </summary>
        /// <param name="text">The source text</param>
        /// <param name="index">The index of the character to check</param>
        /// <returns>True if the character is escaped (odd number of preceding backslashes)</returns>
        /// <remarks>
        /// Examples:
        /// - "hello\"" - quote at end is escaped (1 backslash)
        /// - "hello\\"" - quote at end is NOT escaped (2 backslashes = escaped backslash)
        /// - "hello\\\"" - quote at end IS escaped (3 backslashes = escaped backslash + escape)
        /// </remarks>
        private static bool IsEscaped(string text, int index)
        {
            if (index <= 0) return false;

            var backslashCount = 0;
            var pos = index - 1;
            while (pos >= 0 && text[pos] == '\\')
            {
                backslashCount++;
                pos--;
            }
            return backslashCount % 2 == 1;
        }

        /// <summary>
        /// Find the position of the closing brace that matches an opening brace.
        /// Handles string literals, char literals, and comments correctly.
        /// </summary>
        /// <param name="text">The source text</param>
        /// <param name="openBraceIndex">Index of the opening brace '{'</param>
        /// <returns>Index of the matching closing brace, or -1 if not found</returns>
        public static int FindMatchingCloseBrace(string text, int openBraceIndex)
        {
            var length = text.Length;
            var braceDepth = 1;
            var inString = false;
            var inChar = false;
            var inLineComment = false;
            var inBlockComment = false;

            for (var i = openBraceIndex + 1; i < length; i++)
            {
                var c = text[i];
                var prev = i > 0 ? text[i - 1] : '\0';

                // Handle line comments
                if (inLineComment)
                {
                    if (c == '\n')
                        inLineComment = false;
                    continue;
                }

                // Handle block comments
                if (inBlockComment)
                {
                    if (c == '/' && prev == '*')
                        inBlockComment = false;
                    continue;
                }

                // Check for comment starts
                if (!inString && !inChar)
                {
                    if (c == '/' && i + 1 < length)
                    {
                        if (text[i + 1] == '/')
                        {
                            inLineComment = true;
                            continue;
                        }
                        if (text[i + 1] == '*')
                        {
                            inBlockComment = true;
                            continue;
                        }
                    }
                }

                // Handle string literals (with proper escaped backslash handling)
                if (!inChar)
                {
                    if (c == '"' && !IsEscaped(text, i))
                    {
                        inString = !inString;
                        continue;
                    }
                }

                // Handle char literals (with proper escaped backslash handling)
                if (!inString)
                {
                    if (c == '\'' && !IsEscaped(text, i))
                    {
                        inChar = !inChar;
                        continue;
                    }
                }

                // Count braces only outside strings/chars/comments
                if (!inString && !inChar)
                {
                    if (c == '{')
                        braceDepth++;
                    else if (c == '}')
                    {
                        braceDepth--;
                        if (braceDepth == 0)
                        {
                            return i;
                        }
                    }
                }
            }

            return -1; // No matching brace found
        }

        /// <summary>
        /// Find the opening brace of a function starting from a given offset.
        /// </summary>
        /// <param name="text">The source text</param>
        /// <param name="startOffset">Where to start searching</param>
        /// <returns>Index of the opening brace, or -1 if a semicolon is found first (declaration without body)</returns>
        public static int FindOpeningBrace(string text, int startOffset)
        {
            var length = text.Length;
            for (var i = startOffset; i < length; i++)
            {
                var c = text[i];
                if (c == '{')
                    return i;
                // If we hit a semicolon, this is a declaration without body
                if (c == ';')
                    return -1;
            }
            return -1;
        }
    }

    /// <summary>
    /// Backend component that handles symbol lookup requests from the Kotlin frontend.
    ///
    /// Uses ReSharper's semantic analysis to find symbols, which correctly handles:
    /// - C++ macros (NODE_CONDITION(7) -> __NodeCondition_7_Impl)
    /// - C# methods with attributes
    /// - Full IDE indexing and caching
    ///
    /// Protocol versioning: The backend reports its protocol version via getProtocolVersion.
    /// If the Kotlin frontend has a different version, it can detect incompatibility.
    ///
    /// IMPORTANT: This component is lazy (DemandAnyThreadSafe). It requires
    /// SymbolLookupActivator to force instantiation at solution load time.
    /// Without the activator, the RPC handlers wouldn't be registered until
    /// something explicitly requests this component - which would cause the
    /// Kotlin frontend's RPC calls to time out.
    /// </summary>
    [SolutionComponent(Instantiation.DemandAnyThreadSafe)]
    public class SymbolLookupHost
    {
        // ============================================================
        // Constants
        // ============================================================

        // Use JetBrains logger for visibility in Rider's internal logs
        private static readonly ILog Logger = JetBrains.Diagnostics.Log.GetLog<SymbolLookupHost>();

        /// <summary>
        /// Log an info-level message (initialization, significant events).
        /// </summary>
        private static void LogInfo(string message) => Logger.Info(message);

        /// <summary>
        /// Log a debug-level message (detailed diagnostics, per-operation tracing).
        /// These are only visible when debug logging is enabled.
        /// </summary>
        private static void LogDebug(string message) => Logger.Verbose(message);

        /// <summary>
        /// Log a warning-level message (recoverable issues, unexpected states).
        /// </summary>
        private static void LogWarn(string message) => Logger.Warn(message);

        /// <summary>
        /// Protocol version for compatibility detection.
        /// Must match PROTOCOL_VERSION in GameScriptModel.kt.
        ///
        /// SYNC REQUIRED: When updating this value, also update:
        /// - Kotlin: protocol/src/main/kotlin/model/GameScriptModel.kt (PROTOCOL_VERSION)
        /// </summary>
        private const int ProtocolVersion = 2;

        /// <summary>
        /// GameScript-specific C++ macros that should be included with declarations.
        /// Update this list if new macro types are added to GameScript.
        /// </summary>
        private static readonly string[] GameScriptMacros = { "NODE_CONDITION", "NODE_ACTION" };

        /// <summary>
        /// Unreal Engine macros commonly used with GameScript in Unreal projects.
        /// These are included to properly capture declaration boundaries.
        /// </summary>
        private static readonly string[] UnrealMacros =
        {
            "UFUNCTION", "UPROPERTY", "UCLASS", "USTRUCT", "UENUM", "UMETA"
        };

        // ============================================================
        // Insertion Logic Constants
        // ============================================================
        //
        // ╔══════════════════════════════════════════════════════════════════════════╗
        // ║                          SYNC REQUIRED                                    ║
        // ╠══════════════════════════════════════════════════════════════════════════╣
        // ║  These constants MUST be kept in sync across THREE locations:            ║
        // ║                                                                          ║
        // ║  1. Kotlin: plugins/rider/.../handlers/CodeHandlers.kt                   ║
        // ║     - Used for: GDScript text-based insertion/deletion                   ║
        // ║     - Constants: APPEND_SEPARATOR, CLASS_INSERT_PREFIX, CLASS_INSERT_SUFFIX║
        // ║     - Function: adjustStartForLeadingNewline()                           ║
        // ║                                                                          ║
        // ║  2. C#: plugins/rider/src/dotnet/.../SymbolLookupHost.cs (this file)     ║
        // ║     - Used for: C#/C++ PSI-based insertion/deletion                      ║
        // ║     - Constants: AppendSeparator, ClassInsertPrefix, ClassInsertSuffix   ║
        // ║     - Function: AdjustStartForLeadingNewline()                           ║
        // ║                                                                          ║
        // ║  3. TypeScript: shared/src/templates/index.ts                            ║
        // ║     - Used for: usesClassWrapper() logic that determines insertion mode  ║
        // ║     - Also used by: plugins/vscode/src/handlers/code/index.ts            ║
        // ║                                                                          ║
        // ║  Current values:                                                         ║
        // ║    AppendSeparator    = "\n\n"  (Godot/Unreal: append to end of file)   ║
        // ║    ClassInsertPrefix  = "\n"    (Unity: newline before method)          ║
        // ║    ClassInsertSuffix  = "\n"    (Unity: newline after method)           ║
        // ║                                                                          ║
        // ║  Leading newline adjustment (for clean deletion):                        ║
        // ║    If char before startOffset is '\n', include it in deletion range     ║
        // ║    This prevents leaving extra blank lines after deletion               ║
        // ║                                                                          ║
        // ║  If you change these values, update ALL THREE locations!                 ║
        // ╚══════════════════════════════════════════════════════════════════════════╝
        // ============================================================

        /// <summary>Newline separator for appending to end of file (Godot/Unreal style, no class wrapper).</summary>
        private const string AppendSeparator = "\n\n";

        /// <summary>Newline prefix/suffix for class wrapper insertion (Unity style, before closing brace).</summary>
        private const string ClassInsertPrefix = "\n";
        private const string ClassInsertSuffix = "\n";

        /// <summary>
        /// Adjustment value for converting ReSharper's 1-based line/column numbers to 0-based.
        /// ReSharper PSI uses 1-based coordinates, but the protocol uses 0-based.
        /// </summary>
        private const int OneBasedToZeroBasedAdjustment = 1;

        // ============================================================
        // Fields
        // ============================================================

        private readonly ISolution _solution;
        private readonly IShellLocks _locks;

        public SymbolLookupHost(
            Lifetime lifetime,
            ISolution solution,
            IShellLocks locks)
        {
            _solution = solution;
            _locks = locks;

            var protocol = TryGetProtocol(solution);
            if (protocol == null)
            {
                LogWarn("SymbolLookupHost: Could not get protocol - backend will be unavailable");
                return;
            }

            // Create and bind the protocol model
            var model = new GameScriptModel(lifetime, protocol);

            // Register the RPC handlers
            model.GetProtocolVersion.Set((lt, _) => RdTask<int>.Successful(ProtocolVersion));

            model.FindSymbol.Set((lt, request) =>
            {
                try
                {
                    if (!lt.IsAlive)
                        return RdTask<SymbolLocation?>.Cancelled();

                    SymbolLocation? result;
                    using (_locks.UsingReadLock())
                    {
                        result = FindSymbolCore(request, lt);
                    }
                    return RdTask<SymbolLocation?>.Successful(result);
                }
                catch (OperationCanceledException)
                {
                    return RdTask<SymbolLocation?>.Cancelled();
                }
                catch (Exception ex)
                {
                    LogWarn($"FindSymbol failed: {ex.Message}");
                    return RdTask<SymbolLocation?>.Successful(new SymbolLocation("", 0, "", $"Error: {ex.Message}"));
                }
            });

            model.DeleteSymbol.Set((lt, request) =>
            {
                try
                {
                    if (!lt.IsAlive)
                        return RdTask<DeleteSymbolResponse>.Cancelled();

                    DeleteSymbolResponse result;
                    using (_locks.UsingWriteLock())
                    {
                        result = DeleteSymbolCore(request, lt);
                    }
                    return RdTask<DeleteSymbolResponse>.Successful(result);
                }
                catch (OperationCanceledException)
                {
                    return RdTask<DeleteSymbolResponse>.Cancelled();
                }
                catch (Exception ex)
                {
                    LogWarn($"DeleteSymbol failed: {ex.Message}");
                    return RdTask<DeleteSymbolResponse>.Successful(new DeleteSymbolResponse(false, false, "", $"Error: {ex.Message}"));
                }
            });

            model.DeleteSymbols.Set((lt, request) =>
            {
                try
                {
                    if (!lt.IsAlive)
                        return RdTask<DeleteSymbolsResponse>.Cancelled();

                    DeleteSymbolsResponse result;
                    using (_locks.UsingWriteLock())
                    {
                        result = DeleteSymbolsCore(request, lt);
                    }
                    return RdTask<DeleteSymbolsResponse>.Successful(result);
                }
                catch (OperationCanceledException)
                {
                    return RdTask<DeleteSymbolsResponse>.Cancelled();
                }
                catch (Exception ex)
                {
                    LogWarn($"DeleteSymbols failed: {ex.Message}");
                    return RdTask<DeleteSymbolsResponse>.Successful(new DeleteSymbolsResponse(false, new List<DeletedSymbolEntry>(), $"Error: {ex.Message}"));
                }
            });

            model.CreateSymbol.Set((lt, request) =>
            {
                try
                {
                    if (!lt.IsAlive)
                        return RdTask<CreateSymbolResponse>.Cancelled();

                    CreateSymbolResponse result;
                    using (_locks.UsingWriteLock())
                    {
                        result = CreateSymbolCore(request, lt);
                    }
                    return RdTask<CreateSymbolResponse>.Successful(result);
                }
                catch (OperationCanceledException)
                {
                    return RdTask<CreateSymbolResponse>.Cancelled();
                }
                catch (Exception ex)
                {
                    LogWarn($"CreateSymbol failed: {ex.Message}");
                    return RdTask<CreateSymbolResponse>.Successful(new CreateSymbolResponse(false, 0, $"Error: {ex.Message}"));
                }
            });

            LogInfo("GameScript backend initialized");
        }

        /// <summary>
        /// Get the IProtocol from the solution using the SDK 2025.1.0 API.
        /// </summary>
        private IProtocol? TryGetProtocol(ISolution solution)
        {
            try
            {
                if (!solution.HasProtocolSolution())
                    return null;

                var riderSolution = solution.GetProtocolSolution();
                if (riderSolution is IRdBindable bindable)
                    return bindable.TryGetProto();

                return null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        private SymbolLocation? FindSymbolCore(FindSymbolRequest request, Lifetime lt)
        {
            try
            {
                // Check for cancellation before starting work
                lt.ThrowIfNotAlive();

                // Commit any pending document changes to ensure PSI is in sync
                // This prevents "uncommitted document" errors during rapid undo/redo
                _solution.GetPsiServices().Files.CommitAllDocuments();

                // Ensure PSI is ready
                using (CompilationContextCookie.GetExplicitUniversalContextIfNotSet())
                {
                    // Parse the file path
                    var filePath = VirtualFileSystemPath.Parse(request.FilePath, InteractionContext.SolutionContext);

                    // Get the PSI source file for the requested path
                    var projectFile = _solution.FindProjectItemsByLocation(filePath)
                        .OfType<IProjectFile>()
                        .FirstOrDefault();

                    if (projectFile == null)
                    {
                        return null;  // File not in solution - not an error
                    }

                    // Get the primary PSI file using the extension method on IProjectFile
                    var psiFile = projectFile.GetPrimaryPsiFile();
                    if (psiFile == null)
                    {
                        // PSI not ready yet - transient error during indexing
                        return new SymbolLocation("", 0, "", "PSI not ready - solution may still be indexing");
                    }

                    var sourceFile = psiFile.GetSourceFile();
                    if (sourceFile == null)
                    {
                        return null;  // No source file - not an error
                    }

                    // Search for the symbol by name using PSI traversal
                    var finder = new SymbolFinder(request.SymbolName);
                    psiFile.ProcessDescendants(finder);

                    if (finder.Result == null)
                    {
                        return null;  // Symbol not found
                    }

                    var declaration = finder.Result;
                    var range = declaration.GetNavigationRange();
                    if (!range.IsValid())
                    {
                        return new SymbolLocation("", 0, "", "Invalid navigation range - PSI may be corrupted");
                    }

                    var document = sourceFile.Document;

                    // Convert offset to line number (0-based)
                    var startOffset = range.StartOffset.Offset;
                    var startCoords = document.GetCoordsByOffset(startOffset);

                    // Get the declaration text
                    var text = declaration.GetText() ?? "";

                    // For C++ macro-expanded functions, the Declarator PSI node has empty text
                    // because the function body comes from macro expansion. We need to read
                    // the function body directly from the document.
                    if (string.IsNullOrEmpty(text) && IsCppFile(request.FilePath))
                    {
                        text = ExtractCppFunctionBody(document, startOffset);
                    }

                    return new SymbolLocation(
                        request.FilePath,
                        (int)startCoords.Line - OneBasedToZeroBasedAdjustment,  // Convert to 0-based
                        text,
                        ""  // No error
                    );
                }
            }
            catch (Exception ex)
            {
                // PSI may throw during indexing or for corrupted files
                return new SymbolLocation("", 0, "", $"Lookup failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Delete a single symbol from a file.
        /// Uses PSI to find the declaration and document API for reliable deletion.
        /// </summary>
        private DeleteSymbolResponse DeleteSymbolCore(DeleteSymbolRequest request, Lifetime lt)
        {
            try
            {
                // Check for cancellation before starting work
                lt.ThrowIfNotAlive();

                // Commit any pending document changes to ensure PSI is in sync
                _solution.GetPsiServices().Files.CommitAllDocuments();

                using (CompilationContextCookie.GetExplicitUniversalContextIfNotSet())
                {
                    var (psiFile, sourceFile) = GetPsiFile(request.FilePath);
                    if (psiFile == null || sourceFile == null)
                        return new DeleteSymbolResponse(success: false, found: false, deletedText: "", error: "File not found in solution");

                    var finder = new SymbolFinder(request.SymbolName);
                    psiFile.ProcessDescendants(finder);

                    if (finder.Result == null)
                        return new DeleteSymbolResponse(success: true, found: false, deletedText: "", error: "");

                    var document = sourceFile.Document;
                    var (deletedText, error) = DeleteDeclaration(finder.Result, document);

                    if (error != null)
                        return new DeleteSymbolResponse(success: false, found: true, deletedText: "", error: error);

                    // Commit document changes to PSI and save to disk.
                    // This is critical for files not currently open in an editor - without this,
                    // the deletion stays in memory and isn't persisted.
                    _solution.GetPsiServices().Files.CommitAllDocuments();
                    SaveDocumentToDisk(request.FilePath);

                    return new DeleteSymbolResponse(success: true, found: true, deletedText: deletedText, error: "");
                }
            }
            catch (Exception ex)
            {
                return new DeleteSymbolResponse(success: false, found: false, deletedText: "", error: ex.Message);
            }
        }

        /// <summary>
        /// Delete multiple symbols from a file (batch operation).
        /// Uses MultiSymbolFinder for efficient single-traversal lookup.
        /// Deletes from end to start to preserve offsets.
        /// </summary>
        /// <remarks>
        /// The reverse-order deletion (end to start) is critical: it ensures that deleting
        /// one symbol doesn't invalidate the offsets of symbols earlier in the file.
        /// The overlap check before deletion catches malformed input or nested declarations.
        /// </remarks>
        private DeleteSymbolsResponse DeleteSymbolsCore(DeleteSymbolsRequest request, Lifetime lt)
        {
            try
            {
                // Check for cancellation before starting work
                lt.ThrowIfNotAlive();

                // Commit any pending document changes to ensure PSI is in sync
                _solution.GetPsiServices().Files.CommitAllDocuments();

                // CompilationContextCookie is required for PSI operations (symbol lookup, deletion)
                using (CompilationContextCookie.GetExplicitUniversalContextIfNotSet())
                {
                    var (psiFile, sourceFile) = GetPsiFile(request.FilePath);
                    // File not found: return success with empty results (idempotent behavior)
                    if (psiFile == null || sourceFile == null)
                        return new DeleteSymbolsResponse(true, new List<DeletedSymbolEntry>(), "");

                    var document = sourceFile.Document;
                    var deletedSymbols = new List<DeletedSymbolEntry>();
                    var symbolRanges = new List<(string Name, TextRange Range, string Text)>();

                    // Single traversal to find all symbols (more efficient than N traversals)
                    var finder = new MultiSymbolFinder(request.SymbolNames);
                    psiFile.ProcessDescendants(finder);

                    // Build results from finder - collect ranges BEFORE any modifications
                    foreach (var symbolName in request.SymbolNames)
                    {
                        if (finder.Results.TryGetValue(symbolName, out var declaration))
                        {
                            var range = GetDeclarationRangeWithAttributes(declaration, document);
                            var text = document.GetText(range);
                            symbolRanges.Add((symbolName, range, text));
                            deletedSymbols.Add(new DeletedSymbolEntry(symbolName, found: true, text));
                        }
                        else
                        {
                            deletedSymbols.Add(new DeletedSymbolEntry(symbolName, found: false, ""));
                        }
                    }

                    // Sort by start offset descending (delete from end to preserve earlier offsets)
                    symbolRanges.Sort((a, b) => b.Range.StartOffset.CompareTo(a.Range.StartOffset));

                    // Validate no overlapping ranges (could happen with malformed input or nested declarations)
                    var overlapError = ValidateNoOverlappingRanges(symbolRanges);
                    if (overlapError != null)
                        return new DeleteSymbolsResponse(false, deletedSymbols, overlapError);

                    // Delete all symbols in reverse order (with bounds validation)
                    foreach (var (name, range, _) in symbolRanges)
                    {
                        var (_, error) = DeleteRange(document, range, name);
                        if (error != null)
                            return new DeleteSymbolsResponse(false, deletedSymbols, error);
                    }

                    // Commit document changes to PSI and save to disk.
                    // This is critical for files not currently open in an editor - without this,
                    // the deletion stays in memory and isn't persisted.
                    _solution.GetPsiServices().Files.CommitAllDocuments();
                    SaveDocumentToDisk(request.FilePath);

                    return new DeleteSymbolsResponse(true, deletedSymbols, "");
                }
            }
            catch (Exception ex)
            {
                return new DeleteSymbolsResponse(false, new List<DeletedSymbolEntry>(), ex.Message);
            }
        }

        /// <summary>
        /// Delete a declaration from a document, including attributes/macros.
        /// Extracts common deletion logic for use by both single and batch delete.
        /// </summary>
        /// <param name="declaration">The PSI declaration to delete</param>
        /// <param name="document">The document to modify</param>
        /// <returns>Tuple of (deletedText, error). Error is null on success.</returns>
        private (string DeletedText, string? Error) DeleteDeclaration(IDeclaration declaration, IDocument document)
        {
            var range = GetDeclarationRangeWithAttributes(declaration, document);
            var deletedText = document.GetText(range);

            var (_, error) = DeleteRange(document, range, declaration.DeclaredName ?? "unknown");
            return (error == null ? deletedText : "", error);
        }

        /// <summary>
        /// Delete a text range from a document with proper validation and newline adjustment.
        /// </summary>
        /// <param name="document">The document to modify</param>
        /// <param name="range">The range to delete</param>
        /// <param name="symbolName">Name for error messages</param>
        /// <returns>Tuple of (success, error). Error is null on success.</returns>
        private (bool Success, string? Error) DeleteRange(IDocument document, TextRange range, string symbolName)
        {
            // Validate range is within document bounds (prevents corruption from stale PSI)
            if (range.StartOffset < 0 || range.EndOffset > document.GetTextLength())
                return (false, $"Declaration range for '{symbolName}' is outside document bounds");

            // Include leading newline for clean deletion
            var startOffset = AdjustStartForLeadingNewline(document, range.StartOffset);

            // Final bounds validation after adjustment
            if (startOffset < 0 || range.EndOffset > document.GetTextLength() || startOffset >= range.EndOffset)
                return (false, $"Invalid text range for '{symbolName}' after newline adjustment");

            document.DeleteText(new TextRange(startOffset, range.EndOffset));
            return (true, null);
        }

        /// <summary>
        /// Validate that no ranges in the list overlap.
        /// Assumes the list is sorted by start offset descending.
        /// </summary>
        /// <returns>Error message if overlap found, null otherwise.</returns>
        private static string? ValidateNoOverlappingRanges(List<(string Name, TextRange Range, string Text)> sortedRanges)
        {
            for (var i = 0; i < sortedRanges.Count - 1; i++)
            {
                var current = sortedRanges[i];  // Higher start offset (later in file)
                var next = sortedRanges[i + 1]; // Lower start offset (earlier in file)

                // Check if the earlier range's end overlaps with the later range's start
                if (next.Range.EndOffset > current.Range.StartOffset)
                {
                    return $"Cannot delete: symbols '{next.Name}' and '{current.Name}' have overlapping ranges";
                }
            }
            return null;
        }

        /// <summary>
        /// Create/insert a method into a file.
        /// Handles both class-wrapper style (insert before closing brace) and append-to-end style.
        /// </summary>
        /// <remarks>
        /// <para>
        /// <b>SYNC REQUIRED:</b> The UsesClassWrapper logic MUST be kept in sync across THREE locations:
        /// </para>
        /// <list type="number">
        /// <item>TypeScript: shared/src/templates/index.ts usesClassWrapper()</item>
        /// <item>Kotlin: plugins/rider/.../handlers/CodeHandlers.kt usesClassWrapper()</item>
        /// <item>C#: plugins/rider/src/dotnet/.../SymbolLookupHost.cs (this file)</item>
        /// </list>
        /// <para>
        /// Current behavior: Only "unity" template (UsesClassWrapper=true) uses class wrapper.
        /// </para>
        /// </remarks>
        private CreateSymbolResponse CreateSymbolCore(CreateSymbolRequest request, Lifetime lt)
        {
            try
            {
                // Check for cancellation before starting work
                lt.ThrowIfNotAlive();

                // Commit any pending document changes to ensure PSI is in sync
                _solution.GetPsiServices().Files.CommitAllDocuments();

                var filePath = VirtualFileSystemPath.Parse(request.FilePath, InteractionContext.SolutionContext);

                // Check if file exists
                if (!filePath.ExistsFile)
                {
                    // Create new file with full content
                    try
                    {
                        filePath.Parent?.CreateDirectory();
                        File.WriteAllText(filePath.FullPath, request.FileContent);

                        // Commit documents to ensure PSI is updated for subsequent requests
                        _solution.GetPsiServices().Files.CommitAllDocuments();

                        // Wait for PSI to index the new file, then use it to find the method
                        var lineNumber = FindMethodLineNumberViaPsi(filePath, request.MethodStub);
                        return new CreateSymbolResponse(true, lineNumber, "");
                    }
                    catch (Exception ex)
                    {
                        return new CreateSymbolResponse(false, 0, $"Failed to create file: {ex.Message}");
                    }
                }

                using (CompilationContextCookie.GetExplicitUniversalContextIfNotSet())
                {
                    // Force PSI to reparse the file from the document buffer
                    // This is needed because document changes may not have triggered PSI update yet
                    var psiServices = _solution.GetPsiServices();
                    psiServices.Files.CommitAllDocuments();

                    var (psiFile, sourceFile) = GetPsiFile(request.FilePath);
                    if (psiFile == null || sourceFile == null)
                        return new CreateSymbolResponse(false, 0, "File not found in solution");

                    // Check if PSI needs rebuilding - if document and PSI are out of sync
                    // This can happen when rapid consecutive operations modify the file
                    if (!psiFile.IsValid())
                    {
                        psiServices.Files.CommitAllDocuments();
                        // Re-fetch the PSI file after commit
                        var (newPsiFile, newSourceFile) = GetPsiFile(request.FilePath);
                        if (newPsiFile != null && newSourceFile != null)
                        {
                            psiFile = newPsiFile;
                            sourceFile = newSourceFile;
                        }
                    }

                    var document = sourceFile.Document;
                    var text = document.GetText();

                    int insertOffset;
                    string codeToInsert;

                    if (request.UsesClassWrapper)
                    {
                        // Insert before the class closing brace (Unity C# style)
                        // Use PSI to find the outer class/struct declaration
                        var insertPoint = FindClassInsertionOffset(psiFile);
                        if (insertPoint == null)
                        {
                            // PSI might be stale - try invalidating cache and retrying
                            if (sourceFile != null)
                            {
                                psiServices.Files.InvalidatePsiFilesCache(sourceFile);
                                psiServices.Files.CommitAllDocuments();

                                // Re-fetch the PSI file after invalidation
                                var (newPsiFile, _) = GetPsiFile(request.FilePath);
                                if (newPsiFile != null)
                                {
                                    psiFile = newPsiFile;
                                    insertPoint = FindClassInsertionOffset(psiFile);
                                }
                            }
                        }

                        if (insertPoint == null)
                        {
                            return new CreateSymbolResponse(false, 0, "Could not find class declaration in file");
                        }

                        insertOffset = insertPoint.Value;
                        codeToInsert = ClassInsertPrefix + request.MethodStub + ClassInsertSuffix;
                    }
                    else
                    {
                        // Append to end of file (Godot/Unreal style)
                        var trimmedText = text.TrimEnd();
                        insertOffset = trimmedText.Length;
                        codeToInsert = AppendSeparator + request.MethodStub + "\n";

                        // If there's trailing content after trimming, we need to handle it
                        if (insertOffset < text.Length)
                        {
                            // Replace trailing whitespace with our content
                            document.ReplaceText(new TextRange(insertOffset, text.Length), codeToInsert);

                            // Commit the document change and save to disk
                            _solution.GetPsiServices().Files.CommitAllDocuments();
                            SaveDocumentToDisk(request.FilePath);

                            var coords = document.GetCoordsByOffset(insertOffset + AppendSeparator.Length);
                            var lineNumber = (int)coords.Line - OneBasedToZeroBasedAdjustment; // Convert to 0-based
                            return new CreateSymbolResponse(true, lineNumber, "");
                        }
                    }

                    // Perform the insertion
                    document.InsertText(insertOffset, codeToInsert);

                    // Commit the document change and save to disk.
                    // This is critical for files not currently open in an editor - without this,
                    // the insertion stays in memory and isn't persisted.
                    _solution.GetPsiServices().Files.CommitAllDocuments();
                    SaveDocumentToDisk(request.FilePath);

                    // Calculate line number of inserted method
                    // Use the correct prefix length based on insertion mode
                    var prefixLength = request.UsesClassWrapper ? ClassInsertPrefix.Length : AppendSeparator.Length;
                    var insertCoords = document.GetCoordsByOffset(insertOffset + prefixLength);
                    var methodLineNumber = (int)insertCoords.Line - OneBasedToZeroBasedAdjustment; // Convert to 0-based
                    return new CreateSymbolResponse(true, methodLineNumber, "");
                }
            }
            catch (Exception ex)
            {
                return new CreateSymbolResponse(false, 0, ex.Message);
            }
        }

        /// <summary>
        /// Find the insertion offset for class wrapper style (before the class closing brace).
        /// Uses PSI to find the outer class/struct declaration and locates its closing brace.
        /// This is only used for Unity C# files.
        /// </summary>
        /// <returns>The offset of the closing brace, or null if not found.</returns>
        private int? FindClassInsertionOffset(IFile psiFile)
        {
            ICSharpTypeDeclaration? typeDecl = null;

            // First try using Descendants<T>() which can trigger lazy parsing
            // This is more reliable than ProcessDescendants for getting fully-parsed PSI
            if (psiFile is ICSharpFile csharpFile)
            {
                typeDecl = csharpFile.Descendants<ICSharpTypeDeclaration>().ToEnumerable().FirstOrDefault();
            }

            // Fallback to ProcessDescendants if Descendants didn't work
            if (typeDecl == null)
            {
                var finder = new OuterTypeDeclarationFinder();
                psiFile.ProcessDescendants(finder);
                typeDecl = finder.Result;

                if (typeDecl == null)
                    return null;
            }

            var range = typeDecl.GetNavigationRange();
            if (!range.IsValid())
                return null;

            // The class body (containing { ... }) is typically the last child of the type declaration
            var lastChild = typeDecl.LastChild;

            // Check if last child is a class/struct body - if so, look for RBrace inside it
            if (lastChild is IClassBody classBody)
            {
                var rBrace = classBody.RBrace;
                if (rBrace != null)
                    return rBrace.GetNavigationRange().StartOffset.Offset;
            }

            // Fallback: walk through children looking for closing brace token
            var child = lastChild;
            while (child != null)
            {
                if (child.GetText() == "}")
                    return child.GetNavigationRange().StartOffset.Offset;
                child = child.PrevSibling;
            }

            // Fallback: search the text for the last '}' within the declaration range
            var sourceFile = psiFile.GetSourceFile();
            if (sourceFile?.Document == null)
                return null;

            var document = sourceFile.Document;
            var declText = document.GetText(new TextRange(range.StartOffset.Offset, range.EndOffset.Offset));

            var lastBraceIndex = declText.LastIndexOf('}');
            if (lastBraceIndex < 0)
                return null;

            return range.StartOffset.Offset + lastBraceIndex;
        }

        /// <summary>
        /// Get PSI file and source file for a path.
        /// Returns the IFile for PSI traversal and IPsiSourceFile for document access.
        /// </summary>
        /// <remarks>
        /// Uses GetPrimaryPsiFile() instead of GetPsiFiles&lt;CSharpLanguage&gt;() to ensure
        /// we get a fully-parsed syntax tree rather than a lexer-only shallow parse.
        /// The PSI may be "lazy" until a consumer explicitly requests the full tree.
        /// </remarks>
        private (IFile? PsiFile, IPsiSourceFile? SourceFile) GetPsiFile(string filePath)
        {
            var path = VirtualFileSystemPath.Parse(filePath, InteractionContext.SolutionContext);
            var projectFile = _solution.FindProjectItemsByLocation(path)
                .OfType<IProjectFile>()
                .FirstOrDefault();

            if (projectFile == null)
                return (null, null);

            // Use GetPrimaryPsiFile() to get a fully-parsed PSI tree
            var psiFile = projectFile.GetPrimaryPsiFile();
            if (psiFile == null)
                return (null, null);

            var sourceFile = psiFile.GetSourceFile();

            // For C# files, ensure lazy trees are triggered to fully parse
            if (psiFile is ICSharpFile csharpFile)
            {
                var children = csharpFile.Children().ToList();
                var hasTypeDecl = children.Any(c => c is ICSharpTypeDeclaration);
                if (!hasTypeDecl && children.Count > 0)
                {
                    // Try to force the tree to build by accessing descendants
                    csharpFile.Descendants<ICSharpTypeDeclaration>().ToEnumerable().ToList();
                }
                return (csharpFile, sourceFile);
            }

            return (psiFile, sourceFile);
        }

        /// <summary>
        /// Get the range of a declaration including any preceding attributes or macros.
        /// Walks backwards from the declaration to include attribute lines.
        /// Handles multi-line attributes by tracking bracket nesting.
        /// For C++ macro-expanded functions, extends forward to include the full function body.
        /// </summary>
        private TextRange GetDeclarationRangeWithAttributes(IDeclaration declaration, IDocument document)
        {
            var declRange = declaration.GetNavigationRange();
            var startOffset = declRange.StartOffset.Offset;
            var endOffset = declRange.EndOffset.Offset;

            // Walk backwards to include attributes/macros on preceding lines
            var text = document.GetText();
            var lineStart = startOffset;

            // Find start of current line
            while (lineStart > 0 && text[lineStart - 1] != '\n')
                lineStart--;

            var resultStart = lineStart;
            var checkPos = lineStart;

            // Track unclosed brackets for multi-line attribute support
            var unclosedBrackets = 0;

            while (checkPos > 0)
            {
                // Move to previous line
                if (text[checkPos - 1] != '\n')
                    break;

                var prevLineEnd = checkPos - 1;
                var prevLineStart = prevLineEnd;
                while (prevLineStart > 0 && text[prevLineStart - 1] != '\n')
                    prevLineStart--;

                var prevLine = text.Substring(prevLineStart, prevLineEnd - prevLineStart).Trim();

                // Skip empty lines
                if (string.IsNullOrEmpty(prevLine))
                {
                    checkPos = prevLineStart;
                    continue;
                }

                // If we have unclosed brackets from a previous iteration, this line is part
                // of a multi-line attribute - include it and update bracket count
                if (unclosedBrackets > 0)
                {
                    resultStart = prevLineStart;
                    unclosedBrackets += CountBrackets(prevLine);
                    checkPos = prevLineStart;
                    continue;
                }

                // Check for C# attributes [...] (including multi-line)
                if (prevLine.StartsWith("[") || prevLine.StartsWith("[["))
                {
                    resultStart = prevLineStart;
                    unclosedBrackets = CountBrackets(prevLine);
                    checkPos = prevLineStart;
                    continue;
                }

                // Check for attribute continuation (line ends with attribute content but no opening bracket)
                // This handles cases like:   param1: "value",
                if (prevLine.EndsWith(",") || prevLine.EndsWith("("))
                {
                    // Could be part of a multi-line attribute, but we need an opening bracket
                    // to confirm. For now, don't include these without bracket context.
                }

                // Check for C++/Unreal macros
                // These are the macros GameScript generates - update this list if new macros are added
                if (IsGameScriptMacro(prevLine))
                {
                    resultStart = prevLineStart;
                    checkPos = prevLineStart;
                    continue;
                }

                // Not an attribute or macro - stop here
                break;
            }

            // For C++ macro-expanded functions, the declaration range only covers the declarator,
            // not the function body. Extend forward to find the complete function.
            var resultEnd = ExtendEndOffsetForCppFunction(text, startOffset, endOffset);

            return new TextRange(resultStart, resultEnd);
        }

        /// <summary>
        /// Extend the end offset to include the full function body for C++ declarations.
        /// If the current end offset doesn't include the function body (no closing brace),
        /// search forward to find it using brace matching.
        /// </summary>
        private static int ExtendEndOffsetForCppFunction(string text, int startOffset, int currentEndOffset)
        {
            var length = text.Length;

            // Check if current range already ends with '}' (function body already included)
            if (currentEndOffset > 0 && currentEndOffset <= length)
            {
                var endChar = text[currentEndOffset - 1];
                if (endChar == '}')
                    return currentEndOffset;
            }

            // Find the opening brace
            var braceStart = BraceMatchingHelper.FindOpeningBrace(text, startOffset);
            if (braceStart < 0)
            {
                // Either no brace found or hit semicolon (declaration without body)
                // Check if we found a semicolon
                for (var i = startOffset; i < length; i++)
                {
                    if (text[i] == ';')
                        return i + 1;
                    if (text[i] == '{')
                        break;
                }
                return currentEndOffset;
            }

            // Find the matching closing brace
            var closeBrace = BraceMatchingHelper.FindMatchingCloseBrace(text, braceStart);
            return closeBrace >= 0 ? closeBrace + 1 : currentEndOffset;
        }

        /// <summary>
        /// Check if a character at a given position in a line is escaped by preceding backslashes.
        /// This is a line-local version used by CountBrackets.
        /// </summary>
        private static bool IsEscapedInLine(string line, int index)
        {
            if (index <= 0) return false;

            var backslashCount = 0;
            var pos = index - 1;
            while (pos >= 0 && line[pos] == '\\')
            {
                backslashCount++;
                pos--;
            }
            return backslashCount % 2 == 1;
        }

        /// <summary>
        /// Count net bracket balance in a line (open brackets - close brackets).
        /// Used for tracking multi-line attribute boundaries.
        /// </summary>
        /// <remarks>
        /// <para>
        /// C# attributes can span multiple lines and contain brackets inside string literals.
        /// We track string literal state to ignore brackets inside strings.
        /// </para>
        /// <para>
        /// <b>Supported string types:</b>
        /// </para>
        /// <list type="bullet">
        /// <item>Regular strings: "..."</item>
        /// <item>Verbatim strings: @"..."</item>
        /// <item>Character literals: '.'</item>
        /// <item>Interpolated strings: $"...{expr}...", $@"...", @$"..."</item>
        /// </list>
        /// <para>
        /// For example, <c>[Obsolete("Use [NewAttribute] instead")]</c> correctly returns 0
        /// because the inner brackets are inside a string literal.
        /// </para>
        /// <para>
        /// For interpolated strings like <c>$"Value is {array[0]}"</c>, the <c>[0]</c> inside
        /// the interpolation hole IS counted because it's executable code, not string content.
        /// </para>
        /// <para>
        /// <b>Note:</b> Raw string literals (C# 11+) are not supported as GameScript-generated
        /// attributes don't use them.
        /// </para>
        /// </remarks>
        private static int CountBrackets(string line)
        {
            var count = 0;
            var inString = false;
            var inVerbatimString = false;
            var inChar = false;
            var isInterpolated = false;
            var interpolationDepth = 0;

            for (var i = 0; i < line.Length; i++)
            {
                var c = line[i];
                var prev = i > 0 ? line[i - 1] : '\0';

                // Handle string literal state transitions
                if (!inString && !inVerbatimString && !inChar)
                {
                    // Check for start of interpolated verbatim string $@"..." or @$"..."
                    if ((c == '$' && i + 2 < line.Length && line[i + 1] == '@' && line[i + 2] == '"') ||
                        (c == '@' && i + 2 < line.Length && line[i + 1] == '$' && line[i + 2] == '"'))
                    {
                        isInterpolated = true;
                        inVerbatimString = true;
                        i += 2;
                        continue;
                    }
                    // Check for start of verbatim string @"..."
                    if (c == '@' && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        isInterpolated = false;
                        inVerbatimString = true;
                        i++;
                        continue;
                    }
                    // Check for start of interpolated string $"..."
                    if (c == '$' && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        isInterpolated = true;
                        inString = true;
                        i++;
                        continue;
                    }
                    // Check for start of regular string
                    if (c == '"')
                    {
                        isInterpolated = false;
                        inString = true;
                        continue;
                    }
                    // Check for start of char literal
                    if (c == '\'')
                    {
                        inChar = true;
                        continue;
                    }
                    // Count brackets only outside strings
                    if (c == '[') count++;
                    else if (c == ']') count--;
                }
                else if (inString)
                {
                    // Handle interpolation holes in regular strings
                    if (isInterpolated && c == '{')
                    {
                        if (i + 1 < line.Length && line[i + 1] == '{')
                        {
                            i++; // Skip escaped {{
                        }
                        else
                        {
                            interpolationDepth++;
                        }
                        continue;
                    }
                    if (isInterpolated && interpolationDepth > 0)
                    {
                        if (c == '{') interpolationDepth++;
                        else if (c == '}') interpolationDepth--;
                        else if (c == '[') count++;
                        else if (c == ']') count--;
                        continue;
                    }
                    // End of regular string (with proper escaped backslash handling)
                    if (c == '"' && !IsEscapedInLine(line, i))
                    {
                        inString = false;
                        isInterpolated = false;
                    }
                }
                else if (inVerbatimString)
                {
                    // Handle interpolation holes in verbatim strings
                    if (isInterpolated && c == '{')
                    {
                        if (i + 1 < line.Length && line[i + 1] == '{')
                        {
                            i++; // Skip escaped {{
                        }
                        else
                        {
                            interpolationDepth++;
                        }
                        continue;
                    }
                    if (isInterpolated && interpolationDepth > 0)
                    {
                        if (c == '{') interpolationDepth++;
                        else if (c == '}') interpolationDepth--;
                        else if (c == '[') count++;
                        else if (c == ']') count--;
                        continue;
                    }
                    // End of verbatim string (doubled quotes "" are escapes)
                    if (c == '"')
                    {
                        if (i + 1 < line.Length && line[i + 1] == '"')
                        {
                            i++; // Skip the escaped quote
                        }
                        else
                        {
                            inVerbatimString = false;
                            isInterpolated = false;
                        }
                    }
                }
                else if (inChar)
                {
                    // End of char literal (with proper escaped backslash handling)
                    if (c == '\'' && !IsEscapedInLine(line, i))
                    {
                        inChar = false;
                    }
                }
            }

            return count;
        }

        /// <summary>
        /// Check if a line is a GameScript-generated macro or related Unreal macro.
        /// These macros should be included when capturing declaration boundaries.
        /// </summary>
        private static bool IsGameScriptMacro(string line)
        {
            // Check GameScript-specific macros
            foreach (var macro in GameScriptMacros)
            {
                if (line.StartsWith(macro, StringComparison.Ordinal))
                    return true;
            }

            // Check Unreal Engine macros
            foreach (var macro in UnrealMacros)
            {
                if (line.StartsWith(macro, StringComparison.Ordinal))
                    return true;
            }

            return false;
        }

        /// <summary>
        /// Adjust start offset to include leading newline for clean deletion.
        /// This ensures deleted code doesn't leave behind extra blank lines.
        /// </summary>
        /// <remarks>
        /// <para>
        /// Only adjusts by ONE newline character. This is intentional:
        /// </para>
        /// <list type="bullet">
        /// <item>If the method is preceded by a single newline (typical), include it in deletion</item>
        /// <item>If preceded by multiple blank lines, preserve all but one (keeps visual separation)</item>
        /// <item>If at start of file (no newline), don't adjust</item>
        /// </list>
        /// <para>
        /// <b>Line Endings:</b> This method only checks for <c>\n</c>, not <c>\r\n</c>. This is safe
        /// because ReSharper's <see cref="IDocument.GetText()"/> returns internally normalized text
        /// with <c>\n</c> line endings. If ever interacting with raw file buffers directly, use
        /// <c>DocumentExtensions.GetLineEndings()</c> instead.
        /// </para>
        /// <para>
        /// <b>Sync Required:</b> This must match the Kotlin implementation in
        /// CodeHandlers.adjustStartForLeadingNewline() - see that method for detailed examples.
        /// </para>
        /// </remarks>
        private static int AdjustStartForLeadingNewline(IDocument document, int startOffset)
        {
            if (startOffset > 0)
            {
                var prevChar = document.GetText(new TextRange(startOffset - 1, startOffset));
                if (prevChar == "\n")
                    return startOffset - 1;

                // Debug assertion: if we find \r without \n, our assumption about ReSharper normalization is wrong
                Debug.Assert(prevChar != "\r",
                    "Unexpected \\r without \\n - ReSharper's line ending normalization may have changed");
            }
            return startOffset;
        }

        /// <summary>
        /// Save a document to disk, ensuring modifications are persisted.
        /// This is necessary for files not currently open in an editor, where
        /// document modifications stay in memory until explicitly saved.
        /// </summary>
        /// <param name="filePath">The file path to save</param>
        private void SaveDocumentToDisk(string filePath)
        {
            try
            {
                var path = VirtualFileSystemPath.Parse(filePath, InteractionContext.SolutionContext);
                var projectFile = _solution.FindProjectItemsByLocation(path)
                    .OfType<IProjectFile>()
                    .FirstOrDefault();

                if (projectFile == null)
                    return;

                var psiFile = projectFile.GetPrimaryPsiFile();
                var sourceFile = psiFile?.GetSourceFile();
                var document = sourceFile?.Document;

                if (document == null)
                    return;

                // Get the modified document text and write to disk
                var text = document.GetText();
                File.WriteAllText(filePath, text);
            }
            catch (Exception ex)
            {
                LogWarn($"SaveDocumentToDisk: Failed to save {filePath}: {ex.Message}");
                // Don't throw - the deletion itself succeeded, just the save failed
            }
        }

        /// <summary>
        /// Check if a file path is a C++ file based on extension.
        /// </summary>
        private static bool IsCppFile(string filePath)
        {
            var ext = Path.GetExtension(filePath).ToLowerInvariant();
            return ext == ".cpp" || ext == ".h" || ext == ".hpp" || ext == ".cc" || ext == ".cxx" || ext == ".inl";
        }

        /// <summary>
        /// Extract the complete function body from a C++ document starting at the given offset.
        /// Used for macro-expanded functions where the PSI Declarator has empty text.
        /// </summary>
        /// <remarks>
        /// The startOffset points to the function name (e.g., __NodeCondition_7_Impl).
        /// We need to:
        /// 1. Go backwards to find the start of the declaration line (return type)
        /// 2. Go forwards to find the complete function body (matching braces)
        /// </remarks>
        private static string ExtractCppFunctionBody(IDocument document, int startOffset)
        {
            var text = document.GetText();
            var length = text.Length;

            // Go backwards to find the start of the line containing the declaration
            var lineStart = startOffset;
            while (lineStart > 0 && text[lineStart - 1] != '\n')
                lineStart--;

            // Find the opening brace of the function body
            var braceStart = BraceMatchingHelper.FindOpeningBrace(text, startOffset);
            if (braceStart < 0)
            {
                // Check if we found a semicolon (declaration without body)
                for (var i = startOffset; i < length; i++)
                {
                    if (text[i] == ';')
                        return text.Substring(lineStart, i - lineStart + 1);
                    if (text[i] == '{')
                        break;
                }
                // No brace found, return whatever we can from the line
                var lineEnd = text.IndexOf('\n', startOffset);
                if (lineEnd < 0) lineEnd = length;
                return text.Substring(lineStart, lineEnd - lineStart);
            }

            // Find the matching closing brace
            var closeBrace = BraceMatchingHelper.FindMatchingCloseBrace(text, braceStart);
            if (closeBrace >= 0)
            {
                return text.Substring(lineStart, closeBrace - lineStart + 1);
            }

            // If we couldn't find matching brace, return what we have
            return text.Substring(lineStart, Math.Min(500, length - lineStart));
        }

        /// <summary>
        /// Find the line number of a method in a newly created file using PSI.
        ///
        /// For files in project folders (Unity Assets, Unreal Source, etc.), the project
        /// model auto-includes them and PSI should work. For files outside project folders,
        /// returns 0 and lets the Kotlin side handle cursor positioning.
        /// </summary>
        private int FindMethodLineNumberViaPsi(VirtualFileSystemPath filePath, string methodStub)
        {
            // Extract method name from stub (e.g., "public static bool Foo(" -> "Foo")
            var methodName = ExtractMethodName(methodStub);
            if (string.IsNullOrEmpty(methodName))
                return 0;

            // Commit any pending PSI changes to ensure we see the new file
            var psiServices = _solution.GetPsiServices();
            psiServices.Files.CommitAllDocuments();

            // Try to get PSI for the new file
            using (CompilationContextCookie.GetExplicitUniversalContextIfNotSet())
            {
                var (psiFile, sourceFile) = GetPsiFile(filePath.FullPath);
                if (psiFile == null || sourceFile == null)
                {
                    // File not in project - return 0, Kotlin will open file at start
                    return 0;
                }

                var finder = new SymbolFinder(methodName!);
                psiFile.ProcessDescendants(finder);

                if (finder.Result == null)
                    return 0;

                var range = finder.Result.GetNavigationRange();
                if (!range.IsValid())
                    return 0;

                var document = sourceFile.Document;
                var startCoords = document.GetCoordsByOffset(range.StartOffset.Offset);
                return (int)startCoords.Line - OneBasedToZeroBasedAdjustment;
            }
        }

        /// <summary>
        /// Extract the method name from a method stub.
        /// Handles C#, C++, and GDScript formats, including generics and templates.
        /// </summary>
        /// <remarks>
        /// Examples:
        /// - "public static bool Foo(" → "Foo"
        /// - "void Bar&lt;T&gt;(" → "Bar"
        /// - "template&lt;typename T&gt; void Baz&lt;T&gt;(" → "Baz"
        /// - "func qux(" → "qux"
        /// - "NODE_ACTION(123)" (no method name on first line) → null
        /// </remarks>
        private static string? ExtractMethodName(string methodStub)
        {
            // Get the first non-empty line
            var firstLine = methodStub.Split('\n')
                .Select(line => line.Trim())
                .FirstOrDefault(line => !string.IsNullOrEmpty(line));

            if (string.IsNullOrEmpty(firstLine))
                return null;

            // Find the opening parenthesis that's NOT inside angle brackets (generics/templates)
            // This handles: "Foo<T>(" where we want the '(' after '>', not inside '<>'
            var parenIndex = FindMethodParenthesis(firstLine);
            if (parenIndex < 0)
                return null;

            // Need at least one character before '(' for an identifier
            if (parenIndex == 0)
                return null;

            // Walk backwards from '(' to find the start of the identifier
            // Skip over generic parameters if present: "Foo<T>" → start from 'o', not '>'
            var endIndex = parenIndex - 1;
            while (endIndex >= 0 && char.IsWhiteSpace(firstLine[endIndex]))
                endIndex--;

            if (endIndex < 0)
                return null;

            // If we hit a '>', skip the generic parameters
            if (firstLine[endIndex] == '>')
            {
                var angleBracketDepth = 1;
                endIndex--;
                while (endIndex >= 0 && angleBracketDepth > 0)
                {
                    if (firstLine[endIndex] == '>') angleBracketDepth++;
                    else if (firstLine[endIndex] == '<') angleBracketDepth--;
                    endIndex--;
                }
                // Skip any whitespace after the identifier
                while (endIndex >= 0 && char.IsWhiteSpace(firstLine[endIndex]))
                    endIndex--;
            }

            if (endIndex < 0)
                return null;

            var startIndex = endIndex;
            while (startIndex > 0 && (char.IsLetterOrDigit(firstLine[startIndex - 1]) || firstLine[startIndex - 1] == '_'))
                startIndex--;

            if (startIndex > endIndex)
                return null;

            return firstLine.Substring(startIndex, endIndex - startIndex + 1);
        }

        /// <summary>
        /// Find the opening parenthesis that starts the method's parameter list.
        /// Skips parentheses inside angle brackets (generics/templates).
        /// </summary>
        /// <remarks>
        /// <para>
        /// <b>Known Limitation:</b> This method does not handle C++ operator overloads
        /// correctly. For example, <c>bool operator&lt;(Foo other)</c> would incorrectly
        /// track the &lt; as opening an angle bracket.
        /// </para>
        /// <para>
        /// This is acceptable because GameScript-generated methods never use operator
        /// overloading - they follow specific naming patterns like <c>Node_123_Condition</c>
        /// (Unity), <c>cond_123</c> (Godot), or <c>__NodeCondition_123_Impl</c> (Unreal).
        /// </para>
        /// </remarks>
        /// <returns>Index of the opening parenthesis, or -1 if not found.</returns>
        private static int FindMethodParenthesis(string line)
        {
            var angleBracketDepth = 0;

            for (var i = 0; i < line.Length; i++)
            {
                var c = line[i];

                if (c == '<')
                {
                    angleBracketDepth++;
                }
                else if (c == '>')
                {
                    if (angleBracketDepth > 0) angleBracketDepth--;
                }
                else if (c == '(' && angleBracketDepth == 0)
                {
                    return i;
                }
            }

            return -1;
        }

        /// <summary>
        /// PSI tree processor that finds the outer class/struct declaration.
        /// Used for finding the insertion point for Unity C# class wrapper style.
        /// Stops at the first type declaration found to avoid nested types.
        /// </summary>
        private class OuterTypeDeclarationFinder : IRecursiveElementProcessor
        {
            public ICSharpTypeDeclaration? Result { get; private set; }
            public int ElementsVisited { get; private set; }
            public List<string> TypesSeen { get; } = new List<string>();

            public bool InteriorShouldBeProcessed(ITreeNode element)
            {
                // Stop descending once we find a type (we don't want nested types)
                return Result == null;
            }

            public void ProcessBeforeInterior(ITreeNode element)
            {
                ElementsVisited++;
                if (TypesSeen.Count < 20)
                    TypesSeen.Add(element.GetType().Name);

                if (Result != null)
                    return;

                // Match class, struct, record, etc.
                if (element is ICSharpTypeDeclaration typeDecl)
                {
                    Result = typeDecl;
                }
            }

            public void ProcessAfterInterior(ITreeNode element)
            {
            }

            public bool ProcessingIsFinished => Result != null;
        }

        /// <summary>
        /// PSI tree processor that finds a declaration by name.
        /// </summary>
        private class SymbolFinder : IRecursiveElementProcessor
        {
            private readonly string _targetName;

            public SymbolFinder(string targetName)
            {
                _targetName = targetName;
            }

            public IDeclaration? Result { get; private set; }

            public bool InteriorShouldBeProcessed(ITreeNode element) => Result == null;

            public void ProcessBeforeInterior(ITreeNode element)
            {
                if (Result != null)
                    return;

                if (element is IDeclaration declaration)
                {
                    var name = declaration.DeclaredName;
                    if (name != null && name == _targetName)
                    {
                        Result = declaration;
                    }
                }
            }

            public void ProcessAfterInterior(ITreeNode element)
            {
            }

            public bool ProcessingIsFinished => Result != null;
        }

        /// <summary>
        /// PSI tree processor that finds multiple declarations by name in a single traversal.
        /// More efficient than running SymbolFinder N times for N symbols.
        /// </summary>
        private class MultiSymbolFinder : IRecursiveElementProcessor
        {
            private readonly HashSet<string> _targetNames;
            private readonly Dictionary<string, IDeclaration> _results;

            public MultiSymbolFinder(IEnumerable<string> targetNames)
            {
                _targetNames = new HashSet<string>(targetNames);
                _results = new Dictionary<string, IDeclaration>();
            }

            /// <summary>
            /// Dictionary of symbol name -> declaration for all found symbols.
            /// </summary>
            public IReadOnlyDictionary<string, IDeclaration> Results => _results;

            public bool InteriorShouldBeProcessed(ITreeNode element) => _results.Count < _targetNames.Count;

            public void ProcessBeforeInterior(ITreeNode element)
            {
                if (_results.Count >= _targetNames.Count)
                    return;

                if (element is IDeclaration declaration)
                {
                    var name = declaration.DeclaredName;
                    if (name != null && _targetNames.Contains(name) && !_results.ContainsKey(name))
                    {
                        _results[name] = declaration;
                    }
                }
            }

            public void ProcessAfterInterior(ITreeNode element)
            {
            }

            public bool ProcessingIsFinished => _results.Count >= _targetNames.Count;
        }

    }
}
