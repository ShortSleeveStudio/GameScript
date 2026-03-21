// Database migration utilities
// Handles schema upgrades between versions

import { localeIdToColumns, PLURAL_CATEGORIES, GENDER_CATEGORIES } from '../types/constants.js';
import { CURRENT_SCHEMA_VERSION, type InitializationStatement } from './initialization.js';

/**
 * Generate SQL statements to migrate a database from version 0.0.0 to 0.1.0.
 *
 * Changes:
 * - Rename each locale_N column to locale_N_form_other_other
 * - Add 23 new nullable TEXT form columns per locale
 * - Add grammatical_gender column to actors table
 * - Add subject_actor, is_gender_override, gender_override columns to localizations table
 * - Bump version to 0.1.0
 *
 * @param localeIds - Array of existing locale IDs (discovered by querying the locales table)
 */
export function generateMigrationSQL_0_0_0_to_0_1_0(localeIds: number[]): InitializationStatement[] {
  const statements: InitializationStatement[] = [];

  // =========================================================================
  // Rename existing locale_N columns to locale_N_form_other_other
  // and add 23 new form columns per locale
  // =========================================================================
  for (const localeId of localeIds) {
    const oldColumnName = `locale_${localeId}`;
    const columns = localeIdToColumns(localeId);

    // Rename locale_N → locale_N_form_other_other
    statements.push({
      sql: `ALTER TABLE localizations RENAME COLUMN ${oldColumnName} TO ${columns.default}`,
      params: [],
    });

    // Add the other 23 form columns (skip form_other_other which we just renamed to)
    for (const plural of PLURAL_CATEGORIES) {
      for (const gender of GENDER_CATEGORIES) {
        const col = columns.form(plural, gender);
        if (col === columns.default) continue; // Already exists via rename
        statements.push({
          sql: `ALTER TABLE localizations ADD COLUMN ${col} TEXT`,
          params: [],
        });
      }
    }
  }

  // =========================================================================
  // Add grammatical_gender column to actors table
  // =========================================================================
  statements.push({
    sql: "ALTER TABLE actors ADD COLUMN grammatical_gender TEXT NOT NULL DEFAULT 'other'",
    params: [],
  });

  // =========================================================================
  // Add gender resolution columns to localizations table
  // =========================================================================
  statements.push({
    sql: 'ALTER TABLE localizations ADD COLUMN subject_actor INTEGER',
    params: [],
  });
  statements.push({
    sql: 'ALTER TABLE localizations ADD COLUMN is_gender_override INTEGER NOT NULL DEFAULT 0',
    params: [],
  });
  statements.push({
    sql: 'ALTER TABLE localizations ADD COLUMN gender_override TEXT',
    params: [],
  });

  // =========================================================================
  // Backfill subject_actor on actor name localizations
  // Each actor's localized_name localization should reference the actor itself
  // =========================================================================
  statements.push({
    sql: 'UPDATE localizations SET subject_actor = (SELECT id FROM actors WHERE actors.localized_name = localizations.id) WHERE id IN (SELECT localized_name FROM actors)',
    params: [],
  });

  // =========================================================================
  // Bump schema version
  // =========================================================================
  statements.push({
    sql: 'UPDATE version SET version = ? WHERE id = 1',
    params: ['0.1.0'],
  });

  return statements;
}

/**
 * Generate SQL statements to migrate a database from version 0.1.0 to 0.2.0.
 *
 * Changes:
 * - Add is_templated column to localizations table
 * - Add subject_gender column to localizations table
 * - Migrate is_gender_override + gender_override → subject_gender (CASE expression, not plain copy)
 * - Drop is_gender_override column
 * - Drop gender_override column
 * - Rename locale 1 (system-created locale) to 'x-source'
 * - Bump version to 0.2.0
 */
export function generateMigrationSQL_0_1_0_to_0_2_0(): InitializationStatement[] {
  const statements: InitializationStatement[] = [];

  // Add is_templated column (default 0 = false)
  statements.push({
    sql: 'ALTER TABLE localizations ADD COLUMN is_templated INTEGER NOT NULL DEFAULT 0',
    params: [],
  });

  // Add subject_gender column (nullable)
  statements.push({
    sql: 'ALTER TABLE localizations ADD COLUMN subject_gender TEXT',
    params: [],
  });

  // Migrate: copy gender_override → subject_gender only where is_gender_override was true.
  // Must NOT be a plain copy — rows with is_gender_override = 0 may have stale gender_override values.
  statements.push({
    sql: 'UPDATE localizations SET subject_gender = CASE WHEN is_gender_override = 1 THEN gender_override ELSE NULL END',
    params: [],
  });

  // Drop old columns
  statements.push({
    sql: 'ALTER TABLE localizations DROP COLUMN is_gender_override',
    params: [],
  });
  statements.push({
    sql: 'ALTER TABLE localizations DROP COLUMN gender_override',
    params: [],
  });

  // Rename the system-created locale (locale 1) to 'x-source'
  statements.push({
    sql: "UPDATE locales SET name = 'x-source' WHERE is_system_created = 1",
    params: [],
  });

  // Bump schema version
  statements.push({
    sql: 'UPDATE version SET version = ? WHERE id = 1',
    params: [CURRENT_SCHEMA_VERSION],
  });

  return statements;
}
