package com.shortsleevestudio.gamescript.watchers

import com.google.gson.JsonParser
import com.intellij.openapi.Disposable
import com.intellij.openapi.vfs.AsyncFileListener
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.vfs.newvfs.events.VFileContentChangeEvent
import com.intellij.openapi.vfs.newvfs.events.VFileCreateEvent
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import java.io.File

/**
 * Watches for command.tmp files from game engine plugins.
 * When a command file is detected, parses it and invokes the callback
 * with the navigation target (entity type and ID).
 *
 * Command file format:
 * {
 *   "action": "navigate",
 *   "type": "conversation" | "actor" | "localization" | "locale",
 *   "id": 123
 * }
 */
class SnapshotCommandWatcher(
    parentDisposable: Disposable
) : AsyncFileListener, Disposable {

    @Volatile private var watchPath: String? = null
    @Volatile private var callback: ((String, Int) -> Unit)? = null
    @Volatile private var isDisposed = false

    init {
        VirtualFileManager.getInstance().addAsyncFileListener(this, parentDisposable)
    }

    /**
     * Set the folder path to watch and callback for commands.
     * @param path Absolute path to watch, or null to disable
     * @param onNavigate Callback invoked with (entityType, id) when navigate command received
     */
    fun setWatchPath(path: String?, onNavigate: (entityType: String, id: Int) -> Unit) {
        watchPath = path
        callback = onNavigate
    }

    /**
     * Clear the watch path and callback.
     */
    fun clearWatch() {
        watchPath = null
        callback = null
    }

    override fun prepareChange(events: MutableList<out VFileEvent>): AsyncFileListener.ChangeApplier? {
        if (isDisposed) return null

        val path = watchPath ?: return null
        val cb = callback ?: return null

        // Find command.tmp events (create or change)
        val commandEvents = events.filter { event ->
            val file = event.file ?: return@filter false
            val isRelevant = (event is VFileCreateEvent || event is VFileContentChangeEvent)
            val isInWatchPath = file.path.startsWith(path)
            val isCommandFile = file.name == COMMAND_FILENAME
            isRelevant && isInWatchPath && isCommandFile
        }

        if (commandEvents.isEmpty()) {
            return null
        }

        // Collect file paths to process (VirtualFile references may not be valid after VFS change)
        val filePaths = commandEvents.mapNotNull { it.file?.path }

        return object : AsyncFileListener.ChangeApplier {
            override fun afterVfsChange() {
                if (isDisposed) return

                for (filePath in filePaths) {
                    try {
                        // Read and delete via java.io.File (simpler for external temp files)
                        val ioFile = File(filePath)
                        if (!ioFile.exists()) continue

                        val content = ioFile.readText(Charsets.UTF_8)

                        // Delete the file after reading
                        ioFile.delete()

                        // Parse and validate the command
                        val json = JsonParser.parseString(content).asJsonObject
                        val action = json.get("action")?.asString
                        val type = json.get("type")?.asString
                        val id = json.get("id")?.asInt

                        if (action == "navigate" && type != null && id != null) {
                            if (type in VALID_ENTITY_TYPES) {
                                cb(type, id)
                            }
                        }
                    } catch (_: Exception) {
                        // Ignore malformed command files
                    }
                }
            }
        }
    }

    override fun dispose() {
        isDisposed = true
        watchPath = null
        callback = null
    }

    companion object {
        private const val COMMAND_FILENAME = "command.tmp"
        private val VALID_ENTITY_TYPES = setOf("conversation", "actor", "localization", "locale")
    }
}
