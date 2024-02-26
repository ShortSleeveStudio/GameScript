import Database, { Database as Db, RunResult, Statement } from 'better-sqlite3';
import { DbConnection, DbConnectionConfig, DbResult } from '../../common/common-types-db';
import { DbClient } from './db-client';

export class DbClientSqlite implements DbClient {
    private _nextConnectionId: number;
    private _connectionMap: Map<number, Db>;

    constructor() {
        this._nextConnectionId = 0;
        this._connectionMap = new Map();
    }

    async open(config: DbConnectionConfig): Promise<DbConnection> {
        return new Promise((resolve) => {
            const id = this._nextConnectionId++;
            const connection = new Database(config.sqliteFile, { timeout: 0 });
            this._connectionMap.set(id, connection);
            resolve(<DbConnection>{ id: id });
        });
    }

    async close(connectionId: DbConnection): Promise<void> {
        return new Promise((resolve, reject) => {
            const connection: Db = <Db>this._connectionMap.get(connectionId.id);
            if (!connection) {
                reject();
                return;
            }
            this._connectionMap.delete(connectionId.id);
            connection.close();
            resolve();
        });
    }

    async closeAll(): Promise<void> {
        return new Promise((resolve) => {
            this._connectionMap.forEach((conn: Db) => {
                conn.close();
            });
            this._connectionMap.clear();
            resolve();
        });
    }

    async run(
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<DbResult> {
        return new Promise((resolve, reject) => {
            const connection: Db = <Db>this._connectionMap.get(connectionId.id);
            if (!connection) {
                reject();
                return;
            }
            const statement: Statement = connection.prepare(query);
            const results: RunResult = bindValues ? statement.run(...bindValues) : statement.run();
            resolve(<DbResult>{
                rowsAffected: results.changes,
                lastInsertRowId: results.lastInsertRowid,
            });
        });
    }

    async all(
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<unknown[]> {
        return new Promise((resolve, reject) => {
            const connection: Db = <Db>this._connectionMap.get(connectionId.id);
            if (!connection) {
                reject();
                return;
            }
            const statement: Statement = connection.prepare(query);
            const results: unknown[] = bindValues ? statement.all(...bindValues) : statement.all();
            resolve(results);
        });
    }

    async get(connectionId: DbConnection, query: string, bindValues?: unknown[]): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const connection: Db = <Db>this._connectionMap.get(connectionId.id);
            if (!connection) {
                reject();
                return;
            }
            const statement: Statement = connection.prepare(query);
            const result: unknown = bindValues ? statement.get(...bindValues) : statement.get();
            resolve(result);
        });
    }

    async exec(connectionId: DbConnection, query: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const connection: Db = <Db>this._connectionMap.get(connectionId.id);
            if (!connection) {
                reject();
                return;
            }
            connection.exec(query);
            resolve();
        });
    }
}
export const sqlite: DbClientSqlite = new DbClientSqlite();

// Load Extensions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// function loadExtensions(db: Db): void {
//     switch (process.platform) {
//         case 'win32':
//             db.loadExtension(
//                 path.join(app.getAppPath(), 'resources', 'regex', 'win-x64', 'regexp'),
//             );
//             break;
//         case 'darwin':
//             db.loadExtension(
//                 path.join(app.getAppPath(), 'resources', 'regex', 'macos-arm64', 'regexp'),
//             );
//             break;
//         default:
//             throw new Error('Unsupported operating system detected: ' + process.platform);
//     }
// }
