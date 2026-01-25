package com.shortsleevestudio.gamescript.handlers

import com.google.gson.JsonObject
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ReadAction
import com.intellij.openapi.application.WriteAction
import com.intellij.openapi.command.CommandProcessor
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.ex.DocumentEx
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.util.TextRange
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiManager
import com.intellij.psi.codeStyle.CodeStyleManager
import com.shortsleevestudio.gamescript.watchers.CodeFileWatcher
import com.shortsleevestudio.gamescript.protocol.CreateSymbolRequest
import com.shortsleevestudio.gamescript.protocol.DeleteSymbolRequest
import com.shortsleevestudio.gamescript.protocol.DeleteSymbolsRequest
import com.shortsleevestudio.gamescript.protocol.FindSymbolRequest
import com.shortsleevestudio.gamescript.protocol.GameScriptModel
import com.shortsleevestudio.gamescript.services.GameScriptBackendHost
import java.io.File
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ExecutorService
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import java.util.concurrent.atomic.AtomicReference

/**
 * Handlers for code operations using ReSharper PSI.
 * Implements: code:getMethod, code:createMethod, code:deleteMethod,
 * code:deleteMethodsSilent, code:restoreMethod, code:openMethod,
 * code:watchFolder, code:deleteFile, code:restoreFile
 */
