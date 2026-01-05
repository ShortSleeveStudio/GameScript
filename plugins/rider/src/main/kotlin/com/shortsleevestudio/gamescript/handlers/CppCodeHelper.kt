package com.shortsleevestudio.gamescript.handlers

import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile

/**
 * C++ Helper specifically for Rider (Unreal Engine).
 *
 * Rider's C++ PSI in the Kotlin frontend uses "dummy" declarations - the PSI tree
 * is so shallow that it often doesn't group the signature and body into a single
 * Declaration object. This implementation uses text-based parsing to find function
 * boundaries and returns a RiderFunctionWrapper for reliable deletion.
 */
class CppCodeHelper(private val project: Project) : LanguageCodeHelper {

    /**
     * Check if a PSI element is a C++ function.
     * In Rider's dummy PSI, we check if the element's text looks like a function.
     */
    override fun isFunction(element: PsiElement): Boolean {
        val text = element.text ?: return false
        return text.contains("(") && (
            text.contains("void ") ||
            text.contains("bool ") ||
            text.contains("int ") ||
            text.contains("float ") ||
            text.contains("static ") ||
            text.contains("virtual ")
        )
    }

    /**
     * Find a function element by name in a C++ PSI file.
     *
     * Since Rider's C++ PSI uses dummy declarations, we return a RiderFunctionWrapper
     * that contains the correct text range for the entire function (including
     * Unreal macros like UFUNCTION).
     */
    override fun findMethodElement(psiFile: PsiFile, methodName: String): PsiElement? {
        val text = psiFile.text
        if (text.isEmpty()) return null

        // Find function by looking for its name followed by '(' in the source
        val methodNamePattern = Regex("""\b${Regex.escape(methodName)}\s*\(""")
        val match = methodNamePattern.find(text) ?: return null

        val methodNameOffset = match.range.first

        // Find the complete function range
        val startOffset = findFunctionStart(text, methodNameOffset)
        val endOffset = FunctionParsingUtils.findFunctionEnd(text, methodNameOffset)
        val functionText = text.substring(startOffset, endOffset)

        // Return a wrapper that provides accurate text range and reliable deletion
        val leafElement = psiFile.findElementAt(startOffset) ?: return null

        return RiderFunctionWrapper(leafElement, psiFile, TextRange(startOffset, endOffset), functionText)
    }

    /**
     * Find the start of a function by walking backwards from the function name.
     * Handles Unreal macros like UFUNCTION() that precede the function.
     */
    private fun findFunctionStart(text: String, methodNameOffset: Int): Int {
        // Find the start of the current line (position right after previous newline)
        var lineStartPos = methodNameOffset
        while (lineStartPos > 0 && text[lineStartPos - 1] != '\n') {
            lineStartPos--
        }

        // Now walk backwards to include any Unreal macros (UFUNCTION, etc.) on preceding lines
        var currentLineStart = lineStartPos
        while (currentLineStart > 0) {
            // Go back past the newline to the previous line
            val prevLineEnd = currentLineStart - 1  // This is the \n character
            if (prevLineEnd < 0 || text[prevLineEnd] != '\n') {
                break
            }

            // Find start of previous line
            var prevLineStart = prevLineEnd
            while (prevLineStart > 0 && text[prevLineStart - 1] != '\n') {
                prevLineStart--
            }

            val prevLine = text.substring(prevLineStart, prevLineEnd).trim()

            // Check for Unreal macros or C++ attributes (but NOT comments)
            if ((prevLine.startsWith("UFUNCTION") || prevLine.startsWith("UPROPERTY") ||
                prevLine.startsWith("UCLASS") || prevLine.startsWith("USTRUCT") ||
                prevLine.startsWith("[[") || prevLine.startsWith("#")) &&
                !prevLine.startsWith("//")) {
                // Include this line
                currentLineStart = prevLineStart
                // Continue loop to check for more macros above
            } else {
                // Not a macro line, stop here
                break
            }
        }

        // Skip leading whitespace to return position of first non-whitespace char
        var result = currentLineStart
        while (result < text.length && text[result].isWhitespace() && text[result] != '\n') {
            result++
        }

        return result
    }

    /**
     * Get the insertion offset for new functions.
     * In Unreal C++, we insert before the final closing brace of the class/namespace.
     */
    override fun getInsertionOffset(psiFile: PsiFile): Int? {
        val text = psiFile.text
        if (text.isEmpty()) return 0

        val lastBrace = text.lastIndexOf('}')
        return if (lastBrace != -1) lastBrace else psiFile.textLength
    }

    /**
     * Get the line number of a function element.
     */
    override fun getMethodLineNumber(element: PsiElement): Int {
        val file = element.containingFile ?: return 0
        val virtualFile = file.virtualFile ?: return 0
        val document = FileDocumentManager.getInstance().getDocument(virtualFile) ?: return 0
        return document.getLineNumber(element.textRange.startOffset)
    }
}
