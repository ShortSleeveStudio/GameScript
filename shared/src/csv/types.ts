// CSV-related types and constants

import type { Localization } from '../types/entities.js';
import type { PluralCategory, GenderCategory } from '../types/constants.js';
import { localeIdToColumns, GENDER_CATEGORIES, PLURAL_DISPLAY_NAMES, GENDER_DISPLAY_NAMES } from '../types/constants.js';
import { getRequiredPluralCategories } from '../cldr/plural-rules.js';

// Export constants
export const CSV_FILENAME_PREFIX_MISC = 'miscellaneous';
export const CSV_FILENAME_PREFIX_SINGLE = 'localizations';
export const CSV_FILENAME_PREFIX_PER_CONVERSATION = 'conversation_';
export const CSV_NEWLINE = '\r\n';
export const CSV_DELIMITER = ',';
export const CSV_ENCODING = 'utf-8';

// Column descriptor for CSV headers
export interface CsvColumnDescriptor {
  id: string;   // Database column name (e.g., 'locale_1_form_other_other')
  name: string; // Display name for CSV header (e.g., 'English (other)')
}

// Options for CSV export
export interface CsvExportOptions {
  delimiter?: string;
  newline?: string;
  encoding?: string;
  includeHeader?: boolean;
}

// Options for CSV import
export interface CsvImportOptions {
  delimiter?: string;
  encoding?: string;
  hasHeader?: boolean;
}

// Result of parsing a CSV row
export interface CsvParseResult<T> {
  row: T;
  lineNumber: number;
  errors?: string[];
}

// Callback for processing parsed rows
export type CsvRowHandler<T> = (result: CsvParseResult<T>) => void | Promise<void>;

/**
 * Result of processing an import batch.
 * Stats are returned separately so they can be applied after transaction commits.
 */
export interface ImportBatchResult {
  updated: number;
  inserted: number;
  skipped: number;
}

// Localization-specific types
export interface LocalizationCsvRow {
  id: number;
  parent: number | null;
  name: string | null;
  [localeColumn: `locale_${number}_form_${string}_${string}`]: string | null;
}

// Convert a Localization entity to a CSV-compatible row
export function localizationToCsvRow(
  localization: Localization,
  columns: CsvColumnDescriptor[]
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const col of columns) {
    row[col.name] = localization[col.id as keyof Localization];
  }
  return row;
}

/**
 * Build column descriptors for localization CSV export/import.
 *
 * Generates form-aware column descriptors using CLDR-relevant plural categories.
 *
 * Gender column behavior:
 * - Default (no options): only `other`-gender columns (one per CLDR plural). Clean for export.
 * - `includeAllGenders: true`: all 4 gender columns per plural. Use for import to accept any CSV.
 * - `usedColumns`: curtails to only columns with data. Implies all genders are considered.
 *
 * @param localeIds - Ordered locale IDs to include
 * @param localeNames - Map of locale ID to display name (e.g., "English")
 * @param localeCodes - Map of locale ID to locale code (e.g., "en_US") for CLDR lookup
 * @param options - Optional: includeAllGenders, usedColumns for curtailing
 */
export function buildLocalizationColumns(
  localeIds: number[],
  localeNames: Map<number, string>,
  localeCodes: Map<number, string>,
  options?: {
    includeAllGenders?: boolean;
    usedColumns?: ReadonlySet<string>;
  },
): CsvColumnDescriptor[] {
  const includeAllGenders = options?.includeAllGenders ?? false;
  const usedColumns = options?.usedColumns;

  const columns: CsvColumnDescriptor[] = [
    { id: 'id', name: 'ID' },
    { id: 'parent', name: 'Conversation' },
    { id: 'name', name: 'Name' },
  ];

  for (const localeId of localeIds) {
    const localeName = localeNames.get(localeId) ?? `Locale ${localeId}`;
    const localeCode = localeCodes.get(localeId) ?? '';
    const requiredPlurals = getRequiredPluralCategories(localeCode);
    const localeColumns = localeIdToColumns(localeId);

    const genders = (includeAllGenders || usedColumns) ? GENDER_CATEGORIES : (['other'] as const);

    for (const plural of requiredPlurals) {
      for (const gender of genders) {
        const colId = localeColumns.form(plural, gender);

        // Curtail: skip columns that have no data
        if (usedColumns && !usedColumns.has(colId)) continue;

        // Build human-readable header
        const formLabel = formatFormLabel(plural, gender, requiredPlurals.length, genders.length);
        columns.push({
          id: colId,
          name: `${localeName} (${formLabel})`,
        });
      }
    }
  }

  return columns;
}

/**
 * Format a human-readable label for a form column.
 */
function formatFormLabel(
  plural: PluralCategory,
  gender: GenderCategory,
  pluralCount: number,
  genderCount: number,
): string {
  const pluralName = PLURAL_DISPLAY_NAMES[plural];
  const genderName = GENDER_DISPLAY_NAMES[gender];

  if (pluralCount === 1 && genderCount === 1) {
    // Single form — no qualifier needed
    return 'text';
  }
  if (genderCount === 1) {
    // Only one gender — just show plural
    return pluralName;
  }
  if (pluralCount === 1) {
    // Only one plural — just show gender
    return genderName;
  }
  // Both
  return `${pluralName}/${genderName}`;
}

/**
 * Convert a parsed CSV row to a partial Localization update.
 * Extracts only the fields that are present in the CSV (name, parent, locale form columns).
 * Used for CSV import to build update payloads.
 */
export function csvRowToLocalizationUpdate(
  row: Localization,
  columns: CsvColumnDescriptor[]
): Partial<Localization> {
  const updates: Partial<Localization> = {};

  if (row.name !== undefined) {
    updates.name = row.name;
  }
  if (row.parent !== undefined) {
    updates.parent = row.parent as number;
  }

  // Include all locale form columns present in the row
  for (const col of columns) {
    if (col.id.startsWith('locale_')) {
      const value = row[col.id as keyof Localization];
      if (value !== undefined) {
        (updates as Record<string, unknown>)[col.id] = value;
      }
    }
  }

  return updates;
}
