import { dbConnected, dbSqlitePath, dbType, type DbType } from '@lib/stores/settings/settings';
import type { Db } from './db';
import { PostgresDb } from './postgres-db';
import { SqliteDb } from './sqlite-db';

/**Main DB instance */
export let db: Db;

// Initialization
dbType.subscribe(onDbTypeChange);
function onDbTypeChange(newDbtype: DbType) {
    // Shutdown old DB instance
    if (db) {
        db.shutdown();
    }

    // Create new DB instance
    switch (newDbtype) {
        case 'SQLite':
            db = new SqliteDb(dbConnected, dbSqlitePath);
            break;
        case 'PostgreSQL':
            db = new PostgresDb(dbConnected);
            break;
    }
}
