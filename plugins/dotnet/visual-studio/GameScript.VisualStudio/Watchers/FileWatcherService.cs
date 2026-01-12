namespace GameScript.VisualStudio;

/// <summary>
/// Service that manages file watchers for code files and snapshot commands.
/// Acts as a facade coordinating CodeFileWatcher and SnapshotCommandWatcher.
/// </summary>
public sealed class FileWatcherService : IDisposable
{
    private readonly CodeFileWatcher _codeFileWatcher;
    private readonly SnapshotCommandWatcher _snapshotCommandWatcher;
    private bool _isDisposed;

    /// <summary>
    /// Fired when a conversation code file changes.
    /// Parameter is the conversation ID extracted from the filename.
    /// </summary>
    public event Action<int>? OnCodeFileChanged;

    /// <summary>
    /// Fired when a navigation command is received from a game engine plugin.
    /// Parameters are (entityType, id) where entityType is "conversation", "actor", "localization", or "locale".
    /// </summary>
    public event Action<string, int>? OnNavigateCommand;

    public FileWatcherService()
    {
        _codeFileWatcher = new CodeFileWatcher();
        _snapshotCommandWatcher = new SnapshotCommandWatcher();
    }

    /// <summary>
    /// Set the folder path to watch for code file changes.
    /// </summary>
    /// <param name="path">Absolute path to watch, or null to disable</param>
    /// <param name="extension">File extension to watch for (e.g., ".cs", ".cpp", ".gd")</param>
    public void SetCodeWatchPath(string? path, string extension = ".cs")
    {
        if (_isDisposed)
        {
            return;
        }

        if (string.IsNullOrEmpty(path))
        {
            _codeFileWatcher.ClearWatch();
            return;
        }

        _codeFileWatcher.SetWatchPath(path, extension, conversationId =>
        {
            OnCodeFileChanged?.Invoke(conversationId);
        });
    }

    /// <summary>
    /// Clear the code file watcher.
    /// </summary>
    public void ClearCodeWatch()
    {
        _codeFileWatcher.ClearWatch();
    }

    /// <summary>
    /// Set the folder path to watch for snapshot command files.
    /// </summary>
    /// <param name="path">Absolute path to watch, or null to disable</param>
    public void SetSnapshotWatchPath(string? path)
    {
        if (_isDisposed)
        {
            return;
        }

        if (string.IsNullOrEmpty(path))
        {
            _snapshotCommandWatcher.ClearWatch();
            return;
        }

        _snapshotCommandWatcher.SetWatchPath(path, (entityType, id) =>
        {
            OnNavigateCommand?.Invoke(entityType, id);
        });
    }

    /// <summary>
    /// Clear the snapshot command watcher.
    /// </summary>
    public void ClearSnapshotWatch()
    {
        _snapshotCommandWatcher.ClearWatch();
    }

    /// <summary>
    /// Clear all watchers.
    /// </summary>
    public void ClearAll()
    {
        _codeFileWatcher.ClearWatch();
        _snapshotCommandWatcher.ClearWatch();
    }

    public void Dispose()
    {
        if (_isDisposed)
        {
            return;
        }

        _isDisposed = true;
        _codeFileWatcher.Dispose();
        _snapshotCommandWatcher.Dispose();
    }
}
