using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace GameScript.VisualStudio;

/// <summary>
/// C# code analyzer using Roslyn.
/// Finds methods with [NodeCondition] and [NodeAction] attributes.
/// </summary>
public sealed class CSharpAnalyzer : ILanguageAnalyzer
{
    public MethodInfo? FindMethod(string sourceCode, string methodName)
    {
        if (string.IsNullOrEmpty(sourceCode))
        {
            return null;
        }

        var tree = CSharpSyntaxTree.ParseText(sourceCode);
        var root = tree.GetCompilationUnitRoot();

        // Find method by name
        var method = root.DescendantNodes()
            .OfType<MethodDeclarationSyntax>()
            .FirstOrDefault(m => m.Identifier.Text == methodName);

        if (method == null)
        {
            return null;
        }

        // Get the full method text including attributes
        var fullSpan = GetFullMethodSpan(method);
        var fullText = sourceCode.Substring(fullSpan.Start, fullSpan.Length);

        // Get the method body (just the block, not signature)
        var bodyText = method.Body?.ToFullString() ?? method.ExpressionBody?.ToFullString() ?? "";

        // Calculate line number (0-based)
        var lineNumber = sourceCode.Substring(0, fullSpan.Start).Count(c => c == '\n');

        return new MethodInfo
        {
            Name = methodName,
            Body = bodyText.Trim(),
            FullText = fullText,
            LineNumber = lineNumber,
            StartOffset = fullSpan.Start,
            EndOffset = fullSpan.Start + fullSpan.Length
        };
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
    /// Get the full span of a method including its attributes.
    /// </summary>
    private static Microsoft.CodeAnalysis.Text.TextSpan GetFullMethodSpan(MethodDeclarationSyntax method)
    {
        var start = method.SpanStart;
        var end = method.Span.End;

        // Include attributes if present
        if (method.AttributeLists.Count > 0)
        {
            start = method.AttributeLists[0].SpanStart;
        }

        // Walk backwards to include leading trivia (whitespace/newlines)
        // This ensures clean deletion
        var fullString = method.SyntaxTree.GetText().ToString();
        while (start > 0 && char.IsWhiteSpace(fullString[start - 1]) && fullString[start - 1] != '\n')
        {
            start--;
        }

        // Include leading newline if present
        if (start > 0 && fullString[start - 1] == '\n')
        {
            start--;
        }

        return Microsoft.CodeAnalysis.Text.TextSpan.FromBounds(start, end);
    }

    /// <summary>
    /// Find all methods with GameScript attributes in source code.
    /// Useful for validation at build time.
    /// </summary>
    public IEnumerable<(string MethodName, int NodeId, string AttributeType)> FindGameScriptMethods(string sourceCode)
    {
        if (string.IsNullOrEmpty(sourceCode))
        {
            yield break;
        }

        var tree = CSharpSyntaxTree.ParseText(sourceCode);
        var root = tree.GetCompilationUnitRoot();

        foreach (var method in root.DescendantNodes().OfType<MethodDeclarationSyntax>())
        {
            foreach (var attrList in method.AttributeLists)
            {
                foreach (var attr in attrList.Attributes)
                {
                    var attrName = attr.Name.ToString();
                    if (attrName is "NodeCondition" or "NodeAction")
                    {
                        // Extract node ID from attribute argument
                        var nodeIdArg = attr.ArgumentList?.Arguments.FirstOrDefault();
                        if (nodeIdArg != null && int.TryParse(nodeIdArg.ToString(), out var nodeId))
                        {
                            yield return (method.Identifier.Text, nodeId, attrName);
                        }
                    }
                }
            }
        }
    }
}
