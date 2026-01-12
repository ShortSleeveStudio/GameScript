namespace GameScript.VisualStudio;

/// <summary>
/// Database type enum.
/// </summary>
public enum DatabaseType
{
    Sqlite,
    Postgres
}

/// <summary>
/// Database configuration.
/// </summary>
public sealed class DatabaseConfig
{
    public DatabaseType Type { get; init; }
    public string? Filepath { get; init; }
    public string? Host { get; init; }
    public int? Port { get; init; }
    public string? Database { get; init; }
    public string? User { get; init; }
    public string? Password { get; init; }
}

/// <summary>
/// Result from a run (INSERT/UPDATE/DELETE) operation.
/// </summary>
public sealed class RunResult
{
    public long? LastId { get; init; }
    public long Changes { get; init; }
    public List<Dictionary<string, object?>> Rows { get; init; } = new();
}

/// <summary>
/// Change notification data.
/// </summary>
public sealed class ChangeNotification
{
    public required string Table { get; init; }
    public required string Operation { get; init; }
    public List<Dictionary<string, object?>> Rows { get; init; } = new();
    public long Timestamp { get; init; }
}

/// <summary>
/// Manages database connections for SQLite and PostgreSQL.
/// Provides a unified interface for queries, transactions, and change notifications.
/// </summary>
public sealed class DatabaseManager : IDisposable
{
    private SqliteConnection? _sqliteConnection;
    private PostgresConnection? _postgresConnection;
    private DatabaseType? _dbType;
    private bool _connected;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private const string PostgresChannel = "gamescript_changes";

    public bool IsConnected => _connected;
    public DatabaseType? CurrentDatabaseType => _dbType;

    public event Action<ChangeNotification>? OnChangeNotification;
    public event Action<string>? OnError;

    /// <summary>
    /// Open a raw database connection (no validation or schema initialization).
    /// Schema validation and initialization is handled by the UI layer.
    /// </summary>
    public async Task OpenAsync(DatabaseConfig config, CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            await CloseInternalAsync();

            switch (config.Type)
            {
                case DatabaseType.Sqlite:
                    ArgumentException.ThrowIfNullOrEmpty(config.Filepath, nameof(config.Filepath));
                    var sqliteConn = new SqliteConnection(config.Filepath);
                    await sqliteConn.ConnectAsync(cancellationToken);
                    _sqliteConnection = sqliteConn;
                    _dbType = DatabaseType.Sqlite;
                    break;

                case DatabaseType.Postgres:
                    ArgumentException.ThrowIfNullOrEmpty(config.Host, nameof(config.Host));
                    ArgumentException.ThrowIfNullOrEmpty(config.Database, nameof(config.Database));
                    ArgumentException.ThrowIfNullOrEmpty(config.User, nameof(config.User));
                    var pgConn = new PostgresConnection(
                        host: config.Host,
                        port: config.Port ?? 5432,
                        database: config.Database,
                        user: config.User,
                        password: config.Password);
                    await pgConn.ConnectAsync(cancellationToken);
                    _postgresConnection = pgConn;
                    _dbType = DatabaseType.Postgres;
                    break;
            }

            _connected = true;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>
    /// Close the database connection.
    /// </summary>
    public async Task CloseAsync()
    {
        await _lock.WaitAsync();
        try
        {
            await CloseInternalAsync();
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task CloseInternalAsync()
    {
        if (_sqliteConnection != null)
        {
            await _sqliteConnection.CloseAsync();
            _sqliteConnection = null;
        }
        if (_postgresConnection != null)
        {
            await _postgresConnection.CloseAsync();
            _postgresConnection = null;
        }
        _dbType = null;
        _connected = false;
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
        EnsureConnected();

        return _dbType switch
        {
            DatabaseType.Sqlite => await _sqliteConnection!.QueryAsync(sql, parameters, cancellationToken),
            DatabaseType.Postgres => await _postgresConnection!.QueryAsync(sql, parameters, connectionId, cancellationToken),
            _ => throw new InvalidOperationException("No database connection")
        };
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
        EnsureConnected();

        return _dbType switch
        {
            DatabaseType.Sqlite => await _sqliteConnection!.RunAsync(sql, parameters, returning, cancellationToken),
            DatabaseType.Postgres => await _postgresConnection!.RunAsync(sql, parameters, returning, connectionId, cancellationToken),
            _ => throw new InvalidOperationException("No database connection")
        };
    }

    /// <summary>
    /// Execute a DDL statement (CREATE, ALTER, DROP).
    /// </summary>
    public async Task ExecAsync(
        string sql,
        string? connectionId = null,
        CancellationToken cancellationToken = default)
    {
        EnsureConnected();

        switch (_dbType)
        {
            case DatabaseType.Sqlite:
                await _sqliteConnection!.ExecAsync(sql, cancellationToken);
                break;
            case DatabaseType.Postgres:
                await _postgresConnection!.ExecAsync(sql, connectionId, cancellationToken);
                break;
            default:
                throw new InvalidOperationException("No database connection");
        }
    }

    /// <summary>
    /// Begin a new transaction.
    /// </summary>
    public async Task<string> BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        EnsureConnected();

        return _dbType switch
        {
            DatabaseType.Sqlite => await _sqliteConnection!.BeginTransactionAsync(cancellationToken),
            DatabaseType.Postgres => await _postgresConnection!.BeginTransactionAsync(cancellationToken),
            _ => throw new InvalidOperationException("No database connection")
        };
    }

    /// <summary>
    /// Commit a transaction.
    /// </summary>
    public async Task CommitTransactionAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        EnsureConnected();

        switch (_dbType)
        {
            case DatabaseType.Sqlite:
                await _sqliteConnection!.CommitTransactionAsync(connectionId, cancellationToken);
                break;
            case DatabaseType.Postgres:
                await _postgresConnection!.CommitTransactionAsync(connectionId, cancellationToken);
                break;
            default:
                throw new InvalidOperationException("No database connection");
        }
    }

    /// <summary>
    /// Rollback a transaction.
    /// </summary>
    public async Task RollbackTransactionAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        EnsureConnected();

        switch (_dbType)
        {
            case DatabaseType.Sqlite:
                await _sqliteConnection!.RollbackTransactionAsync(connectionId, cancellationToken);
                break;
            case DatabaseType.Postgres:
                await _postgresConnection!.RollbackTransactionAsync(connectionId, cancellationToken);
                break;
            default:
                throw new InvalidOperationException("No database connection");
        }
    }

