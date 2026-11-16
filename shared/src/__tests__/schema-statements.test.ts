import { describe, it, expect } from 'vitest';
import { generateSchemaStatements, toPostgresPlaceholders } from '../schema/validation.js';

describe('toPostgresPlaceholders', () => {
  it('numbers placeholders in order', () => {
    expect(toPostgresPlaceholders('INSERT INTO t (a, b) VALUES (?, ?)')).toBe('INSERT INTO t (a, b) VALUES ($1, $2)');
  });

  it('leaves ? inside string literals and quoted identifiers alone', () => {
    expect(toPostgresPlaceholders(`SELECT '?', "a?b", 'it''s ?' FROM t WHERE x = ?`)).toBe(
      `SELECT '?', "a?b", 'it''s ?' FROM t WHERE x = $1`
    );
  });
});

describe('generateSchemaStatements', () => {
  it('emits no ? placeholders for postgres', () => {
    for (const stmt of generateSchemaStatements('postgres')) {
      expect(stmt.sql.replace(/'[^']*'/g, '')).not.toContain('?');
      const highest = Math.max(0, ...[...stmt.sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])));
      expect(highest).toBe(stmt.params?.length ?? 0);
    }
  });

  it('keeps ? placeholders for sqlite', () => {
    const insert = generateSchemaStatements('sqlite').find((s) => s.sql.startsWith('INSERT INTO property_types'));
    expect(insert?.sql).toContain('VALUES (?, ?)');
  });
});
