import { Row } from './common-schema';
import { DatabaseTableId, OpTypeId } from './common-types';

export type DbTransaction = (connection: DbConnection) => Promise<void>;

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

export interface DbNotification {
    tableId: DatabaseTableId;
    opType: OpTypeId;
    rows?: Row[];
}

export interface DbClient {
    open(config: DbConnectionConfig): Promise<DbConnection>;
    close(connection: DbConnection): Promise<void>;
    closeAll(): Promise<void>;
    run(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<DbResult>;
    all<T = unknown[]>(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<T>;
    get<T = unknown>(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<T>;
    exec(connection: DbConnection, query: string): Promise<void>;
    notify(connection: DbConnection, notification: DbNotification): Promise<void>;
    listen(connection: DbConnection): Promise<void>;
    unlisten(connection: DbConnection): Promise<void>;
}