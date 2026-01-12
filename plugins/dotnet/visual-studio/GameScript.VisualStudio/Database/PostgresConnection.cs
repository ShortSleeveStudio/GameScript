using Npgsql;
using System.Collections.Concurrent;

namespace GameScript.VisualStudio;

/// <summary>
/// PostgreSQL database connection using Npgsql.
/// Provides async queries, transactions, and LISTEN/NOTIFY support.
/// </summary>
public sealed class PostgresConnection : IDisposable
{
    private readonly string _host;
    private readonly int _port;
    private readonly string _database;
    private readonly string _user;
    private readonly string? _password;

    private NpgsqlDataSource? _dataSource;
    private NpgsqlConnection? _listenConnection;
    private CancellationTokenSource? _listenCancellation;
    private int _nextTransactionId = 1;
    private readonly ConcurrentDictionary<string, NpgsqlConnection> _activeTransactions = new();
    private Action<string>? _notificationCallback;

    public PostgresConnection(
        string host,
        int port,
        string database,
        string user,
        string? password)
    {
        _host = host;
        _port = port;
        _database = database;
        _user = user;
        _password = password;
    }

    /// <summary>
    /// Connect to the PostgreSQL database.
    /// </summary>
    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        var connectionString = new NpgsqlConnectionStringBuilder
        {
            Host = _host,
            Port = _port,
            Database = _database,
            Username = _user,
            Password = _password,
            MaxPoolSize = 10,
            MinPoolSize = 1,
            ConnectionIdleLifetime = 60
        }.ToString();

        _dataSource = NpgsqlDataSource.Create(connectionString);

