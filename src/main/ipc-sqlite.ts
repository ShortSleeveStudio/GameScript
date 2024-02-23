import Database, { Database as Db, RunResult, Statement } from 'better-sqlite3';
import { IpcMainInvokeEvent, app, ipcMain } from 'electron';
import path from 'path';
import {
    API_SQLITE_ALL,
    API_SQLITE_CLOSE,
    API_SQLITE_CLOSE_ALL,
    API_SQLITE_EXEC,
    API_SQLITE_GET,
    API_SQLITE_OPEN,
    API_SQLITE_RUN,
} from '../common/constants';
import { DbConnection } from '../preload/api-db';
import { SqliteResult } from '../preload/api-sqlite';

let connectionId: number = 0;
const connectionMap: Map<number, Db> = new Map();

// Load Extensions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function loadExtensions(db: Db): void {
    switch (process.platform) {
        case 'win32':
            db.loadExtension(
                path.join(app.getAppPath(), 'resources', 'regex', 'win-x64', 'regexp'),
            );
            break;
        case 'darwin':
            db.loadExtension(
                path.join(app.getAppPath(), 'resources', 'regex', 'macos-arm64', 'regexp'),
            );
            break;
        default:
            throw new Error('Unsupported operating system detected: ' + process.platform);
    }
}

ipcMain.handle(
    API_SQLITE_OPEN,
    async (_: IpcMainInvokeEvent, file: string): Promise<DbConnection> => {
        return new Promise((resolve) => {
            const id = connectionId++;
            const connection = new Database(file, { timeout: 0 });
            // loadExtensions(connection);
            connectionMap.set(id, connection);
            resolve(<DbConnection>{ id: id });
        });
    },
);
ipcMain.handle(
    API_SQLITE_CLOSE,
    async (_: IpcMainInvokeEvent, connectionId: DbConnection): Promise<void> => {
        return new Promise((resolve, reject) => {
            const connection: Db = <Db>connectionMap.get(connectionId.id);
            if (!connection) {
                reject();
                return;
            }
            connectionMap.delete(connectionId.id);
            connection.close();
            resolve();
        });
    },
);
ipcMain.handle(API_SQLITE_CLOSE_ALL, async (): Promise<void> => {
    return new Promise((resolve) => {
        connectionMap.forEach((conn: Db) => {
            conn.close();
        });
        connectionMap.clear();
        resolve();
    });
});
ipcMain.handle(
    API_SQLITE_RUN,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<SqliteResult> => {
        return new Promise((resolve, reject) => {
            const connection: Db = <Db>connectionMap.get(connectionId.id);
            if (!connection) {
                reject();
                return;
            }
            const statement: Statement = connection.prepare(query);
            const results: RunResult = bindValues ? statement.run(...bindValues) : statement.run();
            resolve(<SqliteResult>{
                rowsAffected: results.changes,
                lastInsertRowId: results.lastInsertRowid,
            });
        });
    },
);
ipcMain.handle(
    API_SQLITE_ALL,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<unknown[]> => {
        return new Promise((resolve, reject) => {
            const connection: Db = <Db>connectionMap.get(connectionId.id);
            if (!connection) {
                reject();
                return;
            }
            const statement: Statement = connection.prepare(query);
            const results: unknown[] = bindValues ? statement.all(...bindValues) : statement.all();
            resolve(results);
        });
    },
);
ipcMain.handle(
    API_SQLITE_GET,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<unknown> => {
        return new Promise((resolve, reject) => {
            const connection: Db = <Db>connectionMap.get(connectionId.id);
            if (!connection) {
                reject();
                return;
            }
            const statement: Statement = connection.prepare(query);
            const result: unknown = bindValues ? statement.get(...bindValues) : statement.get();
            resolve(result);
        });
    },
);
ipcMain.handle(
    API_SQLITE_EXEC,
    async (_: IpcMainInvokeEvent, connectionId: DbConnection, query: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const connection: Db = <Db>connectionMap.get(connectionId.id);
            if (!connection) {
                reject();
                return;
            }
            connection.exec(query);
            resolve();
        });
    },
);
