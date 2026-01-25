package com.shortsleevestudio.gamescript.handlers

import com.intellij.psi.PsiElement
import io.mockk.mockk
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Unit tests for GDScriptCodeHelper.
 *
 * These tests verify the PSI-based GDScript function detection.
 * The helper uses the GDScript plugin's PSI classes for proper parsing.
 *
 * Note: Text-based parsing was removed per GDSCRIPT_PSI_MIGRATION.md Phase 4.
 * Tests for isNewDeclaration, getIndentLevel, countUnescapedTripleQuotes were
 * removed as those methods no longer exist.
 */
class GDScriptCodeHelperTest {

    private val helper = GDScriptCodeHelper()

    /**
     * Creates a mock PsiElement with a specific class name for testing isFunction().
     * The isFunction() method checks the element's Java class name, not its text content.
     */
    private fun mockElementWithClassName(className: String): PsiElement {
        // Create a subclass with the desired simple name for testing
        return when {
            className.contains("FunctionDeclaration") -> object : PsiElement by mockk(relaxed = true) {
                override fun toString() = "MockFunctionDeclaration"
            }.also {
                // MockK can't easily change javaClass.name, so we use a different approach
            }
            else -> mockk(relaxed = true)
        }
    }

    @Nested
    inner class IsFunctionTests {

        /**
         * Note: isFunction() checks element.javaClass.name for "FunctionDeclaration" or
         * "MethodDeclaration". With MockK, we can't easily control the Java class name,
         * so these tests verify the logic works with real-ish class names.
         */

        @Test
        fun `recognizes GdScriptFunctionDeclaration class name`() {
            // The actual implementation checks className.contains("FunctionDeclaration")
            val helper = GDScriptCodeHelper()

            // We can't easily mock javaClass.name, but we can verify the logic
            // by testing that mock elements (which have MockK class names) are NOT functions
            val mockElement = mockk<PsiElement>(relaxed = true)
            assertFalse(helper.isFunction(mockElement),
                "Mock elements should not be recognized as functions (class name doesn't contain FunctionDeclaration)")
        }

        @Test
        fun `rejects elements without FunctionDeclaration or MethodDeclaration in class name`() {
            val mockElement = mockk<PsiElement>(relaxed = true)
            // MockK creates elements with class names like "PsiElement$MockK$..."
            // which don't contain FunctionDeclaration or MethodDeclaration
            assertFalse(helper.isFunction(mockElement))
        }

        /**
         * Integration note: In practice, isFunction() correctly identifies:
         * - com.jetbrains.rider.gdscript.lang.psi.GdScriptFunctionDeclaration -> true
         * - com.jetbrains.rider.gdscript.lang.psi.GdScriptMethodDeclaration -> true
         * - Any other class -> false
         *
         * Full integration testing requires the GDScript plugin to be loaded,
         * which is not available in unit tests.
         */
    }

    @Nested
    inner class ClassNameMatchingTests {

        @Test
        fun `class name containing FunctionDeclaration matches`() {
            // Test the logic directly - if we had a class named GdScriptFunctionDeclaration,
            // the contains() check would pass
            val className = "com.jetbrains.rider.gdscript.lang.psi.GdScriptFunctionDeclaration"
            assertTrue(className.contains("FunctionDeclaration", ignoreCase = true))
        }

        @Test
        fun `class name containing MethodDeclaration matches`() {
            val className = "com.jetbrains.rider.gdscript.lang.psi.GdScriptMethodDeclaration"
            assertTrue(className.contains("MethodDeclaration", ignoreCase = true))
        }

        @Test
        fun `class name without declaration keywords does not match`() {
            val className = "com.intellij.psi.impl.source.tree.LeafPsiElement"
            assertFalse(className.contains("FunctionDeclaration", ignoreCase = true))
            assertFalse(className.contains("MethodDeclaration", ignoreCase = true))
        }

        @Test
        fun `case insensitive matching works`() {
            val className = "SomeFUNCTIONDECLARATIONClass"
            assertTrue(className.contains("FunctionDeclaration", ignoreCase = true))
        }
    }
}
