import { describe, it, expect } from 'vitest';
import { allTables } from '../schema/tables.js';

describe('allTables order', () => {
  // PostgreSQL rejects a FOREIGN KEY to a table that doesn't exist yet (SQLite allows it),
  // so every referenced table must be created before the table that references it.
  it('creates every referenced table before the table that references it', () => {
    const position = new Map(allTables.map((table, index) => [table.name, index]));
    const forwardReferences: string[] = [];

    allTables.forEach((table, index) => {
      for (const column of table.columns) {
        if (!column.references) continue;
        const target = position.get(column.references.table);
        if (target === undefined || target >= index) {
          forwardReferences.push(`${table.name}.${column.name} -> ${column.references.table}`);
        }
      }
    });

    expect(forwardReferences).toEqual([]);
  });
});
