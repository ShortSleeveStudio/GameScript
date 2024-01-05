import { focused } from '@lib/stores/app/focus';
import { appInitializationErrors } from '@lib/stores/app/initialization-errors';
import { notificationManager } from '@lib/stores/app/notifications';
import { dbConnected, dbSqlitePath, dbType } from '@lib/stores/settings/settings';
import type { Db } from './db-base';
import { PostgresDb } from './db-postgres';
import { SqliteDb } from './db-sqlite';
import type { DatabaseTypeName } from './db-types';

/**Main DB instance */
export let db: Db;

// Initialization
dbType.subscribe(onDbTypeChange);
function onDbTypeChange(newDbtype: DatabaseTypeName) {
    // Shutdown old DB instance
    if (db) {
        db.shutdown();
    }

    // Create new DB instance
    switch (newDbtype) {
        case 'SQLite':
            db = new SqliteDb(
                dbConnected,
                dbSqlitePath,
                appInitializationErrors,
                notificationManager,
                focused,
            );
            break;
        case 'PostgreSQL':
            db = new PostgresDb(dbConnected);
            break;
    }
}
