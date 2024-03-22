import { IpcRendererEvent, ipcRenderer } from 'electron';
import {
    DbConnection,
    DbConnectionConfig,
    DbNotification,
    DbResult,
} from '../common/common-db-types';
import {
    API_POSTGRES_ALL,
    API_POSTGRES_CLOSE,
    API_POSTGRES_CLOSE_ALL,
    API_POSTGRES_EXEC,
    API_POSTGRES_GET,
    API_POSTGRES_LISTEN,
    API_POSTGRES_NOTIFY,
    API_POSTGRES_ON_NOTIFICATION,
    API_POSTGRES_OPEN,
    API_POSTGRES_RUN,
    API_POSTGRES_UNLISTEN,
} from '../common/constants';

export interface PostgresApi {
    open(config: DbConnectionConfig): Promise<DbConnection>;
    close(connection: DbConnection): Promise<void>;
    closeAll(): Promise<void>;
    run(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<DbResult>;
    all<T = unknown[]>(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<T>;
    get<T = unknown>(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<T>;
    exec(connection: DbConnection, query: string): Promise<void>;
    notify(connection: DbConnection, notification: DbNotification): Promise<void>;
    listen(
        connection: DbConnection,
        callback: (event: IpcRendererEvent, notification: DbNotification) => void,
    ): Promise<void>;
    unlisten(
        connection: DbConnection,
        callback: (event: IpcRendererEvent, notification: DbNotification) => void,
    ): Promise<void>;
}

export const postgresApi: PostgresApi = {
    open: async (config: DbConnectionConfig) => {
        return await ipcRenderer.invoke(API_POSTGRES_OPEN, config);
    },
    close: async (connection: DbConnection) => {
        await ipcRenderer.invoke(API_POSTGRES_CLOSE, connection);
    },
    closeAll: async (): Promise<void> => {
        await ipcRenderer.invoke(API_POSTGRES_CLOSE_ALL);
    },
    run: async (connection: DbConnection, query: string, bindValues?: unknown[]) => {
        return await ipcRenderer.invoke(API_POSTGRES_RUN, connection, query, bindValues);
    },
    all: async (connection: DbConnection, query: string, bindValues?: unknown[]) => {
        return await ipcRenderer.invoke(API_POSTGRES_ALL, connection, query, bindValues);
    },
    get: async (connection: DbConnection, query: string, bindValues?: unknown[]) => {
        return await ipcRenderer.invoke(API_POSTGRES_GET, connection, query, bindValues);
    },
    exec: async (connection: DbConnection, query: string) => {
        await ipcRenderer.invoke(API_POSTGRES_EXEC, connection, query);
    },
    notify: async (connection: DbConnection, notification: DbNotification) => {
        await ipcRenderer.invoke(API_POSTGRES_NOTIFY, connection, notification);
    },
    listen: async (
        connection: DbConnection,
        callback: (event: IpcRendererEvent, notification: DbNotification) => void,
    ) => {
        ipcRenderer.addListener(API_POSTGRES_ON_NOTIFICATION, callback);
        await ipcRenderer.invoke(API_POSTGRES_LISTEN, connection);
    },
    unlisten: async (
        connection: DbConnection,
        callback: (event: IpcRendererEvent, notification: DbNotification) => void,
    ) => {
        await ipcRenderer.invoke(API_POSTGRES_UNLISTEN, connection);
        ipcRenderer.removeListener(API_POSTGRES_ON_NOTIFICATION, callback);
    },
};