class CodeHandlers(
    private val context: HandlerContext,
    private val codeFileWatcher: CodeFileWatcher,
    private val backendHost: GameScriptBackendHost? = null
) {
    /**
     * Lazily resolves the backend model on each access.
     * This allows the model to become available after the panel is created,
     * handling cases where the solution is still loading when the panel opens.
     */
    private val backendModel get() = backendHost?.model

    /**
     * Immutable configuration for code file watching.
     * Using a data class ensures atomic reads of both fields together.
     */
    private data class WatchConfig(val folder: String?, val extension: String)

    // Thread-safe state for watch folder configuration (atomic via immutable data class)
    @Volatile private var watchConfig = WatchConfig(null, ".cs")

    // GDScript helper for text-based operations
    // Note: C#/C++ operations go through the ReSharper backend (SymbolLookupHost.cs)
    private val gdscriptHelper: LanguageCodeHelper by lazy { GDScriptCodeHelper() }

    /**
     * Check if a template uses a class wrapper for methods.
     * - Unity: Methods inside a static class (insert before closing brace)
     * - Godot/Unreal: Free-standing functions/macros (append to end)
     *
     * ╔══════════════════════════════════════════════════════════════════════════╗
     * ║                          SYNC REQUIRED                                    ║
     * ╠══════════════════════════════════════════════════════════════════════════╣
     * ║  This logic MUST be kept in sync across THREE locations:                  ║
     * ║                                                                          ║
     * ║  1. TypeScript: shared/src/templates/index.ts usesClassWrapper()         ║
     * ║  2. Kotlin: plugins/rider/.../handlers/CodeHandlers.kt (this file)       ║
     * ║  3. C#: plugins/rider/src/dotnet/.../SymbolLookupHost.cs CreateSymbolCore ║
     * ║                                                                          ║
     * ║  Current behavior: Only "unity" template uses class wrapper.             ║
     * ╚══════════════════════════════════════════════════════════════════════════╝
     */
    private fun usesClassWrapper(template: String): Boolean {
        return template == "unity"
    }

    /**
     * Result of resolving a conversation's code file.
     * Encapsulates the common pattern of:
     * 1. Capturing watchConfig snapshot (thread-safety)
     * 2. Determining file extension (from message or config)
     * 3. Computing file path
     * 4. Optionally finding the VirtualFile
     */
    private data class FileResolution(
        val config: WatchConfig,
        val extension: String,
        val filePath: String,
        val vFile: VirtualFile?
    )

    /**
     * Resolve a conversation's code file.
     * Thread-safe: captures watchConfig atomically at call time.
     *
     * @param message The JSON message (may contain fileExtension override)
     * @param conversationId The conversation ID for file naming
     * @param refresh If true, use refreshAndFindFileByPath (sees recent disk changes).
     *                If false, use findFileByPath (faster, for files we know exist).
     * @return FileResolution with all file context needed for handlers
     */
    private fun resolveConversationFile(
        message: JsonObject,
        conversationId: Int,
        refresh: Boolean = true
    ): FileResolution {
        // Capture watchConfig once for thread-safety (both fields read atomically)
        val config = watchConfig
        val extension = message.getStringOrNull("fileExtension") ?: config.extension
        val filePath = getConversationFilePath(conversationId, extension, config.folder)
        val vFile = if (refresh) {
            LocalFileSystem.getInstance().refreshAndFindFileByPath(filePath)
        } else {
            LocalFileSystem.getInstance().findFileByPath(filePath)
        }
        return FileResolution(config, extension, filePath, vFile)
    }

    /**
     * Get all handlers as a map.
     */
    fun getHandlers(): Map<String, suspend (JsonObject) -> Unit> = mapOf(
        "code:getMethod" to ::handleGetMethod,
        "code:createMethod" to ::handleCreateMethod,
        "code:deleteMethod" to ::handleDeleteMethod,
        "code:deleteMethodsSilent" to ::handleDeleteMethodsSilent,
        "code:restoreMethod" to ::handleRestoreMethod,
        "code:openMethod" to ::handleOpenMethod,
        "code:watchFolder" to ::handleWatchFolder,
        "code:deleteFile" to ::handleDeleteFile,
        "code:restoreFile" to ::handleRestoreFile
    )

    private suspend fun handleGetMethod(message: JsonObject) {
        val id = message.requireString("id", "handleGetMethod") ?: return
        val conversationId = message.requireInt("conversationId", "handleGetMethod") ?: return
        val methodName = message.requireValidMethodName("handleGetMethod", ::validateMethodName) ?: return

        val (_, extension, filePath, vFile) = resolveConversationFile(message, conversationId)

        try {
            if (vFile == null || !vFile.exists()) {
                context.postResponse(
                    id, "code:methodResult", false,
                    error = ERR_CODE_FILE_NOT_FOUND
                )
                return
            }

            // Route based on language: C#/C++ use backend (outside ReadAction), GDScript uses text-based
            val result = if (isBackendLanguage(extension)) {
                // Backend RPC must NOT be called inside ReadAction to avoid potential deadlocks.
                // The backend handles its own PSI access with proper locking.
                findMethodViaBackend(vFile, methodName)
            } else {
                // GDScript: text-based parsing requires ReadAction for PSI access
                // First, ensure document changes are committed so PSI is in sync with disk
                // This is critical after createMethod - without it, the PSI may be stale
                ApplicationManager.getApplication().invokeAndWait {
                    val document = FileDocumentManager.getInstance().getDocument(vFile)
                    if (document != null) {
                        PsiDocumentManager.getInstance(context.project).commitDocument(document)
                    }
                }
                ReadAction.compute<FindMethodResult, Exception> {
                    findMethodViaText(vFile, methodName)
                }
            }

            when (result) {
                is FindMethodResult.Found -> {
                    context.postResponse(
                        id, "code:methodResult", true,
                        mapOf(
                            "body" to result.info.body,
                            "fullText" to result.info.body,  // Same as body for API compatibility
                            "filePath" to filePath,
                            "lineNumber" to result.info.lineNumber
                        )
                    )
                }
                is FindMethodResult.NotFound -> {
                    context.postResponse(
                        id, "code:methodResult", false,
                        error = "Method '$methodName' not found"
                    )
                }
                is FindMethodResult.BackendUnavailable -> {
                    context.postResponse(
                        id, "code:methodResult", false,
                        error = ERR_BACKEND_NOT_READY
                    )
                }
                is FindMethodResult.Error -> {
                    context.postResponse(
                        id, "code:methodResult", false,
                        error = result.message
                    )
                }
            }
        } catch (e: Exception) {
            LOG.error("Error getting method: $methodName", e)
            context.postResponse(id, "code:methodResult", false, error = e.message)
        }
    }

    private suspend fun handleCreateMethod(message: JsonObject) {
        val id = message.requireString("id", "handleCreateMethod") ?: return
        val conversationId = message.requireInt("conversationId", "handleCreateMethod") ?: return
        val methodName = message.requireValidMethodName("handleCreateMethod", ::validateMethodName) ?: return
        val methodStub = message.requireString("methodStub", "handleCreateMethod") ?: return
        val fileContent = message.getStringOrNull("fileContent") ?: ""
        val template = message.getStringOrNull("template") ?: "unity"

        val (_, extension, filePath, _) = resolveConversationFile(message, conversationId, refresh = false)

        try {

            // Route based on language: C#/C++ use ReSharper backend, GDScript uses text-based
            val model = backendModel

            if (isBackendLanguage(extension)) {
                // C#/C++ MUST use backend - text-based fallback would produce incorrect results
                if (model == null) {
                    LOG.warn("Backend unavailable for C#/C++ createMethod: $methodName (solution may still be loading)")
                    context.postResponse(id, "code:createResult", false,
                        error = ERR_BACKEND_NOT_READY)
                    return
                }
                handleCreateMethodViaBackend(id, methodName, methodStub, fileContent, filePath, template, model)
            } else {
                // GDScript: text-based approach (ReSharper doesn't support GDScript)
                handleCreateMethodViaText(id, methodName, methodStub, fileContent, filePath, template)
            }
        } catch (e: Exception) {
            LOG.error("Error creating method: $methodName", e)
            context.postResponse(id, "code:createResult", false, error = e.message)
        }
    }

    /**
     * Create a method using the ReSharper backend (for C#/C++).
     *
     * Handles both existing files (insert method) and new files (create file with content).
     * Uses proper VFS synchronization to ensure the file is visible after backend creates it.
     */
    private fun handleCreateMethodViaBackend(
        id: String,
        methodName: String,
        methodStub: String,
        fileContent: String,
        filePath: String,
        template: String,
        model: GameScriptModel
    ) {
        try {
            val request = CreateSymbolRequest(
                methodStub,
                filePath,
                fileContent,
                usesClassWrapper(template)
            )
            val result = withRpcTimeout { invokeRdCallOnEdt { model.createSymbol.sync(request) } }

            if (result.success) {
                // Open file at the inserted line
                // Use invokeAndWait to ensure VFS is synced before trying to open the file
                ApplicationManager.getApplication().invokeAndWait {
                    // Force VFS refresh for the parent directory to ensure new files are visible
                    val ioFile = java.io.File(filePath)
                    val parentPath = ioFile.parentFile?.absolutePath
                    if (parentPath != null) {
                        LocalFileSystem.getInstance().refreshAndFindFileByPath(parentPath)
                    }

                    // Now find the file with retry for new file creation scenarios
                    var vFile = LocalFileSystem.getInstance().refreshAndFindFileByPath(filePath)

                    // If still not found, do a synchronous refresh of the exact path
                    if (vFile == null) {
                        LocalFileSystem.getInstance().refresh(false)
                        vFile = LocalFileSystem.getInstance().findFileByPath(filePath)
                    }

                    if (vFile != null) {
                        val descriptor = OpenFileDescriptor(context.project, vFile, result.lineNumber, 0)
                        FileEditorManager.getInstance(context.project).openTextEditor(descriptor, true)
                    } else {
                        LOG.warn("File created by backend but not visible in VFS: $filePath")
                    }
                    context.postResponse(id, "code:createResult", true)
                }
            } else {
                context.postResponse(id, "code:createResult", false, error = result.error)
            }
        } catch (e: TimeoutException) {
            LOG.warn("Backend createSymbol timed out for $methodName (transient error)", e)
            context.postResponse(id, "code:createResult", false, error = ERR_TIMEOUT_CREATE)
        } catch (e: Exception) {
            LOG.error("Backend createSymbol failed for $methodName", e)
            context.postResponse(id, "code:createResult", false, error = e.message)
        }
    }

    /**
     * Create a method using text-based approach (for GDScript only).
     *
     * Consolidates file operations into a single EDT block to eliminate race conditions
     * between writing the method and reading back its line number.
     *
     * IMPORTANT: This method should ONLY be called for GDScript files. C#/C++ must use
     * handleCreateMethodViaBackend which provides proper PSI-based insertion. The caller
     * (handleCreateMethod) enforces this routing via isBackendLanguage check.
     */
    private fun handleCreateMethodViaText(
        id: String,
        methodName: String,
        methodStub: String,
        fileContent: String,
        filePath: String,
        template: String
    ) {
        // Invariant: This code path is only for GDScript - C#/C++ routes to handleCreateMethodViaBackend
        // If this assertion fails, there's a bug in the routing logic in handleCreateMethod
        val extension = filePath.substringAfterLast('.', "")
        check(!isBackendLanguage(extension)) {
            "Text-based create called for backend language ($extension). This is a bug - should use handleCreateMethodViaBackend."
        }

        val ioFile = File(filePath)

        // Perform all operations in a single invokeAndWait to prevent race conditions
        // between writing the file and reading back the method location
        ApplicationManager.getApplication().invokeAndWait {
            // 1. Get or create the VirtualFile via VFS (atomic with disk)
            WriteAction.run<Exception> {
                if (!ioFile.exists()) {
                    val parentDir = ioFile.parentFile
                    if (parentDir != null && !parentDir.exists()) {
                        if (!parentDir.mkdirs()) {
                            throw java.io.IOException("Failed to create directory: ${parentDir.absolutePath}")
                        }
                    }
                    if (!ioFile.createNewFile()) {
                        throw java.io.IOException("Failed to create file: ${ioFile.absolutePath}")
                    }
                }
            }

            val vFile = LocalFileSystem.getInstance().refreshAndFindFileByPath(filePath)
            if (vFile == null) {
                context.postResponse(id, "code:createResult", false, error = "Failed to create file")
                return@invokeAndWait
            }

            // 2. Compute new content and write with undo suppressed
            val document = FileDocumentManager.getInstance().getDocument(vFile)
            if (document != null) {
                val existing = document.text

                // Use withSuppressedUndo to make change invisible to Rider's undo stack
                withSuppressedUndo(document) {
                    if (existing.isNotEmpty()) {
                        val result = computeInsertion(existing, methodStub, usesClassWrapper(template))
                        if (result.newContent != null) {
                            document.setText(result.newContent)
                        } else {
                            // Fallback: append to end if insertion failed
                            document.insertString(document.textLength, "\n" + methodStub)
                        }
                    } else {
                        document.setText(fileContent)
                    }
                }
                FileDocumentManager.getInstance().saveDocument(document)

                // Commit document changes to PSI before reformatting
                // Without this, reformat() will fail with "Attempt to modify PSI for non-committed Document"
                PsiDocumentManager.getInstance(context.project).commitDocument(document)

                // Apply code formatting to match user's style settings
                val psiFile = PsiManager.getInstance(context.project).findFile(vFile)
                if (psiFile != null) {
                    withSuppressedUndo(document) {
                        CodeStyleManager.getInstance(context.project).reformat(psiFile)
                    }
                    FileDocumentManager.getInstance().saveDocument(document)
                }
            } else {
                // Fallback to VFS if document not available
                CommandProcessor.getInstance().runUndoTransparentAction {
                    WriteAction.run<Exception> {
                        val existing = VfsUtil.loadText(vFile)
                        val newContent = if (existing.isNotEmpty()) {
                            val result = computeInsertion(existing, methodStub, usesClassWrapper(template))
                            result.newContent ?: (existing + "\n" + methodStub)
                        } else {
                            fileContent
                        }
                        VfsUtil.saveText(vFile, newContent)
                    }
                }
            }

            // 3. Find method and open file - all in same EDT block to prevent race condition
            val methodInfo = ReadAction.compute<MethodInfo?, Exception> {
                findMethod(vFile, methodName)
            }
            val line = methodInfo?.lineNumber ?: 0
            val descriptor = OpenFileDescriptor(context.project, vFile, line, 0)
            FileEditorManager.getInstance(context.project).openTextEditor(descriptor, true)
            context.postResponse(id, "code:createResult", true)
        }
    }

    private suspend fun handleDeleteMethod(message: JsonObject) {
        val id = message.requireString("id", "handleDeleteMethod") ?: return
        val conversationId = message.requireInt("conversationId", "handleDeleteMethod") ?: return
        val methodName = message.requireValidMethodName("handleDeleteMethod", ::validateMethodName) ?: return

        val (_, extension, filePath, vFile) = resolveConversationFile(message, conversationId)

        try {
            if (vFile == null || !vFile.exists()) {
                postDeleteResult(id, accepted = false, error = "File not found")
                return
            }

            // Route based on language: C#/C++ use ReSharper backend, GDScript uses text-based
            val model = backendModel

            if (isBackendLanguage(extension)) {
                // C#/C++ MUST use backend - text-based fallback would produce incorrect results
                if (model == null) {
                    LOG.warn("Backend unavailable for C#/C++ deleteMethod: $methodName (solution may still be loading)")
                    postDeleteResult(id, accepted = false,
                        error = ERR_BACKEND_NOT_READY)
                    return
                }
                handleDeleteMethodViaBackend(id, methodName, filePath, model)
            } else {
                // GDScript: text-based approach (ReSharper doesn't support GDScript)
                handleDeleteMethodViaText(id, methodName, vFile)
            }
        } catch (e: Exception) {
            LOG.error("Error deleting method: $methodName", e)
            postDeleteResult(id, accepted = false, error = e.message)
        }
    }

    /**
     * Delete a method using the ReSharper backend (for C#/C++).
     * Provides PSI-based deletion with proper handling of attributes and macros.
     *
     * All RPC calls run on background threads to avoid blocking the EDT.
     * The dialog is shown on EDT between the find and delete operations.
     */
    private fun handleDeleteMethodViaBackend(id: String, methodName: String, filePath: String, model: GameScriptModel) {
        // Run the initial findSymbol on a background thread to avoid blocking caller
        ApplicationManager.getApplication().executeOnPooledThread {
            // First, find the method to show in confirmation dialog (with timeout)
            val request = FindSymbolRequest(methodName, filePath)
            val findResult = try {
                withRpcTimeout { invokeRdCallOnEdt { model.findSymbol.sync(request) } }
            } catch (e: TimeoutException) {
                LOG.warn("Backend findSymbol timed out for $methodName", e)
                postDeleteResult(id, accepted = false, error = ERR_TIMEOUT_SYMBOL_LOOKUP)
                return@executeOnPooledThread
            } catch (e: Exception) {
                LOG.warn("Backend findSymbol failed for $methodName", e)
                null
            }

            if (findResult == null) {
                // Method not found - treat as already deleted (accepted: true, like VS Code)
                postDeleteResult(id, accepted = true)
                return@executeOnPooledThread
            }

            // Show confirmation dialog on EDT
            ApplicationManager.getApplication().invokeLater {
                val result = Messages.showYesNoDialog(
                    context.project,
                    "Delete method '$methodName'?\n\n${findResult.text}",
                    "Confirm Delete",
                    Messages.getQuestionIcon()
                )

                if (result == Messages.YES) {
                    // Execute the delete RPC call on a background thread to avoid blocking the EDT
                    ApplicationManager.getApplication().executeOnPooledThread {
                        try {
                            val deleteRequest = DeleteSymbolRequest(methodName, filePath)
                            val deleteResult = withRpcTimeout { invokeRdCallOnEdt { model.deleteSymbol.sync(deleteRequest) } }

                            if (deleteResult.success) {
                                postDeleteResult(id, accepted = true)
                            } else {
                                postDeleteResult(id, accepted = false, error = deleteResult.error)
                            }
                        } catch (e: TimeoutException) {
                            postDeleteResult(id, accepted = false, error = ERR_TIMEOUT_DELETE)
                        } catch (e: Exception) {
                            postDeleteResult(id, accepted = false, error = e.message)
                        }
                    }
                } else {
                    // User cancelled - send accepted: false
                    postDeleteResult(id, accepted = false)
                }
            }
        }
    }

    /**
     * Delete a method using text-based approach (for GDScript or fallback).
     *
     * Uses a two-phase approach to prevent TOCTOU race conditions:
     * 1. Find method and capture its body text for the confirmation dialog
     * 2. After user confirms, re-verify the method still exists with the same content
     *    before deleting (prevents deleting wrong code if file was modified)
     */
    private fun handleDeleteMethodViaText(id: String, methodName: String, vFile: VirtualFile) {
        val methodInfo = ReadAction.compute<MethodInfo?, Exception> {
            findMethod(vFile, methodName)
        }

        if (methodInfo == null) {
            // Method not found - treat as already deleted (accepted: true, like VS Code)
            postDeleteResult(id, accepted = true)
            return
        }

        // Capture the method body text shown in the dialog for later verification
        val expectedBodyText = methodInfo.body

        // Show confirmation dialog on EDT
        ApplicationManager.getApplication().invokeLater {
            val result = Messages.showYesNoDialog(
                context.project,
                "Delete method '$methodName'?\n\n${methodInfo.body}",
                "Confirm Delete",
                Messages.getQuestionIcon()
            )

            if (result == Messages.YES) {
                try {
                    // TOCTOU protection: Re-verify the method still exists with the same content
                    // The file may have been modified between showing the dialog and now
                    val currentMethodInfo = ReadAction.compute<MethodInfo?, Exception> {
                        findMethod(vFile, methodName)
                    }

                    if (currentMethodInfo == null) {
                        // Method was already deleted - treat as success (idempotent)
                        postDeleteResult(id, accepted = true)
                        return@invokeLater
                    }

                    if (currentMethodInfo.body != expectedBodyText) {
                        // Method content changed since dialog was shown - abort to prevent data loss
                        postDeleteResult(id, accepted = false,
                            error = "Method '$methodName' was modified since the confirmation dialog was shown. Please try again.")
                        return@invokeLater
                    }

                    if (currentMethodInfo.element == null) {
                        // Element is null - this shouldn't happen for GDScript, but handle it gracefully
                        LOG.error("Method element is null for '$methodName' - cannot delete")
                        postDeleteResult(id, accepted = false,
                            error = "Internal error: method element not available for deletion")
                        return@invokeLater
                    }

                    // Delete using document API for reliable cross-language deletion.
                    val document = FileDocumentManager.getInstance().getDocument(vFile)
                    if (document == null) {
                        postDeleteResult(id, accepted = false, error = "Could not get document")
                        return@invokeLater
                    }

                    // Commit any pending changes before deletion
                    PsiDocumentManager.getInstance(context.project).commitDocument(document)

                    // Delete using document API with undo suppressed
                    val range = currentMethodInfo.element.textRange
                    withSuppressedUndo(document) {
                        val startOffset = adjustStartForLeadingNewline(document, range.startOffset)
                        document.deleteString(startOffset, range.endOffset)
                    }

                    // Commit and save
                    PsiDocumentManager.getInstance(context.project).commitDocument(document)
                    FileDocumentManager.getInstance().saveDocument(document)

                    // Send accepted: true for UI to update toggle state
                    postDeleteResult(id, accepted = true)
                } catch (e: Exception) {
                    postDeleteResult(id, accepted = false, error = e.message)
                }
            } else {
                // User cancelled - send accepted: false
                postDeleteResult(id, accepted = false)
            }
        }
    }

    private suspend fun handleDeleteMethodsSilent(message: JsonObject) {
        val id = message.requireString("id", "handleDeleteMethodsSilent") ?: return
        val conversationId = message.requireInt("conversationId", "handleDeleteMethodsSilent") ?: return
        val methodNamesArray = message.get("methodNames")?.asJsonArray
        if (methodNamesArray == null) {
            LOG.warn("handleDeleteMethodsSilent: missing required field 'methodNames'")
            return
        }
        val methodNames = methodNamesArray.map { it.asString }

        // Validate all method names upfront
        if (!validateMethodNames(methodNames, "handleDeleteMethodsSilent", ::validateMethodName)) {
            return
        }

        val (_, extension, filePath, vFile) = resolveConversationFile(message, conversationId)

        try {
            if (vFile == null || !vFile.exists()) {
                context.postResponse(id, "code:deleteMethodsSilentResult", true, mapOf("deletedMethods" to emptyMap<String, String>()))
                return
            }

            // Route based on language: C#/C++ use ReSharper backend, GDScript uses text-based
            val model = backendModel

            if (isBackendLanguage(extension)) {
                // C#/C++ MUST use backend - text-based fallback would produce incorrect results
                if (model == null) {
                    LOG.warn("Backend unavailable for C#/C++ deleteMethodsSilent (solution may still be loading)")
                    context.postResponse(id, "code:deleteMethodsSilentResult", false,
                        error = ERR_BACKEND_NOT_READY)
                    return
                }
                handleDeleteMethodsSilentViaBackend(id, methodNames, filePath, model)
            } else {
                // GDScript: text-based approach (ReSharper doesn't support GDScript)
                handleDeleteMethodsSilentViaText(id, methodNames, vFile)
            }
        } catch (e: Exception) {
            LOG.error("Error deleting methods", e)
            context.postResponse(id, "code:deleteMethodsSilentResult", false, error = e.message)
        }
    }

    /**
     * Delete multiple methods using the ReSharper backend (for C#/C++).
     */
    private fun handleDeleteMethodsSilentViaBackend(id: String, methodNames: List<String>, filePath: String, model: GameScriptModel) {
        try {
            val request = DeleteSymbolsRequest(methodNames, filePath)
            val result = withRpcTimeout { invokeRdCallOnEdt { model.deleteSymbols.sync(request) } }

            if (result.success) {
                // Convert list of DeletedSymbolEntry to map
                val deletedMethods = result.deletedSymbols.associate { it.symbolName to it.deletedText }
                context.postResponse(
                    id, "code:deleteMethodsSilentResult", true,
                    mapOf("deletedMethods" to deletedMethods)
                )
            } else {
                context.postResponse(id, "code:deleteMethodsSilentResult", false, error = result.error)
            }
        } catch (e: TimeoutException) {
            LOG.warn("Backend deleteSymbols timed out (transient error)", e)
            context.postResponse(id, "code:deleteMethodsSilentResult", false, error = ERR_TIMEOUT_DELETE)
        } catch (e: Exception) {
            LOG.error("Backend deleteSymbols failed", e)
            context.postResponse(id, "code:deleteMethodsSilentResult", false, error = e.message)
        }
    }

    /**
     * Delete multiple methods using PSI-based deletion (for GDScript).
     *
     * ## Why PSI delete() Instead of document.deleteString()
     *
     * The previous approach collected TextRange values and used document.deleteString()
     * with setInBulkUpdate(true). This failed in Rider 2025.3+ because:
     * 1. During bulk update, PSI doesn't receive document change notifications
     * 2. Subsequent element.textRange values were stale (not adjusted for prior deletions)
     * 3. Descending-order deletion only works if offsets are updated between deletions
     *
     * Using element.delete():
     * - Atomically updates both PSI tree and document
     * - Other PSI elements receive notifications and update their ranges
     * - element.isValid correctly reflects whether element was already deleted
     *
     * ## Leading Newline Handling
     *
     * PSI delete() removes only the element, not surrounding whitespace. We handle
     * leading newlines by:
     * 1. Capturing the prevSibling reference BEFORE deleting the element
     * 2. Deleting the element FIRST
     * 3. Then cleaning up orphan whitespace if still valid
     *
     * IMPORTANT: Order matters! Deleting prevSibling first would shift PSI offsets and
     * potentially invalidate the element reference we're about to delete.
     */
    private fun handleDeleteMethodsSilentViaText(id: String, methodNames: List<String>, vFile: VirtualFile) {
        // Map of methodName -> deleted code (matching VS Code's format)
        val deletedMethods = mutableMapOf<String, String>()

        ApplicationManager.getApplication().invokeAndWait {
            val document = FileDocumentManager.getInstance().getDocument(vFile) ?: return@invokeAndWait

            // Commit any pending document changes before PSI access
            PsiDocumentManager.getInstance(context.project).commitDocument(document)

            val psiFile = PsiManager.getInstance(context.project).findFile(vFile) ?: return@invokeAndWait

            // First pass: collect PSI elements and their text
            val elementsToDelete = mutableListOf<Pair<String, PsiElement>>()

            ReadAction.run<Exception> {
                for (methodName in methodNames) {
                    val element = findMethodElement(psiFile, methodName)
                    if (element != null && element.isValid) {
                        deletedMethods[methodName] = element.text
                        elementsToDelete.add(methodName to element)
                    } else {
                        deletedMethods[methodName] = ""
                    }
                }
            }

            // Sort by start offset descending so we delete from end to start
            // This ensures earlier elements remain valid after each deletion
            elementsToDelete.sortByDescending { it.second.textOffset }

            // Second pass: delete via PSI (not document) for proper synchronization
            if (elementsToDelete.isNotEmpty()) {
                CommandProcessor.getInstance().runUndoTransparentAction {
                    WriteAction.run<Exception> {
                        for ((name, element) in elementsToDelete) {
                            if (!element.isValid) {
                                LOG.warn("Skipping deletion of '$name': element no longer valid")
                                continue
                            }

                            LOG.debug("Deleting '$name' via PSI at offset ${element.textOffset}")

                            // Capture whitespace reference BEFORE deleting element
                            // We'll clean it up after the element is gone
                            val prevSibling = element.prevSibling
                            val whitespaceToDelete = if (prevSibling != null && prevSibling.isValid) {
                                val prevText = prevSibling.text
                                if (prevText != null && prevText.isNotEmpty() &&
                                    prevText.all { it.isWhitespace() } && prevText.contains('\n')) {
                                    prevSibling
                                } else null
                            } else null

                            // Delete the element FIRST - this is critical!
                            // Deleting prevSibling first would shift offsets and potentially
                            // invalidate the element reference
                            element.delete()

                            // Now clean up orphan whitespace if it's still valid
                            // (element.delete() might have already cleaned it up)
                            if (whitespaceToDelete != null && whitespaceToDelete.isValid) {
                                whitespaceToDelete.delete()
                            }
                        }
                    }
                }

                // Commit and save after all deletions
                PsiDocumentManager.getInstance(context.project).commitDocument(document)
                FileDocumentManager.getInstance().saveDocument(document)
            }
        }

        context.postResponse(
            id, "code:deleteMethodsSilentResult", true,
            mapOf("deletedMethods" to deletedMethods)
        )
    }

    private suspend fun handleRestoreMethod(message: JsonObject) {
        val id = message.requireString("id", "handleRestoreMethod") ?: return
        val conversationId = message.requireInt("conversationId", "handleRestoreMethod") ?: return
        val methodName = message.requireValidMethodName("handleRestoreMethod", ::validateMethodName) ?: return
        val code = message.getStringOrNull("code")
        val template = message.getStringOrNull("template") ?: "unity"
        val fileContent = message.getStringOrNull("fileContent")

        // Nothing to restore
        if (code.isNullOrEmpty()) {
            context.postResponse(id, "code:restoreMethodResult", true)
            return
        }

        val (_, _, filePath, vFile) = resolveConversationFile(message, conversationId, refresh = false)

        try {
            val ioFile = File(filePath)

            // Track error state from lambda to prevent double response
            val errorRef = AtomicReference<String?>(null)

            if (vFile != null && vFile.exists()) {
                // File exists - use document buffer as source of truth
                ApplicationManager.getApplication().invokeAndWait {
                    val document = FileDocumentManager.getInstance().getDocument(vFile)
                    if (document == null) {
                        errorRef.set("Could not get document")
                        return@invokeAndWait
                    }

                    val text = document.text
                    val result = computeInsertion(text, code.trim(), usesClassWrapper(template))

                    if (result.error != null) {
                        errorRef.set(result.error)
                        return@invokeAndWait
                    }

                    // Use withSuppressedUndo to make change invisible to Rider's undo stack
                    withSuppressedUndo(document) {
                        document.setText(result.newContent!!)
                    }

                    // Save the document
                    FileDocumentManager.getInstance().saveDocument(document)
                }

                // Check if an error occurred inside the lambda
                val error = errorRef.get()
                if (error != null) {
                    context.postResponse(id, "code:restoreMethodResult", false, error = error)
                    return
                }
            } else if (fileContent != null) {
                // File doesn't exist - create it with the pre-generated content
                ApplicationManager.getApplication().invokeAndWait {
                    CommandProcessor.getInstance().runUndoTransparentAction {
                        WriteAction.run<Exception> {
                            val parentDir = ioFile.parentFile
                            if (parentDir != null && !parentDir.exists()) {
                                if (!parentDir.mkdirs()) {
                                    throw java.io.IOException("Failed to create directory: ${parentDir.absolutePath}")
                                }
                            }
                            if (!ioFile.createNewFile()) {
                                throw java.io.IOException("Failed to create file: ${ioFile.absolutePath}")
                            }
                            val newVFile = LocalFileSystem.getInstance().refreshAndFindFileByPath(filePath)
                            if (newVFile != null) {
                                VfsUtil.saveText(newVFile, fileContent)
                            }
                        }
                    }
                }
            } else {
                context.postResponse(id, "code:restoreMethodResult", false, error = "File not found and no file content provided")
                return
            }

            context.postResponse(id, "code:restoreMethodResult", true)
        } catch (e: Exception) {
            LOG.error("Error restoring method", e)
            context.postResponse(id, "code:restoreMethodResult", false, error = e.message)
        }
    }

    private suspend fun handleOpenMethod(message: JsonObject) {
        val conversationId = message.requireInt("conversationId", "handleOpenMethod") ?: return
        val methodName = message.requireValidMethodName("handleOpenMethod", ::validateMethodName) ?: return

        val (_, extension, _, vFile) = resolveConversationFile(message, conversationId, refresh = false)

        try {
            if (vFile == null) return

            // Route based on language to avoid RPC inside ReadAction
            val line = if (isBackendLanguage(extension)) {
                // Backend RPC outside of ReadAction/invokeLater to avoid deadlock
                val result = findMethodViaBackend(vFile, methodName)
                when (result) {
                    is FindMethodResult.Found -> result.info.lineNumber
                    else -> 0
                }
            } else {
                // GDScript: text-based parsing requires ReadAction
                val result = ReadAction.compute<FindMethodResult, Exception> {
                    findMethodViaText(vFile, methodName)
                }
                when (result) {
                    is FindMethodResult.Found -> result.info.lineNumber
                    else -> 0
                }
            }

            ApplicationManager.getApplication().invokeLater {
                val descriptor = OpenFileDescriptor(context.project, vFile, line, 0)
                FileEditorManager.getInstance(context.project).openTextEditor(descriptor, true)
            }
        } catch (e: Exception) {
            LOG.error("Error opening method: $methodName", e)
        }
    }

    private suspend fun handleWatchFolder(message: JsonObject) {
        val folderPath = message.getStringOrNull("folderPath")
        val extension = message.getStringOrNull("fileExtension") ?: ".cs"

        // Atomic update of both fields together
        watchConfig = WatchConfig(folderPath, extension)

        if (folderPath == null) {
            codeFileWatcher.clearWatch()
            return
        }

        val basePath = context.getWorkspacePath()
        if (basePath == null) {
            LOG.warn("Cannot watch folder '$folderPath': workspace path is null")
            codeFileWatcher.clearWatch()
            return
        }

        val absolutePath = "$basePath/$folderPath"

        codeFileWatcher.setWatchPath(absolutePath, extension) { conversationId ->
            context.postToUI("code:fileChanged", mapOf("conversationId" to conversationId))
        }
    }

    private suspend fun handleDeleteFile(message: JsonObject) {
        val id = message.requireString("id", "handleDeleteFile") ?: return
        val conversationId = message.requireInt("conversationId", "handleDeleteFile") ?: return

        val (_, _, _, vFile) = resolveConversationFile(message, conversationId, refresh = false)

        try {
            if (vFile == null || !vFile.exists()) {
                context.postResponse(
                    id, "code:deleteFileResult", true,
                    mapOf("fileContent" to null)
                )
                return
            }

            // Read content and delete via VFS (atomic update)
            val fileContentRef = AtomicReference<String>()
            ApplicationManager.getApplication().invokeAndWait {
                CommandProcessor.getInstance().runUndoTransparentAction {
                    WriteAction.run<Exception> {
                        fileContentRef.set(VfsUtil.loadText(vFile))
                        vFile.delete(null)
                    }
                }
            }

            context.postResponse(
                id, "code:deleteFileResult", true,
                mapOf("fileContent" to fileContentRef.get())
            )
        } catch (e: Exception) {
            LOG.error("Error deleting file", e)
            context.postResponse(id, "code:deleteFileResult", false, error = e.message)
        }
    }

    private suspend fun handleRestoreFile(message: JsonObject) {
        val id = message.requireString("id", "handleRestoreFile") ?: return
        val conversationId = message.requireInt("conversationId", "handleRestoreFile") ?: return
        val fileContent = message.requireString("fileContent", "handleRestoreFile") ?: return

        val (_, _, filePath, _) = resolveConversationFile(message, conversationId, refresh = false)

        try {
            val ioFile = File(filePath)

            // Get or create the VirtualFile via VFS
            val vFileRef = AtomicReference<VirtualFile?>()
            ApplicationManager.getApplication().invokeAndWait {
                WriteAction.run<Exception> {
                    if (!ioFile.exists()) {
                        val parentDir = ioFile.parentFile
                        if (parentDir != null && !parentDir.exists()) {
                            if (!parentDir.mkdirs()) {
                                throw java.io.IOException("Failed to create directory: ${parentDir.absolutePath}")
                            }
                        }
                        if (!ioFile.createNewFile()) {
                            throw java.io.IOException("Failed to create file: ${ioFile.absolutePath}")
                        }
                    }
                    vFileRef.set(LocalFileSystem.getInstance().refreshAndFindFileByPath(filePath))
                }
            }

            val vFile = vFileRef.get()
            if (vFile == null) {
                context.postResponse(id, "code:restoreFileResult", false, error = "Failed to create file")
                return
            }

            // Write content via VFS (atomic update)
            ApplicationManager.getApplication().invokeAndWait {
                CommandProcessor.getInstance().runUndoTransparentAction {
                    WriteAction.run<Exception> {
                        VfsUtil.saveText(vFile, fileContent)
                    }
                }
            }

            context.postResponse(id, "code:restoreFileResult", true)
        } catch (e: Exception) {
            LOG.error("Error restoring file", e)
            context.postResponse(id, "code:restoreFileResult", false, error = e.message)
        }
    }

    /**
     * Get the file path for a conversation's code file.
     * Includes security validation to prevent path traversal and invalid IDs.
     *
     * @param conversationId The conversation ID (must be positive)
     * @param extension The file extension (e.g., ".cs", ".gd")
     * @param folder The folder path from watchConfig (pass explicitly for thread-safety)
     */
    private fun getConversationFilePath(conversationId: Int, extension: String, folder: String?): String {
        // Validate conversation ID is positive (security)
        require(conversationId > 0) { "Invalid conversation ID: $conversationId" }

        // Validate extension doesn't contain path separators (security - prevents path traversal)
        require(!extension.contains("/") && !extension.contains("\\")) {
            "Invalid extension: contains path separator"
        }

        // Validate extension is in whitelist (security - prevents arbitrary file creation)
        // Normalize extension to ensure it has a leading dot for consistent comparison
        val normalizedExtension = if (extension.startsWith(".")) extension else ".$extension"
        require(normalizedExtension.lowercase() in ALLOWED_EXTENSIONS) {
            "Invalid extension '$extension': must be one of ${ALLOWED_EXTENSIONS.joinToString()}"
        }

        val effectiveFolder = folder ?: context.settings.state.codeOutputPath

        // Validate folder path: non-empty, no traversal, and relative
        require(effectiveFolder.isNotEmpty()) { "Invalid folder path: cannot be empty" }
        require(!effectiveFolder.contains("..")) { "Invalid folder path: contains path traversal" }
        require(!java.nio.file.Path.of(effectiveFolder).isAbsolute) { "Invalid folder path: must be relative" }

        val basePath = context.getWorkspacePath() ?: ""
        return "$basePath/$effectiveFolder/conv_$conversationId$extension"
    }

    /**
     * Find a method via ReSharper backend (for C#/C++).
     *
     * IMPORTANT: This must NOT be called inside ReadAction to avoid potential deadlocks.
     * The backend handles its own PSI access with proper locking.
     *
     * @param vFile The virtual file to search in
     * @param methodName The method name to find
     * @return FindMethodResult indicating success, not found, backend unavailable, or error
     */
    private fun findMethodViaBackend(vFile: VirtualFile, methodName: String): FindMethodResult {
        val model = backendModel
        if (model == null) {
            LOG.warn("Backend unavailable for $methodName lookup in ${vFile.path} - backendHost=${backendHost != null}")
            return FindMethodResult.BackendUnavailable
        }
        LOG.info("findMethodViaBackend: Starting lookup for '$methodName' in ${vFile.path}")
        LOG.info("findMethodViaBackend: model.rdid=${model.rdid}, model.location=${model.location}")
        return try {
            val request = FindSymbolRequest(methodName, vFile.path)
            LOG.info("findMethodViaBackend: Making RPC call...")
            val result = withRpcTimeout { invokeRdCallOnEdt { model.findSymbol.sync(request) } }
            LOG.info("findMethodViaBackend: RPC call completed, result=${result != null}, text='${result?.text?.take(100)}', startLine=${result?.startLine}, error='${result?.error}'")
            if (result != null) {
                // The protocol has dual semantics for findSymbol responses:
                // 1. null = symbol not found (handled in else branch below)
                // 2. non-null with error = lookup failed (e.g., PSI not ready, file not in solution)
                //
                // When the backend encounters an error during lookup, it returns a SymbolLocation
                // with empty filePath/text and a populated error field. This allows us to
                // distinguish "not found" from "lookup failed" at the protocol level.
                // See GameScriptModel.kt docs for full semantics.
                if (result.error.isNotEmpty()) {
                    LOG.warn("Backend error for symbol '$methodName' in ${vFile.path}: ${result.error}")
                    return FindMethodResult.Error(result.error)
                }
                FindMethodResult.Found(MethodInfo(
                    name = methodName,
                    body = result.text,
                    lineNumber = result.startLine,
                    element = null  // No PSI element from backend, but not needed for display
                ))
            } else {
                // Backend returned null - symbol not found
                LOG.debug("Backend returned null for symbol '$methodName' in ${vFile.path} (not found)")
                FindMethodResult.NotFound
            }
        } catch (e: TimeoutException) {
            LOG.warn("Backend symbol lookup timed out for $methodName", e)
            FindMethodResult.Error(ERR_TIMEOUT_SYMBOL_LOOKUP)
        } catch (e: Exception) {
            LOG.warn("Backend symbol lookup failed for $methodName: ${e.message}", e)
            FindMethodResult.Error(e.message ?: "Unknown error during symbol lookup")
        }
    }

    /**
     * Find a method via text-based parsing (for GDScript).
     *
     * This must be called inside ReadAction for PSI access.
     *
     * @param vFile The virtual file to search in
     * @param methodName The method name to find
     * @return FindMethodResult indicating success or not found
     */
    private fun findMethodViaText(vFile: VirtualFile, methodName: String): FindMethodResult {
        val psiFile = PsiManager.getInstance(context.project).findFile(vFile)
            ?: return FindMethodResult.Error("Could not get PSI file")

        val methodElement = gdscriptHelper.findMethodElement(psiFile, methodName)
            ?: return FindMethodResult.NotFound

        // Defensive: log if text is null (indicates PSI corruption or bug)
        val bodyText = methodElement.text
        if (bodyText == null) {
            LOG.warn("methodElement.text was null for '$methodName' in ${vFile.path} - PSI may be corrupted")
        }

        return FindMethodResult.Found(MethodInfo(
            name = methodName,
            body = bodyText ?: "",
            lineNumber = gdscriptHelper.getMethodLineNumber(methodElement),
            element = methodElement
        ))
    }

    /**
     * Find a method in a file by name (legacy wrapper for internal use).
     *
     * ARCHITECTURE NOTE: Method finding is implemented in two places by necessity:
     *
     * 1. C#/C++ → ReSharper backend (SymbolLookupHost.cs)
     *    - Uses ReSharper PSI for semantic analysis
     *    - Handles macro expansion (NODE_CONDITION → __NodeCondition_N_Impl)
     *    - Runs in .NET process, accessed via RPC
     *
     * 2. GDScript → GDScriptCodeHelper (this JVM)
     *    - Uses text-based parsing (ReSharper doesn't support GDScript)
     *    - Handles indentation-based function boundaries
     *    - Runs in JVM process, direct method call
     *
     * NOTE: For handlers, prefer using findMethodViaBackend/findMethodViaText directly
     * with proper ReadAction handling. This method is kept for compatibility with
     * internal callers that already handle ReadAction appropriately.
     */
    private fun findMethod(vFile: VirtualFile, methodName: String): MethodInfo? {
        val extension = vFile.extension
        val result = if (isBackendLanguage(extension)) {
            findMethodViaBackend(vFile, methodName)
        } else {
            findMethodViaText(vFile, methodName)
        }
        return when (result) {
            is FindMethodResult.Found -> result.info
            else -> null
        }
    }

    /**
     * Find a method element in a PSI file by name.
     * Only used for GDScript (text-based search).
     */
    private fun findMethodElement(psiFile: PsiFile, methodName: String): PsiElement? {
        return gdscriptHelper.findMethodElement(psiFile, methodName)
    }

    data class MethodInfo(
        val name: String,
        val body: String,
        val lineNumber: Int,
        val element: PsiElement? = null
    )

    /**
     * Result type for findMethod operations.
     * Distinguishes between "not found", "backend unavailable", and errors.
     */
    sealed class FindMethodResult {
        data class Found(val info: MethodInfo) : FindMethodResult()
        data object NotFound : FindMethodResult()
        data object BackendUnavailable : FindMethodResult()
        data class Error(val message: String) : FindMethodResult()
    }

    // ============================================================
    // Response Helper Methods
    // ============================================================
    // These helpers ensure consistent response format across all code paths

    /**
     * Send a delete result response to the UI.
     * Standardizes the response format for code:deleteResult messages.
     *
     * @param id The request ID
     * @param accepted Whether the deletion was accepted (true = deleted or already deleted)
     * @param error Optional error message (only meaningful when accepted = false)
     */
    private fun postDeleteResult(id: String, accepted: Boolean, error: String? = null) {
        val response = mutableMapOf<String, Any?>(
            "id" to id,
            "accepted" to accepted
        )
        if (error != null) {
            response["error"] = error
        }
        context.postToUI("code:deleteResult", response)
    }

    companion object {
        /**
         * Logger for CodeHandlers.
         *
         * ## Logging Level Conventions
         *
         * - **ERROR**: Unexpected failures that indicate bugs or corruption
         *   - Method element is null when it shouldn't be
         *   - Backend operation failed (not timeout/unavailable)
         *   - File operations failed unexpectedly
         *
         * - **WARN**: Expected/recoverable conditions that may need attention
         *   - Backend unavailable (solution still loading)
         *   - Timeouts (transient, may succeed on retry)
         *   - RPC executor issues (shutdown in progress)
         *   - PSI corruption detected
         *
         * - **INFO**: Normal operational events
         *   - Executor initialization/shutdown
         *   - Successful binding
         *
         * - **DEBUG**: Detailed diagnostic information
         *   - Symbol not found (normal lookup result)
         *   - Method discovery details
         */
        private val LOG = Logger.getInstance(CodeHandlers::class.java)

        // ============================================================
        // Error Message Constants
        // ============================================================
        // Standardized error messages for consistent user-facing feedback.
        // Keep these in sync if changing error wording.

        /** Error when ReSharper backend is not yet available (solution loading) */
        private const val ERR_BACKEND_NOT_READY =
            "ReSharper backend not ready. The solution may still be loading - please wait a moment and try again."

        /** Error when an RPC operation times out */
        private const val ERR_TIMEOUT_SYMBOL_LOOKUP = "Symbol lookup timed out"
        private const val ERR_TIMEOUT_CREATE = "Create operation timed out"
        private const val ERR_TIMEOUT_DELETE = "Delete operation timed out"

        /** Error when code file doesn't exist */
        private const val ERR_CODE_FILE_NOT_FOUND =
            "Code file not found. Enable a condition or action to create it."

        // ============================================================
        // RPC Configuration Limits
        // ============================================================
        // These bounds prevent misconfigurations that could cause problems:
        // - Too many retries: Excessive delays when backend is truly unavailable
        // - Too large pool: Thread exhaustion and context-switch overhead
        // - Too long shutdown: Blocks IDE exit for too long

        /** Maximum allowed retries (10 attempts = ~10+ seconds with backoff, enough for transient issues) */
        private const val MAX_RETRY_LIMIT = 10

        /** Maximum pool threads (16 is generous; more would cause contention without benefit) */
        private const val MAX_POOL_SIZE_LIMIT = 16

        /** Maximum shutdown wait (30s is very generous; longer would frustrate users on exit) */
        private const val MAX_SHUTDOWN_TIMEOUT_SEC = 30L

        /** Flag indicating the RPC executor is shutting down - used for fast-fail in withRpcTimeout */
        private val isShuttingDown = java.util.concurrent.atomic.AtomicBoolean(false)

        /**
         * Default timeout for RPC calls to the ReSharper backend.
         * 10 seconds should be ample for symbol lookup/creation/deletion operations.
         * This prevents UI freezes if the backend becomes unresponsive.
         *
         * Can be overridden via system property: -Dgamescript.rpc.timeout.ms=15000
         */
        private val RPC_TIMEOUT_MS: Long by lazy {
            System.getProperty("gamescript.rpc.timeout.ms")?.toLongOrNull() ?: 10_000L
        }

        /**
         * Number of retry attempts for RPC calls before giving up.
         * Default is 3 (initial attempt + 2 retries).
         *
         * Can be overridden via system property: -Dgamescript.rpc.max.retries=5
         */
        private val RPC_MAX_RETRIES: Int by lazy {
            System.getProperty("gamescript.rpc.max.retries")?.toIntOrNull()?.coerceIn(1, MAX_RETRY_LIMIT) ?: 3
        }

        /**
         * Initial backoff delay in milliseconds for RPC retries.
         * Uses exponential backoff: 500ms -> 1000ms -> 2000ms
         *
         * Can be overridden via system property: -Dgamescript.rpc.backoff.ms=500
         */
        private val RPC_INITIAL_BACKOFF_MS: Long by lazy {
            System.getProperty("gamescript.rpc.backoff.ms")?.toLongOrNull() ?: 500L
        }

        /**
         * Number of threads in the RPC executor pool.
         * Default is 4, which allows concurrent RPC calls without exhausting resources.
         *
         * Can be overridden via system property: -Dgamescript.rpc.pool.size=8
         */
        private val RPC_POOL_SIZE: Int by lazy {
            System.getProperty("gamescript.rpc.pool.size")?.toIntOrNull()?.coerceIn(1, MAX_POOL_SIZE_LIMIT) ?: 4
        }

        /**
         * Shutdown timeout for the RPC executor in seconds.
         * Allows in-flight RPC calls to complete gracefully before forcing shutdown.
         *
         * Can be overridden via system property: -Dgamescript.rpc.shutdown.timeout=5
         */
        private val RPC_SHUTDOWN_TIMEOUT_SEC: Long by lazy {
            System.getProperty("gamescript.rpc.shutdown.timeout")?.toLongOrNull()?.coerceIn(1, MAX_SHUTDOWN_TIMEOUT_SEC) ?: 5L
        }

        /** Maximum queue size for pending RPC tasks (prevents unbounded memory growth) */
        private const val RPC_QUEUE_CAPACITY = 100

        /**
         * Bounded executor for RPC timeout operations.
         * Uses a ThreadPoolExecutor with bounded queue to prevent memory exhaustion
         * if the backend becomes slow or unresponsive.
         *
         * Configuration:
         * - Core pool: Half of max pool (allows scaling down when idle)
         * - Max pool: RPC_POOL_SIZE threads
         * - Queue: Bounded to RPC_QUEUE_CAPACITY tasks
         * - Rejection: CallerRunsPolicy provides back-pressure (caller thread executes task)
         * - Keep-alive: 60 seconds for non-core threads
         *
         * Pool size is configurable via system property: -Dgamescript.rpc.pool.size=N
         *
         * The executor is lazily initialized and registers a shutdown hook to ensure
         * proper cleanup when the application exits.
         *
         * Thread Safety: Kotlin's `lazy` uses synchronized initialization by default,
         * ensuring exactly one executor is created even with concurrent first access.
         */
        private val rpcExecutor: ExecutorService by lazy {
            val executor = ThreadPoolExecutor(
                (RPC_POOL_SIZE / 2).coerceAtLeast(1),  // Core pool size (at least 1)
                RPC_POOL_SIZE,                          // Max pool size
                60L, TimeUnit.SECONDS,                  // Keep-alive for non-core threads
                LinkedBlockingQueue<Runnable>(RPC_QUEUE_CAPACITY),  // Bounded queue
                { runnable -> Thread(runnable, "GameScript-RPC").apply { isDaemon = true } },  // ThreadFactory
                ThreadPoolExecutor.CallerRunsPolicy()   // Back-pressure: caller executes if queue full
            )

            LOG.info("Initialized RPC executor: pool=$RPC_POOL_SIZE, timeout=${RPC_TIMEOUT_MS}ms, maxRetries=$RPC_MAX_RETRIES, backoff=${RPC_INITIAL_BACKOFF_MS}ms")

            // Register shutdown hook - try multiple strategies for robustness.
            // Even if all fail, daemon threads will be terminated on JVM exit.
            var shutdownRegistered = false

            // Strategy 1: IntelliJ Disposer (preferred - integrates with IDE lifecycle)
            try {
                com.intellij.openapi.util.Disposer.register(
                    ApplicationManager.getApplication(),
                    com.intellij.openapi.Disposable {
                        shutdownRpcExecutor(executor)
                    }
                )
                shutdownRegistered = true
            } catch (e: Exception) {
                LOG.warn("Failed to register RPC executor shutdown via Disposer: ${e.message}")
            }

            // Strategy 2: JVM shutdown hook (fallback - less reliable ordering)
            if (!shutdownRegistered) {
                try {
                    Runtime.getRuntime().addShutdownHook(Thread({
                        shutdownRpcExecutor(executor)
                    }, "GameScript-RPC-Shutdown"))
                    shutdownRegistered = true
                    LOG.info("Registered RPC executor shutdown via JVM shutdown hook (fallback)")
                } catch (e: Exception) {
                    LOG.warn("Failed to register RPC executor shutdown via JVM hook: ${e.message}")
                }
            }

            // If all strategies failed, log warning but continue - daemon threads will still exit
            if (!shutdownRegistered) {
                LOG.warn("Could not register RPC executor shutdown hook. " +
                    "Daemon threads will be terminated on JVM exit, but graceful shutdown is unavailable.")
            }

            executor
        }

        /**
         * Gracefully shutdown the RPC executor.
         * Waits for in-flight calls to complete, then forces shutdown if needed.
         */
        private fun shutdownRpcExecutor(executor: ExecutorService) {
            LOG.info("Shutting down RPC executor...")
            isShuttingDown.set(true)  // Signal withRpcTimeout to fail fast
            executor.shutdown()
            try {
                // Wait for in-flight calls to complete
                if (!executor.awaitTermination(RPC_SHUTDOWN_TIMEOUT_SEC, TimeUnit.SECONDS)) {
                    LOG.warn("RPC executor did not terminate gracefully after ${RPC_SHUTDOWN_TIMEOUT_SEC}s, forcing shutdown")
                    val pending = executor.shutdownNow()
                    if (pending.isNotEmpty()) {
                        LOG.warn("${pending.size} RPC tasks were cancelled")
                    }
                } else {
                    LOG.info("RPC executor shutdown complete")
                }
            } catch (e: InterruptedException) {
                LOG.warn("RPC executor shutdown interrupted, forcing immediate shutdown")
                executor.shutdownNow()
                Thread.currentThread().interrupt()
            }
        }

        /**
         * Execute an RPC call with a timeout and exponential backoff retry.
         * Uses a bounded thread pool to avoid exhausting the ForkJoinPool common pool.
         *
         * Retry strategy:
         * - Retries on TimeoutException only (transient failures)
         * - Uses exponential backoff: 500ms -> 1000ms -> 2000ms (configurable)
         * - Logs each retry attempt
         *
         * Exception handling:
         * - TimeoutException: Retried up to maxRetries times
         * - CancellationException: Converted to TimeoutException (task was cancelled)
         * - RejectedExecutionException: Logged and rethrown (executor shutting down)
         * - ExecutionException: Unwrapped and rethrown (preserves original cause)
         *
         * @param timeoutMs Maximum time to wait for each attempt (default: RPC_TIMEOUT_MS)
         * @param maxRetries Maximum number of attempts (default: RPC_MAX_RETRIES)
         * @param rpcCall The RPC call to execute
         * @return The result of the RPC call
         * @throws TimeoutException if all retry attempts time out or task was cancelled
         * @throws Exception any non-timeout exception thrown by the RPC call
         */
        private fun <T> withRpcTimeout(
            timeoutMs: Long = RPC_TIMEOUT_MS,
            maxRetries: Int = RPC_MAX_RETRIES,
            rpcCall: () -> T
        ): T {
            var lastException: Exception? = null
            var backoffMs = RPC_INITIAL_BACKOFF_MS

            for (attempt in 1..maxRetries) {
                val future: CompletableFuture<T>
                try {
                    // Check shutdown flag INSIDE try block to close the race window.
                    // Between isShuttingDown.get() and supplyAsync(), the executor could shut down.
                    // By checking inside the try, RejectedExecutionException handles any race.
                    if (isShuttingDown.get()) {
                        throw TimeoutException("RPC executor is shutting down")
                    }
                    future = CompletableFuture.supplyAsync({ rpcCall() }, rpcExecutor)
                } catch (e: java.util.concurrent.RejectedExecutionException) {
                    // Executor is shutting down or overloaded - this is expected during IDE shutdown.
                    // This catch handles the race condition: even if isShuttingDown was false,
                    // the executor may have shut down between the check and supplyAsync.
                    LOG.warn("RPC executor rejected task (attempt $attempt/$maxRetries) - executor may be shutting down", e)
                    throw TimeoutException("RPC executor unavailable: ${e.message}")
                }

                try {
                    return future.get(timeoutMs, TimeUnit.MILLISECONDS)
                } catch (e: TimeoutException) {
                    future.cancel(true)
                    lastException = e

                    if (attempt < maxRetries) {
                        LOG.warn("RPC call timed out (attempt $attempt/$maxRetries), retrying in ${backoffMs}ms...")
                        try {
                            Thread.sleep(backoffMs)
                        } catch (ie: InterruptedException) {
                            Thread.currentThread().interrupt()
                            throw TimeoutException("RPC call interrupted during retry backoff").initCause(ie)
                        }
                        backoffMs *= 2  // Exponential backoff
                    }
                } catch (e: java.util.concurrent.CancellationException) {
                    // Task was cancelled (e.g., by future.cancel() from a previous timeout)
                    LOG.warn("RPC call was cancelled (attempt $attempt/$maxRetries)")
                    throw TimeoutException("RPC call was cancelled")
                } catch (e: java.util.concurrent.ExecutionException) {
                    // Unwrap the cause to preserve the original exception type
                    // Non-timeout exceptions are not retried - they indicate logic errors
                    val cause = e.cause
                    when (cause) {
                        is TimeoutException -> {
                            // Backend itself timed out - treat like our timeout
                            lastException = cause
                            if (attempt < maxRetries) {
                                LOG.warn("Backend timed out (attempt $attempt/$maxRetries), retrying in ${backoffMs}ms...")
                                Thread.sleep(backoffMs)
                                backoffMs *= 2
                                continue
                            }
                        }
                        null -> throw e  // No cause, rethrow wrapper
                        else -> throw cause  // Rethrow unwrapped cause
                    }
                }
            }

            // All retries exhausted
            throw TimeoutException("RPC call timed out after $maxRetries attempts (${timeoutMs}ms each)")
        }

        /**
         * Execute an RdCall on the EDT (Event Dispatch Thread).
         *
         * Rider's RdCall.sync() requires execution on the UI thread. This helper
         * ensures the call is properly scheduled on EDT while allowing the caller
         * to wrap it in timeout logic via withRpcTimeout.
         *
         * Threading: The call is executed synchronously on EDT via invokeAndWait.
         * If called from within withRpcTimeout, the timeout mechanism still works
         * because the background thread waiting on invokeAndWait can be interrupted.
         *
         * @param rdCall The RdCall lambda to execute
         * @return The result of the RdCall
         * @throws Exception any exception thrown by the RdCall is propagated to caller
         */
        private fun <T> invokeRdCallOnEdt(rdCall: () -> T): T {
            var result: T? = null
            var exception: Throwable? = null

            ApplicationManager.getApplication().invokeAndWait {
                try {
                    result = rdCall()
                } catch (e: Throwable) {
                    exception = e
                }
            }

            exception?.let { throw it }
            @Suppress("UNCHECKED_CAST")
            return result as T
        }

        /**
         * Regex pattern for valid method names.
         * Matches identifiers that start with a letter or underscore, followed by
         * letters, digits, or underscores. This is the common subset across C#, C++, and GDScript.
         *
         * Examples of valid names: "Node_123_Condition", "cond_456", "__NodeAction_7_Impl"
         * Examples of invalid names: "123_method", "method name", "method;drop table"
         */
        private val VALID_METHOD_NAME_PATTERN = Regex("^[a-zA-Z_][a-zA-Z0-9_]*$")

        /**
         * Maximum length for method names.
         * Prevents excessively long names that could cause performance issues or buffer overflows.
         *
         * 256 chars is chosen because:
         * - GameScript-generated names are typically 15-30 chars (e.g., "Node_123_Condition")
         * - C# allows up to 512 Unicode chars for identifiers
         * - C++ has implementation-defined limits (typically 1024+)
         * - 256 is a safe middle ground that catches obvious abuse while allowing flexibility
         */
        private const val MAX_METHOD_NAME_LENGTH = 256

        /**
         * Validate that a method name is a valid identifier.
         * This provides defense-in-depth even though method names come from trusted UI.
         *
         * @param methodName The method name to validate
         * @throws IllegalArgumentException if the name is invalid
         */
        fun validateMethodName(methodName: String) {
            require(methodName.isNotEmpty()) { "Method name cannot be empty" }
            require(methodName.length <= MAX_METHOD_NAME_LENGTH) {
                "Method name too long: ${methodName.length} chars (max $MAX_METHOD_NAME_LENGTH)"
            }
            require(VALID_METHOD_NAME_PATTERN.matches(methodName)) {
                "Invalid method name: must be a valid identifier (letters, digits, underscores, starting with letter or underscore)"
            }
        }

        /**
         * File extensions that use the ReSharper backend for symbol operations.
         * These languages have proper PSI support via the C# backend.
         *
         * Extensions:
         * - cs: C# source files
         * - cpp, cc: C++ source files
         * - h, hpp: C/C++ header files
         * - inl: C++ inline implementation files (common in game engines like Unreal)
         *
         * IMPORTANT: When adding new language support, also update:
         * - ALLOWED_EXTENSIONS below
         * - SymbolLookupHost.cs in the C# backend
         *
         * NOTE: Backend limitations (e.g., C++ operator overload handling, string literal
         * edge cases) are documented in SymbolLookupHost.cs. These don't affect GameScript's
         * generated method names, which follow safe naming patterns.
         */
        private val BACKEND_EXTENSIONS = setOf("cs", "cpp", "h", "hpp", "cc", "inl")

        /**
         * Whitelist of allowed file extensions for code file operations.
         * This provides defense-in-depth security by ensuring we only create/modify
         * expected file types. Includes both backend languages and GDScript.
         *
         * Extensions must include the leading dot for validation consistency.
         *
         * IMPORTANT: When adding new language support, also update:
         * - BACKEND_EXTENSIONS above (if using ReSharper backend)
         * - GDScriptCodeHelper (if text-based parsing)
         */
        private val ALLOWED_EXTENSIONS = setOf(".cs", ".cpp", ".h", ".hpp", ".cc", ".inl", ".gd")

        /**
         * Language IDs (from IntelliJ's Language.id) that use the ReSharper backend.
         *
         * IMPORTANT: When adding new language support, also update:
         * - BACKEND_EXTENSIONS above
         * - SymbolLookupHost.cs in the C# backend
         */

        /**
         * Check if a file extension indicates a backend-supported language.
         * The ReSharper backend (SymbolLookupHost.cs) handles C#/C++ symbol operations.
         */
        fun isBackendLanguage(extension: String?): Boolean {
            if (extension == null) return false
            val normalized = extension.lowercase().trimStart('.')
            return normalized in BACKEND_EXTENSIONS
        }

        /**
         * Adjust start offset to include leading newline for clean deletion.
         * This ensures deleted code doesn't leave behind extra blank lines.
         *
         * ## Behavior
         *
         * Only adjusts by ONE newline character. This is intentional:
         * - If the method is preceded by a single newline (typical), include it in deletion
         * - If preceded by multiple blank lines, preserve all but one (keeps visual separation)
         * - If at start of file (no newline), don't adjust
         *
         * Example:
         * ```
         * func foo():   <- Previous method
         *               <- Single blank line (this newline is included in deletion)
         * func bar():   <- Method to delete (startOffset points here)
         * ```
         * After deletion, no extra blank line remains between foo() and what follows.
         *
         * ## Sync Required
         *
         * This is the canonical implementation - also used by:
         * - C#: SymbolLookupHost.AdjustStartForLeadingNewline() (parallel implementation)
         *
         * @param document The document to check
         * @param startOffset The original start offset
         * @return Adjusted offset (startOffset - 1 if preceded by newline, otherwise startOffset)
         */
        fun adjustStartForLeadingNewline(document: com.intellij.openapi.editor.Document, startOffset: Int): Int {
            if (startOffset > 0 && document.getText(TextRange(startOffset - 1, startOffset)) == "\n") {
                return startOffset - 1
            }
            return startOffset
        }

        /**
         * Execute a document modification with undo completely suppressed.
         * Uses DocumentEx.setInBulkUpdate(true) to make the change invisible to Rider's undo stack.
         * This is necessary because the UI has its own undo system.
         *
         * @param document The document to modify
         * @param action The modification action to execute
         * @return The result of the action
         * @throws IllegalStateException if the action fails to produce a result (should not happen in normal operation)
         */
        internal inline fun <T> withSuppressedUndo(document: com.intellij.openapi.editor.Document, crossinline action: () -> T): T {
            val documentEx = document as? DocumentEx
            var result: T? = null
            var actionExecuted = false
            CommandProcessor.getInstance().runUndoTransparentAction {
                result = WriteAction.compute<T, Exception> {
                    try {
                        documentEx?.setInBulkUpdate(true)
                        action().also { actionExecuted = true }
                    } finally {
                        documentEx?.setInBulkUpdate(false)
                    }
                }
            }
            // Safety check: runUndoTransparentAction executes synchronously, so if we reach here
            // without an exception, the action must have completed successfully
            check(actionExecuted) { "withSuppressedUndo: action did not execute - this indicates a bug" }
            @Suppress("UNCHECKED_CAST")
            return result as T
        }

        // ============================================================
        // Insertion Logic Constants
        // ============================================================
        //
        // ╔══════════════════════════════════════════════════════════════════════════╗
        // ║                          SYNC REQUIRED                                    ║
        // ╠══════════════════════════════════════════════════════════════════════════╣
        // ║  These constants MUST be kept in sync across THREE locations:            ║
        // ║                                                                          ║
        // ║  1. Kotlin: plugins/rider/.../handlers/CodeHandlers.kt (this file)       ║
        // ║     - Used for: GDScript text-based insertion/deletion                   ║
        // ║     - Constants: APPEND_SEPARATOR, CLASS_INSERT_PREFIX, CLASS_INSERT_SUFFIX║
        // ║     - Function: adjustStartForLeadingNewline()                           ║
        // ║                                                                          ║
        // ║  2. C#: plugins/rider/src/dotnet/.../SymbolLookupHost.cs                 ║
        // ║     - Used for: C#/C++ PSI-based insertion/deletion                      ║
        // ║     - Constants: AppendSeparator, ClassInsertPrefix, ClassInsertSuffix   ║
        // ║     - Function: AdjustStartForLeadingNewline()                           ║
        // ║                                                                          ║
        // ║  3. TypeScript: shared/src/templates/index.ts                            ║
        // ║     - Used for: usesClassWrapper() logic that determines insertion mode  ║
        // ║     - Also used by: plugins/vscode/src/handlers/code/index.ts            ║
        // ║                                                                          ║
        // ║  Current values:                                                         ║
        // ║    APPEND_SEPARATOR    = "\n\n"  (Godot/Unreal: append to end of file)  ║
        // ║    CLASS_INSERT_PREFIX = "\n"    (Unity: newline before method)         ║
        // ║    CLASS_INSERT_SUFFIX = "\n"    (Unity: newline after method)          ║
        // ║                                                                          ║
        // ║  Leading newline adjustment (for clean deletion):                        ║
        // ║    If char before startOffset is '\n', include it in deletion range     ║
        // ║    This prevents leaving extra blank lines after deletion               ║
        // ║                                                                          ║
        // ║  If you change these values, update ALL THREE locations!                 ║
        // ╚══════════════════════════════════════════════════════════════════════════╝
        // ============================================================

        /** Newline separator for appending to end of file (Godot/Unreal style, no class wrapper) */
        private const val APPEND_SEPARATOR = "\n\n"

        /** Newline prefix/suffix for class wrapper insertion (Unity style, before closing brace) */
        private const val CLASS_INSERT_PREFIX = "\n"
        private const val CLASS_INSERT_SUFFIX = "\n"

        /**
         * Result of computing method insertion into existing content.
         *
         * @property newContent The full new content after insertion
         * @property insertOffset The offset where the method was inserted (for cursor positioning)
         * @property error Error message if insertion failed, null on success
         */
        data class InsertionResult(
            val newContent: String?,
            val insertOffset: Int,
            val error: String?
        )

        /**
         * Compute how to insert a method into existing file content.
         *
         * For class wrapper (Unity): Insert before the last closing brace '}'
         * For non-class wrapper (Godot, Unreal): Append to end of file
         *
         * IMPORTANT: Keep this logic in sync with:
         * - C#: SymbolLookupHost.cs CreateSymbolCore()
         * - TypeScript: shared/src/templates/index.ts usesClassWrapper()
         *
         * @param existingContent The current file content
         * @param methodStub The method code to insert
         * @param usesClassWrapper True for Unity (insert before '}'), false for Godot/Unreal (append)
         * @return InsertionResult with new content and insert offset, or error
         */
        fun computeInsertion(existingContent: String, methodStub: String, usesClassWrapper: Boolean): InsertionResult {
            return if (usesClassWrapper) {
                val lastBrace = existingContent.lastIndexOf('}')
                if (lastBrace == -1) {
                    InsertionResult(null, 0, "Could not find class closing brace")
                } else {
                    val codeToInsert = CLASS_INSERT_PREFIX + methodStub + CLASS_INSERT_SUFFIX
                    val newContent = existingContent.substring(0, lastBrace) + codeToInsert + existingContent.substring(lastBrace)
                    InsertionResult(newContent, lastBrace + CLASS_INSERT_PREFIX.length, null)
                }
            } else {
                // Godot/Unreal: append to end with proper newline separation
                val trimmed = existingContent.trimEnd()
                val codeToInsert = APPEND_SEPARATOR + methodStub + "\n"
                val newContent = trimmed + codeToInsert
                InsertionResult(newContent, trimmed.length + APPEND_SEPARATOR.length, null)
            }
        }
    }
}
