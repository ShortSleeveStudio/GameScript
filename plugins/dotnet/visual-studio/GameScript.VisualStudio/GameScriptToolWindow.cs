using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.VisualStudio.Extensibility;
using Microsoft.VisualStudio.Extensibility.ToolWindows;

namespace GameScript.VisualStudio;

/// <summary>
/// GameScript tool window that hosts the web-based UI via WebView2.
/// Uses the VisualStudio.Extensibility out-of-process model with native WebView support.
/// </summary>
[VisualStudioContribution]
[Guid("8A3B6F2E-1C4D-4E5F-9A0B-2C3D4E5F6A7B")]
public sealed class GameScriptToolWindow : WebViewToolWindow, IDisposable
{
    /// <summary>
    /// Tool window configuration for appearance in Visual Studio's View menu.
    /// </summary>
    public override ToolWindowConfiguration ToolWindowConfiguration => new()
    {
        Placement = ToolWindowPlacement.DocumentWell,
        AllowAutoCreation = true,
    };

    private readonly MessageMediator _mediator;
    private readonly DatabaseManager _databaseManager;
    private readonly ThemeManager _themeManager;
    private readonly CodeAnalyzerService _codeAnalyzer;
    private readonly FileWatcherService _fileWatcher;
    private readonly IGameScriptMessageBroker _messageBroker;
    private bool _isDisposed;

    public GameScriptToolWindow(
        VisualStudioExtensibility extensibility,
        MessageMediator mediator,
        DatabaseManager databaseManager,
        ThemeManager themeManager,
        CodeAnalyzerService codeAnalyzer,
        FileWatcherService fileWatcher,
        IGameScriptMessageBroker messageBroker)
        : base(extensibility)
    {
        Title = "GameScript";
        _mediator = mediator;
        _databaseManager = databaseManager;
        _themeManager = themeManager;
        _codeAnalyzer = codeAnalyzer;
        _fileWatcher = fileWatcher;
        _messageBroker = messageBroker;

        // Subscribe to database change notifications
        _databaseManager.OnChangeNotification += OnDatabaseChange;

        // Subscribe to file watcher events
        _fileWatcher.OnCodeFileChanged += OnCodeFileChanged;
        _fileWatcher.OnNavigateCommand += OnNavigateCommand;

        // Subscribe to theme changes
        _themeManager.OnThemeChanged += OnThemeChanged;

        // Subscribe to message broker for command forwarding (undo/redo/save)
        _messageBroker.MessageRequested += OnBrokerMessageRequested;

        // Initialize handlers
        InitializeHandlers();

        // Initialize theme manager (fire and forget - will send initial state when ready)
        _ = InitializeThemeAsync();
    }

    private async Task InitializeThemeAsync()
    {
        try
        {
            await _themeManager.InitializeAsync();
            // Send initial theme state to UI
            await PostToUIAsync(new
            {
                type = "theme:changed",
                isDark = _themeManager.IsDark
            });
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[GameScriptToolWindow] Failed to initialize theme: {ex.Message}");
        }
    }

    /// <summary>
    /// Configure WebView2 with virtual host mapping for embedded UI files.
    /// </summary>
    public override WebViewConfiguration WebViewConfiguration => new()
    {
        VirtualHostMappings =
        [
            new VirtualHostMapping("gamescript.local", "wwwroot")
        ],
        InitialUri = new Uri("https://gamescript.local/index.html")
    };

    /// <summary>
    /// Handle messages received from JavaScript.
    /// </summary>
    protected override async Task OnMessageReceivedAsync(object message, CancellationToken cancellationToken)
    {
        try
        {
            string? json = message.ToString();
            if (string.IsNullOrEmpty(json))
            {
                return;
            }

            using JsonDocument doc = JsonDocument.Parse(json);
            JsonElement root = doc.RootElement;

            if (!root.TryGetProperty("type", out JsonElement typeElement))
            {
                return;
            }

            string? messageType = typeElement.GetString();
            if (string.IsNullOrEmpty(messageType))
            {
                return;
            }

            await _mediator.HandleAsync(messageType, root, cancellationToken);
        }
        catch (JsonException ex)
        {
            System.Diagnostics.Debug.WriteLine($"[GameScriptToolWindow] Failed to parse message: {ex.Message}");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[GameScriptToolWindow] Error handling message: {ex.Message}");
        }
    }

