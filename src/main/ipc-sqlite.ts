import { IpcMainInvokeEvent, ipcMain } from 'electron';
import {
    DbConnection,
    DbConnectionConfig,
    DbNotification,
    DbResult,
} from '../common/common-types-db';
import {
    API_SQLITE_ALL,
    API_SQLITE_CLOSE,
    API_SQLITE_CLOSE_ALL,
    API_SQLITE_EXEC,
    API_SQLITE_GET,
    API_SQLITE_LISTEN,
    API_SQLITE_NOTIFY,
    API_SQLITE_OPEN,
    API_SQLITE_RUN,
    API_SQLITE_UNLISTEN,
} from '../common/constants';
import { sqlite } from './db/db-client-sqlite';

ipcMain.handle(
    API_SQLITE_OPEN,
    async (_: IpcMainInvokeEvent, config: DbConnectionConfig): Promise<DbConnection> =>
        await sqlite.open(config),
);
ipcMain.handle(
    API_SQLITE_CLOSE,
    async (_: IpcMainInvokeEvent, connectionId: DbConnection): Promise<void> =>
        await sqlite.close(connectionId),
);
ipcMain.handle(API_SQLITE_CLOSE_ALL, async (): Promise<void> => await sqlite.closeAll());
ipcMain.handle(
    API_SQLITE_RUN,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<DbResult> => await sqlite.run(connectionId, query, bindValues),
);
ipcMain.handle(
    API_SQLITE_ALL,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<unknown[]> => await sqlite.all(connectionId, query, bindValues),
);
ipcMain.handle(
    API_SQLITE_GET,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<unknown> => await sqlite.get(connectionId, query, bindValues),
);
ipcMain.handle(
    API_SQLITE_EXEC,
    async (_: IpcMainInvokeEvent, connectionId: DbConnection, query: string): Promise<void> =>
        await sqlite.exec(connectionId, query),
);
ipcMain.handle(
    API_SQLITE_NOTIFY,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        notification: DbNotification,
    ): Promise<void> => await sqlite.notify(connectionId, notification),
);
ipcMain.handle(API_SQLITE_LISTEN, async (): Promise<void> => await sqlite.listen());
ipcMain.handle(API_SQLITE_UNLISTEN, async (): Promise<void> => await sqlite.unlisten());
