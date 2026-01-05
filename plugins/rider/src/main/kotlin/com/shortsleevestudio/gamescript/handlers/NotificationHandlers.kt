package com.shortsleevestudio.gamescript.handlers

import com.google.gson.JsonObject
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.wm.WindowManager
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

private const val DEFAULT_STATUS_TIMEOUT_MS = 3000

/**
 * Handlers for notification operations.
 * Implements: notify, status
 *
 * Uses non-modal balloon notifications (like VSCode's toasts) rather than
 * blocking modal dialogs for better UX consistency.
 */
class NotificationHandlers(private val context: HandlerContext) {

    // Scheduled executor for status bar timeout - avoids blocking pooled threads
    private val scheduler: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()

    /**
     * Get all handlers as a map.
     */
    fun getHandlers(): Map<String, suspend (JsonObject) -> Unit> = mapOf(
        "notify" to ::handleNotify,
        "status" to ::handleStatus
    )

    /**
     * Handle notify message - shows balloon notification.
     * Uses IntelliJ's Notifications API for non-blocking toasts (like VSCode).
     */
    private suspend fun handleNotify(message: JsonObject) {
        val text = message.get("message")?.asString ?: return
        val level = message.get("level")?.asString ?: "info"
        val detail = message.get("detail")?.asString

        val fullMessage = if (detail != null) "$text\n\n$detail" else text

        val notificationType = when (level.lowercase()) {
            "error" -> NotificationType.ERROR
            "warning" -> NotificationType.WARNING
            else -> NotificationType.INFORMATION
        }

        ApplicationManager.getApplication().invokeLater {
            NotificationGroupManager.getInstance()
                .getNotificationGroup("GameScript")
                .createNotification(fullMessage, notificationType)
                .notify(context.project)
        }
    }

    /**
     * Handle status message - shows text in status bar temporarily.
     * Uses timeoutMs parameter name to match shared types.
     */
    private suspend fun handleStatus(message: JsonObject) {
        val text = message.get("message")?.asString ?: return
        // Support both 'timeoutMs' (from shared types) and 'timeout' (legacy)
        val timeout = message.get("timeoutMs")?.asInt
            ?: message.get("timeout")?.asInt
            ?: DEFAULT_STATUS_TIMEOUT_MS

        ApplicationManager.getApplication().invokeLater {
            val statusBar = WindowManager.getInstance().getStatusBar(context.project)
            statusBar?.info = text

            // Clear after timeout using scheduled executor (non-blocking)
            if (timeout > 0) {
                scheduler.schedule({
                    ApplicationManager.getApplication().invokeLater {
                        if (statusBar?.info == text) {
                            statusBar.info = ""
                        }
                    }
                }, timeout.toLong(), TimeUnit.MILLISECONDS)
            }
        }
    }

    /**
     * Cleanup resources when handler is no longer needed.
     */
    fun dispose() {
        scheduler.shutdown()
    }
}
