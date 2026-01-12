using System.Text.Json;
using Microsoft.VisualStudio.Extensibility.Editor;
using Microsoft.VisualStudio.Extensibility.Shell;

namespace GameScript.VisualStudio;

/// <summary>
/// Handlers for code operations.
/// Implements: code:getMethod, code:createMethod, code:deleteMethod,
/// code:deleteMethodsSilent, code:restoreMethod, code:openMethod,
/// code:watchFolder, code:deleteFile, code:restoreFile, snapshot:watchFolder
/// </summary>
public static class CodeHandlers
{
    public static void Register(MessageMediator mediator, HandlerContext context)
    {
        mediator.Register("code:getMethod", (msg, ct) => HandleGetMethod(msg, context, ct));
        mediator.Register("code:createMethod", (msg, ct) => HandleCreateMethod(msg, context, ct));
        mediator.Register("code:deleteMethod", (msg, ct) => HandleDeleteMethod(msg, context, ct));
        mediator.Register("code:deleteMethodsSilent", (msg, ct) => HandleDeleteMethodsSilent(msg, context, ct));
        mediator.Register("code:restoreMethod", (msg, ct) => HandleRestoreMethod(msg, context, ct));
        mediator.Register("code:openMethod", (msg, ct) => HandleOpenMethod(msg, context, ct));
        mediator.Register("code:watchFolder", (msg, ct) => HandleWatchFolder(msg, context, ct));
        mediator.Register("code:deleteFile", (msg, ct) => HandleDeleteFile(msg, context, ct));
        mediator.Register("code:restoreFile", (msg, ct) => HandleRestoreFile(msg, context, ct));
        mediator.Register("snapshot:watchFolder", (msg, ct) => HandleSnapshotWatchFolder(msg, context, ct));
    }

