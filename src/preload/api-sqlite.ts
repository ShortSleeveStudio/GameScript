import { IpcRendererEvent, ipcRenderer } from 'electron';
import { DbConnection, DbConnectionConfig } from '../common/common-db-types';
import { AppNotification } from '../common/common-notification';
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
import { SqlApi } from './api-sql';

export const sqliteApi: SqlApi = {
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
    notify: async (connection: DbConnection, notification: AppNotification) => {
        await ipcRenderer.invoke(API_SQLITE_NOTIFY, connection, notification);
    },
    listen: async (
        config: DbConnectionConfig,
        callback: (event: IpcRendererEvent, notification: AppNotification) => void,
    ) => {
        ipcRenderer.addListener(API_SQLITE_ON_NOTIFICATION, callback);
        await ipcRenderer.invoke(API_SQLITE_LISTEN, config);
    },
    unlisten: async (
        callback: (event: IpcRendererEvent, notification: AppNotification) => void,
    ) => {
        await ipcRenderer.invoke(API_SQLITE_UNLISTEN);
        ipcRenderer.removeListener(API_SQLITE_ON_NOTIFICATION, callback);
    },
};
