import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
// export interface SqliteResult {
//     lastInsertRowId: number;
//     rowsAffected: number;
// }

export interface SqliteApi {
    open(file: string): Promise<Database>;
    // open(file: string): Promise<void>;
    // close(): Promise<void>;
    // run(query: string, bindValues?: unknown[]): Promise<SqliteResult>;
    // get<T>(query: string, bindValues?: unknown[]): Promise<T | undefined>;
    // all<T = unknown[]>(query: string, bindValues?: unknown[]): Promise<T | undefined>;
}

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

export const sqliteApi: SqliteApi = {
    open: async (file: string) => {
        const db = await open({
            filename: file,
            driver: sqlite3.cached.Database,
        });
        return db;
    },
};
