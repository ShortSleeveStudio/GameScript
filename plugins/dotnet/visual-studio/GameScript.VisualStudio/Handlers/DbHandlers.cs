using System.Collections.Concurrent;
using System.Text.Json;

namespace GameScript.VisualStudio;

/// <summary>
/// Handlers for database operations.
/// Implements: db:query, db:run, db:exec, db:batch,
/// db:transaction:begin/commit/rollback, db:open, db:close, db:startNotifications
/// </summary>
public static class DbHandlers
{
    private const int MaxInvalidRowsToLog = 3;

    // Pending notifications for transactions
    private static readonly ConcurrentDictionary<string, List<PendingNotification>> PendingTxNotifications = new();

    private sealed class PendingNotification
    {
        public required string Table { get; init; }
        public required string Operation { get; init; }
        public List<Dictionary<string, object?>> Rows { get; init; } = new();
    }

    public static void Register(MessageMediator mediator, HandlerContext context)
    {
        mediator.Register("ready", (msg, ct) => HandleReady(msg, context, ct));
        mediator.Register("db:query", (msg, ct) => HandleQuery(msg, context, ct));
        mediator.Register("db:run", (msg, ct) => HandleRun(msg, context, ct));
        mediator.Register("db:exec", (msg, ct) => HandleExec(msg, context, ct));
        mediator.Register("db:batch", (msg, ct) => HandleBatch(msg, context, ct));
        mediator.Register("db:transaction:begin", (msg, ct) => HandleTransactionBegin(msg, context, ct));
        mediator.Register("db:transaction:commit", (msg, ct) => HandleTransactionCommit(msg, context, ct));
        mediator.Register("db:transaction:rollback", (msg, ct) => HandleTransactionRollback(msg, context, ct));
        mediator.Register("db:open", (msg, ct) => HandleOpen(msg, context, ct));
        mediator.Register("db:close", (msg, ct) => HandleClose(msg, context, ct));
        mediator.Register("db:startNotifications", (msg, ct) => HandleStartNotifications(msg, context, ct));
    }

    /// <summary>
    /// Clear all pending transaction notifications.
    /// Called when the database connection is closed to prevent memory leaks.
    /// </summary>
    public static void ClearPendingNotifications()
    {
        PendingTxNotifications.Clear();
    }

    private static async Task HandleReady(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        await SendConnectionStatus(context, ct);
    }

