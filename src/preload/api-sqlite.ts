import { ipcRenderer } from 'electron';
import { DbConnection, DbConnectionConfig, DbResult } from '../common/common-types-db';
import {
    API_SQLITE_ALL,
    API_SQLITE_CLOSE,
    API_SQLITE_CLOSE_ALL,
    API_SQLITE_EXEC,
    API_SQLITE_GET,
    API_SQLITE_OPEN,
    API_SQLITE_RUN,
} from '../common/constants';

export interface SqliteApi {
    open(config: DbConnectionConfig): Promise<DbConnection>;
    close(connection: DbConnection): Promise<void>;
    closeAll(): Promise<void>;
    run(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<DbResult>;
    all<T = unknown[]>(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<T>;
    get<T = unknown>(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<T>;
    exec(connection: DbConnection, query: string): Promise<void>;
}

export const sqliteApi: SqliteApi = {
    open: async (config: DbConnectionConfig) => {
        return await ipcRenderer.invoke(API_SQLITE_OPEN, config);
    },
    close: async (connection: DbConnection) => {
        await ipcRenderer.invoke(API_SQLITE_CLOSE, connection);
    },
    closeAll: async (): Promise<void> => {
        await ipcRenderer.invoke(API_SQLITE_CLOSE_ALL);
    },
    run: async (connection: DbConnection, query: string, bindValues?: unknown[]) => {
        return await ipcRenderer.invoke(API_SQLITE_RUN, connection, query, bindValues);
    },
    all: async (connection: DbConnection, query: string, bindValues?: unknown[]) => {
        return await ipcRenderer.invoke(API_SQLITE_ALL, connection, query, bindValues);
    },
    get: async (connection: DbConnection, query: string, bindValues?: unknown[]) => {
        return await ipcRenderer.invoke(API_SQLITE_GET, connection, query, bindValues);
    },
    exec: async (connection: DbConnection, query: string) => {
        await ipcRenderer.invoke(API_SQLITE_EXEC, connection, query);
    },
};
