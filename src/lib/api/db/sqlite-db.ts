import { dbSqlitePathError } from '@lib/stores/settings/settings';
import type { FileResponse } from '@lib/types/file-response';
import Database from '@tauri-apps/plugin-sql';
import { type Unsubscriber, type Writable } from 'svelte/store';
import { Db } from './db';

/**
 * SQLite database implementation
 * NOTE:
 * The default database file location is:
 * C:\Users\<username>\AppData\Roaming\com.tauri.dev\GameScript.db
 */
export class SqliteDb extends Db {
    private _unsubscribe: Unsubscriber;

    constructor(isConnected: Writable<boolean>, sqlitePathStore: Writable<FileResponse>) {
        super(isConnected);
        this._unsubscribe = sqlitePathStore.subscribe(async (fileResponse: FileResponse) => {
            // Destroy previous connection
            super.destroyConnection();

            try {
                // Attempt to connect
                this._db = await Database.load(`sqlite:${fileResponse.path}`);

                // Test the connection
                await this._db.execute('SELECT name FROM sqlite_schema');

                // Notify connected
                this._isConnected.set(true);
            } catch (e: unknown) {
                let message: string;
                switch (typeof e) {
                    case 'string':
                        message = <string>e;
                        break;
                    case 'object':
                        if ('message' in <object>e) {
                            message = (<Error>e).message;
                            break;
                        }
                    // @ts-expect-error fallthrough
                    default:
                        message = 'Invalid database file';
                        break;
                }
                dbSqlitePathError.set(message);
            }
        });
    }

    async shutdown(): Promise<void> {
        await super.shutdown();
        this._unsubscribe();
    }
}

//EVENT_DB_CHANGED
