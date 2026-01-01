// CSV serialization utilities using papaparse
// Handles all edge cases including newlines in quoted fields

import Papa from 'papaparse';
import type { CsvColumnDescriptor, CsvExportOptions, CsvImportOptions, CsvParseResult } from './types.js';
import { CSV_DELIMITER, CSV_NEWLINE } from './types.js';

const DEFAULT_EXPORT_OPTIONS: Required<CsvExportOptions> = {
  delimiter: CSV_DELIMITER,
  newline: CSV_NEWLINE,
  encoding: 'utf-8',
  includeHeader: true,
};

const DEFAULT_IMPORT_OPTIONS: Required<CsvImportOptions> = {
  delimiter: CSV_DELIMITER,
  encoding: 'utf-8',
  hasHeader: true,
};

/**
 * Generate a CSV line from an array of values.
 * Handles escaping of quotes, delimiters, and newlines.
 */
export function toCsvLine(values: unknown[], options?: CsvExportOptions): string {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  // Convert values to strings, handling null/undefined
  const row = values.map((v) => (v === null || v === undefined ? '' : String(v)));
  // Use papaparse to properly escape - unparse returns CSV without trailing newline
  return Papa.unparse([row], {
    delimiter: opts.delimiter,
    newline: opts.newline,
  });
}

/**
 * Generate CSV content from rows.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: CsvColumnDescriptor[],
  options?: CsvExportOptions
): string {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };

  // Build data array with column values
  const data = rows.map((row) => columns.map((c) => row[c.id] ?? ''));

  if (opts.includeHeader) {
    const fields = columns.map((c) => c.name);
    return Papa.unparse(
      { fields, data },
      { delimiter: opts.delimiter, newline: opts.newline }
    );
  }

  return Papa.unparse(data, {
    delimiter: opts.delimiter,
    newline: opts.newline,
  });
}

/**
 * Generate CSV header line only.
 * Used for streaming exports where header is written first.
 * Returns string with trailing newline.
 */
export function toCsvHeader(columns: CsvColumnDescriptor[], options?: CsvExportOptions): string {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const headerValues = columns.map((c) => c.name);
  return Papa.unparse([headerValues], {
    delimiter: opts.delimiter,
    newline: opts.newline,
  }) + opts.newline;
}

/**
 * Generate CSV for a batch of rows (no header).
 * Used for streaming exports where rows are written in batches.
 * Returns string with trailing newline.
 */
export function toCsvBatch<T extends Record<string, unknown>>(
  rows: T[],
  columns: CsvColumnDescriptor[],
  options?: CsvExportOptions
): string {
  if (rows.length === 0) return '';

  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const data = rows.map((row) => columns.map((c) => row[c.id] ?? ''));

  return Papa.unparse(data, {
    delimiter: opts.delimiter,
    newline: opts.newline,
  }) + opts.newline;
}

/**
 * Parse a single CSV line into an array of string values.
 * Handles quoted fields and escaped quotes.
 */
export function parseCsvLine(line: string, options?: CsvImportOptions): string[] {
  const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };
  const result = Papa.parse<string[]>(line, {
    delimiter: opts.delimiter,
  });
  return result.data[0] || [];
}

/**
 * Parse CSV content into typed rows using a generator.
 * Yields one row at a time for memory-efficient processing of large files.
 *
 * @param content - Raw CSV string content
 * @param columns - Expected column descriptors for mapping headers to fields
 * @param options - Import options (delimiter, hasHeader)
 * @yields Parsed rows with line numbers and any validation errors
 */
export function* parseCsv<T extends Record<string, unknown>>(
  content: string,
  columns: CsvColumnDescriptor[],
  options?: CsvImportOptions
): Generator<CsvParseResult<T>> {
  const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };

  // Parse entire CSV - papaparse handles newlines in quoted fields correctly
  const result = Papa.parse<string[]>(content, {
    delimiter: opts.delimiter,
    header: false, // We handle header mapping ourselves for more control
    skipEmptyLines: true,
  });

  if (result.data.length === 0) {
    return;
  }

  let startIndex = 0;
  let columnMap = columns;

  // Handle header row
  if (opts.hasHeader && result.data.length > 0) {
    const headerValues = result.data[0];

    // Build column map from header
    const headerToId = new Map<string, string>();
    for (const col of columns) {
      headerToId.set(col.name, col.id);
    }

    columnMap = headerValues.map((headerName) => {
      const id = headerToId.get(headerName);
      if (!id) {
        // Unknown column - use header name as id
        return { id: headerName, name: headerName };
      }
      return { id, name: headerName };
    });

    startIndex = 1;
  }

  // Parse data rows
  for (let i = startIndex; i < result.data.length; i++) {
    const values = result.data[i];
    const row: Record<string, unknown> = {};
    const errors: string[] = [];

    for (let j = 0; j < columnMap.length && j < values.length; j++) {
      const col = columnMap[j];
      let value: unknown = values[j];

      // Type conversion based on column name
      if (col.id === 'id') {
        const parsed = parseInt(value as string, 10);
        if (isNaN(parsed)) {
          errors.push(`Invalid ID value "${value}" at line ${i + 1}`);
          value = 0;
        } else {
          value = parsed;
        }
      } else if (col.id === 'parent') {
        if (value === '' || value === null) {
          value = null;
        } else {
          const parsed = parseInt(value as string, 10);
          if (isNaN(parsed)) {
            errors.push(`Invalid parent value "${value}" at line ${i + 1}`);
            value = null;
          } else {
            value = parsed;
          }
        }
      }

      row[col.id] = value;
    }

    yield {
      row: row as T,
      lineNumber: i + 1,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

/**
 * Validate that CSV headers match expected columns.
 * Returns missing columns (required but not in CSV) and extra columns (in CSV but unknown).
 *
 * @param headerLine - First line of CSV containing headers
 * @param expectedColumns - Column descriptors defining expected headers
 * @param options - Import options (delimiter)
 * @returns Validation result with missing and extra column names
 */
export function validateCsvHeaders(
  headerLine: string,
  expectedColumns: CsvColumnDescriptor[],
  options?: CsvImportOptions
): { valid: boolean; missing: string[]; extra: string[] } {
  const headers = parseCsvLine(headerLine, options);

  const expectedNames = new Set(expectedColumns.map((c) => c.name));
  const actualNames = new Set(headers);

  const missing = [...expectedNames].filter((name) => !actualNames.has(name));
  const extra = [...actualNames].filter((name) => !expectedNames.has(name));

  return {
    valid: missing.length === 0,
    missing,
    extra,
  };
}
