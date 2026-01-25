package com.shortsleevestudio.gamescript.handlers

import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import org.junit.jupiter.params.provider.ValueSource
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Unit tests for CodeHandlers companion object methods.
 *
 * These tests verify the core logic without requiring the IntelliJ platform.
 * Tests requiring PSI or the backend model should be written as integration tests.
 *
 * ## RPC Timeout/Retry Testing
 *
 * The RPC timeout and retry logic in withRpcTimeout() requires integration tests with:
 * - Mock GameScriptModel to simulate slow/failing backend responses
 * - Thread synchronization to verify retry backoff timing
 * - Mock ExecutorService to verify shutdown behavior
 *
 * These tests should be added as part of a dedicated integration test suite that
 * can properly mock the rd-framework protocol layer.
 */
class CodeHandlersTest {

    @Nested
    inner class IsBackendLanguage {

        @ParameterizedTest(name = "extension ''{0}'' should be backend language")
        @ValueSource(strings = ["cs", "cpp", "h", "hpp", "cc", "inl"])
        fun `backend extensions are recognized`(ext: String) {
            assertTrue(CodeHandlers.isBackendLanguage(extension = ext))
        }

        @ParameterizedTest(name = "extension ''{0}'' with dot should be backend language")
        @ValueSource(strings = [".cs", ".cpp", ".h", ".hpp", ".cc", ".inl"])
        fun `backend extensions with leading dot are normalized`(ext: String) {
            assertTrue(CodeHandlers.isBackendLanguage(extension = ext))
        }

        @ParameterizedTest(name = "extension ''{0}'' should NOT be backend language")
        @ValueSource(strings = ["gd", "py", "js", "ts", "java", "kt", ""])
        fun `non-backend extensions are rejected`(ext: String) {
            assertFalse(CodeHandlers.isBackendLanguage(extension = ext))
        }

        @Test
        fun `null extension returns false`() {
            assertFalse(CodeHandlers.isBackendLanguage(extension = null))
        }

        @Test
        fun `case insensitive extension matching`() {
            assertTrue(CodeHandlers.isBackendLanguage(extension = "CS"))
            assertTrue(CodeHandlers.isBackendLanguage(extension = "Cpp"))
            assertTrue(CodeHandlers.isBackendLanguage(extension = "HPP"))
        }
    }

    @Nested
    inner class ComputeInsertion {

        @Test
        fun `class wrapper inserts before closing brace`() {
            val existing = """
                public class Conversation_123
                {
                    public void ExistingMethod() { }
                }
            """.trimIndent()

            val methodStub = "public void NewMethod() { }"

            val result = CodeHandlers.computeInsertion(existing, methodStub, usesClassWrapper = true)

            assertNull(result.error)
            val newContent = result.newContent ?: error("newContent should not be null")
            assertTrue(newContent.contains(methodStub))
            assertTrue(newContent.indexOf(methodStub) < newContent.lastIndexOf('}'))
        }

        @Test
        fun `class wrapper fails without closing brace`() {
            val existing = "public class Conversation_123 { public void Method()"

            val result = CodeHandlers.computeInsertion(existing, "void NewMethod() { }", usesClassWrapper = true)

            assertEquals("Could not find class closing brace", result.error)
            assertNull(result.newContent)
        }

        @Test
        fun `non-class wrapper appends to end`() {
            val existing = """
                func existing_method():
                    pass
            """.trimIndent()

            val methodStub = """
                func new_method():
                    pass
            """.trimIndent()

            val result = CodeHandlers.computeInsertion(existing, methodStub, usesClassWrapper = false)

            assertNull(result.error)
            assertTrue(result.newContent!!.endsWith(methodStub + "\n"))
        }

        @Test
        fun `non-class wrapper trims trailing whitespace`() {
            val existing = "func method():\n    pass\n\n\n   "
            val methodStub = "func new_method():\n    pass"

            val result = CodeHandlers.computeInsertion(existing, methodStub, usesClassWrapper = false)

            assertNull(result.error)
            // Should not have extra whitespace before the separator
            assertFalse(result.newContent!!.contains("   \n\nfunc"))
        }

        @Test
        fun `insert offset points to method start for class wrapper`() {
            val existing = "class Foo { }"
            val methodStub = "void Bar() { }"

            val result = CodeHandlers.computeInsertion(existing, methodStub, usesClassWrapper = true)

            // Insert offset should point to where the method text starts (after prefix newline)
            val insertedMethodStart = result.newContent!!.indexOf("void Bar")
            assertEquals(insertedMethodStart, result.insertOffset)
        }

        @Test
        fun `insert offset points to method start for non-class wrapper`() {
            val existing = "func foo():\n    pass"
            val methodStub = "func bar():\n    pass"

            val result = CodeHandlers.computeInsertion(existing, methodStub, usesClassWrapper = false)

            // Insert offset should point to where the method text starts (after separator)
            val insertedMethodStart = result.newContent!!.indexOf("func bar")
            assertEquals(insertedMethodStart, result.insertOffset)
        }
    }

