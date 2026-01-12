using TreeSitter;

namespace GameScript.VisualStudio;

/// <summary>
/// C++ code analyzer using Tree-sitter.
/// Finds functions with UFUNCTION() macros (Unreal Engine pattern).
/// </summary>
public sealed class CppAnalyzer : ILanguageAnalyzer
{
    private readonly Language _language;

    public CppAnalyzer()
    {
        _language = new Language("Cpp");
    }

    public MethodInfo? FindMethod(string sourceCode, string methodName)
    {
        if (string.IsNullOrEmpty(sourceCode))
        {
            return null;
        }

        using var parser = new Parser(_language);
        using var tree = parser.Parse(sourceCode);
        var rootNode = tree.RootNode;

        // Query for function definitions
        var queryString = @"
(function_definition
    declarator: (function_declarator
        declarator: (identifier) @func_name)) @func_def";

        using var query = new Query(_language, queryString);
        using var cursor = new QueryCursor();

        foreach (var match in cursor.Exec(query, rootNode))
        {
            string? foundName = null;
            Node? funcDefNode = null;

            foreach (var capture in match.Captures)
            {
                if (capture.Name == "func_name")
                {
                    foundName = capture.Node.GetText(sourceCode);
                }
                else if (capture.Name == "func_def")
                {
                    funcDefNode = capture.Node;
                }
            }

            if (foundName == methodName && funcDefNode != null)
            {
                // Find the full range including UFUNCTION macro if present
                var (startOffset, endOffset) = GetFullFunctionRange(sourceCode, funcDefNode);
                var fullText = sourceCode.Substring(startOffset, endOffset - startOffset);

                // Get body text (the compound_statement)
                var bodyText = "";
                for (uint i = 0; i < funcDefNode.ChildCount; i++)
                {
                    var child = funcDefNode.Child(i);
                    if (child.Type == "compound_statement")
                    {
                        bodyText = child.GetText(sourceCode);
                        break;
                    }
                }

                return new MethodInfo
                {
                    Name = methodName,
                    Body = bodyText.Trim(),
                    FullText = fullText,
                    LineNumber = (int)funcDefNode.StartPoint.Row,
                    StartOffset = startOffset,
                    EndOffset = endOffset
                };
            }
        }

        return null;
    }

    public int GetInsertionOffset(string sourceCode)
    {
        if (string.IsNullOrEmpty(sourceCode))
        {
            return 0;
        }

        // Find the last closing brace (class/namespace end)
        var lastBrace = sourceCode.LastIndexOf('}');
        return lastBrace != -1 ? lastBrace : sourceCode.Length;
    }

    /// <summary>
    /// Get the full function range including any preceding UFUNCTION macro.
    /// </summary>
    private static (int Start, int End) GetFullFunctionRange(string sourceCode, Node funcDefNode)
    {
        var startOffset = (int)funcDefNode.StartByte;
        var endOffset = (int)funcDefNode.EndByte;

        // Look backwards for UFUNCTION/UPROPERTY macros
        var lineStart = startOffset;
        while (lineStart > 0 && sourceCode[lineStart - 1] != '\n')
        {
            lineStart--;
        }

        // Check previous lines for Unreal macros
        var checkPos = lineStart;
        while (checkPos > 0)
        {
            // Move to previous line
            if (sourceCode[checkPos - 1] != '\n')
            {
                break;
            }

            var prevLineEnd = checkPos - 1;
            var prevLineStart = prevLineEnd;
            while (prevLineStart > 0 && sourceCode[prevLineStart - 1] != '\n')
            {
                prevLineStart--;
            }

            var prevLine = sourceCode.Substring(prevLineStart, prevLineEnd - prevLineStart).Trim();

            // Check for Unreal macros or C++ attributes
            if (prevLine.StartsWith("UFUNCTION") ||
                prevLine.StartsWith("UPROPERTY") ||
                prevLine.StartsWith("UCLASS") ||
                prevLine.StartsWith("USTRUCT") ||
                prevLine.StartsWith("[["))
            {
                startOffset = prevLineStart;
                checkPos = prevLineStart;
            }
            else if (string.IsNullOrEmpty(prevLine))
            {
                // Empty line - continue checking
                checkPos = prevLineStart;
            }
            else
            {
                break;
            }
        }

        // Include trailing newline for clean deletion
        if (endOffset < sourceCode.Length && sourceCode[endOffset] == '\n')
        {
            endOffset++;
        }

        return (startOffset, endOffset);
    }

    /// <summary>
    /// Find all functions with Unreal macros in source code.
    /// Useful for validation at build time.
    /// </summary>
    public IEnumerable<(string MethodName, string MacroType)> FindUnrealFunctions(string sourceCode)
    {
        if (string.IsNullOrEmpty(sourceCode))
        {
            yield break;
        }

        using var parser = new Parser(_language);
        using var tree = parser.Parse(sourceCode);
        var rootNode = tree.RootNode;

        var queryString = @"
(function_definition
    declarator: (function_declarator
        declarator: (identifier) @func_name)) @func_def";

        using var query = new Query(_language, queryString);
        using var cursor = new QueryCursor();

        foreach (var match in cursor.Exec(query, rootNode))
        {
            string? funcName = null;
            Node? funcDefNode = null;

            foreach (var capture in match.Captures)
            {
                if (capture.Name == "func_name")
                {
                    funcName = capture.Node.GetText(sourceCode);
                }
                else if (capture.Name == "func_def")
                {
                    funcDefNode = capture.Node;
                }
            }

            if (funcName != null && funcDefNode != null)
            {
                // Check for preceding UFUNCTION macro
                var macroType = FindPrecedingMacro(sourceCode, (int)funcDefNode.StartByte);
                if (macroType != null)
                {
                    yield return (funcName, macroType);
                }
            }
        }
    }

    private static string? FindPrecedingMacro(string sourceCode, int funcStart)
    {
        var lineStart = funcStart;
        while (lineStart > 0 && sourceCode[lineStart - 1] != '\n')
        {
            lineStart--;
        }

        if (lineStart <= 1)
        {
            return null;
        }

        var prevLineEnd = lineStart - 1;
        var prevLineStart = prevLineEnd;
        while (prevLineStart > 0 && sourceCode[prevLineStart - 1] != '\n')
        {
            prevLineStart--;
        }

        var prevLine = sourceCode.Substring(prevLineStart, prevLineEnd - prevLineStart).Trim();

        if (prevLine.StartsWith("UFUNCTION"))
        {
            return "UFUNCTION";
        }

        return null;
    }
}
