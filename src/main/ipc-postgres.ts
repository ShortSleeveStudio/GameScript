import { IpcMainInvokeEvent, ipcMain } from 'electron';
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
    API_POSTGRES_OPEN,
    API_POSTGRES_RUN,
    API_POSTGRES_UNLISTEN,
} from '../common/constants';
import { postgres } from './db/db-client-postgres';

ipcMain.handle(
    API_POSTGRES_OPEN,
    async (_: IpcMainInvokeEvent, config: DbConnectionConfig): Promise<DbConnection> =>
        await postgres.open(config),
);
ipcMain.handle(
    API_POSTGRES_CLOSE,
    async (_: IpcMainInvokeEvent, connectionId: DbConnection): Promise<void> =>
        await postgres.close(connectionId),
);
ipcMain.handle(API_POSTGRES_CLOSE_ALL, async (): Promise<void> => await postgres.closeAll());
ipcMain.handle(
    API_POSTGRES_RUN,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<DbResult> => await postgres.run(connectionId, query, bindValues),
);
ipcMain.handle(
    API_POSTGRES_ALL,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<unknown[]> => await postgres.all(connectionId, query, bindValues),
);
ipcMain.handle(
    API_POSTGRES_GET,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<unknown> => await postgres.get(connectionId, query, bindValues),
);
ipcMain.handle(
    API_POSTGRES_EXEC,
    async (_: IpcMainInvokeEvent, connectionId: DbConnection, query: string): Promise<void> =>
        await postgres.exec(connectionId, query),
);
ipcMain.handle(
    API_POSTGRES_NOTIFY,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        notification: DbNotification,
    ): Promise<void> => await postgres.notify(connectionId, notification),
);
ipcMain.handle(
    API_POSTGRES_LISTEN,
    async (_: IpcMainInvokeEvent, connectionId: DbConnection): Promise<void> =>
        await postgres.listen(connectionId),
);
ipcMain.handle(
    API_POSTGRES_UNLISTEN,
    async (_: IpcMainInvokeEvent, connectionId: DbConnection): Promise<void> =>
        await postgres.unlisten(connectionId),
);
