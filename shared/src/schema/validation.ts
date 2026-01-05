// Schema validation utilities for database connection flow
// Used by the UI bridge to validate and initialize schemas

import type { DatabaseDialect } from './generators.js';
import { generateAllTablesSQL } from './generators.js';
import { allTables } from './tables.js';
import { generateInitializationSQL } from './initialization.js';

/**
 * SQL to check if a core table exists.
 * Checks for 'conversations' table as a representative core table.
 */
export function getSchemaCheckSQL(dialect: DatabaseDialect): string {
	return dialect === 'sqlite'
		? "SELECT name FROM sqlite_master WHERE type='table' AND name='conversations'"
		: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='conversations'";
}

/**
 * SQL to check if database has any tables.
 * Used to distinguish empty database from invalid schema.
 */
export function getTableCountSQL(dialect: DatabaseDialect): string {
	return dialect === 'sqlite'
		? "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
		: "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema='public'";
}

/**
 * Statement type for schema initialization.
 * sql: The SQL statement to execute
 * params: Optional parameters (for DML statements)
 * isDDL: True if this is a DDL statement (CREATE, ALTER, DROP), false for DML (INSERT, UPDATE)
 */
export interface SchemaStatement {
	sql: string;
	params?: unknown[];
	isDDL: boolean;
}

/**
 * Generate all schema creation and initialization statements.
 * Returns statements in the correct order for execution.
 *
 * @param dialect - 'sqlite' or 'postgres'
 * @returns Array of statements with parameters and DDL flag
 */
export function generateSchemaStatements(dialect: DatabaseDialect): SchemaStatement[] {
	const statements: SchemaStatement[] = [];

	// Table creation (DDL, no params)
	const tableSql = generateAllTablesSQL(allTables, dialect);
	for (const stmt of tableSql.split(';').filter((s: string) => s.trim())) {
		statements.push({ sql: stmt.trim(), isDDL: true });
	}

	// Initialization data (DML with params, plus some DDL for ALTER TABLE)
	const initStatements = generateInitializationSQL();
	for (const stmt of initStatements) {
		const trimmed = stmt.sql.trim().toUpperCase();
		const isDDL = trimmed.startsWith('ALTER') || trimmed.startsWith('CREATE') || trimmed.startsWith('DROP');
		statements.push({
			sql: stmt.sql,
			params: stmt.params,
			isDDL,
		});
	}

	return statements;
}
