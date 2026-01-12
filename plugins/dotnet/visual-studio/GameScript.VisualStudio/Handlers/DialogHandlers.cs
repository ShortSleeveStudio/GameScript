using System.Text.Json;
using Microsoft.VisualStudio.Extensibility.Shell;

namespace GameScript.VisualStudio;

/// <summary>
/// Handlers for native dialog operations.
/// Implements: dialog:openSqlite, dialog:saveSqlite, dialog:openCsv,
/// dialog:saveCsv, dialog:selectFolder
/// </summary>
public static class DialogHandlers
{
    public static void Register(MessageMediator mediator, HandlerContext context)
    {
        mediator.Register("dialog:openSqlite", (msg, ct) => HandleOpenSqlite(msg, context, ct));
        mediator.Register("dialog:saveSqlite", (msg, ct) => HandleSaveSqlite(msg, context, ct));
        mediator.Register("dialog:openCsv", (msg, ct) => HandleOpenCsv(msg, context, ct));
        mediator.Register("dialog:saveCsv", (msg, ct) => HandleSaveCsv(msg, context, ct));
        mediator.Register("dialog:selectFolder", (msg, ct) => HandleSelectFolder(msg, context, ct));
    }

    private static async Task HandleOpenSqlite(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");

        OpenFileDialogOptions options = new()
        {
            Title = "Open SQLite Database",
            Filters =
            {
                new FileDialogFilter("SQLite Database", ".db", ".sqlite", ".sqlite3"),
                new FileDialogFilter("All Files", ".*")
            }
        };

        await ShowOpenFileDialogAsync(id, options, context, ct);
    }

    private static async Task HandleSaveSqlite(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string defaultName = message.GetOptionalString("defaultName") ?? "database.db";

        SaveAsFileDialogOptions options = new()
        {
            Title = "Save SQLite Database",
            DefaultFileName = defaultName,
            Filters =
            {
                new FileDialogFilter("SQLite Database", ".db", ".sqlite", ".sqlite3"),
                new FileDialogFilter("All Files", ".*")
            }
        };

        await ShowSaveFileDialogAsync(id, options, context, ct);
    }

    private static async Task HandleOpenCsv(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");

        OpenFileDialogOptions options = new()
        {
            Title = "Open CSV File",
            Filters =
            {
                new FileDialogFilter("CSV Files", ".csv"),
                new FileDialogFilter("All Files", ".*")
            }
        };

        await ShowOpenFileDialogAsync(id, options, context, ct);
    }

    private static async Task HandleSaveCsv(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string defaultName = message.GetOptionalString("defaultName") ?? "export.csv";

        SaveAsFileDialogOptions options = new()
        {
            Title = "Save CSV File",
            DefaultFileName = defaultName,
            Filters =
            {
                new FileDialogFilter("CSV Files", ".csv"),
                new FileDialogFilter("All Files", ".*")
            }
        };

        await ShowSaveFileDialogAsync(id, options, context, ct);
    }

    private static async Task HandleSelectFolder(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string title = message.GetOptionalString("title") ?? "Select Folder";

        try
        {
            OpenFolderDialogOptions options = new()
            {
                Title = title
            };

            Uri? folderUri = await context.Extensibility.Shell().ShowOpenFolderDialogAsync(options, ct);

            if (folderUri != null)
            {
                string chosenPath = folderUri.LocalPath;
                string? workspacePath = await context.GetWorkspacePathAsync(ct);

                // Convert to relative path if within workspace
                string? relativePath = null;
                if (!string.IsNullOrEmpty(workspacePath) && chosenPath.StartsWith(workspacePath, StringComparison.OrdinalIgnoreCase))
                {
                    relativePath = chosenPath.Substring(workspacePath.Length).TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                    if (string.IsNullOrEmpty(relativePath))
                    {
                        relativePath = ".";
                    }
                }

                if (relativePath != null)
                {
                    await SendDialogResultAsync(id, false, relativePath, context, ct);
                }
                else
                {
                    // Folder outside workspace - show error via prompt
                    await context.Extensibility.Shell().ShowPromptAsync(
                        "Selected folder must be within the workspace.",
                        PromptOptions.OK,
                        ct);

                    await SendDialogCancelledAsync(id, context, ct);
                }
            }
            else
            {
                await SendDialogCancelledAsync(id, context, ct);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DialogHandlers] Error showing folder dialog: {ex.Message}");
            await context.PostResponseAsync(id, "dialog:result", false, error: ex.Message, cancellationToken: ct);
        }
    }

    /// <summary>
    /// Helper to show an open file dialog and send the result.
    /// </summary>
    private static async Task ShowOpenFileDialogAsync(
        string id,
        OpenFileDialogOptions options,
        HandlerContext context,
        CancellationToken ct)
    {
        try
        {
            Uri? fileUri = await context.Extensibility.Shell().ShowOpenFileDialogAsync(options, ct);

            if (fileUri != null)
            {
                await SendDialogResultAsync(id, false, fileUri.LocalPath, context, ct);
            }
            else
            {
                await SendDialogCancelledAsync(id, context, ct);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DialogHandlers] Error showing open dialog: {ex.Message}");
            await context.PostResponseAsync(id, "dialog:result", false, error: ex.Message, cancellationToken: ct);
        }
    }

    /// <summary>
    /// Helper to show a save file dialog and send the result.
    /// </summary>
    private static async Task ShowSaveFileDialogAsync(
        string id,
        SaveAsFileDialogOptions options,
        HandlerContext context,
        CancellationToken ct)
    {
        try
        {
            Uri? fileUri = await context.Extensibility.Shell().ShowSaveAsFileDialogAsync(options, ct);

            if (fileUri != null)
            {
                await SendDialogResultAsync(id, false, fileUri.LocalPath, context, ct);
            }
            else
            {
                await SendDialogCancelledAsync(id, context, ct);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DialogHandlers] Error showing save dialog: {ex.Message}");
            await context.PostResponseAsync(id, "dialog:result", false, error: ex.Message, cancellationToken: ct);
        }
    }

    /// <summary>
    /// Send a successful dialog result with a file path.
    /// </summary>
    private static Task SendDialogResultAsync(
        string id,
        bool cancelled,
        string filePath,
        HandlerContext context,
        CancellationToken ct)
    {
        return context.PostResponseAsync(id, "dialog:result", true, new Dictionary<string, object?>
        {
            ["cancelled"] = cancelled,
            ["filePath"] = filePath
        }, cancellationToken: ct);
    }

    /// <summary>
    /// Send a cancelled dialog result.
    /// </summary>
    private static Task SendDialogCancelledAsync(
        string id,
        HandlerContext context,
        CancellationToken ct)
    {
        return context.PostResponseAsync(id, "dialog:result", true, new Dictionary<string, object?>
        {
            ["cancelled"] = true
        }, cancellationToken: ct);
    }
}
