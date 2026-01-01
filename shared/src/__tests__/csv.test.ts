import { describe, it, expect } from 'vitest';
import {
  toCsvLine,
  toCsv,
  toCsvHeader,
  toCsvBatch,
  parseCsvLine,
  parseCsv,
  validateCsvHeaders,
} from '../csv/serializer.js';
import type { CsvColumnDescriptor } from '../csv/types.js';
import { buildLocalizationColumns, csvRowToLocalizationUpdate } from '../csv/types.js';
import type { Localization } from '../types/entities.js';

describe('CSV Serializer', () => {
  describe('toCsvLine', () => {
    it('should convert simple values to CSV', () => {
      const result = toCsvLine(['hello', 'world', 123]);
      expect(result).toBe('hello,world,123');
    });

    it('should escape values with commas', () => {
      const result = toCsvLine(['hello, world', 'test']);
      expect(result).toBe('"hello, world",test');
    });

    it('should escape values with quotes', () => {
      const result = toCsvLine(['say "hello"', 'test']);
      expect(result).toBe('"say ""hello""",test');
    });

    it('should escape values with newlines', () => {
      const result = toCsvLine(['line1\nline2', 'test']);
      expect(result).toBe('"line1\nline2",test');
    });

    it('should handle null and undefined', () => {
      const result = toCsvLine([null, undefined, 'test']);
      expect(result).toBe(',,test');
    });
  });

  describe('parseCsvLine', () => {
    it('should parse simple values', () => {
      const result = parseCsvLine('hello,world,123');
      expect(result).toEqual(['hello', 'world', '123']);
    });

    it('should parse quoted values', () => {
      const result = parseCsvLine('"hello, world",test');
      expect(result).toEqual(['hello, world', 'test']);
    });

    it('should parse escaped quotes', () => {
      const result = parseCsvLine('"say ""hello""",test');
      expect(result).toEqual(['say "hello"', 'test']);
    });

    it('should parse values with newlines', () => {
      const result = parseCsvLine('"line1\nline2",test');
      expect(result).toEqual(['line1\nline2', 'test']);
    });

    it('should handle empty values', () => {
      const result = parseCsvLine(',,test');
      expect(result).toEqual(['', '', 'test']);
    });
  });

  describe('toCsv', () => {
    it('should generate CSV with headers', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
      ];
      const rows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];

      const result = toCsv(rows, columns);
      expect(result).toBe('ID,Name\r\n1,Alice\r\n2,Bob');
    });

    it('should generate CSV without headers', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
      ];
      const rows = [{ id: 1, name: 'Alice' }];

      const result = toCsv(rows, columns, { includeHeader: false });
      expect(result).toBe('1,Alice');
    });
  });

  describe('parseCsv', () => {
    it('should parse CSV with headers', () => {
      const content = 'ID,Name\n1,Alice\n2,Bob';
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
      ];

      const results = [...parseCsv<{ id: number; name: string }>(content, columns)];

      expect(results).toHaveLength(2);
      expect(results[0].row).toEqual({ id: 1, name: 'Alice' });
      expect(results[1].row).toEqual({ id: 2, name: 'Bob' });
    });

    it('should handle parent column with null values', () => {
      const content = 'ID,Parent\n1,\n2,5';
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'parent', name: 'Parent' },
      ];

      const results = [...parseCsv<{ id: number; parent: number | null }>(content, columns)];

      expect(results[0].row.parent).toBeNull();
      expect(results[1].row.parent).toBe(5);
    });

    it('should report errors for invalid ID values', () => {
      const content = 'ID,Name\nnot-a-number,Alice';
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
      ];

      const results = [...parseCsv(content, columns)];

      expect(results[0].errors).toBeDefined();
      expect(results[0].errors![0]).toContain('Invalid ID value');
    });
  });

  describe('validateCsvHeaders', () => {
    it('should validate matching headers', () => {
      const headerLine = 'ID,Name,Email';
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
        { id: 'email', name: 'Email' },
      ];

      const result = validateCsvHeaders(headerLine, columns);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
    });

    it('should detect missing headers', () => {
      const headerLine = 'ID,Name';
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
        { id: 'email', name: 'Email' },
      ];

      const result = validateCsvHeaders(headerLine, columns);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('Email');
    });

    it('should detect extra headers', () => {
      const headerLine = 'ID,Name,Extra';
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
      ];

      const result = validateCsvHeaders(headerLine, columns);

      expect(result.valid).toBe(true); // Extra columns are allowed
      expect(result.extra).toContain('Extra');
    });
  });

  describe('buildLocalizationColumns', () => {
    it('should build columns with locale names', () => {
      const localeIds = [1, 2];
      const localeNames = new Map([
        [1, 'English'],
        [2, 'Spanish'],
      ]);

      const columns = buildLocalizationColumns(localeIds, localeNames);

      expect(columns).toHaveLength(5); // id, parent, name, + 2 locales
      expect(columns[3]).toEqual({ id: 'locale_1', name: 'English' });
      expect(columns[4]).toEqual({ id: 'locale_2', name: 'Spanish' });
    });
  });

  describe('toCsvHeader', () => {
    it('should generate header line with trailing newline', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
      ];

      const result = toCsvHeader(columns);

      expect(result).toBe('ID,Name\r\n');
    });

    it('should escape header names with special characters', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'desc', name: 'Description, Notes' },
      ];

      const result = toCsvHeader(columns);

      expect(result).toBe('ID,"Description, Notes"\r\n');
    });
  });

  describe('toCsvBatch', () => {
    it('should generate CSV rows without header', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
      ];
      const rows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];

      const result = toCsvBatch(rows, columns);

      expect(result).toBe('1,Alice\r\n2,Bob\r\n');
    });

    it('should return empty string for empty rows', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
      ];

      const result = toCsvBatch([], columns);

      expect(result).toBe('');
    });

    it('should handle rows with special characters', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'text', name: 'Text' },
      ];
      const rows = [
        { id: 1, text: 'Hello, World' },
        { id: 2, text: 'Say "Hi"' },
      ];

      const result = toCsvBatch(rows, columns);

      expect(result).toBe('1,"Hello, World"\r\n2,"Say ""Hi"""\r\n');
    });
  });

  describe('csvRowToLocalizationUpdate', () => {
    it('should extract name and parent fields', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'parent', name: 'Conversation' },
        { id: 'name', name: 'Name' },
      ];
      const row = { id: 1, parent: 5, name: 'greeting' } as Localization;

      const result = csvRowToLocalizationUpdate(row, columns);

      expect(result).toEqual({ name: 'greeting', parent: 5 });
    });

    it('should extract locale columns', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
        { id: 'locale_1', name: 'English' },
        { id: 'locale_2', name: 'Spanish' },
      ];
      const row = {
        id: 1,
        name: 'greeting',
        locale_1: 'Hello',
        locale_2: 'Hola',
      } as unknown as Localization;

      const result = csvRowToLocalizationUpdate(row, columns);

      expect(result).toEqual({
        name: 'greeting',
        locale_1: 'Hello',
        locale_2: 'Hola',
      });
    });

    it('should not include undefined fields', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
        { id: 'locale_1', name: 'English' },
      ];
      const row = { id: 1 } as Localization;

      const result = csvRowToLocalizationUpdate(row, columns);

      expect(result).toEqual({});
    });
  });

  describe('round-trip', () => {
    it('should preserve data through export and import', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'parent', name: 'Conversation' },
        { id: 'name', name: 'Name' },
        { id: 'locale_1', name: 'English' },
      ];
      const originalRows = [
        { id: 1, parent: 0, name: 'greeting', locale_1: 'Hello' },
        { id: 2, parent: 0, name: 'farewell', locale_1: 'Goodbye' },
      ];

      // Export
      const csv = toCsvHeader(columns) + toCsvBatch(originalRows, columns);

      // Import
      const parsedRows = [...parseCsv<typeof originalRows[0]>(csv, columns)];

      expect(parsedRows).toHaveLength(2);
      expect(parsedRows[0].row).toEqual(originalRows[0]);
      expect(parsedRows[1].row).toEqual(originalRows[1]);
    });

    it('should handle quotes and commas through round-trip', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'name', name: 'Name' },
        { id: 'locale_1', name: 'English' },
      ];
      const originalRows = [
        { id: 1, name: 'quote_test', locale_1: 'He said "Hello"' },
        { id: 2, name: 'comma_test', locale_1: 'One, two, three' },
      ];

      // Export
      const csv = toCsvHeader(columns) + toCsvBatch(originalRows, columns);

      // Import
      const parsedRows = [...parseCsv<typeof originalRows[0]>(csv, columns)];

      expect(parsedRows).toHaveLength(2);
      expect(parsedRows[0].row.locale_1).toBe('He said "Hello"');
      expect(parsedRows[1].row.locale_1).toBe('One, two, three');
    });

    it('should handle newlines in quoted fields through round-trip', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'locale_1', name: 'English' },
      ];
      const originalRows = [
        { id: 1, locale_1: 'Line 1\nLine 2' },
      ];

      const csv = toCsvHeader(columns) + toCsvBatch(originalRows, columns);
      const parsedRows = [...parseCsv<typeof originalRows[0]>(csv, columns)];

      expect(parsedRows).toHaveLength(1);
      expect(parsedRows[0].row.locale_1).toBe('Line 1\nLine 2');
    });

    it('should handle null parent values through round-trip', () => {
      const columns: CsvColumnDescriptor[] = [
        { id: 'id', name: 'ID' },
        { id: 'parent', name: 'Parent' },
        { id: 'name', name: 'Name' },
      ];
      const originalRows = [
        { id: 1, parent: null, name: 'orphan' },
        { id: 2, parent: 5, name: 'child' },
      ];

      // Export
      const csv = toCsvHeader(columns) + toCsvBatch(originalRows, columns);

      // Import
      const parsedRows = [...parseCsv<typeof originalRows[0]>(csv, columns)];

      expect(parsedRows[0].row.parent).toBeNull();
      expect(parsedRows[1].row.parent).toBe(5);
    });
  });
});
