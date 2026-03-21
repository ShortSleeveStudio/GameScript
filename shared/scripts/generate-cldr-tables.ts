#!/usr/bin/env npx tsx
/**
 * Generate CLDR Lookup Tables
 *
 * Reads from cldr-core and cldr-localenames-full to generate:
 * 1. plural-rules.ts — plural categories per locale
 * 2. locale-display-names.ts — autonyms (each language's name in its own script)
 *
 * Usage: npx tsx shared/scripts/generate-cldr-tables.ts
 *
 * Generated files are checked into source — this script only needs to be re-run
 * when upgrading the CLDR packages.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Valid plural categories in canonical order (must match PLURAL_CATEGORIES in constants.ts)
const VALID_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;
const VALID_SET = new Set<string>(VALID_CATEGORIES);

// Read CLDR data
const cldrPath = resolve(__dirname, '../node_modules/cldr-core/supplemental/plurals.json');
const cldrData = JSON.parse(readFileSync(cldrPath, 'utf-8'));
const cardinals: Record<string, Record<string, string>> =
  cldrData.supplemental['plurals-type-cardinal'];

// Build the entries
const entries: [string, string[]][] = [];

for (const [locale, rules] of Object.entries(cardinals)) {
  const categories = Object.keys(rules)
    .map((key) => key.replace('pluralRule-count-', ''))
    .filter((cat) => VALID_SET.has(cat));

  // Sort in canonical order
  categories.sort((a, b) => VALID_CATEGORIES.indexOf(a as any) - VALID_CATEGORIES.indexOf(b as any));

  entries.push([locale, categories]);
}

// Sort entries by locale code for deterministic output
entries.sort((a, b) => a[0].localeCompare(b[0]));

// Generate TypeScript
const lines: string[] = [
  '// Generated from cldr-core — do not edit manually.',
  '// Re-generate with: npx tsx shared/scripts/generate-cldr-tables.ts',
  '//',
  `// Source: cldr-core/supplemental/plurals.json (${entries.length} locales)`,
  `// Generated: ${new Date().toISOString().split('T')[0]}`,
  '',
  "import type { PluralCategory } from '../types/constants.js';",
  '',
  '/**',
  ' * Map from CLDR locale code to the plural categories that locale distinguishes.',
  ' * Categories are in canonical order: zero, one, two, few, many, other.',
  ' * Every locale includes "other" as the universal catch-all.',
  ' */',
  'const PLURAL_RULES_DATA: ReadonlyArray<readonly [string, readonly PluralCategory[]]> = [',
];

for (const [locale, categories] of entries) {
  const cats = categories.map((c) => `'${c}'`).join(', ');
  lines.push(`  ['${locale}', [${cats}]],`);
}

lines.push('];');
lines.push('');
lines.push('/** Lookup map built from the data array. */');
lines.push('export const PLURAL_RULES: ReadonlyMap<string, readonly PluralCategory[]> = new Map(PLURAL_RULES_DATA);');
lines.push('');
lines.push('/** Default when no CLDR data exists for a locale. */');
lines.push("const DEFAULT_CATEGORIES: readonly PluralCategory[] = ['other'];");
lines.push('');
lines.push('/**');
lines.push(' * Get the plural categories required by a locale.');
lines.push(' *');
lines.push(' * Lookup order:');
lines.push(' * 1. Exact match on the full locale code (e.g., "pt-PT" or "pt_PT")');
lines.push(' * 2. Normalized separator match (CLDR uses hyphens, GameScript uses underscores)');
lines.push(' * 3. Language subtag only (e.g., "pt")');
lines.push(' * 4. Default: ["other"]');
lines.push(' */');
lines.push('export function getRequiredPluralCategories(localeCode: string): readonly PluralCategory[] {');
lines.push('  // Exact match');
lines.push('  const exact = PLURAL_RULES.get(localeCode);');
lines.push('  if (exact) return exact;');
lines.push('');
lines.push('  // Normalize separator: CLDR keys use hyphens, GameScript locale names use underscores');
lines.push("  const normalized = localeCode.includes('_') ? localeCode.replace(/_/g, '-') : localeCode.replace(/-/g, '_');");
lines.push('  const normalizedMatch = PLURAL_RULES.get(normalized);');
lines.push('  if (normalizedMatch) return normalizedMatch;');
lines.push('');
lines.push('  // Language subtag fallback (split on - or _)');
lines.push("  const lang = localeCode.split(/[-_]/)[0];");
lines.push('  if (lang !== localeCode) {');
lines.push('    const langMatch = PLURAL_RULES.get(lang);');
lines.push('    if (langMatch) return langMatch;');
lines.push('  }');
lines.push('');
lines.push('  return DEFAULT_CATEGORIES;');
lines.push('}');
lines.push('');
lines.push('/**');
lines.push(' * Check if a locale code is known to CLDR (has plural rules).');
lines.push(' * Uses the same normalization as getRequiredPluralCategories.');
lines.push(' */');
lines.push('export function isKnownLocale(localeCode: string): boolean {');
lines.push('  if (PLURAL_RULES.has(localeCode)) return true;');
lines.push("  const normalized = localeCode.includes('_') ? localeCode.replace(/_/g, '-') : localeCode.replace(/-/g, '_');");
lines.push('  if (PLURAL_RULES.has(normalized)) return true;');
lines.push("  const lang = localeCode.split(/[-_]/)[0];");
lines.push('  if (lang !== localeCode && PLURAL_RULES.has(lang)) return true;');
lines.push('  return false;');
lines.push('}');
lines.push('');

