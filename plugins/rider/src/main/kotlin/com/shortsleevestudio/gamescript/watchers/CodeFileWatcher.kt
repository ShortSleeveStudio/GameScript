package com.shortsleevestudio.gamescript.watchers

import com.intellij.openapi.Disposable
import com.intellij.openapi.vfs.AsyncFileListener
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.vfs.newvfs.events.VFileEvent

/**
 * Watches for changes to conversation code files (conv_*.{extension}).
 * Notifies the UI when code files are modified.
 *
 * Unlike extension-point based listeners, this class is manually registered
 * with the VFS and tied to a parent Disposable for proper lifecycle management.
 */
class CodeFileWatcher(
    parentDisposable: Disposable
) : AsyncFileListener, Disposable {

    @Volatile private var watchPath: String? = null
    @Volatile private var fileExtension: String = ".cs"
    @Volatile private var callback: ((Int) -> Unit)? = null
    @Volatile private var isDisposed = false

    init {
        VirtualFileManager.getInstance().addAsyncFileListener(this, parentDisposable)
    }

    /**
     * Set the folder path to watch and callback for changes.
     * @param path Absolute path to watch, or null to disable
     * @param extension File extension to watch for (e.g., ".cs", ".cpp", ".gd")
     * @param onChanged Callback invoked with conversationId when file changes
     */
    fun setWatchPath(path: String?, extension: String = ".cs", onChanged: (Int) -> Unit) {
        watchPath = path
        fileExtension = extension
        callback = onChanged
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
        val ext = fileExtension

        // Build pattern dynamically based on current extension
        // Escape the extension for regex (e.g., ".cs" -> "\\.cs")
        val escapedExt = Regex.escape(ext)
        val pattern = Regex("conv_(\\d+)$escapedExt$")

        val changedConversations = events
            .filter { it.file?.path?.startsWith(path) == true }
            .mapNotNull { event ->
                val fileName = event.file?.name ?: return@mapNotNull null
                pattern.find(fileName)?.groupValues?.get(1)?.toIntOrNull()
            }
            .distinct()

        if (changedConversations.isEmpty()) {
            return null
        }

        return object : AsyncFileListener.ChangeApplier {
            override fun afterVfsChange() {
                if (!isDisposed) {
                    changedConversations.forEach { conversationId ->
                        cb(conversationId)
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
}