    /// <summary>
    /// Start listening for database changes.
    /// For PostgreSQL: Uses LISTEN/NOTIFY
    /// For SQLite: Uses manual NotifyChange() calls after CRUD operations
    /// </summary>
    public async Task StartChangeNotificationsAsync(CancellationToken cancellationToken = default)
    {
        if (_dbType == DatabaseType.Postgres && _postgresConnection != null)
        {
            await _postgresConnection.StartListeningAsync(PostgresChannel, HandlePostgresNotification, cancellationToken);
        }
        // SQLite: No automatic notifications - uses NotifyChange() after CRUD operations
    }

    /// <summary>
    /// Stop listening for database changes.
    /// </summary>
    public async Task StopChangeNotificationsAsync(CancellationToken cancellationToken = default)
    {
        if (_dbType == DatabaseType.Postgres && _postgresConnection != null)
        {
            await _postgresConnection.StopListeningAsync(PostgresChannel, cancellationToken);
        }
    }

    /// <summary>
    /// Notify listeners of a change (for SQLite local notifications).
    /// </summary>
    public void NotifyChange(string table, string operation, List<Dictionary<string, object?>> rows)
    {
        var notification = new ChangeNotification
        {
            Table = table,
            Operation = operation,
            Rows = rows,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        OnChangeNotification?.Invoke(notification);
    }

    /// <summary>
    /// Send a PostgreSQL NOTIFY message for a database change.
    /// </summary>
    public async Task SendPostgresNotifyAsync(
        string table,
        string operation,
        List<long>? ids = null,
        CancellationToken cancellationToken = default)
    {
        if (_dbType != DatabaseType.Postgres || _postgresConnection == null)
        {
            return; // Only for PostgreSQL
        }

        try
        {
            var payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                table,
                operation,
                ids = ids ?? new List<long>()
            });

            await _postgresConnection.QueryAsync(
                "SELECT pg_notify($1, $2)",
                new List<object?> { PostgresChannel, payload },
                cancellationToken: cancellationToken);
        }
        catch
        {
            // Best-effort notification
        }
    }

    private void HandlePostgresNotification(string payload)
    {
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(payload);
            var root = doc.RootElement;

            var table = root.GetProperty("table").GetString();
            var operation = root.GetProperty("operation").GetString();
            if (table == null || operation == null) return;

            var ids = new List<long>();
            if (root.TryGetProperty("ids", out var idsElement) && idsElement.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                foreach (var id in idsElement.EnumerateArray())
                {
                    if (id.TryGetInt64(out var idValue))
                    {
                        ids.Add(idValue);
                    }
                }
            }

            // For delete operations or empty IDs, notify without rows
            if (operation == "delete" || ids.Count == 0)
            {
                NotifyChange(table, operation, new List<Dictionary<string, object?>>());
                return;
            }

            // Fetch full row data for affected IDs (eventually consistent)
            _ = Task.Run(async () =>
            {
                try
                {
                    var placeholders = string.Join(", ", ids.Select((_, i) => $"${i + 1}"));
                    var rows = await QueryAsync(
                        $"SELECT * FROM \"{table}\" WHERE id IN ({placeholders})",
                        ids.Cast<object?>().ToList());
                    NotifyChange(table, operation, rows);
                }
                catch
                {
                    // Notifications are eventually consistent - failures are expected
                    NotifyChange(table, operation, new List<Dictionary<string, object?>>());
                }
            });
        }
        catch
        {
            // Ignore malformed payloads
        }
    }

    private void EnsureConnected()
    {
        if (!_connected)
        {
            throw new InvalidOperationException("Database not connected");
        }
    }

    public void Dispose()
    {
        _sqliteConnection?.Dispose();
        _postgresConnection?.Dispose();
        _lock.Dispose();
    }
}
