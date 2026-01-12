using Microsoft.VisualStudio.Extensibility;
using Microsoft.VisualStudio.Extensibility.Shell;

namespace GameScript.VisualStudio;

/// <summary>
/// Manages theme state and notifications for the GameScript UI.
///
/// WebViewToolWindow automatically injects --vscode-* CSS variables that update
/// in real-time with theme changes. This manager provides:
/// 1. Initial theme state detection (dark/light)
/// 2. Theme change notifications to the UI for any JS logic that needs isDark flag
/// </summary>
public sealed class ThemeManager : IDisposable
{
    private readonly VisualStudioExtensibility _extensibility;
    private bool _isDark;
    private bool _isDisposed;
    private bool _isSubscribed;

    /// <summary>
    /// Fired when the theme changes. Parameter is true if dark theme.
    /// </summary>
    public event Action<bool>? OnThemeChanged;

    /// <summary>
    /// Gets whether the current theme is dark.
    /// </summary>
    public bool IsDark => _isDark;

    public ThemeManager(VisualStudioExtensibility extensibility)
    {
        _extensibility = extensibility;
    }

    /// <summary>
    /// Initialize the theme manager and subscribe to theme changes.
    /// Call this after the extension is fully initialized.
    /// </summary>
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        if (_isDisposed)
        {
            return;
        }

        try
        {
            // Get initial theme state
            IShellService shell = _extensibility.Shell();
            ThemeInfo themeInfo = await shell.GetThemeInfoAsync(cancellationToken);
            _isDark = themeInfo.ThemeCategory == ThemeCategory.Dark || themeInfo.IsHighContrast;

            // Subscribe to theme changes
            shell.ThemeChanged += OnShellThemeChanged;
            _isSubscribed = true;

            System.Diagnostics.Debug.WriteLine($"[ThemeManager] Initialized. IsDark: {_isDark}");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[ThemeManager] Failed to initialize: {ex.Message}");
            // Default to dark theme on failure
            _isDark = true;
        }
    }

    private void OnShellThemeChanged(object? sender, ThemeChangedEventArgs args)
    {
        if (_isDisposed)
        {
            return;
        }

        bool wasDark = _isDark;
        _isDark = args.NewThemeInfo.ThemeCategory == ThemeCategory.Dark ||
                  args.NewThemeInfo.IsHighContrast;

        if (_isDark != wasDark)
        {
            System.Diagnostics.Debug.WriteLine($"[ThemeManager] Theme changed. IsDark: {_isDark}");
            OnThemeChanged?.Invoke(_isDark);
        }
    }

    public void Dispose()
    {
        if (_isDisposed)
        {
            return;
        }

        _isDisposed = true;

        // Only unsubscribe if we successfully subscribed
        if (_isSubscribed)
        {
            try
            {
                _extensibility.Shell().ThemeChanged -= OnShellThemeChanged;
            }
            catch
            {
                // Ignore disposal errors
            }
        }
    }
}
