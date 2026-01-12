namespace GameScript.VisualStudio;

/// <summary>
/// Result of finding a method in source code.
/// </summary>
public sealed class MethodInfo
{
    public required string Name { get; init; }
    public required string Body { get; init; }
    public required string FullText { get; init; }
    public required int LineNumber { get; init; }
    public required int StartOffset { get; init; }
    public required int EndOffset { get; init; }
}

/// <summary>
/// Interface for language-specific code analyzers.
/// </summary>
public interface ILanguageAnalyzer
{
    /// <summary>
    /// Find a method by name in source code.
    /// </summary>
    MethodInfo? FindMethod(string sourceCode, string methodName);

    /// <summary>
    /// Get the offset where new methods should be inserted (before closing brace).
    /// </summary>
    int GetInsertionOffset(string sourceCode);
}

/// <summary>
/// Unified code analysis service that delegates to language-specific analyzers.
/// Supports C# (Roslyn), C++ (Tree-sitter), and GDScript (GDShrapt).
/// </summary>
public sealed class CodeAnalyzerService
{
    private readonly CSharpAnalyzer _csharpAnalyzer = new();
    private readonly CppAnalyzer _cppAnalyzer = new();
    private readonly GDScriptAnalyzer _gdscriptAnalyzer = new();

    /// <summary>
    /// Get the appropriate analyzer for a file extension.
    /// </summary>
    public ILanguageAnalyzer GetAnalyzerForExtension(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".cs" => _csharpAnalyzer,
            ".cpp" or ".h" or ".hpp" or ".cc" or ".inl" => _cppAnalyzer,
            ".gd" => _gdscriptAnalyzer,
            _ => _csharpAnalyzer // Default to C#
        };
    }

    /// <summary>
    /// Find a method in a file by reading its content.
    /// </summary>
    public async Task<MethodInfo?> FindMethodAsync(string filePath, string methodName, CancellationToken ct = default)
    {
        if (!File.Exists(filePath))
        {
            return null;
        }

        var extension = Path.GetExtension(filePath);
        var analyzer = GetAnalyzerForExtension(extension);
        var sourceCode = await File.ReadAllTextAsync(filePath, ct);

        return analyzer.FindMethod(sourceCode, methodName);
    }

    /// <summary>
    /// Find a method in source code using the specified file extension to determine language.
    /// </summary>
    public MethodInfo? FindMethod(string sourceCode, string methodName, string fileExtension)
    {
        var analyzer = GetAnalyzerForExtension(fileExtension);
        return analyzer.FindMethod(sourceCode, methodName);
    }

    /// <summary>
    /// Get the insertion offset for new methods.
    /// </summary>
    public int GetInsertionOffset(string sourceCode, string fileExtension)
    {
        var analyzer = GetAnalyzerForExtension(fileExtension);
        return analyzer.GetInsertionOffset(sourceCode);
    }
}
