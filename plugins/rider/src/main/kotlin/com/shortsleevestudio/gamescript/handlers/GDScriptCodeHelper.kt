package com.shortsleevestudio.gamescript.handlers

import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiRecursiveElementWalkingVisitor

/**
 * GDScript implementation of LanguageCodeHelper for Rider.
 *
 * GDScript is an indentation-based language (like Python), so function boundaries
 * are determined by indentation level rather than braces. This implementation uses
 * text-based parsing to find functions and their full text ranges.
 *
 * GameScript generates methods like:
 *   func cond_123(ctx: RunnerContext) -> bool:
 *       # TODO: Implement condition
 *       return true
 *
 *   func act_123(ctx: RunnerContext) -> void:
 *       # TODO: Implement action
 *       pass
 */
class GDScriptCodeHelper(private val project: Project) : LanguageCodeHelper {

    /**
     * Check if a PSI element is a GDScript function.
     * Checks if the text starts with 'func '.
     */
    override fun isFunction(element: PsiElement): Boolean {
        val text = element.text?.trim() ?: return false
        return text.startsWith("func ")
    }

    /**
     * Find a method element by name in a GDScript PSI file.
     *
     * When the Godot Support plugin is active, the PSI tree contains proper
     * function elements. We use a recursive visitor to find functions that may
     * be nested inside wrapper elements (like GDScriptClass or ScriptBody).
     *
     * Falls back to text-based parsing if PSI doesn't provide function elements.
     */
    override fun findMethodElement(psiFile: PsiFile, methodName: String): PsiElement? {
        // First, try using PSI tree with recursive search (works when Godot plugin is active)
        // Functions may be nested inside wrapper elements, so we need to walk the tree
        val funcPrefix = "func $methodName"

        var foundElement: PsiElement? = null
        psiFile.accept(object : PsiRecursiveElementWalkingVisitor() {
            override fun visitElement(element: PsiElement) {
                // Skip the PsiFile itself - its .text is the entire file content
                // which would incorrectly match if the file starts with our function
                if (element is PsiFile) {
                    super.visitElement(element)
                    return
                }

                // Check if this is a function declaration node by examining the Java class name.
                // The Godot plugin is built on Python plugin infrastructure, so function nodes
                // are either GDScriptFunctionDeclaration or PyFunction classes.
                // Checking elementType.toString().contains("FUNC") is too broad and catches
                // wrapper nodes like GDScriptFile or GDScriptClass which contain the whole file.
                val className = element.javaClass.simpleName
                if (className.contains("FunctionDeclaration", ignoreCase = true) ||
                    className.contains("PyFunction", ignoreCase = true)) {
                    // Verify this specific function's name by checking the declaration line
                    // Use regex to ensure exact method name match (avoid cond_3 matching cond_30)
                    val firstLine = element.text.lineSequence().firstOrNull() ?: ""
                    if (Regex("""func\s+${Regex.escape(methodName)}\s*\(""").containsMatchIn(firstLine)) {
                        foundElement = element
                        stopWalking()  // Stop the visitor entirely
                        return
                    }
                }

                super.visitElement(element)
            }
        })

        if (foundElement != null) {
            return foundElement
        }

        // Fallback: manual text parsing if PSI doesn't have function elements
        // This handles cases where the Godot plugin isn't installed or PSI is flat
        val text = psiFile.text
        if (text.isEmpty()) return null

        // Find function by looking for "func methodName(" pattern
        val funcPattern = Regex("""^([ \t]*)func\s+${Regex.escape(methodName)}\s*\(""", RegexOption.MULTILINE)
        val match = funcPattern.find(text) ?: return null

        val funcLineStart = match.range.first
        val baseIndent = match.groupValues[1]

        // Find the end of the function by tracking indentation
        val endOffset = findGDScriptFunctionEnd(text, funcLineStart, baseIndent)
        val functionText = text.substring(funcLineStart, endOffset)

        // Return a wrapper that provides accurate text range and reliable deletion
        val leafElement = psiFile.findElementAt(funcLineStart) ?: return null

        return RiderFunctionWrapper(leafElement, psiFile, TextRange(funcLineStart, endOffset), functionText)
    }

    /**
     * Find the end of a GDScript function by tracking indentation.
     *
     * A GDScript function ends when we encounter:
     * 1. A line with equal or less indentation than the 'func' line (new declaration)
     * 2. An empty line followed by a line with equal or less indentation
     * 3. End of file
     *
     * The function body has greater indentation than the 'func' line.
     */
    private fun findGDScriptFunctionEnd(text: String, funcStart: Int, baseIndent: String): Int {
        val baseIndentLevel = getIndentLevel(baseIndent)
        var pos = funcStart

        // Skip the 'func' declaration line
        pos = text.indexOf('\n', pos)
        if (pos == -1) return text.length
        pos++ // Move past the newline

        var lastContentEnd = pos  // Track the last line with actual content

        while (pos < text.length) {
            // Find end of current line
            val lineEnd = text.indexOf('\n', pos)
            val actualLineEnd = if (lineEnd == -1) text.length else lineEnd

            // Get the current line
            val line = text.substring(pos, actualLineEnd)

            // Check if line is empty, only whitespace, or only a comment
            // Comments don't affect indentation-based function boundaries
            val trimmedLine = line.trim()
            if (trimmedLine.isEmpty() || trimmedLine.startsWith("#")) {
                // Empty line or comment - continue but don't update lastContentEnd yet
                pos = if (lineEnd == -1) text.length else lineEnd + 1
                continue
            }

            // Get this line's indentation level
            val lineIndent = line.takeWhile { it == ' ' || it == '\t' }
            val lineIndentLevel = getIndentLevel(lineIndent)

            // If this line has equal or less indentation than the func line,
            // it's a new top-level declaration - function ends before this line
            if (lineIndentLevel <= baseIndentLevel) {
                // Function ends at the position before this new declaration
                // But include trailing empty lines that were part of the function
                return lastContentEnd
            }

            // This line is part of the function body
            lastContentEnd = if (lineEnd == -1) text.length else lineEnd + 1
            pos = lastContentEnd
        }

        // Reached end of file - function extends to the end
        return text.length
    }

    /**
     * Calculate indentation level, treating tabs as 4 spaces (Godot default).
     */
    private fun getIndentLevel(indent: String): Int {
        var level = 0
        for (char in indent) {
            when (char) {
                ' ' -> level++
                '\t' -> level += 4
            }
        }
        return level
    }

    /**
     * Get the insertion offset for new methods.
     * For GDScript, we append to the end of the file (no class wrapper).
     */
    override fun getInsertionOffset(psiFile: PsiFile): Int {
        return psiFile.textLength
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