const output = lines.join('\n');
const outPath = resolve(__dirname, '../src/cldr/plural-rules.ts');
writeFileSync(outPath, output, 'utf-8');

console.log(`Generated ${outPath} with ${entries.length} locale entries.`);

// ============================================================================
// Generate locale-display-names.ts (autonyms)
// ============================================================================

const localeNamesBasePath = resolve(__dirname, '../node_modules/cldr-localenames-full/main');

/**
 * Try to read a language's autonym from its own CLDR locale directory.
 * For "pt-PT", try: pt-PT/languages.json → key "pt", then pt/languages.json → key "pt".
 */
function getAutonym(localeCode: string): string | null {
  // The language subtag is the key to look up in the languages file
  const langSubtag = localeCode.split('-')[0];

  // Try the full locale code directory first, then the language subtag
  const candidates = [localeCode, langSubtag];
  // Deduplicate (e.g., "en" would try "en" twice)
  const unique = [...new Set(candidates)];

  for (const dir of unique) {
    try {
      const filePath = resolve(localeNamesBasePath, dir, 'languages.json');
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      const languages = data.main[dir]?.localeDisplayNames?.languages;
      if (languages && languages[langSubtag]) {
        return languages[langSubtag];
      }
    } catch {
      // Directory doesn't exist for this locale — try next candidate
    }
  }
  return null;
}

// Build autonym entries for all locales that have plural rules
const autonymEntries: [string, string][] = [];

for (const [locale] of entries) {
  const autonym = getAutonym(locale);
  if (autonym) {
    autonymEntries.push([locale, autonym]);
  }
}

// Sort by locale code for deterministic output
autonymEntries.sort((a, b) => a[0].localeCompare(b[0]));

// Generate TypeScript
const nameLines: string[] = [
  '// Generated from cldr-localenames-full — do not edit manually.',
  '// Re-generate with: npx tsx shared/scripts/generate-cldr-tables.ts',
  '//',
  `// Source: cldr-localenames-full/main/*/languages.json (${autonymEntries.length} autonyms)`,
  `// Generated: ${new Date().toISOString().split('T')[0]}`,
  '',
  '/**',
  " * Autonyms: each language's name in its own script.",
  " * e.g., 'fr' → 'français', 'ja' → '日本語', 'de' → 'Deutsch'",
  ' */',
  'const LOCALE_AUTONYMS_DATA: ReadonlyArray<readonly [string, string]> = [',
];

for (const [locale, autonym] of autonymEntries) {
  // Escape single quotes in autonyms
  const escaped = autonym.replace(/'/g, "\\'");
  nameLines.push(`  ['${locale}', '${escaped}'],`);
}

nameLines.push('];');
nameLines.push('');
nameLines.push('/** Lookup map of locale code → autonym. */');
nameLines.push('export const LOCALE_AUTONYMS: ReadonlyMap<string, string> = new Map(LOCALE_AUTONYMS_DATA);');
nameLines.push('');
nameLines.push('/**');
nameLines.push(' * Get the autonym for a locale code.');
nameLines.push(' * Returns the code itself if no autonym is found.');
nameLines.push(' */');
nameLines.push('export function getLocaleAutonym(localeCode: string): string {');
nameLines.push('  const autonym = LOCALE_AUTONYMS.get(localeCode);');
nameLines.push('  if (autonym) return autonym;');
nameLines.push('');
nameLines.push('  // Normalize separator and try again');
nameLines.push("  const normalized = localeCode.includes('_') ? localeCode.replace(/_/g, '-') : localeCode.replace(/-/g, '_');");
nameLines.push('  const normalizedMatch = LOCALE_AUTONYMS.get(normalized);');
nameLines.push('  if (normalizedMatch) return normalizedMatch;');
nameLines.push('');
nameLines.push('  // Language subtag fallback');
nameLines.push("  const lang = localeCode.split(/[-_]/)[0];");
nameLines.push('  if (lang !== localeCode) {');
nameLines.push('    const langMatch = LOCALE_AUTONYMS.get(lang);');
nameLines.push('    if (langMatch) return langMatch;');
nameLines.push('  }');
nameLines.push('');
nameLines.push('  return localeCode;');
nameLines.push('}');
nameLines.push('');

const nameOutput = nameLines.join('\n');
const nameOutPath = resolve(__dirname, '../src/cldr/locale-display-names.ts');
writeFileSync(nameOutPath, nameOutput, 'utf-8');

console.log(`Generated ${nameOutPath} with ${autonymEntries.length} autonym entries.`);
