import { IpcRendererEvent } from 'electron';
import { DbConnection, DbConnectionConfig, DbResult } from '../common/common-db-types';
import { AppNotification } from '../common/common-notification';

export interface SqlApi {
    open(config: DbConnectionConfig): Promise<DbConnection>;
    close(connection: DbConnection): Promise<void>;
    closeAll(): Promise<void>;
    run(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<DbResult>;
    all<T = unknown[]>(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<T>;
    get<T = unknown>(connection: DbConnection, query: string, bindValues?: unknown[]): Promise<T>;
    exec(connection: DbConnection, query: string): Promise<void>;
    notify(connection: DbConnection, notification: AppNotification): Promise<void>;
    listen(
        config: DbConnectionConfig,
        callback: (event: IpcRendererEvent, notification: AppNotification) => void,
    ): Promise<void>;
    unlisten(
        callback: (event: IpcRendererEvent, notification: AppNotification) => void,
    ): Promise<void>;
}
