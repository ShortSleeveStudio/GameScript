package com.shortsleevestudio.gamescript.database

import com.intellij.openapi.Disposable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Database type enum.
 */
enum class DatabaseType {
    SQLITE,
    POSTGRES
}

/**
 * Database configuration.
 */
data class DatabaseConfig(
    val type: DatabaseType,
    val filepath: String? = null,
    val host: String? = null,
    val port: Int? = null,
    val database: String? = null,
    val user: String? = null,
    val password: String? = null
)

/**
 * Result from a run (INSERT/UPDATE/DELETE) operation.
 */
data class RunResult(
    val lastId: Long?,
    val changes: Long,
    val rows: List<Map<String, Any?>>
)

/**
 * Change notification data.
 */
data class ChangeNotification(
    val table: String,
    val operation: String,
    val rows: List<Map<String, Any?>>,
    val timestamp: Long
)

/**
 * Manages database connections for SQLite and PostgreSQL.
 * Provides a unified interface for queries, transactions, and change notifications.
 *
 * Full implementation in Phase 4.
 */
class DatabaseManager(
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
) : Disposable {

    private var sqliteConnection: SqliteConnection? = null
    private var postgresConnection: PostgresConnection? = null
    private var dbType: DatabaseType? = null
    private var _connected = false

    private val changeListeners = mutableSetOf<(ChangeNotification) -> Unit>()
    private val errorListeners = mutableSetOf<(String) -> Unit>()

    val isConnected: Boolean
        get() = _connected

    val databaseType: DatabaseType?
        get() = dbType

    /**
     * Open a raw database connection (no validation or schema initialization).
     * Schema validation and initialization is handled by the UI layer.
     */
    suspend fun open(config: DatabaseConfig) {
        close()

        when (config.type) {
            DatabaseType.SQLITE -> {
                val filepath = requireNotNull(config.filepath) { "SQLite filepath is required" }
                val conn = SqliteConnection(filepath)
                conn.connect()
                sqliteConnection = conn
                dbType = DatabaseType.SQLITE
            }
            DatabaseType.POSTGRES -> {
                val host = requireNotNull(config.host) { "PostgreSQL host is required" }
                val database = requireNotNull(config.database) { "PostgreSQL database is required" }
                val user = requireNotNull(config.user) { "PostgreSQL user is required" }
                val conn = PostgresConnection(
                    host = host,
                    port = config.port ?: 5432,
                    database = database,
                    user = user,
                    password = config.password
                )
                conn.connect()
                postgresConnection = conn
                dbType = DatabaseType.POSTGRES
            }
        }

        _connected = true
    }

    /**
     * Close the database connection.
     */
    fun close() {
        sqliteConnection?.close()
        sqliteConnection = null
        postgresConnection?.close()
        postgresConnection = null
        dbType = null
        _connected = false
    }

    /**
     * Execute a SELECT query.
     */
    suspend fun query(sql: String, params: List<Any?>? = null, connectionId: String? = null): List<Map<String, Any?>> {
        check(_connected) { "Database not connected" }

        return when (dbType) {
            DatabaseType.SQLITE -> sqliteConnection!!.query(sql, params)
            DatabaseType.POSTGRES -> postgresConnection!!.query(sql, params, connectionId)
            else -> throw IllegalStateException("No database connection")
        }
    }

    /**
     * Execute an INSERT/UPDATE/DELETE statement.
     */
    suspend fun run(
        sql: String,
        params: List<Any?>? = null,
        returning: Boolean = false,
        connectionId: String? = null
    ): RunResult {
        check(_connected) { "Database not connected" }

        return when (dbType) {
            DatabaseType.SQLITE -> sqliteConnection!!.run(sql, params, returning)
            DatabaseType.POSTGRES -> postgresConnection!!.run(sql, params, returning, connectionId)
            else -> throw IllegalStateException("No database connection")
        }
    }

    /**
     * Execute a DDL statement (CREATE, ALTER, DROP).
     */
    suspend fun exec(sql: String, connectionId: String? = null) {
        check(_connected) { "Database not connected" }

        when (dbType) {
            DatabaseType.SQLITE -> sqliteConnection!!.exec(sql)
            DatabaseType.POSTGRES -> postgresConnection!!.exec(sql, connectionId)
            else -> throw IllegalStateException("No database connection")
        }
    }

    /**
     * Begin a new transaction.
     */
    suspend fun beginTransaction(): String {
        check(_connected) { "Database not connected" }

        return when (dbType) {
            DatabaseType.SQLITE -> sqliteConnection!!.beginTransaction()
            DatabaseType.POSTGRES -> postgresConnection!!.beginTransaction()
            else -> throw IllegalStateException("No database connection")
        }
    }

    /**
     * Commit a transaction.
     */
    suspend fun commitTransaction(connectionId: String) {
        check(_connected) { "Database not connected" }

        when (dbType) {
            DatabaseType.SQLITE -> sqliteConnection!!.commitTransaction(connectionId)
            DatabaseType.POSTGRES -> postgresConnection!!.commitTransaction(connectionId)
            else -> throw IllegalStateException("No database connection")
        }
    }

    /**
     * Rollback a transaction.
     */
    suspend fun rollbackTransaction(connectionId: String) {
        check(_connected) { "Database not connected" }

        when (dbType) {
            DatabaseType.SQLITE -> sqliteConnection!!.rollbackTransaction(connectionId)
            DatabaseType.POSTGRES -> postgresConnection!!.rollbackTransaction(connectionId)
            else -> throw IllegalStateException("No database connection")
        }
    }

    /**
     * Subscribe to change notifications.
     */
    fun onChangeNotification(listener: (ChangeNotification) -> Unit): () -> Unit {
        changeListeners.add(listener)
        return { changeListeners.remove(listener) }
    }

    /**
     * Notify listeners of a change (for SQLite local notifications).
     */
    fun notifyChange(table: String, operation: String, rows: List<Map<String, Any?>>) {
        val notification = ChangeNotification(table, operation, rows, System.currentTimeMillis())
        changeListeners.forEach { it(notification) }
    }

    /**
     * Subscribe to error notifications.
     */
    fun onError(listener: (String) -> Unit): () -> Unit {
        errorListeners.add(listener)
        return { errorListeners.remove(listener) }
    }

    /**
     * Start listening for database changes.
     * For PostgreSQL: Uses LISTEN/NOTIFY
     * For SQLite: Uses manual notifyChange() calls after CRUD operations
     */
    suspend fun startChangeNotifications() {
        if (dbType == DatabaseType.POSTGRES && postgresConnection != null) {
            postgresConnection!!.startListening(POSTGRES_CHANNEL) { payload ->
                handlePostgresNotification(payload)
            }
        }
        // SQLite: No automatic notifications - uses notifyChange() after CRUD operations
    }

    /**
     * Stop listening for database changes.
     */
    suspend fun stopChangeNotifications() {
        if (dbType == DatabaseType.POSTGRES && postgresConnection != null) {
            postgresConnection!!.stopListening(POSTGRES_CHANNEL)
        }
    }

    /**
     * Handle a PostgreSQL notification payload.
     * Fetches full row data for affected IDs (eventually consistent).
     */
    private fun handlePostgresNotification(payload: String) {
        try {
            val json = com.google.gson.JsonParser.parseString(payload).asJsonObject
            val table = json.get("table")?.asString ?: return
            val operation = json.get("operation")?.asString ?: return
            val ids = json.get("ids")?.asJsonArray?.mapNotNull { it.asLong } ?: emptyList()

            // For delete operations or empty IDs, notify without rows
            if (operation == "delete" || ids.isEmpty()) {
                notifyChange(table, operation, emptyList())
                return
            }

            // Fetch full row data for affected IDs (eventually consistent)
            // Launch in our scope to avoid blocking the notification thread
            scope.launch {
                try {
                    val placeholders = ids.mapIndexed { i, _ -> "\$${i + 1}" }.joinToString(", ")
                    val rows = query("SELECT * FROM \"$table\" WHERE id IN ($placeholders)", ids)
                    notifyChange(table, operation, rows)
                } catch (e: Exception) {
                    // Notifications are eventually consistent - failures are expected
                    notifyChange(table, operation, emptyList())
                }
            }
        } catch (e: Exception) {
            // Ignore malformed payloads
        }
    }

    /**
     * Send a PostgreSQL NOTIFY message for a database change.
     * This is used by the metadata-based notification system to propagate changes
     * from one client to other connected clients.
     *
     * @param table Table name
     * @param operation Operation type
     * @param ids Array of affected row IDs (for INSERT/UPDATE/DELETE)
     */
    suspend fun sendPostgresNotify(table: String, operation: String, ids: List<Long> = emptyList()) {
        if (dbType != DatabaseType.POSTGRES || postgresConnection == null) {
            return // Only for PostgreSQL
        }

        try {
            val notification = com.google.gson.JsonObject().apply {
                addProperty("table", table)
                addProperty("operation", operation)
                add("ids", com.google.gson.JsonArray().apply {
                    ids.forEach { add(it) }
                })
            }

            // Use parameterized query to prevent SQL injection
            postgresConnection!!.query(
                "SELECT pg_notify(\$1, \$2)",
                listOf(POSTGRES_CHANNEL, notification.toString())
            )
        } catch (e: Exception) {
            // Best-effort notification
        }
    }

    override fun dispose() {
        kotlinx.coroutines.runBlocking {
            stopChangeNotifications()
        }
        close()
        scope.cancel()
    }

    companion object {
        private const val POSTGRES_CHANNEL = "gamescript_changes"
    }
}
