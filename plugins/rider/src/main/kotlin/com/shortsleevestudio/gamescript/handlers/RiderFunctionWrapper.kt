package com.shortsleevestudio.gamescript.handlers

import com.intellij.openapi.application.WriteAction
import com.intellij.openapi.command.CommandProcessor
import com.intellij.openapi.editor.ex.DocumentEx
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile

/**
 * A "Safe" wrapper for Rider's projected PSI (C# and C++).
 *
 * Rider's frontend PSI is a "dummy" projection of the real backend (ReSharper) PSI.
 * This means that PsiElement.delete() often only deletes a single token instead of
 * the entire function. This wrapper ensures that:
 *
 * 1. getText() returns the full function text (including attributes/macros)
 * 2. getTextRange() returns the accurate range covering the entire function
 * 3. delete() uses the Document API to reliably remove the entire function
 *
 * This works for both C# (Unity) and C++ (Unreal) code.
 */
class RiderFunctionWrapper(
    private val delegate: PsiElement,
    private val psiFile: PsiFile,
    private val functionRange: TextRange,
    private val functionText: String
) : PsiElement by delegate {

    override fun getText(): String = functionText

    override fun getTextRange(): TextRange = functionRange

    override fun getTextLength(): Int = functionRange.length

    override fun getTextOffset(): Int = functionRange.startOffset

    override fun getContainingFile(): PsiFile = psiFile

    override fun isValid(): Boolean = delegate.isValid && psiFile.isValid

    /**
     * Delete this function by removing its text range from the document.
     * Uses Document API directly since PSI-based deletion doesn't work reliably
     * with Rider's dummy PSI for either C# or C++.
     *
     * Uses DocumentEx.setInBulkUpdate to suppress Rider's undo tracking.
     */
    override fun delete() {
        val virtualFile = psiFile.virtualFile ?: return
        val document = FileDocumentManager.getInstance().getDocument(virtualFile) ?: return

        // Calculate deletion range - include leading newline for clean output
        var startOffset = functionRange.startOffset

        // Include the newline before the function if present
        if (startOffset > 0 && document.getText(TextRange(startOffset - 1, startOffset)) == "\n") {
            startOffset--
        }

        // Use DocumentEx.setInBulkUpdate to suppress Rider's undo tracking
        val documentEx = document as? DocumentEx
        val finalStartOffset = startOffset
        CommandProcessor.getInstance().runUndoTransparentAction {
            WriteAction.run<Exception> {
                try {
                    documentEx?.setInBulkUpdate(true)
                    document.deleteString(finalStartOffset, functionRange.endOffset)
                } finally {
                    documentEx?.setInBulkUpdate(false)
                }
            }
        }
    }
}

/**
 * Shared utility functions for parsing C-style languages (C#, C++).
 * These functions work on raw text and don't depend on PSI.
 */
object FunctionParsingUtils {

    /**
     * Find the end of a function by matching braces.
     * Handles comments and string literals that might contain braces.
     *
     * Works for both C# and C++ since they share the same brace syntax.
     */
    fun findFunctionEnd(text: String, startOffset: Int): Int {
        val openBrace = text.indexOf('{', startOffset)
        if (openBrace == -1) {
            // Likely a declaration ending in ; (e.g., abstract method or .h file)
            val semicolon = text.indexOf(';', startOffset)
            return if (semicolon != -1) semicolon + 1 else text.length
        }

        var braceCount = 1
        var pos = openBrace + 1
        while (pos < text.length && braceCount > 0) {
            val char = text[pos]
            when (char) {
                '/' -> {
                    if (pos + 1 < text.length) {
                        when (text[pos + 1]) {
                            '/' -> {
                                // Line comment - skip to end of line
                                val lineEnd = text.indexOf('\n', pos)
                                pos = if (lineEnd == -1) text.length else lineEnd
                            }
                            '*' -> {
                                // Block comment - skip to */
                                val blockEnd = text.indexOf("*/", pos + 2)
                                pos = if (blockEnd == -1) text.length else blockEnd + 1
                            }
                        }
                    }
                }
                '"' -> {
                    // String literal - skip to closing quote (handle escaped quotes)
                    pos++
                    while (pos < text.length) {
                        if (text[pos] == '"' && text[pos - 1] != '\\') break
                        // Also handle C# verbatim strings (@"...")
                        if (text[pos] == '"' && pos + 1 < text.length && text[pos + 1] == '"') {
                            pos++ // Skip escaped quote in verbatim string
                        } else if (text[pos] == '"') {
                            break
                        }
                        pos++
                    }
                }
                '\'' -> {
                    // Char literal - skip to closing quote (handle escaped quotes)
                    pos++
                    while (pos < text.length) {
                        if (text[pos] == '\'' && text[pos - 1] != '\\') break
                        pos++
                    }
                }
                '@' -> {
                    // C# verbatim string - check for @"
                    if (pos + 1 < text.length && text[pos + 1] == '"') {
                        pos += 2 // Skip @"
                        while (pos < text.length) {
                            if (text[pos] == '"') {
                                // Check for escaped "" in verbatim string
                                if (pos + 1 < text.length && text[pos + 1] == '"') {
                                    pos++ // Skip escaped quote
                                } else {
                                    break
                                }
                            }
                            pos++
                        }
                    }
                }
                '{' -> braceCount++
                '}' -> braceCount--
            }
            pos++
        }

        // Include trailing newline for clean deletion
        if (pos < text.length && text[pos] == '\n') {
            pos++
        }

        return pos
    }
}
