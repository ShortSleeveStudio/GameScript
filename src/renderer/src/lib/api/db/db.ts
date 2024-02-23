import {
    DATABASE_TYPE_POSTGRES,
    DATABASE_TYPE_SQLITE,
    type DatabaseTypeId,
} from '@common/common-types';
import { EVENT_SHUTDOWN } from '@lib/constants/events';
import { focusManager } from '@lib/stores/app/focus';
import { appInitializationErrors } from '@lib/stores/app/initialization-errors';
import { notificationManager } from '@lib/stores/app/notifications';
import { dbConnected, dbSqlitePath, dbType } from '@lib/stores/settings/settings';
import { type Unsubscriber } from 'svelte/store';
import type { Db } from './db-base';
import { PostgresDb } from './db-postgres';
import { SqliteDb } from './db-sqlite';

/**Main DB instance */
export let db: Db;

// Initialization
const dbTypeUnsubscriber: Unsubscriber = dbType.subscribe(onDbTypeChange);
function onDbTypeChange(newDbtype: DatabaseTypeId): void {
    // Shutdown old DB instance
    if (db) {
        db.shutdown();
    }

    // Create new DB instance
    switch (newDbtype) {
        case DATABASE_TYPE_SQLITE.id:
            db = new SqliteDb(
                dbConnected,
                dbSqlitePath,
                appInitializationErrors,
                notificationManager,
                focusManager,
            );
            break;
        case DATABASE_TYPE_POSTGRES.id:
            db = new PostgresDb(dbConnected);
            break;
    }
}

addEventListener(EVENT_SHUTDOWN, () => {
    if (dbTypeUnsubscriber) dbTypeUnsubscriber();
    db.shutdown();
});
