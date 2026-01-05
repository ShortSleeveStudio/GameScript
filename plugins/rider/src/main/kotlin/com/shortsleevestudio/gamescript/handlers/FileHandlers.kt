package com.shortsleevestudio.gamescript.handlers

import com.google.gson.JsonObject
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.vfs.LocalFileSystem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.util.Base64

/**
 * Handlers for file operations.
 * Implements: file:read, file:write, file:create, file:append, file:mkdir,
 * file:writeBinary, file:rename, file:exists
 */
class FileHandlers(private val context: HandlerContext) {

    /**
     * Get all handlers as a map.
     */
    fun getHandlers(): Map<String, suspend (JsonObject) -> Unit> = mapOf(
        "file:read" to ::handleRead,
        "file:write" to ::handleWrite,
        "file:create" to ::handleCreate,
        "file:append" to ::handleAppend,
        "file:mkdir" to ::handleMkdir,
        "file:writeBinary" to ::handleWriteBinary,
        "file:rename" to ::handleRename,
        "file:exists" to ::handleExists
    )

    private suspend fun handleRead(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val filePath = resolvePath(message.get("filePath")?.asString ?: "")

        try {
            val content = withContext(Dispatchers.IO) {
                File(filePath).readText(Charsets.UTF_8)
            }
            context.postResponse(id, "file:readResult", true, mapOf("content" to content))
        } catch (e: Exception) {
            LOG.error("Error reading file: $filePath", e)
            context.postResponse(id, "file:readResult", false, error = e.message)
        }
    }

    private suspend fun handleWrite(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val filePath = resolvePath(message.get("filePath")?.asString ?: "")
        val content = message.get("content")?.asString ?: ""

        try {
            withContext(Dispatchers.IO) {
                val file = File(filePath)
                file.parentFile?.mkdirs()
                file.writeText(content, Charsets.UTF_8)
            }
            refreshVfs(filePath)
            context.postResponse(id, "file:writeResult", true)
        } catch (e: Exception) {
            LOG.error("Error writing file: $filePath", e)
            context.postResponse(id, "file:writeResult", false, error = e.message)
        }
    }

    /**
     * Create an empty file (matches VSCode behavior).
     * Uses writeFile with empty content to create/truncate file.
     */
    private suspend fun handleCreate(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val filePath = resolvePath(message.get("filePath")?.asString ?: "")

        try {
            withContext(Dispatchers.IO) {
                val file = File(filePath)
                file.parentFile?.mkdirs()
                // Always create empty file (matches VSCode's file:create behavior)
                file.writeText("", Charsets.UTF_8)
            }
            refreshVfs(filePath)
            context.postResponse(id, "file:createResult", true)
        } catch (e: Exception) {
            LOG.error("Error creating file: $filePath", e)
            context.postResponse(id, "file:createResult", false, error = e.message)
        }
    }

    private suspend fun handleAppend(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val filePath = resolvePath(message.get("filePath")?.asString ?: "")
        val content = message.get("content")?.asString ?: ""

        try {
            withContext(Dispatchers.IO) {
                val file = File(filePath)
                file.parentFile?.mkdirs()
                file.appendText(content, Charsets.UTF_8)
            }
            refreshVfs(filePath)
            context.postResponse(id, "file:appendResult", true)
        } catch (e: Exception) {
            LOG.error("Error appending to file: $filePath", e)
            context.postResponse(id, "file:appendResult", false, error = e.message)
        }
    }

    private suspend fun handleMkdir(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val dirPath = resolvePath(message.get("dirPath")?.asString ?: "")

        try {
            withContext(Dispatchers.IO) {
                File(dirPath).mkdirs()
            }
            refreshVfs(dirPath)
            context.postResponse(id, "file:mkdirResult", true)
        } catch (e: Exception) {
            LOG.error("Error creating directory: $dirPath", e)
            context.postResponse(id, "file:mkdirResult", false, error = e.message)
        }
    }

    private suspend fun handleWriteBinary(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val filePath = resolvePath(message.get("filePath")?.asString ?: "")
        val contentBase64 = message.get("contentBase64")?.asString ?: ""

        try {
            withContext(Dispatchers.IO) {
                val bytes = Base64.getDecoder().decode(contentBase64)
                val file = File(filePath)
                file.parentFile?.mkdirs()
                file.writeBytes(bytes)
            }
            refreshVfs(filePath)
            context.postResponse(id, "file:writeBinaryResult", true)
        } catch (e: Exception) {
            LOG.error("Error writing binary file: $filePath", e)
            context.postResponse(id, "file:writeBinaryResult", false, error = e.message)
        }
    }

    private suspend fun handleRename(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val oldPath = resolvePath(message.get("oldPath")?.asString ?: "")
        val newPath = resolvePath(message.get("newPath")?.asString ?: "")

        try {
            withContext(Dispatchers.IO) {
                val oldFile = File(oldPath)
                val newFile = File(newPath)
                newFile.parentFile?.mkdirs()
                val success = oldFile.renameTo(newFile)
                if (!success) {
                    throw java.io.IOException("Failed to rename file: $oldPath -> $newPath")
                }
            }
            refreshVfs(oldPath)
            refreshVfs(newPath)
            context.postResponse(id, "file:renameResult", true)
        } catch (e: Exception) {
            LOG.error("Error renaming file: $oldPath -> $newPath", e)
            context.postResponse(id, "file:renameResult", false, error = e.message)
        }
    }

    private suspend fun handleExists(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val filePath = resolvePath(message.get("filePath")?.asString ?: "")

        try {
            val exists = withContext(Dispatchers.IO) {
                File(filePath).exists()
            }
            context.postResponse(id, "file:existsResult", true, mapOf("exists" to exists))
        } catch (e: Exception) {
            LOG.error("Error checking file existence: $filePath", e)
            context.postResponse(id, "file:existsResult", false, error = e.message)
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

    /**
     * Refresh the VFS to pick up file changes.
     */
    private fun refreshVfs(path: String) {
        LocalFileSystem.getInstance().refreshAndFindFileByPath(path)
    }

    companion object {
        private val LOG = Logger.getInstance(FileHandlers::class.java)
    }
}
