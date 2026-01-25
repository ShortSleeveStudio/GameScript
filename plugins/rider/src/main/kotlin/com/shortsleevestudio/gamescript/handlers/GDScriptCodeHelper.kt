package com.shortsleevestudio.gamescript.handlers

import com.intellij.openapi.diagnostic.Logger
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.util.PsiTreeUtil

/**
 * GDScript implementation of LanguageCodeHelper for Rider.
 *
 * ## Function Discovery (Rider 2025.3+)
 *
 * This helper uses the native GDScript PSI parser (`com.intellij.rider.godot.gdscript` plugin)
 * to find functions. This provides:
 * - Fast, offline function discovery
 * - Accurate function ranges from the PSI tree
 * - No dependency on Godot Editor running
 *
 * ## PSI Classes Used
 *
 * - `gdscript.psi.GdFile`: Root PSI element for .gd files
 * - `gdscript.psi.GdMethodDeclTl`: PSI element for top-level `func` declarations
 *
 * ## Migration Note
 *
 * Prior to Rider 2025.3, GDScript used TextMate + LSP (from Godot engine).
 * The native PSI parser provides better integration and performance.
 */
class GDScriptCodeHelper : LanguageCodeHelper {

    companion object {
        private val LOG = Logger.getInstance(GDScriptCodeHelper::class.java)

        // GDScript PSI class names from com.intellij.rider.godot.gdscript plugin
        // Package is "gdscript.psi", class for top-level functions is "GdMethodDeclTl"
        private const val GD_METHOD_DECL_CLASS = "gdscript.psi.GdMethodDeclTl"

        /**
         * Cached class reference for GdMethodDeclTl, loaded via reflection.
         *
         * Validates that the class:
         * 1. Exists (ClassNotFoundException if plugin not installed)
         * 2. Extends PsiElement (ClassCastException if API changed)
         * 3. Has getName() method (NoSuchMethodException if API changed)
         *
         * If validation fails, operations fall back to text-based parsing.
         */
        private val gdMethodDeclClass: Class<out PsiElement>? by lazy {
            try {
                @Suppress("UNCHECKED_CAST")
                val clazz = Class.forName(GD_METHOD_DECL_CLASS) as Class<out PsiElement>

                // Validate the class has the expected getName() method
                // This catches API changes in future GDScript plugin versions
                try {
                    clazz.getMethod("getName")
                } catch (e: NoSuchMethodException) {
                    LOG.warn(
                        "GDScript PSI class '$GD_METHOD_DECL_CLASS' found but missing getName() method. " +
                        "The GDScript plugin API may have changed. GameScript will use text-based fallback."
                    )
                    return@lazy null
                }

                LOG.info("GDScript PSI class '$GD_METHOD_DECL_CLASS' loaded successfully")
                clazz
            } catch (e: ClassNotFoundException) {
                LOG.warn("GDScript PSI not available - is com.intellij.rider.godot.gdscript plugin installed?")
                null
            } catch (e: ClassCastException) {
                LOG.warn(
                    "GDScript PSI class '$GD_METHOD_DECL_CLASS' found but does not extend PsiElement. " +
                    "The GDScript plugin API may have changed. GameScript will use text-based fallback."
                )
                null
            }
        }
    }

    /**
     * Check if a PSI element is a GDScript function.
     * Uses the native PSI class check when available.
     */
    override fun isFunction(element: PsiElement): Boolean {
        val methodClass = gdMethodDeclClass ?: return false
        return methodClass.isInstance(element)
    }

    /**
     * Find a method element by name in a GDScript file.
     *
     * Uses the native GDScript PSI parser to find function declarations.
     * This works offline without the Godot Editor running.
     *
     * @param psiFile The GDScript file to search in
     * @param methodName The function name to find (e.g., "cond_123")
     * @return The PsiElement for the function, or null if not found
     */
    override fun findMethodElement(psiFile: PsiFile, methodName: String): PsiElement? {
        LOG.info("findMethodElement: Looking for '$methodName' in ${psiFile.name}")

        val methodClass = gdMethodDeclClass
        if (methodClass == null) {
            LOG.warn("findMethodElement: GDScript PSI not available")
            return null
        }

        // Find all top-level method declarations in the file
        val methods = PsiTreeUtil.findChildrenOfType(psiFile, methodClass)
        LOG.debug("findMethodElement: Found ${methods.size} methods in ${psiFile.name}")

        // Find the method with the matching name
        for (method in methods) {
            val name = getMethodName(method)
            if (name == methodName) {
                LOG.info("findMethodElement: Found '$methodName' at offset ${method.textOffset}")
                return method
            }
        }

        LOG.info("findMethodElement: Method '$methodName' not found")
        return null
    }

    /**
     * Get the insertion offset for new methods.
     * For GDScript, we append to the end of the file (no class wrapper).
     */
    override fun getInsertionOffset(psiFile: PsiFile): Int = psiFile.textLength

    /**
     * Extract the method name from a GdMethodDeclTl element.
     * Uses reflection to access the name property.
     */
    private fun getMethodName(element: PsiElement): String? {
        return try {
            // GdMethodDeclTl should have a getName() method via PsiNamedElement
            val method = element.javaClass.getMethod("getName")
            method.invoke(element) as? String
        } catch (e: Exception) {
            LOG.debug("Could not get method name: ${e.message}")
            null
        }
    }
}
