using System.Text.Json;

namespace GameScript.VisualStudio;

/// <summary>
/// Watches for command.tmp files from game engine plugins.
/// When a command file is detected, parses it and invokes the callback
/// with the navigation target (entity type and ID).
///
/// Command file format:
/// {
///   "action": "navigate",
///   "type": "conversation" | "actor" | "localization" | "locale",
///   "id": 123
/// }
/// </summary>
public sealed class SnapshotCommandWatcher : IDisposable
{
    private const string CommandFilename = "command.tmp";

    private static readonly HashSet<string> ValidEntityTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "conversation",
        "actor",
        "localization",
        "locale"
    };

    private FileSystemWatcher? _watcher;
    private string? _watchPath;
    private Action<string, int>? _callback;
    private bool _isDisposed;

    /// <summary>
    /// Set the folder path to watch and callback for commands.
    /// </summary>
    /// <param name="path">Absolute path to watch, or null to disable</param>
    /// <param name="onNavigate">Callback invoked with (entityType, id) when navigate command received</param>
    public void SetWatchPath(string? path, Action<string, int> onNavigate)
    {
        ClearWatch();

        if (string.IsNullOrEmpty(path))
        {
            return;
        }

        _watchPath = path;
        _callback = onNavigate;

        if (!Directory.Exists(path))
        {
            System.Diagnostics.Debug.WriteLine($"[SnapshotCommandWatcher] Watch path does not exist: {path}");
            return;
        }

        try
        {
            _watcher = new FileSystemWatcher(path)
            {
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName,
                Filter = CommandFilename,
                EnableRaisingEvents = true
            };

            _watcher.Changed += OnCommandFileChanged;
            _watcher.Created += OnCommandFileChanged;

            System.Diagnostics.Debug.WriteLine($"[SnapshotCommandWatcher] Watching: {path} for {CommandFilename}");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[SnapshotCommandWatcher] Failed to create watcher: {ex.Message}");
            _watcher?.Dispose();
            _watcher = null;
        }
    }

    /// <summary>
    /// Clear the watch path and callback.
    /// </summary>
    public void ClearWatch()
    {
        if (_watcher != null)
        {
            _watcher.EnableRaisingEvents = false;
            _watcher.Changed -= OnCommandFileChanged;
            _watcher.Created -= OnCommandFileChanged;
            _watcher.Dispose();
            _watcher = null;
        }

        _watchPath = null;
        _callback = null;
    }

    private void OnCommandFileChanged(object sender, FileSystemEventArgs e)
    {
        if (_isDisposed || _callback == null)
        {
            return;
        }

        // Process on a background thread to not block the file system watcher
        Action<string, int> callback = _callback;
        string filePath = e.FullPath;

        _ = Task.Run(async () =>
        {
            try
            {
                // Small delay to ensure file is fully written
                await Task.Delay(50);

                if (!File.Exists(filePath))
                {
                    return;
                }

                // Read file content
                string content = await File.ReadAllTextAsync(filePath);

                // Delete file after reading (ignore errors - file may already be gone)
                try
                {
                    File.Delete(filePath);
                }
                catch
                {
                    // File already deleted or inaccessible - that's fine
                }

                // Parse and validate the command
                using JsonDocument doc = JsonDocument.Parse(content);
                JsonElement root = doc.RootElement;

                if (!root.TryGetProperty("action", out JsonElement actionElement) ||
                    actionElement.GetString() != "navigate")
                {
                    return;
                }

                if (!root.TryGetProperty("type", out JsonElement typeElement))
                {
                    return;
                }

                string? entityType = typeElement.GetString();
                if (string.IsNullOrEmpty(entityType) || !ValidEntityTypes.Contains(entityType))
                {
                    return;
                }

                if (!root.TryGetProperty("id", out JsonElement idElement) ||
                    idElement.ValueKind != JsonValueKind.Number)
                {
                    return;
                }

                int id = idElement.GetInt32();

                if (!_isDisposed)
                {
                    callback(entityType, id);
                }
            }
            catch (Exception ex)
            {
                // Silently ignore errors - file may have been deleted or be incomplete
                System.Diagnostics.Debug.WriteLine($"[SnapshotCommandWatcher] Error processing command: {ex.Message}");
            }
        });
    }

    public void Dispose()
    {
        if (_isDisposed)
        {
            return;
        }

        _isDisposed = true;
        ClearWatch();
    }
}
