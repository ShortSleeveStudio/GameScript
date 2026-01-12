using System.Text.Json;
using Microsoft.VisualStudio.Extensibility.Editor;

namespace GameScript.VisualStudio;

/// <summary>
/// Handlers for editor operations.
/// Implements: editor:openFile, editor:createFile
/// </summary>
public static class EditorHandlers
{
    public static void Register(MessageMediator mediator, HandlerContext context)
    {
        mediator.Register("editor:openFile", (msg, ct) => HandleOpenFile(msg, context, ct));
        mediator.Register("editor:createFile", (msg, ct) => HandleCreateFile(msg, context, ct));
    }

    private static async Task HandleOpenFile(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string filePath = await context.ResolvePathAsync(message.GetOptionalString("filePath") ?? "", ct);
        int line = message.GetOptionalInt("line") ?? 0;
        int column = message.GetOptionalInt("column") ?? 0;

        try
        {
            if (!File.Exists(filePath))
            {
                System.Diagnostics.Debug.WriteLine($"[EditorHandlers] File not found: {filePath}");
                return;
            }

            Uri fileUri = new(filePath);
            TextDocumentAddress address = new(fileUri);

            // TextPosition uses 0-based indices
            TextPosition position = new(Math.Max(0, line), Math.Max(0, column));

            await context.Extensibility.Editor().OpenDocumentAsync(address, position, ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[EditorHandlers] Error opening file: {filePath} - {ex.Message}");
        }
    }

    private static async Task HandleCreateFile(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string? id = message.GetOptionalString("id");
        string filePath = await context.ResolvePathAsync(message.GetOptionalString("filePath") ?? "", ct);
        string content = message.GetOptionalString("content") ?? "";
        bool overwrite = message.GetOptionalBool("overwrite") ?? false;

        try
        {
            if (File.Exists(filePath) && !overwrite)
            {
                if (id != null)
                {
                    await context.PostResponseAsync(id, "editor:createFileResult", false,
                        error: "File already exists", cancellationToken: ct);
                }
                return;
            }

            // Create directory if needed
            FileHelpers.EnsureDirectoryExists(filePath);

            // Write content
            await File.WriteAllTextAsync(filePath, content, ct);

            // Open the file in editor
            Uri fileUri = new(filePath);
            TextDocumentAddress address = new(fileUri);
            await context.Extensibility.Editor().OpenDocumentAsync(address, ct);

            if (id != null)
            {
                await context.PostResponseAsync(id, "editor:createFileResult", true, cancellationToken: ct);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[EditorHandlers] Error creating file: {filePath} - {ex.Message}");
            if (id != null)
            {
                await context.PostResponseAsync(id, "editor:createFileResult", false,
                    error: ex.Message, cancellationToken: ct);
            }
        }
    }
}