    /// <summary>
    /// Post a message to the JavaScript UI.
    /// </summary>
    public async Task PostToUIAsync(object message, CancellationToken cancellationToken = default)
    {
        string json = JsonSerializer.Serialize(message, JsonSerializerOptions);
        await PostMessageAsync(json, cancellationToken);
    }

    /// <summary>
    /// Post a typed response message to the UI.
    /// </summary>
    public async Task PostResponseAsync(
        string id,
        string type,
        bool success,
        Dictionary<string, object?>? data = null,
        string? error = null,
        CancellationToken cancellationToken = default)
    {
        Dictionary<string, object?> response = new()
        {
            ["type"] = type,
            ["id"] = id,
            ["success"] = success
        };

        if (data != null)
        {
            foreach (KeyValuePair<string, object?> kvp in data)
            {
                response[kvp.Key] = kvp.Value;
            }
        }

        if (error != null)
        {
            response["error"] = error;
        }

        await PostToUIAsync(response, cancellationToken);
    }

    private void InitializeHandlers()
    {
        HandlerContext context = new(
            this,
            _databaseManager,
            _themeManager,
            _codeAnalyzer,
            _fileWatcher,
            Extensibility);

        // Register all handlers
        DbHandlers.Register(_mediator, context);
        FileHandlers.Register(_mediator, context);
        DialogHandlers.Register(_mediator, context);
        EditorHandlers.Register(_mediator, context);
        NotificationHandlers.Register(_mediator, context);
        CodeHandlers.Register(_mediator, context);
    }

    private async void OnDatabaseChange(ChangeNotification notification)
    {
        try
        {
            await PostToUIAsync(new
            {
                type = "db:changed",
                table = notification.Table,
                operation = notification.Operation,
                rows = notification.Rows,
                timestamp = notification.Timestamp
            });
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[GameScriptToolWindow] Failed to send change notification: {ex.Message}");
        }
    }

    private async void OnCodeFileChanged(int conversationId)
    {
        try
        {
            await PostToUIAsync(new
            {
                type = "code:fileChanged",
                conversationId
            });
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[GameScriptToolWindow] Failed to send code file change: {ex.Message}");
        }
    }

    private async void OnNavigateCommand(string entityType, int id)
    {
        try
        {
            await PostToUIAsync(new
            {
                type = "focus:broadcast",
                table = entityType,
                items = new[] { new { id } }
            });
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[GameScriptToolWindow] Failed to send navigate command: {ex.Message}");
        }
    }

    private async void OnThemeChanged(bool isDark)
    {
        try
        {
            await PostToUIAsync(new
            {
                type = "theme:changed",
                isDark
            });
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[GameScriptToolWindow] Failed to send theme change: {ex.Message}");
        }
    }

    private async void OnBrokerMessageRequested(object? sender, string messageType)
    {
        try
        {
            await PostToUIAsync(new { type = messageType });
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[GameScriptToolWindow] Failed to send broker message '{messageType}': {ex.Message}");
        }
    }

    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    /// <summary>
    /// Dispose the tool window and unsubscribe from all events to prevent memory leaks.
    /// </summary>
    public void Dispose()
    {
        if (_isDisposed)
        {
            return;
        }

        _isDisposed = true;

        // Unsubscribe from all events to prevent memory leaks
        _databaseManager.OnChangeNotification -= OnDatabaseChange;
        _fileWatcher.OnCodeFileChanged -= OnCodeFileChanged;
        _fileWatcher.OnNavigateCommand -= OnNavigateCommand;
        _themeManager.OnThemeChanged -= OnThemeChanged;
        _messageBroker.MessageRequested -= OnBrokerMessageRequested;
    }
}
