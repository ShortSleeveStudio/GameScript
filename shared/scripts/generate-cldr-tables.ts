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

const cldrCorePath = resolve(__dirname, '../node_modules/cldr-core');
const localeNamesBasePath = resolve(__dirname, '../node_modules/cldr-localenames-full/main');

// The locale list comes from CLDR's available locales, not from plurals.json.
// plurals.json is keyed almost entirely by bare language ("zh", "es") because
// regional variants share their language's plural rules, so deriving the list
// from it dropped every regional/script variant (zh-Hant, es-419, fr-CA, ...).
//
// Default-content locales (pt-BR, ja-JP, zh-Hans-CN, ...) are not listed in
// availableLocales because CLDR treats them as identical to their parent, but
// projects commonly name locales that way, so they are included too.
const availableLocales: string[] = JSON.parse(
  readFileSync(resolve(cldrCorePath, 'availableLocales.json'), 'utf-8')
).availableLocales.full;
const defaultContentLocales: string[] = JSON.parse(
  readFileSync(resolve(cldrCorePath, 'defaultContent.json'), 'utf-8')
).defaultContent;
const defaultContentSet = new Set(defaultContentLocales);

const likelySubtags: Record<string, string> = JSON.parse(
  readFileSync(resolve(cldrCorePath, 'supplemental/likelySubtags.json'), 'utf-8')
).supplemental.likelySubtags;

type DisplayNames = {
  languages: Record<string, string>;
  scripts: Record<string, string>;
  territories: Record<string, string>;
  variants: Record<string, string>;
  localePattern: string;
  localeSeparator: string;
};

const displayNamesCache = new Map<string, DisplayNames | null>();

/** Load the display-name tables written in the given CLDR locale, or null if it has no directory. */
function loadDisplayNames(dir: string): DisplayNames | null {
  if (displayNamesCache.has(dir)) return displayNamesCache.get(dir)!;
  // Smaller locales ship only some of these files (e.g. no scripts.json), so each is optional
  const read = (file: string) => {
    try {
      return JSON.parse(readFileSync(resolve(localeNamesBasePath, dir, file), 'utf-8')).main[dir]
        .localeDisplayNames ?? {};
    } catch {
      return null;
    }
  };
  const languages = read('languages.json')?.languages;
  const patterns = read('localeDisplayNames.json')?.localeDisplayPattern;
  // A locale without its own language names counts as having no data
  const result: DisplayNames | null = languages
    ? {
        languages,
        scripts: read('scripts.json')?.scripts ?? {},
        territories: read('territories.json')?.territories ?? {},
        variants: read('variants.json')?.variants ?? {},
        localePattern: patterns?.localePattern ?? '{0} ({1})',
        localeSeparator: patterns?.localeSeparator ?? '{0}, {1}',
      }
    : null;
  displayNamesCache.set(dir, result);
  return result;
}

/** Drop the last subtag: "zh-Hant-HK" → "zh-Hant", "zh" → null. */
function truncateLocale(localeCode: string): string | null {
  const i = localeCode.lastIndexOf('-');
  return i > 0 ? localeCode.slice(0, i) : null;
}

/**
 * Get a locale's name written in that locale itself.
 *
 * - "zh-Hant" → "繁體中文", "es-419" → "español latinoamericano" (CLDR dialect names)
 * - "zh-Hant-HK" → "繁體中文（中國香港特別行政區）" (dialect name + region qualifier)
 * - "sr-Latn" → "srpski (latinica)" (language + script qualifier)
 * - "ja-JP", "pt-BR" → same as "ja", "pt" (default content is identical to its parent,
 *   and this name is exported as the player-facing language name)
 */
function getAutonym(localeCode: string): string | null {
  if (defaultContentSet.has(localeCode)) {
    const parent = truncateLocale(localeCode);
    if (parent) return getAutonym(parent);
  }

  // Use the locale's own data, or its nearest ancestor's (default-content locales have no directory)
  let names: DisplayNames | null = null;
  for (let dir: string | null = localeCode; dir && !names; dir = truncateLocale(dir)) {
    names = loadDisplayNames(dir);
  }
  if (!names) return null;

  // Longest prefix with its own language name ("zh-Hant" for "zh-Hant-HK")
  const subtags = localeCode.split('-');
  let baseLength = subtags.length;
  while (baseLength > 0 && !names.languages[subtags.slice(0, baseLength).join('-')]) baseLength--;
  if (baseLength === 0) return null;
  const base = names.languages[subtags.slice(0, baseLength).join('-')];

  // Qualify with the remaining script / region / variant subtags
  const qualifiers: string[] = [];
  for (const subtag of subtags.slice(baseLength)) {
    const qualifier = /^[A-Z][a-z]{3}$/.test(subtag)
      ? names.scripts[subtag]
      : /^([A-Z]{2}|\d{3})$/.test(subtag)
        ? names.territories[subtag]
        : names.variants[subtag.toUpperCase()]; // "valencia" → key "VALENCIA"
    qualifiers.push(qualifier ?? subtag);
  }
  if (qualifiers.length === 0) return base;

  // Function replacers so a "$" in a name is never read as a replacement pattern
  const fill = (pattern: string, a: string, b: string) =>
    pattern.replace('{0}', () => a).replace('{1}', () => b);
  const joined = qualifiers.reduce((acc, q) => fill(names!.localeSeparator, acc, q));
  return fill(names.localePattern, base, joined);
}

