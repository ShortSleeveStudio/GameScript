import {
    DATABASE_TYPE_POSTGRES,
    DATABASE_TYPE_SQLITE,
    type DatabaseTypeId,
} from '@common/common-types';
import { EVENT_SHUTDOWN } from '@lib/constants/events';
import { focusManager } from '@lib/stores/app/focus';
import { NotificationItem, notificationManager } from '@lib/stores/app/notifications';
import { dbConnected, dbType } from '@lib/stores/settings/settings';
import { type Unsubscriber } from 'svelte/store';
import type { Db } from './db-interface';
import { PostgresDb } from './db-postgres';
import { SqliteDb } from './db-sqlite';

/**Main DB instance */
export let db: Db;

// Initialization
const dbTypeUnsubscriber: Unsubscriber = dbType.subscribe(onDbTypeChange);
const onDbConnectedChangedUnsubscriber: Unsubscriber = dbConnected.subscribe(onDbConnectedChanged);

function onDbTypeChange(newDbtype: DatabaseTypeId): void {
    // Shutdown old DB instance
    if (db) {
        void db.disconnect();
    }

    // Create new DB instance
    switch (newDbtype) {
        case DATABASE_TYPE_SQLITE.id:
            db = new SqliteDb(dbConnected, focusManager);
            break;
        case DATABASE_TYPE_POSTGRES.id:
            db = new PostgresDb(dbConnected, focusManager);
            break;
    }
}

function onDbConnectedChanged(isConnected: boolean): void {
    // Notify user
    if (isConnected) {
        notificationManager.showNotification(
            new NotificationItem('success', '', 'Connected to database'),
        );
    } else {
        notificationManager.showNotification(
            new NotificationItem('warning', '', 'Disconnected from database'),
        );
    }
}

addEventListener(EVENT_SHUTDOWN, () => {
    if (dbTypeUnsubscriber) dbTypeUnsubscriber();
    if (onDbConnectedChangedUnsubscriber) onDbConnectedChangedUnsubscriber();
    void db.disconnect();
});
