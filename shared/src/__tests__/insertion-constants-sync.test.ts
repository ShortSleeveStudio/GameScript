/**
 * Tests to ensure insertion constants are synchronized across all codebases.
 *
 * These constants MUST remain in sync across THREE locations:
 * 1. Kotlin: plugins/rider/.../handlers/CodeHandlers.kt
 * 2. C#: plugins/rider/src/dotnet/.../SymbolLookupHost.cs
 * 3. TypeScript: shared/src/templates/index.ts
 *
 * If any of these tests fail, the constants have drifted and need to be synchronized.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Expected constant values - the source of truth
const EXPECTED_CONSTANTS = {
    // Separator between existing content and new method (Godot/Unreal style)
    appendSeparator: '\n\n',
    // Prefix before method when inserting into class (Unity style)
    classInsertPrefix: '\n',
    // Suffix after method when inserting into class (Unity style)
    classInsertSuffix: '\n',
};

describe('Insertion Constants Synchronization', () => {
    let kotlinSource: string;
    let csharpSource: string;
    let typescriptSource: string;

    beforeAll(() => {
        // Read source files
        const rootDir = path.resolve(__dirname, '../../..');

        const kotlinPath = path.join(
            rootDir,
            'plugins/rider/src/main/kotlin/com/shortsleevestudio/gamescript/handlers/CodeHandlers.kt'
        );
        const csharpPath = path.join(
            rootDir,
            'plugins/rider/src/dotnet/GameScript.Backend/SymbolLookupHost.cs'
        );
        const typescriptPath = path.join(rootDir, 'shared/src/templates/index.ts');

        kotlinSource = fs.readFileSync(kotlinPath, 'utf-8');
        csharpSource = fs.readFileSync(csharpPath, 'utf-8');
        typescriptSource = fs.readFileSync(typescriptPath, 'utf-8');
    });

    describe('APPEND_SEPARATOR / AppendSeparator', () => {
        it('should be synchronized in Kotlin', () => {
            // Match: private const val APPEND_SEPARATOR = "\n\n"
            const match = kotlinSource.match(/private const val APPEND_SEPARATOR\s*=\s*"(.+?)"/);
            expect(match).not.toBeNull();
            const value = parseEscapedString(match![1]);
            expect(value).toBe(EXPECTED_CONSTANTS.appendSeparator);
        });

        it('should be synchronized in C#', () => {
            // Match: private const string AppendSeparator = "\n\n";
            const match = csharpSource.match(/private const string AppendSeparator\s*=\s*"(.+?)";/);
            expect(match).not.toBeNull();
            const value = parseEscapedString(match![1]);
            expect(value).toBe(EXPECTED_CONSTANTS.appendSeparator);
        });
    });

    describe('CLASS_INSERT_PREFIX / ClassInsertPrefix', () => {
        it('should be synchronized in Kotlin', () => {
            // Match: private const val CLASS_INSERT_PREFIX = "\n"
            const match = kotlinSource.match(/private const val CLASS_INSERT_PREFIX\s*=\s*"(.+?)"/);
            expect(match).not.toBeNull();
            const value = parseEscapedString(match![1]);
            expect(value).toBe(EXPECTED_CONSTANTS.classInsertPrefix);
        });

        it('should be synchronized in C#', () => {
            // Match: private const string ClassInsertPrefix = "\n";
            const match = csharpSource.match(/private const string ClassInsertPrefix\s*=\s*"(.+?)";/);
            expect(match).not.toBeNull();
            const value = parseEscapedString(match![1]);
            expect(value).toBe(EXPECTED_CONSTANTS.classInsertPrefix);
        });
    });

    describe('CLASS_INSERT_SUFFIX / ClassInsertSuffix', () => {
        it('should be synchronized in Kotlin', () => {
            // Match: private const val CLASS_INSERT_SUFFIX = "\n"
            const match = kotlinSource.match(/private const val CLASS_INSERT_SUFFIX\s*=\s*"(.+?)"/);
            expect(match).not.toBeNull();
            const value = parseEscapedString(match![1]);
            expect(value).toBe(EXPECTED_CONSTANTS.classInsertSuffix);
        });

        it('should be synchronized in C#', () => {
            // Match: private const string ClassInsertSuffix = "\n";
            const match = csharpSource.match(/private const string ClassInsertSuffix\s*=\s*"(.+?)";/);
            expect(match).not.toBeNull();
            const value = parseEscapedString(match![1]);
            expect(value).toBe(EXPECTED_CONSTANTS.classInsertSuffix);
        });
    });

    describe('usesClassWrapper logic', () => {
        it('should return true only for Unity in TypeScript', () => {
            // Check that usesClassWrapper returns true only for 'unity'
            const match = typescriptSource.match(
                /export function usesClassWrapper\([^)]*\):\s*boolean\s*\{([^}]+)\}/
            );
            expect(match).not.toBeNull();
            const body = match![1];
            // Should contain: return template === 'unity';
            expect(body).toContain("template === 'unity'");
        });

        it('should match Kotlin usesClassWrapper logic', () => {
            // Check Kotlin has same logic
            const match = kotlinSource.match(
                /private fun usesClassWrapper\([^)]*\):\s*Boolean\s*\{([^}]+)\}/
            );
            expect(match).not.toBeNull();
            const body = match![1];
            // Should contain: return template == "unity"
            expect(body).toContain('template == "unity"');
        });
    });
});

/**
 * Parse escaped string from source code.
 * Converts \n, \t, etc. to actual characters.
 */
function parseEscapedString(s: string): string {
    return s
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"');
}
