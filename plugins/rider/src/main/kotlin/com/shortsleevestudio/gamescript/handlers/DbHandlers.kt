package com.shortsleevestudio.gamescript.handlers

import com.google.gson.JsonObject
import com.intellij.openapi.diagnostic.Logger
import com.shortsleevestudio.gamescript.database.DatabaseConfig
import com.shortsleevestudio.gamescript.database.DatabaseManager
import com.shortsleevestudio.gamescript.database.DatabaseType
import java.util.concurrent.ConcurrentHashMap

private const val MAX_INVALID_ROWS_TO_LOG = 3

/**
 * Handlers for database operations.
 * Implements: db:query, db:run, db:exec, db:batch,
 * db:transaction:begin/commit/rollback, db:connect, db:disconnect
 */
class DbHandlers(
    private val context: HandlerContext,
    private val onConnected: () -> Unit,
    private val onDisconnected: () -> Unit
) {

    private val databaseManager: DatabaseManager
        get() = context.databaseManager

    // Pending notifications for transactions - thread-safe for concurrent coroutine access
    private val pendingTxNotifications = ConcurrentHashMap<String, MutableList<PendingNotification>>()

    data class PendingNotification(
        val table: String,
        val operation: String,
        val rows: List<Map<String, Any?>>
    )

    /**
     * Get all handlers as a map.
     */
    fun getHandlers(): Map<String, suspend (JsonObject) -> Unit> = mapOf(
        "ready" to ::handleReady,
        "db:query" to ::handleQuery,
        "db:run" to ::handleRun,
        "db:exec" to ::handleExec,
        "db:batch" to ::handleBatch,
        "db:transaction:begin" to ::handleTransactionBegin,
        "db:transaction:commit" to ::handleTransactionCommit,
        "db:transaction:rollback" to ::handleTransactionRollback,
        "db:open" to ::handleOpen,
        "db:close" to ::handleClose,
        "db:startNotifications" to ::handleStartNotifications
    )

    private suspend fun handleReady(message: JsonObject) {
        sendConnectionStatus()
    }

    /**
     * Parse a DatabaseConfig from a JSON object.
     */
    private fun parseConfig(configObj: JsonObject): DatabaseConfig {
        val typeStr = configObj.get("type")?.asString ?: "sqlite"
        val type = if (typeStr.lowercase() == "postgres") DatabaseType.POSTGRES else DatabaseType.SQLITE

        return DatabaseConfig(
            type = type,
            filepath = configObj.get("filepath")?.asString,
            host = configObj.get("host")?.asString,
            port = configObj.get("port")?.asInt,
            database = configObj.get("database")?.asString,
            user = configObj.get("user")?.asString,
            password = configObj.get("password")?.asString
        )
    }

    private suspend fun handleQuery(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val sql = message.get("sql")?.asString ?: return
        val params = message.get("params")?.asJsonArray?.toParamList()
        val contextId = message.get("context")?.asJsonObject?.get("id")?.asString

        try {
            val result = databaseManager.query(sql, params, contextId)
            context.postResponse(id, "db:queryResult", true, mapOf("data" to result))
        } catch (e: Exception) {
            LOG.error("Query failed: $sql", e)
            context.postResponse(id, "db:queryResult", false, error = e.message)
        }
    }

    private suspend fun handleRun(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val sql = message.get("sql")?.asString ?: return
        val params = message.get("params")?.asJsonArray?.toParamList()
        val returning = message.get("returning")?.asBoolean ?: false
        val notificationMeta = message.get("notificationMeta")?.asJsonObject
        val contextId = message.get("context")?.asJsonObject?.get("id")?.asString

        try {
            val result = databaseManager.run(sql, params, returning, contextId)

            // Handle notification - send if we have rows OR if it's an alter operation
            if (notificationMeta != null) {
                val table = notificationMeta.get("table")?.asString ?: ""
                val operation = notificationMeta.get("operation")?.asString ?: "update"

                // Send notification if we have rows OR if it's an alter operation (bulk ops don't return rows)
                if (result.rows.isNotEmpty() || operation == "alter") {
                    queueOrSendNotification(table, operation, result.rows, contextId)
                }
            }

            context.postResponse(
                id, "db:runResult", true,
                mapOf(
                    "lastID" to result.lastId,
                    "changes" to result.changes,
                    "rows" to result.rows
                )
            )
        } catch (e: Exception) {
            LOG.error("Run failed: $sql", e)
            context.postResponse(id, "db:runResult", false, error = e.message)
        }
    }

    private suspend fun handleExec(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val sql = message.get("sql")?.asString ?: return
        val notificationMeta = message.get("notificationMeta")?.asJsonObject
        val contextId = message.get("context")?.asJsonObject?.get("id")?.asString

        try {
            databaseManager.exec(sql, contextId)

            // exec() doesn't return rows, so use empty list for notification
            if (notificationMeta != null) {
                val table = notificationMeta.get("table")?.asString ?: ""
                val operation = notificationMeta.get("operation")?.asString ?: "alter"
                queueOrSendNotification(table, operation, emptyList(), contextId)
            }

            context.postResponse(id, "db:execResult", true)
        } catch (e: Exception) {
            LOG.error("Exec failed: $sql", e)
            context.postResponse(id, "db:execResult", false, error = e.message)
        }
    }

    private suspend fun handleBatch(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val statements = message.get("statements")?.asJsonArray ?: return

        try {
            val txId = databaseManager.beginTransaction()
            val results = mutableListOf<Long?>()
            val allNotifications = mutableListOf<PendingNotification>()

            for (element in statements) {
                val stmt = element.asJsonObject
                val sql = stmt.get("sql")?.asString ?: continue
                val params = stmt.get("params")?.asJsonArray?.toParamList()
                val notificationMeta = stmt.get("notificationMeta")?.asJsonObject

                val result = databaseManager.run(sql, params, true, txId)
                results.add(result.lastId)

                if (notificationMeta != null && result.rows.isNotEmpty()) {
                    val table = notificationMeta.get("table")?.asString ?: ""
                    val operation = notificationMeta.get("operation")?.asString ?: "update"
                    allNotifications.add(PendingNotification(table, operation, result.rows))
                }
            }

            databaseManager.commitTransaction(txId)

            // Send consolidated notifications
            val groupedNotifications = allNotifications.groupBy { "${it.table}:${it.operation}" }
            for ((_, notifications) in groupedNotifications) {
                val first = notifications.first()
                val allRows = notifications.flatMap { it.rows }
                handleNotificationMeta(first.table, first.operation, allRows)
            }

            context.postResponse(id, "db:batchResult", true, mapOf("insertIds" to results))
        } catch (e: Exception) {
            LOG.error("Batch failed", e)
            context.postResponse(id, "db:batchResult", false, error = e.message)
        }
    }

    private suspend fun handleTransactionBegin(message: JsonObject) {
        val id = message.get("id")?.asString ?: return

        try {
            val connectionId = databaseManager.beginTransaction()
            context.postResponse(
                id, "db:transactionBeginResult", true,
                mapOf("context" to mapOf("id" to connectionId))
            )
        } catch (e: Exception) {
            LOG.error("Transaction begin failed", e)
            context.postResponse(id, "db:transactionBeginResult", false, error = e.message)
        }
    }

    private suspend fun handleTransactionCommit(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val contextId = message.get("context")?.asJsonObject?.get("id")?.asString ?: return

        try {
            databaseManager.commitTransaction(contextId)

            // Send deferred notifications - consolidate by (table, operation) first
            val pending = pendingTxNotifications.remove(contextId)
            if (pending != null) {
                val consolidated = consolidateNotifications(pending)
                for (notification in consolidated) {
                    handleNotificationMeta(notification.table, notification.operation, notification.rows)
                }
            }

            context.postResponse(id, "db:transactionCommitResult", true)
        } catch (e: Exception) {
            pendingTxNotifications.remove(contextId)
            LOG.error("Transaction commit failed", e)
            context.postResponse(id, "db:transactionCommitResult", false, error = e.message)
        }
    }

    private suspend fun handleTransactionRollback(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val contextId = message.get("context")?.asJsonObject?.get("id")?.asString ?: return

        try {
            databaseManager.rollbackTransaction(contextId)
            pendingTxNotifications.remove(contextId)
            context.postResponse(id, "db:transactionRollbackResult", true)
        } catch (e: Exception) {
            pendingTxNotifications.remove(contextId)
            LOG.error("Transaction rollback failed", e)
            context.postResponse(id, "db:transactionRollbackResult", false, error = e.message)
        }
    }

    /**
     * Handle db:open - Open a raw database connection (no validation).
     */
    private suspend fun handleOpen(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val configObj = message.get("config")?.asJsonObject ?: return

        try {
            val config = parseConfig(configObj)
            databaseManager.open(config)
            context.postResponse(id, "db:openResult", true)
        } catch (e: Exception) {
            LOG.error("db:open failed", e)
            context.postResponse(id, "db:openResult", false, error = e.message ?: e.toString())
        }
    }

    /**
     * Handle db:close - Close the database connection.
     */
    private suspend fun handleClose(message: JsonObject) {
        val id = message.get("id")?.asString ?: return

        try {
            databaseManager.close()
            context.postResponse(id, "db:closeResult", true)
        } catch (e: Exception) {
            LOG.error("Close failed", e)
            context.postResponse(id, "db:closeResult", false, error = e.message)
        }
    }

    /**
     * Handle db:startNotifications - Start listening for database changes.
     * Called by the UI after schema validation/initialization completes.
     */
    private suspend fun handleStartNotifications(message: JsonObject) {
        val id = message.get("id")?.asString ?: return

        try {
            // Set up change notification listener (receives notifications from LISTEN for PostgreSQL,
            // or from local notifyChange calls for SQLite)
            databaseManager.onChangeNotification { notification ->
                // Forward validated notifications directly to UI
                val validatedRows = validateRows(notification.rows)
                context.postToUI("db:changed", mapOf(
                    "table" to notification.table,
                    "operation" to notification.operation,
                    "rows" to validatedRows,
                    "timestamp" to notification.timestamp
                ))
            }

            // Start LISTEN for PostgreSQL
            databaseManager.startChangeNotifications()

            // Notify that we're fully connected
            onConnected()
            context.postResponse(id, "db:startNotificationsResult", true)
        } catch (e: Exception) {
            LOG.error("Failed to start change notifications", e)
            context.postResponse(id, "db:startNotificationsResult", false, error = e.message)
        }
    }

    private fun sendConnectionStatus() {
        if (databaseManager.isConnected) {
            context.postToUI(
                "connected",
                mapOf("dbType" to (databaseManager.databaseType?.name?.lowercase() ?: "unknown"))
            )
        } else {
            context.postToUI("disconnected", emptyMap())
        }
    }

    // ==========================================================================
    // Notification Helpers
    // ==========================================================================

    /**
     * Queue or send a notification based on transaction state.
     * Defers notifications during transactions until commit.
     */
    private suspend fun queueOrSendNotification(
        table: String,
        operation: String,
        rows: List<Map<String, Any?>>,
        txId: String?
    ) {
        if (txId != null) {
            // Defer notification until transaction commits
            // Use computeIfAbsent for thread-safe initialization, synchronized add
            val pending = pendingTxNotifications.computeIfAbsent(txId) {
                java.util.Collections.synchronizedList(mutableListOf())
            }
            pending.add(PendingNotification(table, operation, rows))
        } else {
            // No transaction - send immediately
            handleNotificationMeta(table, operation, rows)
        }
    }

    /**
     * Consolidate notifications by (table, operation), merging rows.
     * Matches VSCode's combineAndBroadcastNotifications pattern.
     */
    private fun consolidateNotifications(
        pending: List<PendingNotification>
    ): List<PendingNotification> {
        val grouped = mutableMapOf<String, PendingNotification>()

        for (notification in pending) {
            val key = "${notification.table}:${notification.operation}"
            val existing = grouped[key]
            if (existing != null) {
                grouped[key] = existing.copy(rows = existing.rows + notification.rows)
            } else {
                grouped[key] = notification.copy(rows = notification.rows.toList())
            }
        }

        return grouped.values.toList()
    }

    /**
     * Handle notification metadata from frontend operations.
     * Rows are now provided from RETURNING clause results.
     *
     * SQLite mode: Sends rows directly to local webview
     * PostgreSQL mode: Sends NOTIFY to propagate to all clients (including self via LISTEN)
     */
    private suspend fun handleNotificationMeta(table: String, operation: String, rows: List<Map<String, Any?>>) {
        val isPostgres = databaseManager.databaseType == DatabaseType.POSTGRES

        // For ALTER operations
        if (operation == "alter") {
            // Always notify local webview for ALTER (both SQLite and PostgreSQL)
            sendChangeNotificationToUI(table, "alter", emptyList())

            // PostgreSQL: Also send NOTIFY to propagate to other clients
            if (isPostgres) {
                databaseManager.sendPostgresNotify(table, "alter")
            }
            return
        }

        // For INSERT/UPDATE/DELETE
        if (rows.isEmpty()) {
            // No row data provided - trigger notification without rows
            if (!isPostgres) {
                sendChangeNotificationToUI(table, operation, emptyList())
            } else {
                databaseManager.sendPostgresNotify(table, operation)
            }
            return
        }

        // Validate rows before using them
        val validatedRows = validateRows(rows)

        if (isPostgres) {
            // PostgreSQL: Extract IDs from validated rows and send NOTIFY with batched IDs
            // The LISTEN handler will receive this and fetch fresh data, then notify UI
            val affectedIds = validatedRows.mapNotNull { (it["id"] as? Number)?.toLong() }
            databaseManager.sendPostgresNotify(table, operation, affectedIds)
        } else {
            // SQLite: Send validated rows directly to local webview
            sendChangeNotificationToUI(table, operation, validatedRows)
        }
    }

    /**
     * Send a change notification directly to the UI with timestamp.
     * Used for SQLite (direct notification) and PostgreSQL ALTER operations.
     */
    private fun sendChangeNotificationToUI(table: String, operation: String, rows: List<Map<String, Any?>>) {
        context.postToUI("db:changed", mapOf(
            "table" to table,
            "operation" to operation,
            "rows" to rows,
            "timestamp" to System.currentTimeMillis()
        ))
    }

    /**
     * Type guard to validate that a row has a numeric id field.
     */
    private fun isValidRow(row: Map<String, Any?>): Boolean {
        val id = row["id"]
        return id != null && (id is Number)
    }

    /**
     * Validate and filter rows to ensure they have valid id fields.
     * Logs warnings for invalid rows.
     */
    private fun validateRows(rows: List<Map<String, Any?>>): List<Map<String, Any?>> {
        val validRows = mutableListOf<Map<String, Any?>>()
        var invalidCount = 0

        for ((index, row) in rows.withIndex()) {
            if (isValidRow(row)) {
                validRows.add(row)
            } else {
                invalidCount++
                if (invalidCount <= MAX_INVALID_ROWS_TO_LOG) {
                    LOG.warn("Invalid row at index $index, skipping: $row")
                }
            }
        }

        if (invalidCount > MAX_INVALID_ROWS_TO_LOG) {
            LOG.warn("Skipped ${invalidCount - MAX_INVALID_ROWS_TO_LOG} additional invalid rows")
        }

        if (invalidCount > 0 && validRows.isEmpty()) {
            LOG.warn("Database operation returned $invalidCount invalid row(s). Data may not be displayed correctly.")
        }

        return validRows
    }

    companion object {
        private val LOG = Logger.getInstance(DbHandlers::class.java)
    }
}
