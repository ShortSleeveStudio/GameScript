package com.shortsleevestudio.gamescript.handlers

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.shortsleevestudio.gamescript.browser.MessageBridge
import com.shortsleevestudio.gamescript.database.DatabaseManager
import com.shortsleevestudio.gamescript.settings.GameScriptSettings

/**
 * Context provided to message handlers.
 * Contains references to all services needed for handling messages.
 */
data class HandlerContext(
    val project: Project,
    val bridge: MessageBridge,
    val databaseManager: DatabaseManager,
    val settings: GameScriptSettings
) {
    /**
     * Get the workspace root folder.
     */
    fun getWorkspaceFolder(): VirtualFile? {
        return project.baseDir
    }

    /**
     * Get the workspace base path as a string.
     */
    fun getWorkspacePath(): String? {
        return project.basePath
    }

    /**
     * Post a message to the UI.
     */
    fun postToUI(message: Any) {
        bridge.postToUI(message)
    }

    /**
     * Post a typed message to the UI.
     */
    fun postToUI(type: String, data: Map<String, Any?>) {
        bridge.postToUI(type, data)
    }

    /**
     * Post a response to a request.
     */
    fun postResponse(
        id: String,
        type: String,
        success: Boolean,
        data: Map<String, Any?>? = null,
        error: String? = null
    ) {
        bridge.postResponse(id, type, success, data, error)
    }
}
