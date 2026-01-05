package com.shortsleevestudio.gamescript.handlers

import com.google.gson.JsonObject
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.vfs.LocalFileSystem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Handlers for editor operations.
 * Implements: editor:openFile, editor:createFile
 */
class EditorHandlers(private val context: HandlerContext) {

    /**
     * Get all handlers as a map.
     */
    fun getHandlers(): Map<String, suspend (JsonObject) -> Unit> = mapOf(
        "editor:openFile" to ::handleOpenFile,
        "editor:createFile" to ::handleCreateFile
    )

    private suspend fun handleOpenFile(message: JsonObject) {
        val filePath = resolvePath(message.get("filePath")?.asString ?: "")
        val line = message.get("line")?.asInt ?: 0
        val column = message.get("column")?.asInt ?: 0

        ApplicationManager.getApplication().invokeLater {
            val vFile = LocalFileSystem.getInstance().findFileByPath(filePath)
            if (vFile != null && vFile.exists()) {
                val descriptor = OpenFileDescriptor(context.project, vFile, line, column)
                FileEditorManager.getInstance(context.project).openTextEditor(descriptor, true)
            } else {
                LOG.warn("File not found: $filePath")
            }
        }
    }

    private suspend fun handleCreateFile(message: JsonObject) {
        val id = message.get("id")?.asString
        val filePath = resolvePath(message.get("filePath")?.asString ?: "")
        val content = message.get("content")?.asString ?: ""
        val overwrite = message.get("overwrite")?.asBoolean ?: false

        try {
            val file = File(filePath)

            if (file.exists() && !overwrite) {
                // File exists and overwrite not requested
                if (id != null) {
                    context.postResponse(
                        id, "editor:createFileResult", false,
                        error = "File already exists"
                    )
                }
                return
            }

            withContext(Dispatchers.IO) {
                file.parentFile?.mkdirs()
                file.writeText(content, Charsets.UTF_8)
            }

            // Refresh VFS and open file
            ApplicationManager.getApplication().invokeLater {
                val vFile = LocalFileSystem.getInstance().refreshAndFindFileByPath(filePath)
                if (vFile != null) {
                    val descriptor = OpenFileDescriptor(context.project, vFile)
                    FileEditorManager.getInstance(context.project).openTextEditor(descriptor, true)
                }
            }

            if (id != null) {
                context.postResponse(id, "editor:createFileResult", true)
            }
        } catch (e: Exception) {
            LOG.error("Error creating file: $filePath", e)
            if (id != null) {
                context.postResponse(id, "editor:createFileResult", false, error = e.message)
            }
        }
    }

    /**
     * Resolve a path, making relative paths absolute using workspace root.
     */
    private fun resolvePath(path: String): String {
        if (path.isEmpty()) return ""

        val file = File(path)
        return if (file.isAbsolute) {
            path
        } else {
            val basePath = context.getWorkspacePath() ?: ""
            "$basePath/$path"
        }
    }

    companion object {
        private val LOG = Logger.getInstance(EditorHandlers::class.java)
    }
}
