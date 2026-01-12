using System.Text.RegularExpressions;

namespace GameScript.VisualStudio;

/// <summary>
/// Watches for changes to conversation code files (conv_*.{extension}).
/// Notifies via callback when code files are modified.
/// Uses debouncing to avoid duplicate notifications from rapid file changes.
/// </summary>
public sealed class CodeFileWatcher : IDisposable
{
    private const int DebounceDelayMs = 250;

    private FileSystemWatcher? _watcher;
    private string? _watchPath;
    private string _fileExtension = ".cs";
    private Action<int>? _callback;
    private bool _isDisposed;
    private Regex? _cachedPattern;

    // Debounce state
    private readonly object _debounceLock = new();
    private readonly Dictionary<int, CancellationTokenSource> _pendingNotifications = new();

    /// <summary>
    /// Set the folder path to watch and callback for changes.
    /// </summary>
    /// <param name="path">Absolute path to watch, or null to disable</param>
    /// <param name="extension">File extension to watch for (e.g., ".cs", ".cpp", ".gd")</param>
    /// <param name="onChanged">Callback invoked with conversationId when file changes</param>
    public void SetWatchPath(string? path, string extension, Action<int> onChanged)
    {
        ClearWatch();

        if (string.IsNullOrEmpty(path))
        {
            return;
        }

        _watchPath = path;
        _fileExtension = extension;
        _callback = onChanged;

        // Cache the regex pattern for this extension
        string escapedExt = Regex.Escape(extension);
        _cachedPattern = new Regex($@"conv_(\d+){escapedExt}$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        if (!Directory.Exists(path))
        {
            System.Diagnostics.Debug.WriteLine($"[CodeFileWatcher] Watch path does not exist: {path}");
            return;
        }

        try
        {
            _watcher = new FileSystemWatcher(path)
            {
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName,
                Filter = $"conv_*{extension}",
                EnableRaisingEvents = true
            };

            _watcher.Changed += OnFileChanged;
            _watcher.Created += OnFileChanged;

            System.Diagnostics.Debug.WriteLine($"[CodeFileWatcher] Watching: {path} for conv_*{extension}");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[CodeFileWatcher] Failed to create watcher: {ex.Message}");
            _watcher?.Dispose();
            _watcher = null;
        }
    }

    /// <summary>
    /// Clear the watch path and callback.
    /// </summary>
    public void ClearWatch()
    {
        lock (_debounceLock)
        {
            foreach (CancellationTokenSource cts in _pendingNotifications.Values)
            {
                cts.Cancel();
                cts.Dispose();
            }
            _pendingNotifications.Clear();
        }

        if (_watcher != null)
        {
            _watcher.EnableRaisingEvents = false;
            _watcher.Changed -= OnFileChanged;
            _watcher.Created -= OnFileChanged;
            _watcher.Dispose();
            _watcher = null;
        }

        _watchPath = null;
        _callback = null;
        _cachedPattern = null;
    }

    private void OnFileChanged(object sender, FileSystemEventArgs e)
    {
        if (_isDisposed || _callback == null || _cachedPattern == null)
        {
            return;
        }

        // Extract conversation ID from filename (conv_123.cs -> 123)
        int? conversationId = ExtractConversationId(e.Name, _cachedPattern);
        if (conversationId == null)
        {
            return;
        }

        int convId = conversationId.Value;
        Action<int> callback = _callback;

        // Debounce: cancel any pending notification for this conversation
        lock (_debounceLock)
        {
            if (_pendingNotifications.TryGetValue(convId, out CancellationTokenSource? existingCts))
            {
                existingCts.Cancel();
                existingCts.Dispose();
                _pendingNotifications.Remove(convId);
            }

            CancellationTokenSource cts = new();
            _pendingNotifications[convId] = cts;

            _ = Task.Run(async () =>
            {
                try
                {
                    await Task.Delay(DebounceDelayMs, cts.Token);

                    // Remove from pending and dispose the CTS after successful completion
                    lock (_debounceLock)
                    {
                        _pendingNotifications.Remove(convId);
                    }
                    cts.Dispose();

                    if (!_isDisposed)
                    {
                        callback(convId);
                    }
                }
                catch (TaskCanceledException)
                {
                    // Debounced - newer change came in, CTS already disposed by the new event
                }
            });
        }
    }

    private static int? ExtractConversationId(string? fileName, Regex pattern)
    {
        if (string.IsNullOrEmpty(fileName))
        {
            return null;
        }

        Match match = pattern.Match(fileName);
        if (match.Success && int.TryParse(match.Groups[1].Value, out int id))
        {
            return id;
        }

        return null;
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
