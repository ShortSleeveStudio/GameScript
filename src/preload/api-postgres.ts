import { IpcRendererEvent, ipcRenderer } from 'electron';
import { DbConnection, DbConnectionConfig } from '../common/common-db-types';
import { AppNotification } from '../common/common-notification';
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
import { SqlApi } from './api-sql';

export const postgresApi: SqlApi = {
    open: async (config: DbConnectionConfig) => {
        return await ipcRenderer.invoke(API_POSTGRES_OPEN, config);
    },
    close: async (connection: DbConnection) => {
        await await ipcRenderer.invoke(API_POSTGRES_CLOSE, connection);
    },
    closeAll: async (): Promise<void> => {
        await await ipcRenderer.invoke(API_POSTGRES_CLOSE_ALL);
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
    notify: async (connection: DbConnection, notification: AppNotification) => {
        await ipcRenderer.invoke(API_POSTGRES_NOTIFY, connection, notification);
    },
    listen: async (
        config: DbConnectionConfig,
        callback: (event: IpcRendererEvent, notification: AppNotification) => void,
    ) => {
        ipcRenderer.addListener(API_POSTGRES_ON_NOTIFICATION, callback);
        await ipcRenderer.invoke(API_POSTGRES_LISTEN, config);
    },
    unlisten: async (
        callback: (event: IpcRendererEvent, notification: AppNotification) => void,
    ) => {
        await ipcRenderer.invoke(API_POSTGRES_UNLISTEN);
        ipcRenderer.removeListener(API_POSTGRES_ON_NOTIFICATION, callback);
    },
};
