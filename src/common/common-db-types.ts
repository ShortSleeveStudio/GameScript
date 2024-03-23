import { AppNotification } from './common-notification';

export type DbTransaction = (connection: DbConnection) => Promise<void>;

export interface DbConnectionConfig {
    // SQLite
    sqliteFile: string;
    // Postgres
    pgAddress: string;
    pgPort: string;
    pgDatabase: string;
    pgUsername: string;
    pgPassword: string;
}

export interface DbConnection {
    id: number;
}

export interface DbResult {
    lastInsertRowId: number;
    rowsAffected: number;
}

export interface NotifyRequest {
    id: number;
}

export interface DbListen {
    channel: string;
}

export interface DbClient {
    open(config: DbConnectionConfig): Promise<DbConnection>;
    close(connection: DbConnection): Promise<void>;
    closeAll(): Promise<void>;
    run(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<DbResult>;
    all<T = unknown[]>(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<T>;
    get<T = unknown>(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<T>;
    exec(connection: DbConnection, query: string): Promise<void>;
    notify(connection: DbConnection, notification: AppNotification): Promise<void>;
    listen(connection: DbConnection): Promise<void>;
    unlisten(connection: DbConnection): Promise<void>;
}
