using Microsoft.VisualStudio.Extensibility;

namespace GameScript.VisualStudio;

/// <summary>
/// Context provided to message handlers.
/// Contains references to all services needed for handling messages.
/// </summary>
public sealed class HandlerContext
{
    private string? _cachedWorkspacePath;
    private bool _workspacePathCached;

    public GameScriptToolWindow ToolWindow { get; }
    public DatabaseManager DatabaseManager { get; }
    public ThemeManager ThemeManager { get; }
    public CodeAnalyzerService CodeAnalyzer { get; }
    public FileWatcherService FileWatcher { get; }
    public VisualStudioExtensibility Extensibility { get; }

    /// <summary>
    /// Code output folder path (relative to workspace).
    /// Used by CodeHandlers for locating conversation code files.
    /// </summary>
    public string? CodeOutputFolder { get; set; }

    /// <summary>
    /// File extension for code files (e.g., ".cs", ".cpp", ".gd").
    /// </summary>
    public string CodeFileExtension { get; set; } = ".cs";

    public HandlerContext(
        GameScriptToolWindow toolWindow,
        DatabaseManager databaseManager,
        ThemeManager themeManager,
        CodeAnalyzerService codeAnalyzer,
        FileWatcherService fileWatcher,
        VisualStudioExtensibility extensibility)
    {
        ToolWindow = toolWindow;
        DatabaseManager = databaseManager;
        ThemeManager = themeManager;
        CodeAnalyzer = codeAnalyzer;
        FileWatcher = fileWatcher;
        Extensibility = extensibility;
    }

    /// <summary>
    /// Post a message to the UI.
    /// </summary>
    public Task PostToUIAsync(object message, CancellationToken cancellationToken = default)
    {
        return ToolWindow.PostToUIAsync(message, cancellationToken);
    }

    /// <summary>
    /// Post a typed response message to the UI.
    /// </summary>
    public Task PostResponseAsync(
        string id,
        string type,
        bool success,
        Dictionary<string, object?>? data = null,
        string? error = null,
        CancellationToken cancellationToken = default)
    {
        return ToolWindow.PostResponseAsync(id, type, success, data, error, cancellationToken);
    }

    /// <summary>
    /// Get the workspace/solution directory path.
    /// Uses the Project Query API to get the solution path.
    /// Result is cached after first retrieval.
    /// </summary>
    public async Task<string?> GetWorkspacePathAsync(CancellationToken cancellationToken = default)
    {
        if (_workspacePathCached)
        {
            return _cachedWorkspacePath;
        }

        try
        {
            Microsoft.VisualStudio.Extensibility.Workspaces.ISolution? queryResults = await Extensibility.Workspaces().QuerySolutionAsync(
                solution => solution.With(s => s.Path),
                cancellationToken);

            string? solutionPath = queryResults?.Path;
            if (!string.IsNullOrEmpty(solutionPath))
            {
                _cachedWorkspacePath = Path.GetDirectoryName(solutionPath);
            }

            _workspacePathCached = true;
            return _cachedWorkspacePath;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[HandlerContext] Failed to get workspace path: {ex.Message}");
            _workspacePathCached = true;
            return null;
        }
    }

    /// <summary>
    /// Resolve a path, making relative paths absolute using workspace root.
    /// </summary>
    public async Task<string> ResolvePathAsync(string path, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(path))
        {
            return "";
        }

        if (Path.IsPathRooted(path))
        {
            return path;
        }

        string? workspacePath = await GetWorkspacePathAsync(cancellationToken);
        if (string.IsNullOrEmpty(workspacePath))
        {
            return path;
        }

        return Path.Combine(workspacePath, path);
    }

    /// <summary>
    /// Clear the cached workspace path (call when solution changes).
    /// </summary>
    public void InvalidateWorkspaceCache()
    {
        _workspacePathCached = false;
        _cachedWorkspacePath = null;
    }
}
