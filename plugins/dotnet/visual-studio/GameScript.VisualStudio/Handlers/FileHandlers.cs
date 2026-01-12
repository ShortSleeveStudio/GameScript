using System.Text.Json;

namespace GameScript.VisualStudio;

/// <summary>
/// Handlers for file operations.
/// Implements: file:read, file:write, file:create, file:append, file:mkdir,
/// file:writeBinary, file:rename, file:exists
/// </summary>
public static class FileHandlers
{
    public static void Register(MessageMediator mediator, HandlerContext context)
    {
        mediator.Register("file:read", (msg, ct) => HandleRead(msg, context, ct));
        mediator.Register("file:write", (msg, ct) => HandleWrite(msg, context, ct));
        mediator.Register("file:create", (msg, ct) => HandleCreate(msg, context, ct));
        mediator.Register("file:append", (msg, ct) => HandleAppend(msg, context, ct));
        mediator.Register("file:mkdir", (msg, ct) => HandleMkdir(msg, context, ct));
        mediator.Register("file:writeBinary", (msg, ct) => HandleWriteBinary(msg, context, ct));
        mediator.Register("file:rename", (msg, ct) => HandleRename(msg, context, ct));
        mediator.Register("file:exists", (msg, ct) => HandleExists(msg, context, ct));
    }

    private static async Task HandleRead(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string filePath = await context.ResolvePathAsync(message.GetOptionalString("filePath") ?? "", ct);

        try
        {
            string content = await File.ReadAllTextAsync(filePath, ct);
            await context.PostResponseAsync(id, "file:readResult", true, new Dictionary<string, object?>
            {
                ["content"] = content
            }, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[FileHandlers] Error reading file: {filePath} - {ex.Message}");
            await context.PostResponseAsync(id, "file:readResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleWrite(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string filePath = await context.ResolvePathAsync(message.GetOptionalString("filePath") ?? "", ct);
        string content = message.GetOptionalString("content") ?? "";

        try
        {
            FileHelpers.EnsureDirectoryExists(filePath);
            await File.WriteAllTextAsync(filePath, content, ct);
            await context.PostResponseAsync(id, "file:writeResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[FileHandlers] Error writing file: {filePath} - {ex.Message}");
            await context.PostResponseAsync(id, "file:writeResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleCreate(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string filePath = await context.ResolvePathAsync(message.GetOptionalString("filePath") ?? "", ct);

        try
        {
            FileHelpers.EnsureDirectoryExists(filePath);
            // Always create empty file (matches VSCode's file:create behavior)
            await File.WriteAllTextAsync(filePath, "", ct);
            await context.PostResponseAsync(id, "file:createResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[FileHandlers] Error creating file: {filePath} - {ex.Message}");
            await context.PostResponseAsync(id, "file:createResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleAppend(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string filePath = await context.ResolvePathAsync(message.GetOptionalString("filePath") ?? "", ct);
        string content = message.GetOptionalString("content") ?? "";

        try
        {
            FileHelpers.EnsureDirectoryExists(filePath);
            await File.AppendAllTextAsync(filePath, content, ct);
            await context.PostResponseAsync(id, "file:appendResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[FileHandlers] Error appending to file: {filePath} - {ex.Message}");
            await context.PostResponseAsync(id, "file:appendResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleMkdir(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string dirPath = await context.ResolvePathAsync(message.GetOptionalString("dirPath") ?? "", ct);

        try
        {
            Directory.CreateDirectory(dirPath);
            await context.PostResponseAsync(id, "file:mkdirResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[FileHandlers] Error creating directory: {dirPath} - {ex.Message}");
            await context.PostResponseAsync(id, "file:mkdirResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleWriteBinary(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string filePath = await context.ResolvePathAsync(message.GetOptionalString("filePath") ?? "", ct);
        string contentBase64 = message.GetOptionalString("contentBase64") ?? "";

        try
        {
            byte[] bytes = Convert.FromBase64String(contentBase64);
            FileHelpers.EnsureDirectoryExists(filePath);
            await File.WriteAllBytesAsync(filePath, bytes, ct);
            await context.PostResponseAsync(id, "file:writeBinaryResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[FileHandlers] Error writing binary file: {filePath} - {ex.Message}");
            await context.PostResponseAsync(id, "file:writeBinaryResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleRename(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string oldPath = await context.ResolvePathAsync(message.GetOptionalString("oldPath") ?? "", ct);
        string newPath = await context.ResolvePathAsync(message.GetOptionalString("newPath") ?? "", ct);

        try
        {
            FileHelpers.EnsureDirectoryExists(newPath);
            File.Move(oldPath, newPath);
            await context.PostResponseAsync(id, "file:renameResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[FileHandlers] Error renaming file: {oldPath} -> {newPath} - {ex.Message}");
            await context.PostResponseAsync(id, "file:renameResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleExists(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        string filePath = await context.ResolvePathAsync(message.GetOptionalString("filePath") ?? "", ct);

        try
        {
            bool exists = File.Exists(filePath) || Directory.Exists(filePath);
            await context.PostResponseAsync(id, "file:existsResult", true, new Dictionary<string, object?>
            {
                ["exists"] = exists
            }, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[FileHandlers] Error checking file existence: {filePath} - {ex.Message}");
            await context.PostResponseAsync(id, "file:existsResult", false, error: ex.Message, cancellationToken: ct);
        }
    }
}
