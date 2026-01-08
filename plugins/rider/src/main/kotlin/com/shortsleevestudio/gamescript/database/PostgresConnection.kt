package com.shortsleevestudio.gamescript.database

import com.github.jasync.sql.db.Connection
import com.github.jasync.sql.db.QueryResult
import com.github.jasync.sql.db.pool.ConnectionPool
import com.github.jasync.sql.db.postgresql.PostgreSQLConnection
import com.github.jasync.sql.db.postgresql.PostgreSQLConnectionBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.future.await
import kotlinx.coroutines.withContext
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/**
 * PostgreSQL database connection using jasync-sql.
 * Provides async queries, transactions, and LISTEN/NOTIFY support.
 */
class PostgresConnection(
    private val host: String,
    private val port: Int,
    private val database: String,
    private val user: String,
    private val password: String?
) {

    private var pool: ConnectionPool<PostgreSQLConnection>? = null
    private var listenPool: ConnectionPool<PostgreSQLConnection>? = null
    private var listenConnection: PostgreSQLConnection? = null

    private val nextTransactionId = AtomicInteger(1)
    private val activeTransactions = ConcurrentHashMap<String, PostgreSQLConnection>()

    /**
     * Connect to the PostgreSQL database.
     */
    @Suppress("UNCHECKED_CAST")
    suspend fun connect() = withContext(Dispatchers.IO) {
        pool = PostgreSQLConnectionBuilder.createConnectionPool {
            this.host = this@PostgresConnection.host
            this.port = this@PostgresConnection.port
            this.database = this@PostgresConnection.database
            this.username = this@PostgresConnection.user
            this.password = this@PostgresConnection.password
            this.maxActiveConnections = 10
            this.maxIdleTime = 60_000
            this.maxPendingQueries = 100
        } as ConnectionPool<PostgreSQLConnection>

        // Test connection
        pool!!.connect().await()
    }

    /**
     * Close all connections.
     */
    fun close() {
        try {
            // Return listen connection to its pool before disconnecting
            listenConnection?.let { conn ->
                listenPool?.giveBack(conn)
            }
            listenConnection = null
            // Disconnect the listen pool (this properly releases server resources)
            listenPool?.disconnect()
            listenPool = null
            // Disconnect main pool
            pool?.disconnect()
            pool = null
            activeTransactions.clear()
        } catch (_: Exception) {
            // Ignore close errors
        }
    }

    /**
     * Execute a SELECT query.
     * @param connectionId Optional transaction connection ID. If provided, uses that connection.
     */
    suspend fun query(sql: String, params: List<Any?>? = null, connectionId: String? = null): List<Map<String, Any?>> =
        withContext(Dispatchers.IO) {
            val conn = getConnection(connectionId)

            val result = if (params.isNullOrEmpty()) {
                conn.sendQuery(sql).await()
            } else {
                conn.sendPreparedStatement(sql, params).await()
            }

            queryResultToList(result)
        }

    /**
     * Execute an INSERT/UPDATE/DELETE statement.
     * @param connectionId Optional transaction connection ID. If provided, uses that connection.
     */
    suspend fun run(sql: String, params: List<Any?>? = null, returning: Boolean = false, connectionId: String? = null): RunResult =
        withContext(Dispatchers.IO) {
            val conn = getConnection(connectionId)

            val result = if (params.isNullOrEmpty()) {
                conn.sendQuery(sql).await()
            } else {
                conn.sendPreparedStatement(sql, params).await()
            }

            val rows = if (returning) {
                queryResultToList(result)
            } else {
                emptyList()
            }

            val lastId = rows.firstOrNull()?.get("id") as? Long
            RunResult(lastId, result.rowsAffected, rows)
        }

    /**
     * Execute a DDL statement.
     * @param connectionId Optional transaction connection ID. If provided, uses that connection.
     */
    suspend fun exec(sql: String, connectionId: String? = null) = withContext(Dispatchers.IO) {
        val conn = getConnection(connectionId)
        conn.sendQuery(sql).await()
    }

    /**
     * Get a connection - either from a transaction or from the pool.
     * Returns the common Connection interface which both PostgreSQLConnection
     * and ConnectionPool implement, allowing the pool to handle connection
     * borrowing/returning automatically for non-transactional queries.
     */
    private fun getConnection(connectionId: String?): Connection {
        if (connectionId != null) {
            return activeTransactions[connectionId]
                ?: throw IllegalStateException("Transaction $connectionId not found")
        }
        return pool ?: throw IllegalStateException("Not connected")
    }

    /**
     * Begin a new transaction.
     * Gets a dedicated connection from the pool for this transaction.
     */
    suspend fun beginTransaction(): String = withContext(Dispatchers.IO) {
        val connectionPool = pool ?: throw IllegalStateException("Not connected")
        val id = "tx_${nextTransactionId.getAndIncrement()}"

        // Get a dedicated connection from the pool for this transaction
        val dedicatedConn = connectionPool.take().await()
        dedicatedConn.sendQuery("BEGIN").await()
        activeTransactions[id] = dedicatedConn
        id
    }

    /**
     * Commit a transaction.
     * Returns the dedicated connection back to the pool.
     */
    suspend fun commitTransaction(connectionId: String) = withContext(Dispatchers.IO) {
        val conn = activeTransactions.remove(connectionId)
            ?: throw IllegalStateException("Transaction $connectionId not found")

        try {
            conn.sendQuery("COMMIT").await()
        } finally {
            // Return connection to pool
            pool?.giveBack(conn)
        }
    }

    /**
     * Rollback a transaction.
     * Returns the dedicated connection back to the pool.
     */
    suspend fun rollbackTransaction(connectionId: String) = withContext(Dispatchers.IO) {
        val conn = activeTransactions.remove(connectionId)
            ?: throw IllegalStateException("Transaction $connectionId not found")

        try {
            conn.sendQuery("ROLLBACK").await()
        } finally {
            // Return connection to pool
            pool?.giveBack(conn)
        }
    }

    /**
     * Start listening for notifications on a channel.
     * Uses a dedicated connection for LISTEN/NOTIFY.
     */
    @Suppress("UNCHECKED_CAST")
    suspend fun startListening(channel: String, onNotification: (String) -> Unit) =
        withContext(Dispatchers.IO) {
            // Create dedicated pool for listening (must store pool reference for proper cleanup)
            listenPool = PostgreSQLConnectionBuilder.createConnectionPool {
                this.host = this@PostgresConnection.host
                this.port = this@PostgresConnection.port
                this.database = this@PostgresConnection.database
                this.username = this@PostgresConnection.user
                this.password = this@PostgresConnection.password
                this.maxActiveConnections = 1
            } as ConnectionPool<PostgreSQLConnection>

            // Get a dedicated connection from the pool
            listenConnection = listenPool!!.take().await()

            // Register notification listener
            listenConnection!!.registerNotifyListener { notification ->
                if (notification.channel == channel) {
                    onNotification(notification.payload)
                }
            }

            // Start listening
            listenConnection!!.sendQuery("LISTEN $channel").await()
        }

    /**
     * Stop listening for notifications.
     */
    suspend fun stopListening(channel: String) = withContext(Dispatchers.IO) {
        listenConnection?.sendQuery("UNLISTEN $channel")?.await()
        // Return connection to pool before disconnecting the pool
        listenConnection?.let { conn ->
            listenPool?.giveBack(conn)
        }
        listenConnection = null
        // Disconnect the pool to release server resources
        listenPool?.disconnect()
        listenPool = null
    }

    private fun queryResultToList(result: QueryResult): List<Map<String, Any?>> {
        val rows = result.rows
        if (rows.isEmpty()) return emptyList()

        val columns = rows.columnNames()
        return rows.map { row ->
            columns.mapIndexed { index, column ->
                column to row[index]
            }.toMap()
        }
    }
}
