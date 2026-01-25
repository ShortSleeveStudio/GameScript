package com.shortsleevestudio.gamescript.handlers

import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile

/**
 * Interface for language-specific code operations.
 *
 * Note: C#/C++ operations now go through the ReSharper backend (SymbolLookupHost.cs).
 * This interface is only implemented by GDScriptCodeHelper for text-based operations.
 */
interface LanguageCodeHelper {
    /**
     * Check if a PSI element represents a function/method in this language.
     */
    fun isFunction(element: PsiElement): Boolean

    /**
     * Find a method element by name in a PSI file.
     * Returns null if not found.
     */
    fun findMethodElement(psiFile: PsiFile, methodName: String): PsiElement?

    /**
     * Get the insertion point for new methods.
     * Returns the offset in the document where new methods should be inserted.
     */
    fun getInsertionOffset(psiFile: PsiFile): Int

    /**
     * Get the line number of a method element.
     * Default implementation uses the document API to convert offset to line number.
     */
    fun getMethodLineNumber(element: PsiElement): Int {
        val file = element.containingFile ?: return 0
        val virtualFile = file.virtualFile ?: return 0
        val document = FileDocumentManager.getInstance().getDocument(virtualFile) ?: return 0
        return document.getLineNumber(element.textRange.startOffset)
    }
}