        // Test connection
        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
    }

    /// <summary>
    /// Close all connections.
    /// </summary>
    public async Task CloseAsync()
    {
        try
        {
            if (_listenConnection != null)
            {
                await _listenConnection.CloseAsync();
                await _listenConnection.DisposeAsync();
                _listenConnection = null;
            }

            // Close transaction connections
            foreach (var (_, conn) in _activeTransactions)
            {
                await conn.CloseAsync();
                await conn.DisposeAsync();
            }
            _activeTransactions.Clear();

            if (_dataSource != null)
            {
                await _dataSource.DisposeAsync();
                _dataSource = null;
            }
        }
        catch
        {
            // Ignore close errors
        }
    }

    /// <summary>
    /// Execute a SELECT query.
    /// </summary>
    public async Task<List<Dictionary<string, object?>>> QueryAsync(
        string sql,
        List<object?>? parameters = null,
        string? connectionId = null,
        CancellationToken cancellationToken = default)
    {
        var conn = await GetConnectionAsync(connectionId, cancellationToken);

        try
        {
            await using var cmd = new NpgsqlCommand(sql, conn);
            BindParameters(cmd, parameters);

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            return await ReaderToListAsync(reader, cancellationToken);
        }
        finally
        {
            // Only close if we opened it (not a transaction connection)
            if (connectionId == null)
            {
                await conn.CloseAsync();
            }
        }
    }

    /// <summary>
    /// Execute an INSERT/UPDATE/DELETE statement.
    /// </summary>
    public async Task<RunResult> RunAsync(
        string sql,
        List<object?>? parameters = null,
        bool returning = false,
        string? connectionId = null,
        CancellationToken cancellationToken = default)
    {
        var conn = await GetConnectionAsync(connectionId, cancellationToken);

        try
        {
            await using var cmd = new NpgsqlCommand(sql, conn);
            BindParameters(cmd, parameters);

            if (returning)
            {
                await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                var rows = await ReaderToListAsync(reader, cancellationToken);
                var lastId = rows.FirstOrDefault()?.TryGetValue("id", out var id) == true ? Convert.ToInt64(id) : (long?)null;
                return new RunResult
                {
                    LastId = lastId,
                    Changes = rows.Count,
                    Rows = rows
                };
            }
            else
            {
                var changes = await cmd.ExecuteNonQueryAsync(cancellationToken);
                return new RunResult
                {
                    LastId = null,
                    Changes = changes,
                    Rows = new List<Dictionary<string, object?>>()
                };
            }
        }
        finally
        {
            if (connectionId == null)
            {
                await conn.CloseAsync();
            }
        }
    }

    /// <summary>
    /// Execute a DDL statement.
    /// </summary>
    public async Task ExecAsync(
        string sql,
        string? connectionId = null,
        CancellationToken cancellationToken = default)
    {
        var conn = await GetConnectionAsync(connectionId, cancellationToken);

        try
        {
            await using var cmd = new NpgsqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            if (connectionId == null)
            {
                await conn.CloseAsync();
            }
        }
    }

    /// <summary>
    /// Get a connection - either from a transaction or from the pool.
    /// </summary>
    private async Task<NpgsqlConnection> GetConnectionAsync(
        string? connectionId,
        CancellationToken cancellationToken)
    {
        if (connectionId != null)
        {
            if (_activeTransactions.TryGetValue(connectionId, out var txConn))
            {
                return txConn;
            }
            throw new InvalidOperationException($"Transaction {connectionId} not found");
        }

        if (_dataSource == null)
        {
            throw new InvalidOperationException("Not connected");
        }

        return await _dataSource.OpenConnectionAsync(cancellationToken);
    }

    /// <summary>
    /// Begin a new transaction.
    /// Gets a dedicated connection from the pool for this transaction.
    /// </summary>
    public async Task<string> BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_dataSource == null)
        {
            throw new InvalidOperationException("Not connected");
        }

        var id = $"tx_{Interlocked.Increment(ref _nextTransactionId)}";
        var conn = await _dataSource.OpenConnectionAsync(cancellationToken);

        try
        {
            await using var cmd = new NpgsqlCommand("BEGIN", conn);
            await cmd.ExecuteNonQueryAsync(cancellationToken);

            _activeTransactions[id] = conn;
            return id;
        }
        catch
        {
            await conn.CloseAsync();
            throw;
        }
    }

    /// <summary>
    /// Commit a transaction.
    /// Returns the dedicated connection back to the pool.
    /// </summary>
    public async Task CommitTransactionAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        if (!_activeTransactions.TryRemove(connectionId, out var conn))
        {
            throw new InvalidOperationException($"Transaction {connectionId} not found");
        }

        try
        {
            await using var cmd = new NpgsqlCommand("COMMIT", conn);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    /// <summary>
    /// Rollback a transaction.
    /// Returns the dedicated connection back to the pool.
    /// </summary>
    public async Task RollbackTransactionAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        if (!_activeTransactions.TryRemove(connectionId, out var conn))
        {
            throw new InvalidOperationException($"Transaction {connectionId} not found");
        }

        try
        {
            await using var cmd = new NpgsqlCommand("ROLLBACK", conn);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    /// <summary>
    /// Start listening for notifications on a channel.
    /// Uses a dedicated connection for LISTEN/NOTIFY.
    /// </summary>
    public async Task StartListeningAsync(
        string channel,
        Action<string> onNotification,
        CancellationToken cancellationToken = default)
    {
        if (_dataSource == null)
        {
            throw new InvalidOperationException("Not connected");
        }

        // Cancel any existing listener
        _listenCancellation?.Cancel();
        _listenCancellation?.Dispose();
        _listenCancellation = new CancellationTokenSource();

        _notificationCallback = onNotification;
        _listenConnection = await _dataSource.OpenConnectionAsync(cancellationToken);

        // Register notification handler
        _listenConnection.Notification += (_, e) =>
        {
            if (e.Channel == channel)
            {
                _notificationCallback?.Invoke(e.Payload);
            }
        };

        // Start listening
        await using var cmd = new NpgsqlCommand($"LISTEN {channel}", _listenConnection);
        await cmd.ExecuteNonQueryAsync(cancellationToken);

        // Capture the cancellation token for the background task
        CancellationToken listenToken = _listenCancellation.Token;

        // Start background task to wait for notifications
        _ = Task.Run(async () =>
        {
            try
            {
                while (!listenToken.IsCancellationRequested &&
                       _listenConnection != null &&
                       _listenConnection.State == System.Data.ConnectionState.Open)
                {
                    await _listenConnection.WaitAsync(listenToken);
                }
            }
            catch (OperationCanceledException)
            {
                // Expected when stopping
            }
            catch
            {
                // Connection closed
            }
        }, listenToken);
    }

    /// <summary>
    /// Stop listening for notifications.
    /// </summary>
    public async Task StopListeningAsync(string channel, CancellationToken cancellationToken = default)
    {
        // Cancel the background listener task
        _listenCancellation?.Cancel();
        _listenCancellation?.Dispose();
        _listenCancellation = null;

        if (_listenConnection != null)
        {
            try
            {
                await using var cmd = new NpgsqlCommand($"UNLISTEN {channel}", _listenConnection);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
            }
            catch
            {
                // Ignore errors during cleanup
            }

            await _listenConnection.CloseAsync();
            await _listenConnection.DisposeAsync();
            _listenConnection = null;
        }

        _notificationCallback = null;
    }

    private static void BindParameters(NpgsqlCommand cmd, List<object?>? parameters)
    {
        if (parameters == null) return;

        for (int i = 0; i < parameters.Count; i++)
        {
            var value = parameters[i];
            cmd.Parameters.AddWithValue($"${i + 1}", value ?? DBNull.Value);
        }
    }

    private static async Task<List<Dictionary<string, object?>>> ReaderToListAsync(
        NpgsqlDataReader reader,
        CancellationToken cancellationToken)
    {
        var results = new List<Dictionary<string, object?>>();

        while (await reader.ReadAsync(cancellationToken))
        {
            var row = new Dictionary<string, object?>();
            for (int i = 0; i < reader.FieldCount; i++)
            {
                var columnName = reader.GetName(i);
                var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                row[columnName] = value;
            }
            results.Add(row);
        }

        return results;
    }

    public void Dispose()
    {
        _listenCancellation?.Cancel();
        _listenCancellation?.Dispose();
        _listenConnection?.Dispose();
        foreach (var (_, conn) in _activeTransactions)
        {
            conn.Dispose();
        }
        _activeTransactions.Clear();
        _dataSource?.Dispose();
    }
}