    private static async Task HandleGetMethod(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        int conversationId = message.GetRequiredInt("conversationId");
        string methodName = message.GetRequiredString("methodName");
        string extension = message.GetOptionalString("fileExtension") ?? context.CodeFileExtension;

        try
        {
            string filePath = await GetConversationFilePathAsync(conversationId, extension, context, ct);

            if (!File.Exists(filePath))
            {
                await context.PostResponseAsync(id, "code:methodResult", false,
                    error: "Code file not found. Enable a condition or action to create it.",
                    cancellationToken: ct);
                return;
            }

            string sourceCode = await File.ReadAllTextAsync(filePath, ct);
            MethodInfo? methodInfo = context.CodeAnalyzer.FindMethod(sourceCode, methodName, extension);

            if (methodInfo != null)
            {
                await context.PostResponseAsync(id, "code:methodResult", true, new Dictionary<string, object?>
                {
                    ["body"] = methodInfo.Body,
                    ["fullText"] = methodInfo.FullText,
                    ["filePath"] = filePath,
                    ["lineNumber"] = methodInfo.LineNumber
                }, cancellationToken: ct);
            }
            else
            {
                await context.PostResponseAsync(id, "code:methodResult", false,
                    error: $"Method '{methodName}' not found",
                    cancellationToken: ct);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[CodeHandlers] Error getting method: {methodName} - {ex.Message}");
            await context.PostResponseAsync(id, "code:methodResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleCreateMethod(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        int conversationId = message.GetRequiredInt("conversationId");
        string methodName = message.GetRequiredString("methodName");
        string methodStub = message.GetRequiredString("methodStub");
        string fileContent = message.GetOptionalString("fileContent") ?? "";
        string extension = message.GetOptionalString("fileExtension") ?? context.CodeFileExtension;

        try
        {
            string filePath = await GetConversationFilePathAsync(conversationId, extension, context, ct);
            FileHelpers.EnsureDirectoryExists(filePath);

            string newContent;
            if (File.Exists(filePath))
            {
                string existing = await File.ReadAllTextAsync(filePath, ct);
                int insertionOffset = context.CodeAnalyzer.GetInsertionOffset(existing, extension);

                // Insert method before closing brace
                newContent = existing.Substring(0, insertionOffset) +
                             "\n" + methodStub + "\n" +
                             existing.Substring(insertionOffset);
            }
            else
            {
                newContent = fileContent;
            }

            await File.WriteAllTextAsync(filePath, newContent, ct);

            // Open the file and navigate to the method
            MethodInfo? methodInfo = context.CodeAnalyzer.FindMethod(newContent, methodName, extension);
            int line = methodInfo?.LineNumber ?? 0;

            Uri fileUri = new(filePath);
            TextDocumentAddress address = new(fileUri);
            TextPosition position = new(line, 0);
            await context.Extensibility.Editor().OpenDocumentAsync(address, position, ct);

            await context.PostResponseAsync(id, "code:createResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[CodeHandlers] Error creating method: {methodName} - {ex.Message}");
            await context.PostResponseAsync(id, "code:createResult", false, error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleDeleteMethod(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        int conversationId = message.GetRequiredInt("conversationId");
        string methodName = message.GetRequiredString("methodName");
        string extension = message.GetOptionalString("fileExtension") ?? context.CodeFileExtension;

        try
        {
            string filePath = await GetConversationFilePathAsync(conversationId, extension, context, ct);

            if (!File.Exists(filePath))
            {
                await context.PostToUIAsync(new
                {
                    type = "code:deleteResult",
                    id,
                    accepted = false,
                    error = "File not found"
                }, ct);
                return;
            }

            string sourceCode = await File.ReadAllTextAsync(filePath, ct);
            MethodInfo? methodInfo = context.CodeAnalyzer.FindMethod(sourceCode, methodName, extension);

            if (methodInfo == null)
            {
                // Method not found - treat as already deleted
                await context.PostToUIAsync(new
                {
                    type = "code:deleteResult",
                    id,
                    accepted = true
                }, ct);
                return;
            }

            // Show confirmation dialog
            bool result = await context.Extensibility.Shell().ShowPromptAsync(
                $"Delete method '{methodName}'?\n\n{methodInfo.Body}",
                PromptOptions.OKCancel,
                ct);

            if (result)
            {
                // Delete the method
                string newContent = sourceCode.Substring(0, methodInfo.StartOffset) +
                                 sourceCode.Substring(methodInfo.EndOffset);

                await File.WriteAllTextAsync(filePath, newContent, ct);

                await context.PostToUIAsync(new
                {
                    type = "code:deleteResult",
                    id,
                    accepted = true
                }, ct);
            }
            else
            {
                await context.PostToUIAsync(new
                {
                    type = "code:deleteResult",
                    id,
                    accepted = false
                }, ct);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[CodeHandlers] Error deleting method: {methodName} - {ex.Message}");
            await context.PostToUIAsync(new
            {
                type = "code:deleteResult",
                id,
                accepted = false,
                error = ex.Message
            }, ct);
        }
    }

    private static async Task HandleDeleteMethodsSilent(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        int conversationId = message.GetRequiredInt("conversationId");
        List<string> methodNames = message.GetOptionalStringArray("methodNames") ?? new List<string>();
        string extension = message.GetOptionalString("fileExtension") ?? context.CodeFileExtension;

        try
        {
            string filePath = await GetConversationFilePathAsync(conversationId, extension, context, ct);
            Dictionary<string, string> deletedMethods = new();

            if (!File.Exists(filePath))
            {
                await context.PostResponseAsync(id, "code:deleteMethodsSilentResult", true,
                    new Dictionary<string, object?> { ["deletedMethods"] = deletedMethods },
                    cancellationToken: ct);
                return;
            }

            string sourceCode = await File.ReadAllTextAsync(filePath, ct);

            // Collect all method ranges (sorted by offset descending for safe deletion)
            List<(string Name, int Start, int End, string Text)> methodRanges = new();

            foreach (string methodName in methodNames)
            {
                MethodInfo? methodInfo = context.CodeAnalyzer.FindMethod(sourceCode, methodName, extension);
                if (methodInfo != null)
                {
                    deletedMethods[methodName] = methodInfo.FullText;
                    methodRanges.Add((methodName, methodInfo.StartOffset, methodInfo.EndOffset, methodInfo.FullText));
                }
                else
                {
                    deletedMethods[methodName] = "";
                }
            }

            // Sort by start offset descending (delete from end to start)
            methodRanges.Sort((a, b) => b.Start.CompareTo(a.Start));

            // Delete all methods
            foreach ((string _, int start, int end, string _) in methodRanges)
            {
                sourceCode = sourceCode.Substring(0, start) + sourceCode.Substring(end);
            }

            await File.WriteAllTextAsync(filePath, sourceCode, ct);

            await context.PostResponseAsync(id, "code:deleteMethodsSilentResult", true,
                new Dictionary<string, object?> { ["deletedMethods"] = deletedMethods },
                cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[CodeHandlers] Error deleting methods - {ex.Message}");
            await context.PostResponseAsync(id, "code:deleteMethodsSilentResult", false,
                error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleRestoreMethod(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        int conversationId = message.GetRequiredInt("conversationId");
        string methodName = message.GetOptionalString("methodName") ?? "";
        string? code = message.GetOptionalString("code");
        string extension = message.GetOptionalString("fileExtension") ?? context.CodeFileExtension;
        string? fileContent = message.GetOptionalString("fileContent");

        // Nothing to restore
        if (string.IsNullOrEmpty(code))
        {
            await context.PostResponseAsync(id, "code:restoreMethodResult", true, cancellationToken: ct);
            return;
        }

        try
        {
            string filePath = await GetConversationFilePathAsync(conversationId, extension, context, ct);

            if (File.Exists(filePath))
            {
                string existing = await File.ReadAllTextAsync(filePath, ct);
                int insertionOffset = context.CodeAnalyzer.GetInsertionOffset(existing, extension);

                // Insert method before closing brace
                string newContent = existing.Substring(0, insertionOffset) +
                                 "\n" + code.Trim() + "\n" +
                                 existing.Substring(insertionOffset);

                await File.WriteAllTextAsync(filePath, newContent, ct);
            }
            else if (!string.IsNullOrEmpty(fileContent))
            {
                FileHelpers.EnsureDirectoryExists(filePath);
                await File.WriteAllTextAsync(filePath, fileContent, ct);
            }
            else
            {
                await context.PostResponseAsync(id, "code:restoreMethodResult", false,
                    error: "File not found and no file content provided",
                    cancellationToken: ct);
                return;
            }

            await context.PostResponseAsync(id, "code:restoreMethodResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[CodeHandlers] Error restoring method - {ex.Message}");
            await context.PostResponseAsync(id, "code:restoreMethodResult", false,
                error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleOpenMethod(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        int conversationId = message.GetRequiredInt("conversationId");
        string methodName = message.GetRequiredString("methodName");
        string extension = message.GetOptionalString("fileExtension") ?? context.CodeFileExtension;

        try
        {
            string filePath = await GetConversationFilePathAsync(conversationId, extension, context, ct);

            if (!File.Exists(filePath))
            {
                return;
            }

            string sourceCode = await File.ReadAllTextAsync(filePath, ct);
            MethodInfo? methodInfo = context.CodeAnalyzer.FindMethod(sourceCode, methodName, extension);
            int line = methodInfo?.LineNumber ?? 0;

            Uri fileUri = new(filePath);
            TextDocumentAddress address = new(fileUri);
            TextPosition position = new(line, 0);
            await context.Extensibility.Editor().OpenDocumentAsync(address, position, ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[CodeHandlers] Error opening method: {methodName} - {ex.Message}");
        }
    }

    private static async Task HandleWatchFolder(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string? folderPath = message.GetOptionalString("folderPath");
        string extension = message.GetOptionalString("fileExtension") ?? ".cs";

        // Store in context for use by GetConversationFilePathAsync
        context.CodeOutputFolder = folderPath;
        context.CodeFileExtension = extension;

        if (string.IsNullOrEmpty(folderPath))
        {
            context.FileWatcher.ClearCodeWatch();
            return;
        }

        string? workspacePath = await context.GetWorkspacePathAsync(ct);
        if (string.IsNullOrEmpty(workspacePath))
        {
            return;
        }

        string absolutePath = Path.Combine(workspacePath, folderPath);
        context.FileWatcher.SetCodeWatchPath(absolutePath, extension);
    }

    private static async Task HandleDeleteFile(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        int conversationId = message.GetRequiredInt("conversationId");
        string extension = message.GetOptionalString("fileExtension") ?? context.CodeFileExtension;

        try
        {
            string filePath = await GetConversationFilePathAsync(conversationId, extension, context, ct);

            if (!File.Exists(filePath))
            {
                await context.PostResponseAsync(id, "code:deleteFileResult", true,
                    new Dictionary<string, object?> { ["fileContent"] = null },
                    cancellationToken: ct);
                return;
            }

            string fileContent = await File.ReadAllTextAsync(filePath, ct);
            File.Delete(filePath);

            await context.PostResponseAsync(id, "code:deleteFileResult", true,
                new Dictionary<string, object?> { ["fileContent"] = fileContent },
                cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[CodeHandlers] Error deleting file - {ex.Message}");
            await context.PostResponseAsync(id, "code:deleteFileResult", false,
                error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleRestoreFile(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string id = message.GetRequiredString("id");
        int conversationId = message.GetRequiredInt("conversationId");
        string fileContent = message.GetRequiredString("fileContent");
        string extension = message.GetOptionalString("fileExtension") ?? context.CodeFileExtension;

        try
        {
            string filePath = await GetConversationFilePathAsync(conversationId, extension, context, ct);
            FileHelpers.EnsureDirectoryExists(filePath);
            await File.WriteAllTextAsync(filePath, fileContent, ct);

            await context.PostResponseAsync(id, "code:restoreFileResult", true, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[CodeHandlers] Error restoring file - {ex.Message}");
            await context.PostResponseAsync(id, "code:restoreFileResult", false,
                error: ex.Message, cancellationToken: ct);
        }
    }

    private static async Task HandleSnapshotWatchFolder(JsonElement message, HandlerContext context, CancellationToken ct)
    {
        string? folderPath = message.GetOptionalString("folderPath");

        if (string.IsNullOrEmpty(folderPath))
        {
            context.FileWatcher.ClearSnapshotWatch();
            return;
        }

        string? workspacePath = await context.GetWorkspacePathAsync(ct);
        if (string.IsNullOrEmpty(workspacePath))
        {
            return;
        }

        string absolutePath = Path.Combine(workspacePath, folderPath);
        context.FileWatcher.SetSnapshotWatchPath(absolutePath);
    }

    /// <summary>
    /// Get the file path for a conversation's code file.
    /// </summary>
    private static async Task<string> GetConversationFilePathAsync(
        int conversationId,
        string extension,
        HandlerContext context,
        CancellationToken ct)
    {
        if (conversationId <= 0)
        {
            throw new ArgumentException($"Invalid conversation ID: {conversationId}");
        }

        string folder = context.CodeOutputFolder ?? "GameScript/Code";

        if (folder.Contains(".."))
        {
            throw new ArgumentException("Invalid folder path: contains path traversal");
        }

        string workspacePath = await context.GetWorkspacePathAsync(ct) ?? "";
        return Path.Combine(workspacePath, folder, $"conv_{conversationId}{extension}");
    }
}