    private static async Task HandleQuery(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string sql = message.GetRequiredString("sql");
        List<object?>? parameters = message.GetOptionalObject("params")?.ToParameterList();
        string? contextId = message.GetOptionalObject("context")?.GetOptionalString("id");

        try
        {
            List<Dictionary<string, object?>> result = await context.DatabaseManager.QueryAsync(sql, parameters, contextId, ct);
            await context.PostResponseAsync(id, "db:queryResult", true, new Dictionary<string, object?>
            {
                ["data"] = result
            }, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DbHandlers] Query failed: {sql} - {ex.Message}");
            await context.PostResponseAsync(id, "db:queryResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleRun(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string sql = message.GetRequiredString("sql");
        List<object?>? parameters = message.GetOptionalObject("params")?.ToParameterList();
        bool returning = message.GetOptionalBool("returning") ?? false;
        JsonElement? notificationMeta = message.GetOptionalObject("notificationMeta");
        string? contextId = message.GetOptionalObject("context")?.GetOptionalString("id");

        try
        {
            RunResult result = await context.DatabaseManager.RunAsync(sql, parameters, returning, contextId, ct);

            // Handle notification
            if (notificationMeta.HasValue)
            {
                string table = notificationMeta.Value.GetOptionalString("table") ?? "";
                string operation = notificationMeta.Value.GetOptionalString("operation") ?? "update";

                if (result.Rows.Count > 0 || operation == "alter")
                {
                    await QueueOrSendNotification(context, table, operation, result.Rows, contextId, ct);
                }
            }

            await context.PostResponseAsync(id, "db:runResult", true, new Dictionary<string, object?>
            {
                ["lastID"] = result.LastId,
                ["changes"] = result.Changes,
                ["rows"] = result.Rows
            }, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DbHandlers] Run failed: {sql} - {ex.Message}");
            await context.PostResponseAsync(id, "db:runResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleExec(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string sql = message.GetRequiredString("sql");
        JsonElement? notificationMeta = message.GetOptionalObject("notificationMeta");
        string? contextId = message.GetOptionalObject("context")?.GetOptionalString("id");

        try
        {
            await context.DatabaseManager.ExecAsync(sql, contextId, ct);

            if (notificationMeta.HasValue)
            {
                string table = notificationMeta.Value.GetOptionalString("table") ?? "";
                string operation = notificationMeta.Value.GetOptionalString("operation") ?? "alter";
                await QueueOrSendNotification(context, table, operation, new List<Dictionary<string, object?>>(), contextId, ct);
            }

            await context.PostResponseAsync(id, "db:execResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DbHandlers] Exec failed: {sql} - {ex.Message}");
            await context.PostResponseAsync(id, "db:execResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleBatch(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");

        if (!message.TryGetProperty("statements", out JsonElement statementsElement))
        {
            await context.PostResponseAsync(id, "db:batchResult", false, error: "Missing statements", cancellationToken: ct);
            return;
        }

        try
        {
            string txId = await context.DatabaseManager.BeginTransactionAsync(ct);
            List<long?> results = new();
            List<PendingNotification> allNotifications = new();

            foreach (JsonElement stmt in statementsElement.EnumerateArray())
            {
                string? sql = stmt.GetOptionalString("sql");
                if (sql == null) continue;

                List<object?>? parameters = stmt.GetOptionalObject("params")?.ToParameterList();
                JsonElement? notificationMeta = stmt.GetOptionalObject("notificationMeta");

                RunResult result = await context.DatabaseManager.RunAsync(sql, parameters, true, txId, ct);
                results.Add(result.LastId);

                if (notificationMeta.HasValue && result.Rows.Count > 0)
                {
                    string table = notificationMeta.Value.GetOptionalString("table") ?? "";
                    string operation = notificationMeta.Value.GetOptionalString("operation") ?? "update";
                    allNotifications.Add(new PendingNotification
                    {
                        Table = table,
                        Operation = operation,
                        Rows = result.Rows
                    });
                }
            }

            await context.DatabaseManager.CommitTransactionAsync(txId, ct);

            // Send consolidated notifications
            IEnumerable<IGrouping<string, PendingNotification>> grouped = allNotifications.GroupBy(n => $"{n.Table}:{n.Operation}");
            foreach (IGrouping<string, PendingNotification> group in grouped)
            {
                PendingNotification first = group.First();
                List<Dictionary<string, object?>> allRows = group.SelectMany(n => n.Rows).ToList();
                await HandleNotificationMeta(context, first.Table, first.Operation, allRows, ct);
            }

            await context.PostResponseAsync(id, "db:batchResult", true, new Dictionary<string, object?>
            {
                ["insertIds"] = results
            }, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DbHandlers] Batch failed: {ex.Message}");
            await context.PostResponseAsync(id, "db:batchResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleTransactionBegin(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");

        try
        {
            string connectionId = await context.DatabaseManager.BeginTransactionAsync(ct);
            await context.PostResponseAsync(id, "db:transactionBeginResult", true, new Dictionary<string, object?>
            {
                ["context"] = new Dictionary<string, object?> { ["id"] = connectionId }
            }, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DbHandlers] Transaction begin failed: {ex.Message}");
            await context.PostResponseAsync(id, "db:transactionBeginResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleTransactionCommit(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string? contextId = message.GetOptionalObject("context")?.GetRequiredString("id");

        if (contextId == null)
        {
            await context.PostResponseAsync(id, "db:transactionCommitResult", false, error: "Missing context id", cancellationToken: ct);
            return;
        }

        try
        {
            await context.DatabaseManager.CommitTransactionAsync(contextId, ct);

            // Send deferred notifications
            if (PendingTxNotifications.TryRemove(contextId, out List<PendingNotification>? pending))
            {
                List<PendingNotification> consolidated = ConsolidateNotifications(pending);
                foreach (PendingNotification notification in consolidated)
                {
                    await HandleNotificationMeta(context, notification.Table, notification.Operation, notification.Rows, ct);
                }
            }

            await context.PostResponseAsync(id, "db:transactionCommitResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            PendingTxNotifications.TryRemove(contextId, out _);
            System.Diagnostics.Debug.WriteLine($"[DbHandlers] Transaction commit failed: {ex.Message}");
            await context.PostResponseAsync(id, "db:transactionCommitResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleTransactionRollback(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string? contextId = message.GetOptionalObject("context")?.GetRequiredString("id");

        if (contextId == null)
        {
            await context.PostResponseAsync(id, "db:transactionRollbackResult", false, error: "Missing context id", cancellationToken: ct);
            return;
        }

        try
        {
            await context.DatabaseManager.RollbackTransactionAsync(contextId, ct);
            PendingTxNotifications.TryRemove(contextId, out _);
            await context.PostResponseAsync(id, "db:transactionRollbackResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            PendingTxNotifications.TryRemove(contextId, out _);
            System.Diagnostics.Debug.WriteLine($"[DbHandlers] Transaction rollback failed: {ex.Message}");
            await context.PostResponseAsync(id, "db:transactionRollbackResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleOpen(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        JsonElement? configObj = message.GetOptionalObject("config");

        if (!configObj.HasValue)
        {
            await context.PostResponseAsync(id, "db:openResult", false, error: "Missing config", cancellationToken: ct);
            return;
        }

        try
        {
            DatabaseConfig config = ParseConfig(configObj.Value);
            await context.DatabaseManager.OpenAsync(config, ct);
            await context.PostResponseAsync(id, "db:openResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DbHandlers] Open failed: {ex.Message}");
            await context.PostResponseAsync(id, "db:openResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleClose(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");

        try
        {
            // Clear pending notifications to prevent memory leaks
            ClearPendingNotifications();

            await context.DatabaseManager.CloseAsync();
            await context.PostResponseAsync(id, "db:closeResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DbHandlers] Close failed: {ex.Message}");
            await context.PostResponseAsync(id, "db:closeResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleStartNotifications(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");

        try
        {
            await context.DatabaseManager.StartChangeNotificationsAsync(ct);
            await context.PostResponseAsync(id, "db:startNotificationsResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DbHandlers] Start notifications failed: {ex.Message}");
            await context.PostResponseAsync(id, "db:startNotificationsResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task SendConnectionStatus(HandlerContext context, CancellationToken ct)
    {
        if (context.DatabaseManager.IsConnected)
        {
            await context.PostToUIAsync(new
            {
                type = "connected",
                dbType = context.DatabaseManager.CurrentDatabaseType?.ToString().ToLowerInvariant() ?? "unknown"
            }, ct);
        }
        else
        {
            await context.PostToUIAsync(new { type = "disconnected" }, ct);
        }
    }

    private static DatabaseConfig ParseConfig(JsonElement configObj)
    {
        string typeStr = configObj.GetOptionalString("type") ?? "sqlite";
        DatabaseType type = typeStr.ToLowerInvariant() == "postgres" ? DatabaseType.Postgres : DatabaseType.Sqlite;

        return new DatabaseConfig
        {
            Type = type,
            Filepath = configObj.GetOptionalString("filepath"),
            Host = configObj.GetOptionalString("host"),
            Port = configObj.GetOptionalInt("port"),
            Database = configObj.GetOptionalString("database"),
            User = configObj.GetOptionalString("user"),
            Password = configObj.GetOptionalString("password")
        };
    }

    private static async Task QueueOrSendNotification(
        HandlerContext context,
        string table,
        string operation,
        List<Dictionary<string, object?>> rows,
        string? txId,
        CancellationToken ct)
    {
        if (txId != null)
        {
            List<PendingNotification> pending = PendingTxNotifications.GetOrAdd(txId, _ => new List<PendingNotification>());
            lock (pending)
            {
                pending.Add(new PendingNotification
                {
                    Table = table,
                    Operation = operation,
                    Rows = rows
                });
            }
        }
        else
        {
            await HandleNotificationMeta(context, table, operation, rows, ct);
        }
    }

    private static List<PendingNotification> ConsolidateNotifications(List<PendingNotification> pending)
    {
        Dictionary<string, PendingNotification> grouped = new();

        foreach (PendingNotification notification in pending)
        {
            string key = $"{notification.Table}:{notification.Operation}";
            if (grouped.TryGetValue(key, out PendingNotification? existing))
            {
                existing.Rows.AddRange(notification.Rows);
            }
            else
            {
                grouped[key] = new PendingNotification
                {
                    Table = notification.Table,
                    Operation = notification.Operation,
                    Rows = notification.Rows.ToList()
                };
            }
        }

        return grouped.Values.ToList();
    }

    private static async Task HandleNotificationMeta(
        HandlerContext context,
        string table,
        string operation,
        List<Dictionary<string, object?>> rows,
        CancellationToken ct)
    {
        bool isPostgres = context.DatabaseManager.CurrentDatabaseType == DatabaseType.Postgres;

        if (operation == "alter")
        {
            await SendChangeNotificationToUI(context, table, "alter", new List<Dictionary<string, object?>>(), ct);

            if (isPostgres)
            {
                await context.DatabaseManager.SendPostgresNotifyAsync(table, "alter", null, ct);
            }
            return;
        }

        if (rows.Count == 0)
        {
            if (!isPostgres)
            {
                await SendChangeNotificationToUI(context, table, operation, new List<Dictionary<string, object?>>(), ct);
            }
            else
            {
                await context.DatabaseManager.SendPostgresNotifyAsync(table, operation, null, ct);
            }
            return;
        }

        List<Dictionary<string, object?>> validatedRows = ValidateRows(rows);

        if (isPostgres)
        {
            List<long> affectedIds = validatedRows
                .Select(r => r.TryGetValue("id", out object? id) ? Convert.ToInt64(id) : (long?)null)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .ToList();
            await context.DatabaseManager.SendPostgresNotifyAsync(table, operation, affectedIds, ct);
        }
        else
        {
            await SendChangeNotificationToUI(context, table, operation, validatedRows, ct);
        }
    }

    private static async Task SendChangeNotificationToUI(
        HandlerContext context,
        string table,
        string operation,
        List<Dictionary<string, object?>> rows,
        CancellationToken ct)
    {
        await context.PostToUIAsync(new
        {
            type = "db:changed",
            table,
            operation,
            rows,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        }, ct);
    }

    private static bool IsValidRow(Dictionary<string, object?> row)
    {
        return row.TryGetValue("id", out object? id) && id is not null && (id is int or long or short or byte);
    }

    private static List<Dictionary<string, object?>> ValidateRows(List<Dictionary<string, object?>> rows)
    {
        List<Dictionary<string, object?>> validRows = new();
        int invalidCount = 0;

        for (int i = 0; i < rows.Count; i++)
        {
            Dictionary<string, object?> row = rows[i];
            if (IsValidRow(row))
            {
                validRows.Add(row);
            }
            else
            {
                invalidCount++;
                if (invalidCount <= MaxInvalidRowsToLog)
                {
                    System.Diagnostics.Debug.WriteLine($"[DbHandlers] Invalid row at index {i}, skipping");
                }
            }
        }

        if (invalidCount > MaxInvalidRowsToLog)
        {
            System.Diagnostics.Debug.WriteLine($"[DbHandlers] Skipped {invalidCount - MaxInvalidRowsToLog} additional invalid rows");
        }

        return validRows;
    }
}
