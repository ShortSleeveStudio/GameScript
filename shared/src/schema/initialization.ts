// Schema initialization utilities
// Provides default data and initialization logic for new databases

import { PROPERTY_TYPES, TABLE_CODE_OUTPUT_FOLDER } from '../types/constants.js';

export interface InitialRow {
  [key: string]: unknown;
}

export interface InitialTableData {
  tableName: string;
  rows: InitialRow[];
}

/**
 * Default values for initial database setup
 */
export const DEFAULT_LOCALE_NAME = 'English';
export const DEFAULT_ACTOR_NAME = 'Narrator';
export const DEFAULT_ACTOR_COLOR = '#808080';
export const DEFAULT_VERSION = '0.0.0';

export interface InitializationStatement {
  sql: string;
  params: unknown[];
}

/**
 * Generate SQL statements to initialize a new database with default data.
 * This includes:
 * - Property types lookup table
 * - Default locale with localized name
 * - Default actor with localized name
 * - Version tracking
 *
 * @returns Array of SQL statements with parameters to execute in order
 */
export function generateInitializationSQL(): InitializationStatement[] {
  const statements: InitializationStatement[] = [];

  // =========================================================================
  // Initialize property_types table (required for node properties)
  // =========================================================================
  for (const propertyType of PROPERTY_TYPES) {
    statements.push({
      sql: 'INSERT INTO property_types (id, name) VALUES (?, ?)',
      params: [propertyType.id, propertyType.name],
    });
  }

  // =========================================================================
  // Initialize locales with localized name
  // =========================================================================
  // Insert localization for default locale's localized name (id will be 1)
  statements.push({
    sql: 'INSERT INTO localizations (parent, name, is_system_created) VALUES (NULL, NULL, 1)',
    params: [],
  });

  // Insert default locale with localized_name reference (id will be 1)
  statements.push({
    sql: 'INSERT INTO locales (name, localized_name, is_system_created) VALUES (?, 1, 1)',
    params: [DEFAULT_LOCALE_NAME],
  });

  // Set the default locale as the primary locale
  statements.push({
    sql: 'INSERT INTO locale_principal (principal) VALUES (1)',
    params: [],
  });

  // Add locale_1 column to localizations table
  statements.push({
    sql: 'ALTER TABLE localizations ADD COLUMN locale_1 TEXT',
    params: [],
  });

  // =========================================================================
  // Initialize actors with localized name
  // =========================================================================
  // Insert localization for default actor's localized name (id will be 2)
  statements.push({
    sql: 'INSERT INTO localizations (parent, name, is_system_created) VALUES (NULL, NULL, 1)',
    params: [],
  });

  // Insert default actor (Narrator) with localized_name reference (id will be 1)
  statements.push({
    sql: 'INSERT INTO actors (name, color, localized_name, is_system_created) VALUES (?, ?, 2, 1)',
    params: [DEFAULT_ACTOR_NAME, DEFAULT_ACTOR_COLOR],
  });

  // Set the default actor as the principal actor
  statements.push({
    sql: 'INSERT INTO actor_principal (principal) VALUES (1)',
    params: [],
  });

  // =========================================================================
  // Initialize version tracking
  // =========================================================================
  statements.push({
    sql: 'INSERT INTO version (version) VALUES (?)',
    params: [DEFAULT_VERSION],
  });

  // =========================================================================
  // Initialize code output folder setting (singleton, value starts as null)
  // =========================================================================
  statements.push({
    sql: `INSERT INTO "${TABLE_CODE_OUTPUT_FOLDER.name}" (value) VALUES (NULL)`,
    params: [],
  });

  return statements;
}

/**
 * Get initial table data in a structured format.
 * Useful for testing or alternative initialization methods.
 */
export function getInitialData(): InitialTableData[] {
  return [
    {
      tableName: 'property_types',
      rows: PROPERTY_TYPES.map(pt => ({ id: pt.id, name: pt.name })),
    },
    {
      tableName: 'localizations',
      rows: [
        { id: 1, parent: null, name: null, is_system_created: true },
        { id: 2, parent: null, name: null, is_system_created: true },
      ],
    },
    {
      tableName: 'locales',
      rows: [
        { id: 1, name: DEFAULT_LOCALE_NAME, localized_name: 1, is_system_created: true },
      ],
    },
    {
      tableName: 'locale_principal',
      rows: [{ id: 1, principal: 1 }],
    },
    {
      tableName: 'actors',
      rows: [
        { id: 1, name: DEFAULT_ACTOR_NAME, color: DEFAULT_ACTOR_COLOR, localized_name: 2, is_system_created: true },
      ],
    },
    {
      tableName: 'actor_principal',
      rows: [{ id: 1, principal: 1 }],
    },
    {
      tableName: 'version',
      rows: [{ id: 1, version: DEFAULT_VERSION }],
    },
    {
      tableName: TABLE_CODE_OUTPUT_FOLDER.name,
      rows: [{ id: 1, value: null }],
    },
  ];
}
