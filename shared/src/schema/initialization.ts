// Schema initialization utilities
// Provides default data and initialization logic for new databases

import { PROPERTY_TYPES, TABLE_CODE_OUTPUT_FOLDER, TABLE_SNAPSHOT_OUTPUT_PATH, TABLE_CODE_TEMPLATE, localeIdToColumns } from '../types/constants.js';

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
export const DEFAULT_LOCALE_CODE = 'x-source';
export const DEFAULT_LOCALE_DISPLAY_NAME = 'Source Text';
export const DEFAULT_ACTOR_NAME = 'Narrator';
export const DEFAULT_ACTOR_COLOR = '#808080';

/** Current schema version — new databases start here, migrations target this */
export const CURRENT_SCHEMA_VERSION = '0.2.0';

export interface InitializationStatement {
  sql: string;
  params: unknown[];
}

/**
 * Generate SQL statements to initialize a new database with default data.
 * This includes:
 * - Property types lookup table
 * - Default locale with localized name (24 form columns)
 * - Default actor with localized name and grammatical_gender
 * - Version tracking
 *
 * @returns Array of SQL statements with parameters to execute in order
 */
export function generateInitializationSQL(): InitializationStatement[] {
  const statements: InitializationStatement[] = [];
  const locale1 = localeIdToColumns(1);

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
    sql: 'INSERT INTO localizations (parent, name, is_system_created, subject_actor, subject_gender, is_templated) VALUES (NULL, NULL, 1, NULL, NULL, 0)',
    params: [],
  });

  // Insert default locale with localized_name reference (id will be 1)
  statements.push({
    sql: 'INSERT INTO locales (name, localized_name, is_system_created) VALUES (?, 1, 1)',
    params: [DEFAULT_LOCALE_CODE],
  });

  // Set the default locale as the primary locale
  statements.push({
    sql: 'INSERT INTO locale_principal (principal) VALUES (1)',
    params: [],
  });

  // Add all 24 locale form columns for locale_1
  for (const col of locale1.all) {
    statements.push({
      sql: `ALTER TABLE localizations ADD COLUMN ${col} TEXT`,
      params: [],
    });
  }

  // Update the locale's localized name with the display name ("Source Text")
  statements.push({
    sql: `UPDATE localizations SET ${locale1.default} = ? WHERE id = 1`,
    params: [DEFAULT_LOCALE_DISPLAY_NAME],
  });

  // =========================================================================
  // Initialize actors with localized name
  // =========================================================================
  // Insert localization for default actor's localized name (id will be 2)
  statements.push({
    sql: 'INSERT INTO localizations (parent, name, is_system_created, subject_actor, subject_gender, is_templated) VALUES (NULL, NULL, 1, NULL, NULL, 0)',
    params: [],
  });

  // Update the actor's localized name with the display name ("Narrator")
  statements.push({
    sql: `UPDATE localizations SET ${locale1.default} = ? WHERE id = 2`,
    params: [DEFAULT_ACTOR_NAME],
  });

  // Insert default actor (Narrator) with localized_name reference and grammatical_gender
  statements.push({
    sql: "INSERT INTO actors (name, color, localized_name, is_system_created, grammatical_gender) VALUES (?, ?, 2, 1, 'other')",
    params: [DEFAULT_ACTOR_NAME, DEFAULT_ACTOR_COLOR],
  });

  // Point the actor's localized name back to the actor for gender resolution
  statements.push({
    sql: 'UPDATE localizations SET subject_actor = 1 WHERE id = 2',
    params: [],
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
    params: [CURRENT_SCHEMA_VERSION],
  });

  // =========================================================================
  // Initialize code output folder setting (singleton, value starts as null)
  // =========================================================================
  statements.push({
    sql: `INSERT INTO "${TABLE_CODE_OUTPUT_FOLDER.name}" (value) VALUES (NULL)`,
    params: [],
  });

  // =========================================================================
  // Initialize snapshot output path setting (singleton, value starts as null)
  // =========================================================================
  statements.push({
    sql: `INSERT INTO "${TABLE_SNAPSHOT_OUTPUT_PATH.name}" (value) VALUES (NULL)`,
    params: [],
  });

  // =========================================================================
  // Initialize code template setting (singleton, defaults to 'unity')
  // =========================================================================
  statements.push({
    sql: `INSERT INTO "${TABLE_CODE_TEMPLATE.name}" (value) VALUES (?)`,
    params: ['unity'],
  });

  return statements;
}

/**
 * Get initial table data in a structured format.
 * Useful for testing or alternative initialization methods.
 */
export function getInitialData(): InitialTableData[] {
  const locale1 = localeIdToColumns(1);
  return [
    {
      tableName: 'property_types',
      rows: PROPERTY_TYPES.map(pt => ({ id: pt.id, name: pt.name })),
    },
    {
      tableName: 'localizations',
      rows: [
        { id: 1, parent: null, name: null, is_system_created: true, subject_actor: null, subject_gender: null, is_templated: false, [locale1.default]: DEFAULT_LOCALE_DISPLAY_NAME },
        { id: 2, parent: null, name: null, is_system_created: true, subject_actor: 1, subject_gender: null, is_templated: false, [locale1.default]: DEFAULT_ACTOR_NAME },
      ],
    },
    {
      tableName: 'locales',
      rows: [
        { id: 1, name: DEFAULT_LOCALE_CODE, localized_name: 1, is_system_created: true },
      ],
    },
    {
      tableName: 'locale_principal',
      rows: [{ id: 1, principal: 1 }],
    },
    {
      tableName: 'actors',
      rows: [
        { id: 1, name: DEFAULT_ACTOR_NAME, color: DEFAULT_ACTOR_COLOR, localized_name: 2, is_system_created: true, grammatical_gender: 'other' },
      ],
    },
    {
      tableName: 'actor_principal',
      rows: [{ id: 1, principal: 1 }],
    },
    {
      tableName: 'version',
      rows: [{ id: 1, version: CURRENT_SCHEMA_VERSION }],
    },
    {
      tableName: TABLE_CODE_OUTPUT_FOLDER.name,
      rows: [{ id: 1, value: null }],
    },
    {
      tableName: TABLE_SNAPSHOT_OUTPUT_PATH.name,
      rows: [{ id: 1, value: null }],
    },
    {
      tableName: TABLE_CODE_TEMPLATE.name,
      rows: [{ id: 1, value: 'unity' }],
    },
  ];
}
