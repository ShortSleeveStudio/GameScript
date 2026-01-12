using Microsoft.Data.Sqlite;

namespace GameScript.VisualStudio;

/// <summary>
/// SQLite database connection using Microsoft.Data.Sqlite.
/// Provides query, run, and transaction support with WAL mode.
/// </summary>
public sealed class SqliteConnection : IDisposable
{
    private readonly string _path;
    private Microsoft.Data.Sqlite.SqliteConnection? _connection;
    private int _nextTransactionId = 1;
    private TransactionInfo? _activeTransaction;
    private readonly object _transactionLock = new();

    private sealed class TransactionInfo
    {
        public required string Id { get; init; }
        public required SqliteTransaction Transaction { get; init; }
    }

    public SqliteConnection(string path)
    {
        _path = path;
    }

    /// <summary>
    /// Connect to the SQLite database.
    /// </summary>
    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        string connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _path,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Shared
        }.ToString();

        _connection = new Microsoft.Data.Sqlite.SqliteConnection(connectionString);
        await _connection.OpenAsync(cancellationToken);

        // Enable WAL mode for better concurrency
        await ExecAsync("PRAGMA journal_mode=WAL", cancellationToken);
        // Set busy timeout to 30 seconds
        await ExecAsync("PRAGMA busy_timeout=30000", cancellationToken);
    }

    /// <summary>
    /// Close the connection.
    /// </summary>
    public async Task CloseAsync()
    {
        if (_connection != null)
        {
            await _connection.CloseAsync();
            await _connection.DisposeAsync();
            _connection = null;
        }
    }

    /// <summary>
    /// Execute a SELECT query.
    /// </summary>
    public async Task<List<Dictionary<string, object?>>> QueryAsync(
        string sql,
        List<object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        EnsureConnected();

        await using SqliteCommand cmd = _connection!.CreateCommand();
        cmd.CommandText = sql;
        BindParameters(cmd, parameters);

        await using SqliteDataReader reader = await cmd.ExecuteReaderAsync(cancellationToken);
        return await ReaderToListAsync(reader, cancellationToken);
    }

    /// <summary>
    /// Execute an INSERT/UPDATE/DELETE statement.
    /// </summary>
    public async Task<RunResult> RunAsync(
        string sql,
        List<object?>? parameters = null,
        bool returning = false,
        CancellationToken cancellationToken = default)
    {
        EnsureConnected();

        await using SqliteCommand cmd = _connection!.CreateCommand();
        cmd.CommandText = sql;
        BindParameters(cmd, parameters);

        if (returning)
        {
            // For RETURNING clause, use ExecuteReader
            await using SqliteDataReader reader = await cmd.ExecuteReaderAsync(cancellationToken);
            List<Dictionary<string, object?>> rows = await ReaderToListAsync(reader, cancellationToken);
            Dictionary<string, object?>? firstRow = rows.FirstOrDefault();
            long? lastId = firstRow?.TryGetValue("id", out object? idValue) == true ? Convert.ToInt64(idValue) : null;
            return new RunResult
            {
                LastId = lastId,
                Changes = rows.Count,
                Rows = rows
            };
        }
        else
        {
            int changes = await cmd.ExecuteNonQueryAsync(cancellationToken);

            // Get last insert rowid
            await using SqliteCommand lastIdCmd = _connection.CreateCommand();
            lastIdCmd.CommandText = "SELECT last_insert_rowid()";
            object? lastIdResult = await lastIdCmd.ExecuteScalarAsync(cancellationToken);

            return new RunResult
            {
                LastId = lastIdResult != null && lastIdResult != DBNull.Value ? Convert.ToInt64(lastIdResult) : null,
                Changes = changes,
                Rows = new List<Dictionary<string, object?>>()
            };
        }
    }

    /// <summary>
    /// Execute a DDL statement.
    /// </summary>
    public async Task ExecAsync(string sql, CancellationToken cancellationToken = default)
    {
        EnsureConnected();

        await using SqliteCommand cmd = _connection!.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// Begin a new transaction.
    /// </summary>
    public Task<string> BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        EnsureConnected();

        lock (_transactionLock)
        {
            if (_activeTransaction != null)
            {
                throw new InvalidOperationException("SQLite does not support nested transactions");
            }

            string id = $"tx_{Interlocked.Increment(ref _nextTransactionId)}";

            // BeginTransaction with deferred=false acquires an immediate write lock
            SqliteTransaction transaction = _connection!.BeginTransaction(deferred: false);

            _activeTransaction = new TransactionInfo { Id = id, Transaction = transaction };

            return Task.FromResult(id);
        }
    }

    /// <summary>
    /// Commit a transaction.
    /// </summary>
    public async Task CommitTransactionAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        TransactionInfo? tx;
        lock (_transactionLock)
        {
            tx = _activeTransaction;
            if (tx?.Id != connectionId)
            {
                throw new InvalidOperationException($"Transaction {connectionId} not found");
            }
        }

        await tx.Transaction.CommitAsync(cancellationToken);

        lock (_transactionLock)
        {
            _activeTransaction = null;
        }
    }

    /// <summary>
    /// Rollback a transaction.
    /// </summary>
    public async Task RollbackTransactionAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        TransactionInfo? tx;
        lock (_transactionLock)
        {
            tx = _activeTransaction;
            if (tx?.Id != connectionId)
            {
                throw new InvalidOperationException($"Transaction {connectionId} not found");
            }
        }

        await tx.Transaction.RollbackAsync(cancellationToken);

        lock (_transactionLock)
        {
            _activeTransaction = null;
        }
    }

    private void BindParameters(SqliteCommand cmd, List<object?>? parameters)
    {
        if (parameters == null) return;

        for (int i = 0; i < parameters.Count; i++)
        {
            object? value = parameters[i];
            SqliteParameter param = cmd.CreateParameter();
            param.ParameterName = $"${i + 1}";
            param.Value = value ?? DBNull.Value;
            cmd.Parameters.Add(param);
        }
    }

    private static async Task<List<Dictionary<string, object?>>> ReaderToListAsync(
        SqliteDataReader reader,
        CancellationToken cancellationToken)
    {
        List<Dictionary<string, object?>> results = new();

        while (await reader.ReadAsync(cancellationToken))
        {
            Dictionary<string, object?> row = new();
            for (int i = 0; i < reader.FieldCount; i++)
            {
                string columnName = reader.GetName(i);
                object? value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                row[columnName] = value;
            }
            results.Add(row);
        }

        return results;
    }

    private void EnsureConnected()
    {
        if (_connection == null || _connection.State != System.Data.ConnectionState.Open)
        {
            throw new InvalidOperationException("Not connected");
        }
    }

    public void Dispose()
    {
        _activeTransaction?.Transaction.Dispose();
        _connection?.Dispose();
    }
}
