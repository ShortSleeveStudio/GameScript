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
import java.io.File
import java.util.concurrent.atomic.AtomicReference

/**
 * Handlers for code operations using ReSharper PSI.
 * Implements: code:getMethod, code:createMethod, code:deleteMethod,
 * code:deleteMethodsSilent, code:restoreMethod, code:openMethod,
 * code:watchFolder, code:deleteFile, code:restoreFile
 */
class CodeHandlers(
    private val context: HandlerContext,
    private val codeFileWatcher: CodeFileWatcher
) {

    // Thread-safe state for watch folder configuration
    @Volatile private var codeOutputFolder: String? = null
    @Volatile private var fileExtension: String = ".cs"

    // Language-specific helpers
    private val csharpHelper: LanguageCodeHelper = CSharpCodeHelper(context.project)
    private val cppHelper: LanguageCodeHelper by lazy { CppCodeHelper(context.project) }

    /**
     * Get the appropriate language helper based on file language.
     * Note: Cidr uses various language IDs for C/C++ depending on version.
     */
    private fun getHelperForFile(psiFile: PsiFile): LanguageCodeHelper {
        return when (psiFile.language.id) {
            "C#", "CSharp" -> csharpHelper
            "ObjectiveC", "CPP", "C++" -> cppHelper  // Cidr uses different IDs across versions
            else -> csharpHelper  // Default to C#
        }
    }

    /**
     * Get the appropriate language helper based on file extension.
     */
    private fun getHelperForExtension(extension: String): LanguageCodeHelper {
        return when (extension.lowercase()) {
            ".cs" -> csharpHelper
            ".cpp", ".h", ".hpp", ".cc", ".inl" -> cppHelper  // Includes Unreal .inl files
            else -> csharpHelper  // Default to C#
        }
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
        val id = message.get("id")?.asString ?: return
        val conversationId = message.get("conversationId")?.asInt ?: return
        val methodName = message.get("methodName")?.asString ?: return
        val extension = message.get("fileExtension")?.asString ?: fileExtension

        try {
            val filePath = getConversationFilePath(conversationId, extension)
            val vFile = LocalFileSystem.getInstance().findFileByPath(filePath)

            if (vFile == null || !vFile.exists()) {
                context.postResponse(
                    id, "code:methodResult", false,
                    error = "Code file not found. Enable a condition or action to create it."
                )
                return
            }

            val result = ReadAction.compute<MethodInfo?, Exception> {
                findMethod(vFile, methodName)
            }

            if (result != null) {
                context.postResponse(
                    id, "code:methodResult", true,
                    mapOf(
                        "body" to result.body,
                        "fullText" to result.fullText,
                        "filePath" to filePath,
                        "lineNumber" to result.lineNumber
                    )
                )
            } else {
                context.postResponse(
                    id, "code:methodResult", false,
                    error = "Method '$methodName' not found"
                )
            }
        } catch (e: Exception) {
            LOG.error("Error getting method: $methodName", e)
            context.postResponse(id, "code:methodResult", false, error = e.message)
        }
    }

    private suspend fun handleCreateMethod(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val conversationId = message.get("conversationId")?.asInt ?: return
        val methodName = message.get("methodName")?.asString ?: return
        val methodStub = message.get("methodStub")?.asString ?: return
        val fileContent = message.get("fileContent")?.asString ?: ""
        val extension = message.get("fileExtension")?.asString ?: fileExtension

        try {
            val filePath = getConversationFilePath(conversationId, extension)
            val ioFile = File(filePath)

            // 1. Get or create the VirtualFile via VFS (atomic with disk)
            val vFileRef = AtomicReference<VirtualFile?>()
            ApplicationManager.getApplication().invokeAndWait {
                WriteAction.run<Exception> {
                    if (!ioFile.exists()) {
                        ioFile.parentFile?.mkdirs()
                        ioFile.createNewFile()
                    }
                    vFileRef.set(LocalFileSystem.getInstance().refreshAndFindFileByPath(filePath))
                }
            }

            val vFile = vFileRef.get()
            if (vFile == null) {
                context.postResponse(id, "code:createResult", false, error = "Failed to create file")
                return
            }

            // 2. Compute new content and write with undo suppressed
            ApplicationManager.getApplication().invokeAndWait {
                val document = FileDocumentManager.getInstance().getDocument(vFile)
                if (document != null) {
                    val existing = document.text

                    // Use withSuppressedUndo to make change invisible to Rider's undo stack
                    withSuppressedUndo(document) {
                        if (existing.isNotEmpty()) {
                            val lastBrace = existing.lastIndexOf('}')
                            if (lastBrace != -1) {
                                // Insert method before closing brace (matches VSCode behavior)
                                val codeToInsert = "\n" + methodStub + "\n"
                                document.insertString(lastBrace, codeToInsert)
                            } else {
                                document.insertString(document.textLength, "\n" + methodStub)
                            }
                        } else {
                            document.setText(fileContent)
                        }
                    }
                    FileDocumentManager.getInstance().saveDocument(document)

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
                                val lastBrace = existing.lastIndexOf('}')
                                if (lastBrace != -1) {
                                    existing.substring(0, lastBrace) +
                                            "\n" + methodStub + "\n" +
                                            existing.substring(lastBrace)
                                } else {
                                    existing + "\n" + methodStub
                                }
                            } else {
                                fileContent
                            }
                            VfsUtil.saveText(vFile, newContent)
                        }
                    }
                }
            }

            // 3. Open file and respond on EDT
            ApplicationManager.getApplication().invokeLater {
                val methodInfo = ReadAction.compute<MethodInfo?, Exception> {
                    findMethod(vFile, methodName)
                }
                val line = methodInfo?.lineNumber ?: 0
                val descriptor = OpenFileDescriptor(context.project, vFile, line, 0)
                FileEditorManager.getInstance(context.project).openTextEditor(descriptor, true)
                context.postResponse(id, "code:createResult", true)
            }
        } catch (e: Exception) {
            LOG.error("Error creating method: $methodName", e)
            context.postResponse(id, "code:createResult", false, error = e.message)
        }
    }

    private suspend fun handleDeleteMethod(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val conversationId = message.get("conversationId")?.asInt ?: return
        val methodName = message.get("methodName")?.asString ?: return
        val extension = message.get("fileExtension")?.asString ?: fileExtension

        try {
            val filePath = getConversationFilePath(conversationId, extension)
            val vFile = LocalFileSystem.getInstance().findFileByPath(filePath)

            if (vFile == null || !vFile.exists()) {
                context.postToUI("code:deleteResult", mapOf(
                    "id" to id,
                    "accepted" to false,
                    "error" to "File not found"
                ))
                return
            }

            val methodInfo = ReadAction.compute<MethodInfo?, Exception> {
                findMethod(vFile, methodName)
            }

            if (methodInfo == null) {
                // Method not found - treat as already deleted (accepted: true, like VS Code)
                context.postToUI("code:deleteResult", mapOf(
                    "id" to id,
                    "accepted" to true
                ))
                return
            }

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
                        // RiderFunctionWrapper.delete() handles undo-transparent action internally
                        if (methodInfo.element != null) {
                            // Commit any pending document changes before PSI modification
                            val document = FileDocumentManager.getInstance().getDocument(vFile)
                            if (document != null) {
                                PsiDocumentManager.getInstance(context.project).commitDocument(document)
                            }

                            // RiderFunctionWrapper.delete() wraps in runUndoTransparentAction + WriteAction
                            methodInfo.element.delete()

                            // Save the document
                            document?.let {
                                FileDocumentManager.getInstance().saveDocument(it)
                            }
                        }

                        // Send accepted: true for UI to update toggle state
                        context.postToUI("code:deleteResult", mapOf(
                            "id" to id,
                            "accepted" to true
                        ))
                    } catch (e: Exception) {
                        context.postToUI("code:deleteResult", mapOf(
                            "id" to id,
                            "accepted" to false,
                            "error" to e.message
                        ))
                    }
                } else {
                    // User cancelled - send accepted: false
                    context.postToUI("code:deleteResult", mapOf(
                        "id" to id,
                        "accepted" to false
                    ))
                }
            }
        } catch (e: Exception) {
            LOG.error("Error deleting method: $methodName", e)
            context.postToUI("code:deleteResult", mapOf(
                "id" to id,
                "accepted" to false,
                "error" to e.message
            ))
        }
    }

    private suspend fun handleDeleteMethodsSilent(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val conversationId = message.get("conversationId")?.asInt ?: return
        val methodNames = message.get("methodNames")?.asJsonArray?.map { it.asString } ?: return
        val extension = message.get("fileExtension")?.asString ?: fileExtension

        try {
            val filePath = getConversationFilePath(conversationId, extension)
            val vFile = LocalFileSystem.getInstance().findFileByPath(filePath)

            if (vFile == null || !vFile.exists()) {
                context.postResponse(id, "code:deleteMethodsSilentResult", true, mapOf("deletedMethods" to emptyMap<String, String>()))
                return
            }

            // Map of methodName -> deleted code (matching VS Code's format)
            val deletedMethods = mutableMapOf<String, String>()

            // Use WriteAction (not WriteCommandAction) so Rider's undo doesn't conflict with UI's undo
            ApplicationManager.getApplication().invokeAndWait {
                val document = FileDocumentManager.getInstance().getDocument(vFile) ?: return@invokeAndWait

                // Commit any pending document changes and refresh PSI
                PsiDocumentManager.getInstance(context.project).commitDocument(document)

                // Get fresh PSI file INSIDE invokeAndWait after commit
                val psiFile = PsiManager.getInstance(context.project).findFile(vFile) ?: return@invokeAndWait

                // First pass: collect all method ranges and text from the document
                // We use the document text directly since RiderFunctionWrapper works with text ranges
                val methodRanges = mutableListOf<Triple<String, TextRange, String>>() // (name, range, text)

                for (methodName in methodNames) {
                    val element = findMethodElement(psiFile, methodName)
                    if (element != null) {
                        deletedMethods[methodName] = element.text
                        methodRanges.add(Triple(methodName, element.textRange, element.text))
                    } else {
                        deletedMethods[methodName] = ""
                    }
                }

                // Sort by start offset descending so we delete from end to start
                // This prevents earlier deletions from invalidating later offsets
                methodRanges.sortByDescending { it.second.startOffset }

                // Second pass: delete all methods in reverse order with undo suppressed
                withSuppressedUndo(document) {
                    for ((_, range, _) in methodRanges) {
                        // Include leading newline for clean deletion
                        var startOffset = range.startOffset
                        if (startOffset > 0 && document.getText(TextRange(startOffset - 1, startOffset)) == "\n") {
                            startOffset--
                        }
                        if (range.endOffset <= document.textLength) {
                            document.deleteString(startOffset, range.endOffset)
                        }
                    }
                }

                // Commit and save the document after all deletions
                PsiDocumentManager.getInstance(context.project).commitDocument(document)
                FileDocumentManager.getInstance().saveDocument(document)
            }

            context.postResponse(
                id, "code:deleteMethodsSilentResult", true,
                mapOf("deletedMethods" to deletedMethods)
            )
        } catch (e: Exception) {
            LOG.error("Error deleting methods", e)
            context.postResponse(id, "code:deleteMethodsSilentResult", false, error = e.message)
        }
    }

    private suspend fun handleRestoreMethod(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val conversationId = message.get("conversationId")?.asInt ?: return
        val methodName = message.get("methodName")?.asString ?: return
        val code = message.get("code")?.asString
        val extension = message.get("fileExtension")?.asString ?: fileExtension
        val fileContent = message.get("fileContent")?.asString

        // Nothing to restore
        if (code.isNullOrEmpty()) {
            context.postResponse(id, "code:restoreMethodResult", true)
            return
        }

        try {
            val filePath = getConversationFilePath(conversationId, extension)
            val ioFile = File(filePath)
            var vFile = LocalFileSystem.getInstance().findFileByPath(filePath)

            if (vFile != null && vFile.exists()) {
                // File exists - use document buffer as source of truth
                ApplicationManager.getApplication().invokeAndWait {
                    val document = FileDocumentManager.getInstance().getDocument(vFile)
                    if (document == null) {
                        context.postResponse(id, "code:restoreMethodResult", false, error = "Could not get document")
                        return@invokeAndWait
                    }

                    val text = document.text
                    val lastBrace = text.lastIndexOf('}')
                    if (lastBrace == -1) {
                        context.postResponse(id, "code:restoreMethodResult", false, error = "Could not find class closing brace")
                        return@invokeAndWait
                    }

                    // Ensure proper newline separation (matches VSCode behavior)
                    val lineNumber = document.getLineNumber(lastBrace)
                    val lineBeforeBrace = if (lineNumber > 0) {
                        document.getText(TextRange(
                            document.getLineStartOffset(lineNumber - 1),
                            document.getLineEndOffset(lineNumber - 1)
                        ))
                    } else ""
                    val needsLeadingNewline = lineBeforeBrace.trim().isNotEmpty()
                    val codeToInsert = (if (needsLeadingNewline) "\n" else "") + code.trim() + "\n"

                    // Use withSuppressedUndo to make change invisible to Rider's undo stack
                    withSuppressedUndo(document) {
                        document.insertString(lastBrace, codeToInsert)
                    }

                    // Save the document
                    FileDocumentManager.getInstance().saveDocument(document)
                }
            } else if (fileContent != null) {
                // File doesn't exist - create it with the pre-generated content
                ApplicationManager.getApplication().invokeAndWait {
                    CommandProcessor.getInstance().runUndoTransparentAction {
                        WriteAction.run<Exception> {
                            ioFile.parentFile?.mkdirs()
                            ioFile.createNewFile()
                            vFile = LocalFileSystem.getInstance().refreshAndFindFileByPath(filePath)
                            if (vFile != null) {
                                VfsUtil.saveText(vFile!!, fileContent)
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
        val conversationId = message.get("conversationId")?.asInt ?: return
        val methodName = message.get("methodName")?.asString ?: return
        val extension = message.get("fileExtension")?.asString ?: fileExtension

        try {
            val filePath = getConversationFilePath(conversationId, extension)
            val vFile = LocalFileSystem.getInstance().findFileByPath(filePath) ?: return

            ApplicationManager.getApplication().invokeLater {
                val methodInfo = ReadAction.compute<MethodInfo?, Exception> {
                    findMethod(vFile, methodName)
                }

                val line = methodInfo?.lineNumber ?: 0
                val descriptor = OpenFileDescriptor(context.project, vFile, line, 0)
                FileEditorManager.getInstance(context.project).openTextEditor(descriptor, true)
            }
        } catch (e: Exception) {
            LOG.error("Error opening method: $methodName", e)
        }
    }

    private suspend fun handleWatchFolder(message: JsonObject) {
        val folderPath = message.getStringOrNull("folderPath")
        val extension = message.get("fileExtension")?.asString ?: ".cs"

        codeOutputFolder = folderPath
        fileExtension = extension

        if (folderPath == null) {
            codeFileWatcher.clearWatch()
            return
        }

        val absolutePath = "${context.getWorkspacePath()}/$folderPath"

        codeFileWatcher.setWatchPath(absolutePath, extension) { conversationId ->
            context.postToUI("code:fileChanged", mapOf("conversationId" to conversationId))
        }
    }

    private suspend fun handleDeleteFile(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val conversationId = message.get("conversationId")?.asInt ?: return
        val extension = message.get("fileExtension")?.asString ?: fileExtension

        try {
            val filePath = getConversationFilePath(conversationId, extension)
            val vFile = LocalFileSystem.getInstance().findFileByPath(filePath)

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
        val id = message.get("id")?.asString ?: return
        val conversationId = message.get("conversationId")?.asInt ?: return
        val fileContent = message.get("fileContent")?.asString ?: return
        val extension = message.get("fileExtension")?.asString ?: fileExtension

        try {
            val filePath = getConversationFilePath(conversationId, extension)
            val ioFile = File(filePath)

            // Get or create the VirtualFile via VFS
            val vFileRef = AtomicReference<VirtualFile?>()
            ApplicationManager.getApplication().invokeAndWait {
                WriteAction.run<Exception> {
                    if (!ioFile.exists()) {
                        ioFile.parentFile?.mkdirs()
                        ioFile.createNewFile()
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
     */
    private fun getConversationFilePath(conversationId: Int, extension: String): String {
        // Validate conversation ID is positive (security)
        require(conversationId > 0) { "Invalid conversation ID: $conversationId" }

        val folder = codeOutputFolder ?: context.settings.state.codeOutputPath

        // Validate folder path doesn't contain traversal and is relative
        require(!folder.contains("..")) { "Invalid folder path: contains path traversal" }
        require(!java.nio.file.Path.of(folder).isAbsolute) { "Invalid folder path: must be relative" }

        val basePath = context.getWorkspacePath() ?: ""
        return "$basePath/$folder/conv_$conversationId$extension"
    }

    /**
     * Find a method in a file by name using the language-specific helper.
     * The PSI element includes attributes, modifiers, and body.
     */
    private fun findMethod(vFile: VirtualFile, methodName: String): MethodInfo? {
        val psiFile = PsiManager.getInstance(context.project).findFile(vFile) ?: return null
        val helper = getHelperForFile(psiFile)

        val methodElement = helper.findMethodElement(psiFile, methodName) ?: return null

        return MethodInfo(
            name = methodName,
            body = methodElement.text,
            fullText = methodElement.text,
            lineNumber = helper.getMethodLineNumber(methodElement),
            element = methodElement
        )
    }

    /**
     * Find a method element in a PSI file by name.
     */
    private fun findMethodElement(psiFile: PsiFile, methodName: String): PsiElement? {
        val helper = getHelperForFile(psiFile)
        return helper.findMethodElement(psiFile, methodName)
    }

    data class MethodInfo(
        val name: String,
        val body: String,
        val fullText: String,
        val lineNumber: Int,
        val element: PsiElement? = null
    )

    companion object {
        private val LOG = Logger.getInstance(CodeHandlers::class.java)

        /**
         * Execute a document modification with undo completely suppressed.
         * Uses DocumentEx.setInBulkUpdate(true) to make the change invisible to Rider's undo stack.
         * This is necessary because the UI has its own undo system.
         */
        internal inline fun <T> withSuppressedUndo(document: com.intellij.openapi.editor.Document, crossinline action: () -> T): T {
            val documentEx = document as? DocumentEx
            var result: T? = null
            CommandProcessor.getInstance().runUndoTransparentAction {
                result = WriteAction.compute<T, Exception> {
                    try {
                        documentEx?.setInBulkUpdate(true)
                        action()
                    } finally {
                        documentEx?.setInBulkUpdate(false)
                    }
                }
            }
            @Suppress("UNCHECKED_CAST")
            return result as T
        }
    }
}
