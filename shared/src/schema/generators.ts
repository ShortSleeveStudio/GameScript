// SQL generation utilities for SQLite and PostgreSQL

import type { TableDefinition, ColumnDefinition } from './tables.js';

export type DatabaseDialect = 'sqlite' | 'postgres';

function columnTypeToSQL(col: ColumnDefinition, dialect: DatabaseDialect): string {
  const typeMap: Record<string, Record<DatabaseDialect, string>> = {
    INTEGER: { sqlite: 'INTEGER', postgres: 'INTEGER' },
    TEXT: { sqlite: 'TEXT', postgres: 'TEXT' },
    REAL: { sqlite: 'REAL', postgres: 'DOUBLE PRECISION' },
    BOOLEAN: { sqlite: 'INTEGER', postgres: 'BOOLEAN' },
    TIMESTAMP: { sqlite: 'TEXT', postgres: 'TIMESTAMP WITH TIME ZONE' },
  };
  return typeMap[col.type]?.[dialect] ?? col.type;
}

function formatDefaultValue(col: ColumnDefinition, dialect: DatabaseDialect): string {
  if (col.defaultValue === undefined || col.defaultValue === null) {
    return '';
  }

  if (col.defaultValue === 'CURRENT_TIMESTAMP') {
    return dialect === 'postgres' ? ' DEFAULT CURRENT_TIMESTAMP' : " DEFAULT (datetime('now'))";
  }

  if (typeof col.defaultValue === 'boolean') {
    if (dialect === 'sqlite') {
      return ` DEFAULT ${col.defaultValue ? 1 : 0}`;
    }
    return ` DEFAULT ${col.defaultValue}`;
  }

  if (typeof col.defaultValue === 'string') {
    return ` DEFAULT '${col.defaultValue}'`;
  }

  return ` DEFAULT ${col.defaultValue}`;
}

function generateColumnSQL(col: ColumnDefinition, dialect: DatabaseDialect): string {
  const parts: string[] = [col.name, columnTypeToSQL(col, dialect)];

  if (col.primaryKey) {
    if (dialect === 'sqlite') {
      parts.push('PRIMARY KEY');
      if (col.autoIncrement) {
        parts.push('AUTOINCREMENT');
      }
    } else {
      if (col.autoIncrement) {
        // PostgreSQL uses SERIAL for auto-increment primary keys
        parts[1] = 'SERIAL';
      }
      parts.push('PRIMARY KEY');
    }
  }

  if (col.notNull && !col.primaryKey) {
    parts.push('NOT NULL');
  }

  if (col.unique && !col.primaryKey) {
    parts.push('UNIQUE');
  }

  const defaultVal = formatDefaultValue(col, dialect);
  if (defaultVal) {
    parts.push(defaultVal.trim());
  }

  return parts.join(' ');
}

function generateForeignKeysSQL(table: TableDefinition, dialect: DatabaseDialect): string[] {
  const fks: string[] = [];

  for (const col of table.columns) {
    if (col.references) {
      const onDelete = 'CASCADE';
      fks.push(
        `FOREIGN KEY (${col.name}) REFERENCES ${col.references.table}(${col.references.column}) ON DELETE ${onDelete}`
      );
    }
  }

  return fks;
}

function generateUniqueConstraintsSQL(table: TableDefinition): string[] {
  if (!table.uniqueConstraints) return [];

  return table.uniqueConstraints.map(
    (cols, i) => `CONSTRAINT ${table.name}_unique_${i} UNIQUE (${cols.join(', ')})`
  );
}

export function generateCreateTableSQL(table: TableDefinition, dialect: DatabaseDialect): string {
  const columns = table.columns.map((col) => generateColumnSQL(col, dialect));
  const foreignKeys = generateForeignKeysSQL(table, dialect);
  const uniqueConstraints = generateUniqueConstraintsSQL(table);

  const allParts = [...columns, ...foreignKeys, ...uniqueConstraints];

  return `CREATE TABLE IF NOT EXISTS ${table.name} (\n  ${allParts.join(',\n  ')}\n);`;
}

export function generateDropTableSQL(table: TableDefinition): string {
  return `DROP TABLE IF EXISTS ${table.name};`;
}

export function generateAllTablesSQL(tables: TableDefinition[], dialect: DatabaseDialect): string {
  return tables.map((t) => generateCreateTableSQL(t, dialect)).join('\n\n');
}

export function generateDropAllTablesSQL(tables: TableDefinition[]): string {
  // Drop in reverse order to handle foreign key dependencies
  return [...tables].reverse().map((t) => generateDropTableSQL(t)).join('\n');
}

// Helper to add a dynamic locale column to localizations table
export function generateAddLocaleColumnSQL(localeId: number, dialect: DatabaseDialect): string {
  const columnName = `locale_${localeId}`;
  return `ALTER TABLE localizations ADD COLUMN ${columnName} TEXT;`;
}

// Helper to remove a locale column
export function generateDropLocaleColumnSQL(localeId: number, dialect: DatabaseDialect): string {
  const columnName = `locale_${localeId}`;
  if (dialect === 'sqlite') {
    // SQLite doesn't support DROP COLUMN before version 3.35.0
    // For older versions, would need to recreate the table
    return `ALTER TABLE localizations DROP COLUMN ${columnName};`;
  }
  return `ALTER TABLE localizations DROP COLUMN ${columnName};`;
}
