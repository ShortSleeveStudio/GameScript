export interface DbConnectionConfig {
    sqliteFile: string; // used for SQLite
}

export interface DbConnection {
    id: number;
}

export interface DbResult {
    lastInsertRowId: number;
    rowsAffected: number;
}

export type Transaction = (connection: DbConnection) => Promise<void>;
