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

export const sqliteApi: SqliteApi = {
    open: async (file: string) => {
        return await ipcRenderer.invoke(API_SQLITE_OPEN, file);
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
    exec: async (connection: DbConnection, query: string) => {
        await ipcRenderer.invoke(API_SQLITE_EXEC, connection, query);
    },
};
