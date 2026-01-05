package com.shortsleevestudio.gamescript.database

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.sql.Connection
import java.sql.DriverManager
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference

/**
 * SQLite database connection using JDBC.
 * Provides query, run, and transaction support.
 */
class SqliteConnection(private val path: String) {

    private var connection: Connection? = null
    private val nextTransactionId = AtomicInteger(1)
    private val activeTransaction = AtomicReference<TransactionInfo?>(null)

    private data class TransactionInfo(
        val id: String,
        val startTime: Long
    )

    /**
     * Connect to the SQLite database.
     */
    suspend fun connect() = withContext(Dispatchers.IO) {
        // Load SQLite JDBC driver
        Class.forName("org.sqlite.JDBC")

        connection = DriverManager.getConnection("jdbc:sqlite:$path")
        connection?.autoCommit = true

        // Enable WAL mode for better concurrency
        exec("PRAGMA journal_mode=WAL")
        // Set busy timeout to 30 seconds
        exec("PRAGMA busy_timeout=30000")
    }

    /**
     * Close the connection.
     */
    fun close() {
        try {
            connection?.close()
            connection = null
        } catch (_: Exception) {
            // Ignore close errors
        }
    }

    /**
     * Execute a SELECT query.
     */
    suspend fun query(sql: String, params: List<Any?>? = null): List<Map<String, Any?>> =
        withContext(Dispatchers.IO) {
            val conn = connection ?: throw IllegalStateException("Not connected")

            conn.prepareStatement(sql).use { stmt ->
                bindParameters(stmt, params)
                stmt.executeQuery().use { rs ->
                    resultSetToList(rs)
                }
            }
        }

    /**
     * Execute an INSERT/UPDATE/DELETE statement.
     */
    suspend fun run(sql: String, params: List<Any?>? = null, returning: Boolean = false): RunResult =
        withContext(Dispatchers.IO) {
            val conn = connection ?: throw IllegalStateException("Not connected")

            if (returning) {
                // For RETURNING clause, use executeQuery
                conn.prepareStatement(sql).use { stmt ->
                    bindParameters(stmt, params)
                    stmt.executeQuery().use { rs ->
                        val rows = resultSetToList(rs)
                        val lastId = rows.firstOrNull()?.get("id") as? Long
                        RunResult(lastId, rows.size.toLong(), rows)
                    }
                }
            } else {
                conn.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS).use { stmt ->
                    bindParameters(stmt, params)
                    val changes = stmt.executeUpdate()

                    val lastId = stmt.generatedKeys.use { keys ->
                        if (keys.next()) keys.getLong(1) else null
                    }

                    RunResult(lastId, changes.toLong(), emptyList())
                }
            }
        }

    /**
     * Execute a DDL statement.
     */
    suspend fun exec(sql: String) = withContext(Dispatchers.IO) {
        val conn = connection ?: throw IllegalStateException("Not connected")
        conn.createStatement().use { stmt ->
            stmt.execute(sql)
        }
    }

    /**
     * Begin a new transaction.
     */
    suspend fun beginTransaction(): String = withContext(Dispatchers.IO) {
        check(activeTransaction.get() == null) {
            "SQLite does not support nested transactions"
        }

        val id = "tx_${nextTransactionId.getAndIncrement()}"
        exec("BEGIN IMMEDIATE")
        activeTransaction.set(TransactionInfo(id, System.currentTimeMillis()))
        id
    }

    /**
     * Commit a transaction.
     */
    suspend fun commitTransaction(connectionId: String) = withContext(Dispatchers.IO) {
        val tx = activeTransaction.get()
        check(tx?.id == connectionId) { "Transaction $connectionId not found" }

        exec("COMMIT")
        activeTransaction.set(null)
    }

    /**
     * Rollback a transaction.
     */
    suspend fun rollbackTransaction(connectionId: String) = withContext(Dispatchers.IO) {
        val tx = activeTransaction.get()
        check(tx?.id == connectionId) { "Transaction $connectionId not found" }

        exec("ROLLBACK")
        activeTransaction.set(null)
    }

    private fun bindParameters(stmt: PreparedStatement, params: List<Any?>?) {
        params?.forEachIndexed { index, value ->
            when (value) {
                null -> stmt.setNull(index + 1, java.sql.Types.NULL)
                is String -> stmt.setString(index + 1, value)
                is Int -> stmt.setInt(index + 1, value)
                is Long -> stmt.setLong(index + 1, value)
                is Double -> stmt.setDouble(index + 1, value)
                is Float -> stmt.setFloat(index + 1, value)
                is Boolean -> stmt.setBoolean(index + 1, value)
                is ByteArray -> stmt.setBytes(index + 1, value)
                else -> stmt.setObject(index + 1, value)
            }
        }
    }

    private fun resultSetToList(rs: ResultSet): List<Map<String, Any?>> {
        val metaData = rs.metaData
        val columnCount = metaData.columnCount
        val columns = (1..columnCount).map { metaData.getColumnLabel(it) }

        val results = mutableListOf<Map<String, Any?>>()
        while (rs.next()) {
            val row = mutableMapOf<String, Any?>()
            columns.forEachIndexed { index, column ->
                row[column] = rs.getObject(index + 1)
            }
            results.add(row)
        }
        return results
    }
}