/**
 * Region-only aliases for script-qualified locales, using CLDR likely subtags:
 * "zh-Hant-TW" → "zh-TW", "zh-Hans-CN" → "zh-CN", "sr-Latn-ME" → "sr-ME".
 * These short forms are what most projects (and OS/store language settings) use,
 * so they get an entry with the full locale's name. Only added when the short form
 * actually implies that script, and never over an existing CLDR locale.
 */
function getRegionAliases(locales: Iterable<string>): [string, string][] {
  const existing = new Set(locales);
  const aliases: [string, string][] = [];
  for (const locale of existing) {
    const match = /^([a-z]{2,3})-([A-Z][a-z]{3})-([A-Z]{2}|\d{3})$/.exec(locale);
    if (!match) continue;
    const [, lang, script, region] = match;
    const alias = `${lang}-${region}`;
    if (existing.has(alias)) continue;
    // Maximize the short form: lang-REGION entry, else the language's likely script
    const likely = likelySubtags[alias] ?? likelySubtags[lang];
    if (likely?.split('-')[1] !== script) continue;
    aliases.push([alias, locale]);
  }
  return aliases;
}

// Build autonym entries for every CLDR locale, plus any plural-rules locale not otherwise listed
const autonymLocales = new Set<string>([
  ...availableLocales,
  ...defaultContentLocales,
  ...entries.map(([locale]) => locale),
]);
autonymLocales.delete('root');
autonymLocales.delete('und');

// Keep only locales isKnownLocale() accepts (exact or language-subtag plural rules).
// The UI and exporter treat "known" as "has a CLDR name", so a listed locale it
// rejected would show "Unknown locale" right after being picked from the list.
const pluralLocales = new Set(entries.map(([locale]) => locale));
for (const locale of autonymLocales) {
  if (!pluralLocales.has(locale) && !pluralLocales.has(locale.split('-')[0])) {
    autonymLocales.delete(locale);
  }
}

const autonymEntries: [string, string][] = [];

for (const locale of autonymLocales) {
  const autonym = getAutonym(locale);
  if (autonym) {
    autonymEntries.push([locale, autonym]);
  }
}

for (const [alias, target] of getRegionAliases(autonymLocales)) {
  const autonym = getAutonym(target);
  if (autonym) {
    autonymEntries.push([alias, autonym]);
  }
}

// Sort by locale code for deterministic output
autonymEntries.sort((a, b) => a[0].localeCompare(b[0]));

// Generate TypeScript
const nameLines: string[] = [
  '// Generated from cldr-localenames-full — do not edit manually.',
  '// Re-generate with: npx tsx shared/scripts/generate-cldr-tables.ts',
  '//',
  `// Source: cldr-core availableLocales + defaultContent, names from cldr-localenames-full (${autonymEntries.length} autonyms)`,
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
nameLines.push('/** Lowercased, hyphen-separated code → canonical LOCALE_AUTONYMS key. */');
nameLines.push('const CANONICAL_CODES: ReadonlyMap<string, string> = new Map(');
nameLines.push('  LOCALE_AUTONYMS_DATA.map(([code]) => [code.toLowerCase(), code] as const)');
nameLines.push(');');
nameLines.push('');
nameLines.push('/**');
nameLines.push(' * Find the LOCALE_AUTONYMS key for a locale code, ignoring separator and case');
nameLines.push(' * (locale tags are case-insensitive): "zh_TW", "zh-tw", "ZH-TW" → "zh-TW".');
nameLines.push(' * Returns null if CLDR does not list the code; no language-subtag fallback.');
nameLines.push(' */');
nameLines.push('export function findLocaleCode(localeCode: string): string | null {');
nameLines.push("  return CANONICAL_CODES.get(localeCode.replace(/_/g, '-').toLowerCase()) ?? null;");
nameLines.push('}');
nameLines.push('');
nameLines.push('/**');
nameLines.push(' * Get the autonym for a locale code.');
nameLines.push(' * Falls back to the language subtag ("de_XX" → "Deutsch"), then to the code itself.');
nameLines.push(' */');
nameLines.push('export function getLocaleAutonym(localeCode: string): string {');
nameLines.push('  const code = findLocaleCode(localeCode);');
nameLines.push('  if (code) return LOCALE_AUTONYMS.get(code)!;');
nameLines.push('');
nameLines.push('  // Language subtag fallback');
nameLines.push("  const lang = findLocaleCode(localeCode.split(/[-_]/)[0]);");
nameLines.push('  if (lang) return LOCALE_AUTONYMS.get(lang)!;');
nameLines.push('');
nameLines.push('  return localeCode;');
nameLines.push('}');
nameLines.push('');

const nameOutput = nameLines.join('\n');
const nameOutPath = resolve(__dirname, '../src/cldr/locale-display-names.ts');
writeFileSync(nameOutPath, nameOutput, 'utf-8');

console.log(`Generated ${nameOutPath} with ${autonymEntries.length} autonym entries.`);
