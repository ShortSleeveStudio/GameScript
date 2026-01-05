package com.shortsleevestudio.gamescript.handlers

import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile

/**
 * Interface for language-specific code operations.
 * Implementations handle finding methods, determining insertion points,
 * and formatting for their respective languages (C#, C++, etc.).
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
     * Get the insertion point for new methods (usually before the closing brace of the class).
     * Returns the offset in the document where new methods should be inserted.
     */
    fun getInsertionOffset(psiFile: PsiFile): Int?

    /**
     * Get the line number of a method element.
     */
    fun getMethodLineNumber(element: PsiElement): Int
}