    @Nested
    inner class InsertionConstants {
        /**
         * These tests verify the insertion constants match their documented values.
         * If these fail, it means the constants have drifted from documentation.
         *
         * SYNC REQUIRED: These values must match:
         * - C#: SymbolLookupHost.cs (AppendSeparator, ClassInsertPrefix, ClassInsertSuffix)
         * - TypeScript: shared/src/templates/index.ts
         */

        @Test
        fun `class wrapper uses single newline prefix and suffix`() {
            // Unity style: method is surrounded by single newlines
            val existing = "class Foo { }"
            val methodStub = "METHOD"

            val result = CodeHandlers.computeInsertion(existing, methodStub, usesClassWrapper = true)

            // Should be: "class Foo { \nMETHOD\n}"
            val expectedPattern = "\nMETHOD\n}"
            assertTrue(
                result.newContent!!.contains(expectedPattern),
                "Expected class wrapper to use \\n prefix and \\n suffix. Got: ${result.newContent}"
            )
        }

        @Test
        fun `non-class wrapper uses double newline separator`() {
            // Godot/Unreal style: double newline between methods
            val existing = "existing"
            val methodStub = "METHOD"

            val result = CodeHandlers.computeInsertion(existing, methodStub, usesClassWrapper = false)

            // Should be: "existing\n\nMETHOD\n"
            val expectedPattern = "existing\n\nMETHOD\n"
            assertEquals(expectedPattern, result.newContent)
        }
    }

    @Nested
    inner class FindMethodResultTests {
        /**
         * Tests for the FindMethodResult sealed class hierarchy.
         * These verify the type system correctly distinguishes different outcomes.
         */

        @Test
        fun `Found result contains MethodInfo`() {
            val methodInfo = CodeHandlers.MethodInfo(
                name = "testMethod",
                body = "func test(): pass",
                lineNumber = 10,
                element = null
            )
            val result: CodeHandlers.FindMethodResult = CodeHandlers.FindMethodResult.Found(methodInfo)

            assertIs<CodeHandlers.FindMethodResult.Found>(result)
            assertEquals("testMethod", result.info.name)
            assertEquals(10, result.info.lineNumber)
        }

        @Test
        fun `NotFound is a singleton`() {
            val result1 = CodeHandlers.FindMethodResult.NotFound
            val result2 = CodeHandlers.FindMethodResult.NotFound

            assertIs<CodeHandlers.FindMethodResult.NotFound>(result1)
            assertEquals(result1, result2) // data object singletons are equal
        }

        @Test
        fun `BackendUnavailable is a singleton`() {
            val result = CodeHandlers.FindMethodResult.BackendUnavailable

            assertIs<CodeHandlers.FindMethodResult.BackendUnavailable>(result)
        }

        @Test
        fun `Error result contains message`() {
            val result: CodeHandlers.FindMethodResult = CodeHandlers.FindMethodResult.Error("Connection timed out")

            assertIs<CodeHandlers.FindMethodResult.Error>(result)
            assertEquals("Connection timed out", result.message)
        }

        @Test
        fun `when expression covers all result types`() {
            // This test verifies exhaustive matching compiles (compiler enforces this)
            val results = listOf(
                CodeHandlers.FindMethodResult.Found(
                    CodeHandlers.MethodInfo("m", "body", 0, null)
                ),
                CodeHandlers.FindMethodResult.NotFound,
                CodeHandlers.FindMethodResult.BackendUnavailable,
                CodeHandlers.FindMethodResult.Error("error")
            )

            results.forEach { result ->
                // Exhaustive when - compiler verifies all cases are covered
                val description = when (result) {
                    is CodeHandlers.FindMethodResult.Found -> "found: ${result.info.name}"
                    is CodeHandlers.FindMethodResult.NotFound -> "not found"
                    is CodeHandlers.FindMethodResult.BackendUnavailable -> "backend unavailable"
                    is CodeHandlers.FindMethodResult.Error -> "error: ${result.message}"
                }
                assertTrue(description.isNotEmpty())
            }
        }
    }
}
