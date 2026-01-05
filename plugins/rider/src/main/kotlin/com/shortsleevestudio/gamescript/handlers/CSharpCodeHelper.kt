package com.shortsleevestudio.gamescript.handlers

import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile

/**
 * C# implementation of LanguageCodeHelper for Rider.
 *
 * Rider's C# PSI in the Kotlin frontend is a "dummy" PSI - the real parsing happens
 * in the ReSharper backend. PsiNamedElement.name returns null for C# elements.
 *
 * This implementation uses text-based search to find methods by name, then returns
 * a RiderFunctionWrapper that provides accurate text ranges and reliable deletion.
 */
class CSharpCodeHelper(private val project: Project) : LanguageCodeHelper {

    /**
     * Check if a PSI element is a C# method.
     * In Rider's dummy PSI, we check if the element's text looks like a method.
     */
    override fun isFunction(element: PsiElement): Boolean {
        val text = element.text ?: return false
        // Check if text contains a method-like pattern
        return text.contains("(") && (
            text.contains("public ") ||
            text.contains("private ") ||
            text.contains("static ") ||
            text.contains("void ") ||
            text.contains("bool ") ||
            text.contains("async ")
        )
    }

    /**
     * Find a method element by name in a C# PSI file.
     *
     * Since Rider's C# PSI uses dummy declarations without proper names,
     * we search the file text for the method name pattern and return a
     * RiderFunctionWrapper that provides the accurate text range.
     */
    override fun findMethodElement(psiFile: PsiFile, methodName: String): PsiElement? {
        val text = psiFile.text
        if (text.isEmpty()) return null

        // Find method by looking for its name followed by '(' in the source
        // This handles: public static bool Node_12_Condition(
        val methodNamePattern = Regex("""\b${Regex.escape(methodName)}\s*\(""")
        val match = methodNamePattern.find(text) ?: return null

        val methodNameOffset = match.range.first

        // Find the complete method range
        val startOffset = findMethodStart(text, methodNameOffset)
        val endOffset = FunctionParsingUtils.findFunctionEnd(text, methodNameOffset)
        val functionText = text.substring(startOffset, endOffset)

        // Return a wrapper that provides accurate text range and reliable deletion
        val leafElement = psiFile.findElementAt(startOffset) ?: return null

        return RiderFunctionWrapper(leafElement, psiFile, TextRange(startOffset, endOffset), functionText)
    }

    /**
     * Find the start of a method by walking backwards from the method name.
     * Handles C# attributes like [NodeCondition(...)] that precede the method.
     */
    private fun findMethodStart(text: String, methodNameOffset: Int): Int {
        var pos = methodNameOffset

        // Walk backwards past whitespace and the return type/modifiers to find start of this line
        while (pos > 0 && text[pos - 1] != '\n' && text[pos - 1] != '}' && text[pos - 1] != '{' && text[pos - 1] != ';') {
            pos--
        }

        // pos now points to the first char of the line (after newline) or a boundary char
        // Find the actual start of content on this line (skip leading whitespace)
        var lineStart = pos
        while (lineStart < text.length && text[lineStart].isWhitespace() && text[lineStart] != '\n') {
            lineStart++
        }

        // Now check for attributes on preceding lines
        // We need to include all consecutive attribute lines above the method
        var resultStart = pos  // Start from beginning of line (including whitespace for clean deletion)
        var checkPos = pos

        while (checkPos > 0) {
            // Move to the previous line
            if (text[checkPos - 1] != '\n') {
                break
            }
            val prevLineEnd = checkPos - 1  // Points to the \n

            // Find start of previous line
            var prevLineStart = prevLineEnd
            while (prevLineStart > 0 && text[prevLineStart - 1] != '\n') {
                prevLineStart--
            }

            val prevLine = text.substring(prevLineStart, prevLineEnd).trim()

            // Check for C# attributes [...] - can be multiple on one line like [Attr1][Attr2]
            // Also handle multiline attributes and empty lines between attributes
            if (prevLine.isEmpty()) {
                // Empty line - continue checking above
                checkPos = prevLineStart
                continue
            } else if (prevLine.startsWith("[") && prevLine.contains("]")) {
                // This is an attribute line, include it
                resultStart = prevLineStart
                checkPos = prevLineStart
                // Continue loop to check for more attributes above
            } else {
                // Not an attribute, stop here
                break
            }
        }

        return resultStart
    }

    /**
     * Get the insertion offset for new methods.
     * Returns the offset of the last '}' which should be the class closing brace.
     */
    override fun getInsertionOffset(psiFile: PsiFile): Int? {
        val text = psiFile.text
        if (text.isEmpty()) return 0

        val lastBrace = text.lastIndexOf('}')
        return if (lastBrace != -1) lastBrace else psiFile.textLength
    }

    /**
     * Get the line number of a method element.
     */
    override fun getMethodLineNumber(element: PsiElement): Int {
        val file = element.containingFile ?: return 0
        val virtualFile = file.virtualFile ?: return 0
        val document = FileDocumentManager.getInstance().getDocument(virtualFile) ?: return 0
        return document.getLineNumber(element.textRange.startOffset)
    }
}
