import { ipcRenderer } from 'electron';
import {
    API_SQLITE_ALL,
    API_SQLITE_CLOSE,
    API_SQLITE_CLOSE_ALL,
    API_SQLITE_EXEC,
    API_SQLITE_OPEN,
    API_SQLITE_RUN,
} from '../common/constants';
import { DbConnection } from './api-db';

export interface SqliteResult {
    lastInsertRowId: number;
    rowsAffected: number;
}

export interface SqliteApi {
    open(file: string): Promise<DbConnection>;
    close(connection: DbConnection): Promise<void>;
    closeAll(): Promise<void>;
    run(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<SqliteResult>;
    all<T = unknown[]>(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<T>;
    exec(connection: DbConnection, query: string): Promise<void>;
}

// class SqliteApiImpl implements SqliteApi {
//     async open(file: string): Promise<SqliteConnection> {
//         return await ipcRenderer.invoke(API_SQLITE_OPEN, file);
//     }
//     async close(connection: SqliteConnection): Promise<void> {
//         return await ipcRenderer.invoke(API_SQLITE_CLOSE, connection);
//     }
//     async run(
//         connection: SqliteConnection,
//         query: string,
//         bindValues?: unknown[] | undefined,
//     ): Promise<SqliteResult> {
//         return await ipcRenderer.invoke(API_SQLITE_RUN, connection, query, bindValues);
//     }
//     async all<T = unknown[]>(
//         connection: SqliteConnection,
//         query: string,
//         bindValues?: unknown[] | undefined,
//     ): Promise<T> {
//         return await ipcRenderer.invoke(API_SQLITE_ALL, connection, query, bindValues);
//     }
//     async exec(connection: SqliteConnection, query: string): Promise<void> {
//         return await ipcRenderer.invoke(API_SQLITE_EXEC, connection, query);
//     }
// }
// export const sqliteApi: SqliteApi = new SqliteApiImpl();

export const sqliteApi: SqliteApi = {
    open: async (file: string) => {
        return await ipcRenderer.invoke(API_SQLITE_OPEN, file);
    },
    close: async (connection: DbConnection) => {
        return await ipcRenderer.invoke(API_SQLITE_CLOSE, connection);
    },
    closeAll: async (): Promise<void> => {
        return await ipcRenderer.invoke(API_SQLITE_CLOSE_ALL);
    },
    run: async (connection: DbConnection, query: string, bindValues?: unknown[]) => {
        return await ipcRenderer.invoke(API_SQLITE_RUN, connection, query, bindValues);
    },
    all: async (connection: DbConnection, query: string, bindValues?: unknown[]) => {
        return await ipcRenderer.invoke(API_SQLITE_ALL, connection, query, bindValues);
    },
    exec: async (connection: DbConnection, query: string) => {
        return await ipcRenderer.invoke(API_SQLITE_EXEC, connection, query);
    },
};

// OLD BELOW
// import { Database, open } from 'sqlite';
// import sqlite3 from 'sqlite3';
// export interface SqliteApi {
//     open(file: string): Promise<Database>;
//     // open(file: string): Promise<void>;
//     // close(): Promise<void>;
//     // run(query: string, bindValues?: unknown[]): Promise<SqliteResult>;
//     // get<T>(query: string, bindValues?: unknown[]): Promise<T | undefined>;
//     // all<T = unknown[]>(query: string, bindValues?: unknown[]): Promise<T | undefined>;
// }

// class SqliteApiImpl implements SqliteApi {
//     private _db: Database | undefined;

//     async open(file: string): Promise<void> {
//         if (this._db) return;
//         this._db = await open({
//             filename: file,
//             driver: sqlite3.cached.Database,
//         });
//     }
//     async close(): Promise<void> {
//         if (!this._db) return;
//         await this._db.close();
//         this._db = undefined;
//     }
//     async run(query: string, bindValues?: unknown[] | undefined): Promise<SqliteResult> {
//         const result = await this._db?.run(query, bindValues);
//         return <SqliteResult>{
//             rowsAffected: result?.changes,
//             lastInsertRowId: result?.lastID,
//         };
//     }
//     async get<T>(query: string, bindValues?: unknown[] | undefined): Promise<T | undefined> {
//         return await this._db?.get<T>(query, bindValues);
//     }
//     async all<T = unknown[]>(
//         query: string,
//         bindValues?: unknown[] | undefined,
//     ): Promise<T | undefined> {
//         return await this._db?.all(query, bindValues);
//     }
// }

// export const sqliteApi: SqliteApi = new SqliteApiImpl();

// export const sqliteApi: SqliteApi = {
//     open: async (file: string) => {
//         const db = await open({
//             filename: file,
//             driver: sqlite3.cached.Database,
//         });
//         return db;
//     },
// };
