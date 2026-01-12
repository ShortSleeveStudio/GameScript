using System.Text.Json;
using Microsoft.VisualStudio.Extensibility.Shell;

namespace GameScript.VisualStudio;

/// <summary>
/// Handlers for notification operations.
/// Implements: notify, status
///
/// Uses non-modal prompts and status bar messages for better UX consistency.
/// </summary>
public static class NotificationHandlers
{
    private const int DefaultStatusTimeoutMs = 3000;

    public static void Register(MessageMediator mediator, HandlerContext context)
    {
        mediator.Register("notify", (msg, ct) => HandleNotify(msg, context, ct));
        mediator.Register("status", (msg, ct) => HandleStatus(msg, context, ct));
    }

    /// <summary>
    /// Handle notify message - shows prompt notification.
    /// Uses Visual Studio's ShowPromptAsync for user notifications.
    /// </summary>
    private static async Task HandleNotify(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        var text = message.GetOptionalString("message");
        if (string.IsNullOrEmpty(text))
        {
            return;
        }

        var level = message.GetOptionalString("level") ?? "info";
        var detail = message.GetOptionalString("detail");

        var fullMessage = !string.IsNullOrEmpty(detail) ? $"{text}\n\n{detail}" : text;

        try
        {
            // ShowPromptAsync displays a message to the user
            // For errors/warnings, we use the prompt; for info, we could use status bar
            // but prompts ensure the user sees important messages
            if (level.Equals("error", StringComparison.OrdinalIgnoreCase) ||
                level.Equals("warning", StringComparison.OrdinalIgnoreCase))
            {
                await context.Extensibility.Shell().ShowPromptAsync(fullMessage, PromptOptions.OK, ct);
            }
            else
            {
                // For info/success, use status bar which is less intrusive
                await ShowStatusWithTimeoutAsync(context, fullMessage, DefaultStatusTimeoutMs, ct);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[NotificationHandlers] Error showing notification: {ex.Message}");
        }
    }

    /// <summary>
    /// Handle status message - shows text in status bar temporarily.
    /// Uses timeoutMs parameter name to match shared types.
    /// </summary>
    private static async Task HandleStatus(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        var text = message.GetOptionalString("message");
        if (string.IsNullOrEmpty(text))
        {
            return;
        }

        // Support both 'timeoutMs' (from shared types) and 'timeout' (legacy)
        var timeout = message.GetOptionalInt("timeoutMs")
            ?? message.GetOptionalInt("timeout")
            ?? DefaultStatusTimeoutMs;

        try
        {
            await ShowStatusWithTimeoutAsync(context, text, timeout, ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[NotificationHandlers] Error showing status: {ex.Message}");
        }
    }

    /// <summary>
    /// Show a status bar message that auto-clears after the specified timeout.
    /// </summary>
    private static async Task ShowStatusWithTimeoutAsync(
        HandlerContext context,
        string message,
        int timeoutMs,
        CancellationToken ct)
    {
        // ShowStatusMessageAsync returns a disposable that clears the message when disposed
        using var status = await context.Extensibility.Shell().ShowStatusMessageAsync(message, ct);

        if (timeoutMs > 0)
        {
            // Wait for the timeout, then the using block will dispose and clear the message
            await Task.Delay(timeoutMs, ct);
        }
    }
}
