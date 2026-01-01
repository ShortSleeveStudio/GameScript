// CSV-related types and constants
// Extracted from GameScriptElectron/src/main/build/build-common.ts

import type { Localization } from '../types/entities.js';

// Export constants
export const CSV_FILENAME_PREFIX_MISC = 'miscellaneous';
export const CSV_FILENAME_PREFIX_SINGLE = 'localizations';
export const CSV_FILENAME_PREFIX_PER_CONVERSATION = 'conversation_';
export const CSV_NEWLINE = '\r\n';
export const CSV_DELIMITER = ',';
export const CSV_ENCODING = 'utf-8';

// Column descriptor for CSV headers
export interface CsvColumnDescriptor {
  id: string;   // Database column name (e.g., 'locale_1')
  name: string; // Display name for CSV header (e.g., 'English')
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
  [localeColumn: `locale_${number}`]: string | null;
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

// Build column descriptors for localizations with given locale IDs
export function buildLocalizationColumns(
  localeIds: number[],
  localeNames: Map<number, string>
): CsvColumnDescriptor[] {
  const columns: CsvColumnDescriptor[] = [
    { id: 'id', name: 'ID' },
    { id: 'parent', name: 'Conversation' },
    { id: 'name', name: 'Name' },
  ];

  for (const localeId of localeIds) {
    const localeName = localeNames.get(localeId) ?? `Locale ${localeId}`;
    columns.push({
      id: `locale_${localeId}`,
      name: localeName,
    });
  }

  return columns;
}

/**
 * Convert a parsed CSV row to a partial Localization update.
 * Extracts only the fields that are present in the CSV (name, parent, locale columns).
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

  // Include all locale columns present in the row
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
