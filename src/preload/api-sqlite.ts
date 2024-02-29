import { IpcRendererEvent, ipcRenderer } from 'electron';
import {
    DbConnection,
    DbConnectionConfig,
    DbNotification,
    DbResult,
} from '../common/common-db-types';
import {
    API_SQLITE_ALL,
    API_SQLITE_CLOSE,
    API_SQLITE_CLOSE_ALL,
    API_SQLITE_EXEC,
    API_SQLITE_GET,
    API_SQLITE_LISTEN,
    API_SQLITE_NOTIFY,
    API_SQLITE_ON_NOTIFICATION,
    API_SQLITE_OPEN,
    API_SQLITE_RUN,
    API_SQLITE_UNLISTEN,
} from '../common/constants';

// Note:
// SQLite will send fully saturated rows down and back so that we can take full advantage and not
// reload tables that don't fit filter criteria. How postgres will handle notifications is
// currently undecided.
export interface SqliteApi {
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
    notify: async (connection: DbConnection, notification: DbNotification) => {
        await ipcRenderer.invoke(API_SQLITE_NOTIFY, connection, notification);
    },
    listen: async (
        connection: DbConnection,
        callback: (event: IpcRendererEvent, notification: DbNotification) => void,
    ) => {
        ipcRenderer.addListener(API_SQLITE_ON_NOTIFICATION, callback);
        await ipcRenderer.invoke(API_SQLITE_LISTEN, connection);
    },
    unlisten: async (
        connection: DbConnection,
        callback: (event: IpcRendererEvent, notification: DbNotification) => void,
    ) => {
        await ipcRenderer.invoke(API_SQLITE_UNLISTEN, connection);
        ipcRenderer.removeListener(API_SQLITE_ON_NOTIFICATION, callback);
    },
};
