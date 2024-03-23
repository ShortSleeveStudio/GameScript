import { BrowserWindow } from 'electron';
import { Client, ClientConfig, Notification, QueryConfig, QueryResult } from 'pg';
import {
    DbClient,
    DbConnection,
    DbConnectionConfig,
    DbResult,
    NotifyRequest,
} from '../../common/common-db-types';
import { AppNotification } from '../../common/common-notification';
import { Notification as DbNotification } from '../../common/common-schema';
import { TABLE_NOTIFICATIONS } from '../../common/common-types';
import { API_POSTGRES_ON_NOTIFICATION, APP_NAME } from '../../common/constants';
import { getMainWindow } from '../common/common-helpers';

export class DbClientPostgres implements DbClient {
    static NOTIFICATION_CHANNEL: string = APP_NAME;
    private _nextConnectionId: number;
    private _connectionMap: Map<number, Client>;

    constructor() {
        this._nextConnectionId = 0;
        this._connectionMap = new Map();
    }

    async open(config: DbConnectionConfig): Promise<DbConnection> {
        const client: Client = new Client(<ClientConfig>{
            host: config.pgAddress,
            port: parseInt(config.pgPort),
            database: config.pgDatabase,
            user: config.pgUsername,
            password: config.pgPassword,
        });
        await client.connect();
        const id = this._nextConnectionId++;
        this._connectionMap.set(id, client);
        return <DbConnection>{ id: id };
    }

    async close(connection: DbConnection): Promise<void> {
        const client: Client = this.ensureClient(connection);
        this._connectionMap.delete(connection.id);
        await client.end();
    }

    async closeAll(): Promise<void> {
        for (const [, client] of this._connectionMap) {
            await client.end();
        }
        this._connectionMap.clear();
    }

    async run(
        connection: DbConnection,
        query: string,
        bindValues?: unknown[] | undefined,
    ): Promise<DbResult> {
        const client: Client = this.ensureClient(connection);
        const result: QueryResult = await client.query(<QueryConfig>{
            text: query,
            values: bindValues,
        });
        // TODO - expecting this to have "returning id" is a brittle. This API is a mess.
        return <DbResult>{
            rowsAffected: result.rowCount,
            lastInsertRowId: result.rows[0].id,
        };
    }

    async all<T = unknown[]>(
        connection: DbConnection,
        query: string,
        bindValues?: unknown[] | undefined,
    ): Promise<T> {
        const client: Client = this.ensureClient(connection);
        const result: QueryResult = await client.query(<QueryConfig>{
            text: query,
            values: bindValues,
        });
        return <T>result.rows;
    }

    async get<T = unknown>(
        connection: DbConnection,
        query: string,
        bindValues?: unknown[] | undefined,
    ): Promise<T> {
        const client: Client = this.ensureClient(connection);
        const result: QueryResult = await client.query(<QueryConfig>{
            text: query,
            values: bindValues,
        });
        return result.rows[0];
    }

    async exec(connection: DbConnection, query: string): Promise<void> {
        const client: Client = this.ensureClient(connection);
        await client.query(query);
    }

    async notify(connection: DbConnection, notification: AppNotification): Promise<void> {
        const client: Client = this.ensureClient(connection);

        // Write to notifications table
        const dbNotification: DbNotification = <DbNotification>{
            timestamp: Date.now(),
            table_id: notification.tableId,
            operation_id: notification.operationId,
            json_payload: JSON.stringify(notification.rows),
        };
        const result: QueryResult = await client.query(<QueryConfig>{
            text: `INSERT INTO ${TABLE_NOTIFICATIONS.name} (timestamp, table_id, operation_id, json_payload) VALUES ($1,$2,$3,$4) RETURNING id;`,
            values: [
                dbNotification.timestamp,
                dbNotification.table_id,
                dbNotification.operation_id,
                dbNotification.json_payload,
            ],
        });

        // Notify
        const payload = this.serializeNotification(<NotifyRequest>{ id: result.rows[0].id });
        await client.query(`NOTIFY ${DbClientPostgres.NOTIFICATION_CHANNEL}, '${payload}';`);
    }

    async listen(connection: DbConnection): Promise<void> {
        const client: Client = this.ensureClient(connection);
        await client.query(`LISTEN ${DbClientPostgres.NOTIFICATION_CHANNEL};`);
        client.on('notification', async (msg: Notification) => {
            // Fetch the notification row
            const notifyRequest: NotifyRequest = this.deserializeNotification(msg.payload);
            const result: QueryResult = await client.query(<QueryConfig>{
                text: `SELECT * FROM ${TABLE_NOTIFICATIONS.name} WHERE id = ${notifyRequest.id};`,
            });
            const notification: DbNotification = <DbNotification>result.rows[0];
            const appNotification: AppNotification = <AppNotification>{
                tableId: notification.table_id,
                operationId: notification.operation_id,
                rows: JSON.parse(notification.json_payload),
            };

            // Notify
            const mainWindow: BrowserWindow = getMainWindow();
            mainWindow.webContents.send(API_POSTGRES_ON_NOTIFICATION, appNotification);
        });
    }

    async unlisten(connection: DbConnection): Promise<void> {
        const client: Client = this.ensureClient(connection);
        await client.query(`UNLISTEN ${DbClientPostgres.NOTIFICATION_CHANNEL};`);
        client.removeAllListeners('notification');
    }

    private ensureClient(connection: DbConnection): Client {
        const client: Client = <Client>this._connectionMap.get(connection.id);
        if (!client) throw new Error('Could not find database client');
        return client;
    }

    private serializeNotification(toSerialize: NotifyRequest): string {
        return `${toSerialize.id}`;
    }

    private deserializeNotification(toDeserialize: string | undefined): NotifyRequest {
        if (toDeserialize === undefined)
            throw new Error(`Notification payload was malformed: ${toDeserialize}`);
        const id: number = parseInt(toDeserialize);
        if (isNaN(id)) throw new Error(`Notification was malformed: ${toDeserialize}`);
        return <NotifyRequest>{ id: id };
    }
}
export const postgres: DbClientPostgres = new DbClientPostgres();
