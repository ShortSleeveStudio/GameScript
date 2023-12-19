import type Database from '@tauri-apps/plugin-sql';
import type { Writable } from 'svelte/store';

/**The interface all databases must implement */
export abstract class Db {
    protected _db: Database | undefined;
    protected _isConnected: Writable<boolean>;

    constructor(isConnected: Writable<boolean>) {
        this._db = undefined;
        this._isConnected = isConnected;
    }

    async shutdown(): Promise<void> {
        await this.destroyConnection();
    }

    protected async destroyConnection() {
        this._isConnected.set(false);
        if (this._db) {
            await this._db.close();
            this._db = undefined;
        }
    }
}
