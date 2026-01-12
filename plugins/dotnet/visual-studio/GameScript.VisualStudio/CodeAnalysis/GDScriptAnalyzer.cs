using GDShrapt.Reader;

namespace GameScript.VisualStudio;

/// <summary>
/// GDScript code analyzer using GDShrapt.
/// Finds functions with @node_condition and @node_action annotations.
/// </summary>
public sealed class GDScriptAnalyzer : ILanguageAnalyzer
{
    private readonly GDScriptReader _reader = new();

    public MethodInfo? FindMethod(string sourceCode, string methodName)
    {
        if (string.IsNullOrEmpty(sourceCode))
        {
            return null;
        }

        try
        {
            var scriptClass = _reader.ParseFileContent(sourceCode);
            if (scriptClass == null)
            {
                return null;
            }

            // Find method by name
            var method = scriptClass.Methods
                .FirstOrDefault(m => m.Identifier?.Sequence == methodName);

            if (method == null)
            {
                return null;
            }

            // Get the full method range including attributes
            var (startOffset, endOffset) = GetFullMethodRange(sourceCode, method);
            var fullText = sourceCode.Substring(startOffset, endOffset - startOffset);

            // Get body text (statements)
            var bodyText = GetMethodBody(sourceCode, method);

            return new MethodInfo
            {
                Name = methodName,
                Body = bodyText,
                FullText = fullText,
                LineNumber = method.StartLine,
                StartOffset = startOffset,
                EndOffset = endOffset
            };
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[GDScriptAnalyzer] Parse error: {ex.Message}");
            return null;
        }
    }

    public int GetInsertionOffset(string sourceCode)
    {
        if (string.IsNullOrEmpty(sourceCode))
        {
            return 0;
        }

        // In GDScript, we insert at the end of the file
        // Find the last non-whitespace position
        var pos = sourceCode.Length;
        while (pos > 0 && char.IsWhiteSpace(sourceCode[pos - 1]))
        {
            pos--;
        }

        return pos;
    }

    /// <summary>
    /// Get the full method range including any preceding @annotations.
    /// </summary>
    private static (int Start, int End) GetFullMethodRange(string sourceCode, GDMethodDeclaration method)
    {
        // Start from the method's start position
        var startLine = method.StartLine;
        var startColumn = method.StartColumn;

        // Convert line/column to offset
        var startOffset = GetOffsetFromLineColumn(sourceCode, startLine, startColumn);

        // Check for preceding annotations
        if (method.Attributes.Count > 0)
        {
            var firstAttr = method.Attributes.First();
            var attrOffset = GetOffsetFromLineColumn(sourceCode, firstAttr.StartLine, firstAttr.StartColumn);
            if (attrOffset < startOffset)
            {
                startOffset = attrOffset;
            }
        }

        // Include leading whitespace on the line for clean deletion
        while (startOffset > 0 && sourceCode[startOffset - 1] != '\n')
        {
            startOffset--;
        }

        // Get end position
        var endLine = method.EndLine;
        var endColumn = method.EndColumn;
        var endOffset = GetOffsetFromLineColumn(sourceCode, endLine, endColumn);

        // Include trailing newline for clean deletion
        if (endOffset < sourceCode.Length && sourceCode[endOffset] == '\n')
        {
            endOffset++;
        }

        return (startOffset, endOffset);
    }

    /// <summary>
    /// Get the method body text (just the statements, not the signature).
    /// </summary>
    private static string GetMethodBody(string sourceCode, GDMethodDeclaration method)
    {
        // Find the colon after the signature, then get everything after
        var methodStart = GetOffsetFromLineColumn(sourceCode, method.StartLine, method.StartColumn);
        var colonPos = sourceCode.IndexOf(':', methodStart);

        if (colonPos == -1)
        {
            return "";
        }

        var endOffset = GetOffsetFromLineColumn(sourceCode, method.EndLine, method.EndColumn);
        var bodyStart = colonPos + 1;

        // Skip the newline after colon
        while (bodyStart < endOffset && (sourceCode[bodyStart] == '\n' || sourceCode[bodyStart] == '\r'))
        {
            bodyStart++;
        }

        if (bodyStart >= endOffset)
        {
            return "";
        }

        return sourceCode.Substring(bodyStart, endOffset - bodyStart).Trim();
    }

    /// <summary>
    /// Convert line/column to byte offset.
    /// </summary>
    private static int GetOffsetFromLineColumn(string sourceCode, int line, int column)
    {
        var currentLine = 0;
        var offset = 0;

        while (offset < sourceCode.Length && currentLine < line)
        {
            if (sourceCode[offset] == '\n')
            {
                currentLine++;
            }
            offset++;
        }

        // Add column offset
        offset += column;

        return Math.Min(offset, sourceCode.Length);
    }

    /// <summary>
    /// Find all methods with GameScript annotations in source code.
    /// Useful for validation at build time.
    /// </summary>
    public IEnumerable<(string MethodName, int NodeId, string AnnotationType)> FindGameScriptMethods(string sourceCode)
    {
        if (string.IsNullOrEmpty(sourceCode))
        {
            yield break;
        }

        GDClassDeclaration? scriptClass;
        try
        {
            scriptClass = _reader.ParseFileContent(sourceCode);
        }
        catch
        {
            yield break;
        }

        if (scriptClass == null)
        {
            yield break;
        }

        foreach (var method in scriptClass.Methods)
        {
            foreach (var attr in method.Attributes)
            {
                var attrName = attr.Name?.Sequence;
                if (attrName is "node_condition" or "node_action" or "NodeCondition" or "NodeAction")
                {
                    // Extract node ID from annotation argument
                    var nodeIdArg = attr.Parameters.FirstOrDefault()?.ToString();
                    if (nodeIdArg != null && int.TryParse(nodeIdArg, out var nodeId))
                    {
                        var methodName = method.Identifier?.Sequence ?? "";
                        yield return (methodName, nodeId, attrName);
                    }
                }
            }
        }
    }
}
