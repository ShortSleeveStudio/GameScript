import { IpcMainInvokeEvent, ipcMain } from 'electron';
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
    ): Promise<unknown[]> => sqlite.all(connectionId, query, bindValues),
);
ipcMain.handle(
    API_SQLITE_GET,
    async (
        _: IpcMainInvokeEvent,
        connectionId: DbConnection,
        query: string,
        bindValues?: unknown[],
    ): Promise<unknown> => sqlite.get(connectionId, query, bindValues),
);
ipcMain.handle(
    API_SQLITE_EXEC,
    async (_: IpcMainInvokeEvent, connectionId: DbConnection, query: string): Promise<void> =>
        sqlite.exec(connectionId, query),
);
