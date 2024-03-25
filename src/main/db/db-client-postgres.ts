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
    static NOTIFICATION_RETENTION_SECONDS: number = 120; // Minute
    static SYNC_INTERVAL_MILLIS: number = 60000; // Minute
    private _nextConnectionId: number;
    private _connectionMap: Map<number, Client>;
    private _notificationFetchConn: DbConnection | undefined;
    private _notificationListenConn: DbConnection | undefined;
    private _interval: NodeJS.Timeout | undefined;
    private _lastNotificationId: number;

    constructor() {
        this._nextConnectionId = 0;
        this._connectionMap = new Map();
        this._notificationFetchConn = undefined;
        this._notificationListenConn = undefined;
        this._interval = undefined;
        this._lastNotificationId = 0;
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
        const client: Client = <Client>this._connectionMap.get(connection.id);
        if (!client) return;
        this._connectionMap.delete(connection.id);
        await client.end();
    }

    async closeAll(): Promise<void> {
        for (const [, client] of this._connectionMap) {
            await client.end();
        }
        this._connectionMap.clear();
    }

    async run(): Promise<DbResult> {
        throw new Error('Method not implemented.');
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
            table_id: notification.tableId,
            operation_id: notification.operationId,
            json_payload: JSON.stringify(notification.rows),
        };
        const result: QueryResult = await client.query(<QueryConfig>{
            text:
                `INSERT INTO ${TABLE_NOTIFICATIONS.name} ` +
                `(table_id, operation_id, json_payload, timestamp) ` +
                `VALUES ($1,$2,$3,extract(epoch from now())) RETURNING id;`,
            values: [
                dbNotification.table_id,
                dbNotification.operation_id,
                dbNotification.json_payload,
            ],
        });

        // Notify
        const payload = this.serializeNotification(<NotifyRequest>{ id: result.rows[0].id });
        await client.query(`NOTIFY ${DbClientPostgres.NOTIFICATION_CHANNEL}, '${payload}';`);
    }

    async listen(config: DbConnectionConfig): Promise<void> {
        // Idempotent
        await this.unlisten();

        // Open connections
        this._notificationFetchConn = await this.open(config);
        this._notificationListenConn = await this.open(config);

        // Listen
        const client: Client = this.ensureClient(this._notificationListenConn);
        client.on('notification', this.onNotification);
        await client.query(`LISTEN ${DbClientPostgres.NOTIFICATION_CHANNEL};`);

        // Fetch most recent record
        const fetchClient: Client = this.ensureClient(this._notificationFetchConn);
        const mostRecent: DbNotification | undefined =
            await this.fetchMostRecentNotification(fetchClient);
        if (mostRecent) this._lastNotificationId = mostRecent.id;

        // Setup Syncer
        this._interval = setInterval(this.onSync, DbClientPostgres.SYNC_INTERVAL_MILLIS);
    }

    async unlisten(): Promise<void> {
        this._lastNotificationId = 0;
        if (this._interval) clearTimeout(this._interval);
        if (this._notificationListenConn) {
            const client: Client = <Client>this._connectionMap.get(this._notificationListenConn.id);
            if (client) {
                await client.query(`UNLISTEN ${DbClientPostgres.NOTIFICATION_CHANNEL};`);
                client.removeAllListeners('notification');
                await this.close(this._notificationListenConn);
            }
            this._notificationListenConn = undefined;
        }
        if (this._notificationFetchConn) {
            const client: Client = <Client>this._connectionMap.get(this._notificationFetchConn.id);
            if (client) {
                client.removeAllListeners();
                await this.close(this._notificationFetchConn);
            }
            this._notificationFetchConn = undefined;
        }
    }

    private onSync: () => Promise<void> = async () => {
        // Grab client
        if (!this._notificationFetchConn) return;
        const client: Client = this.ensureClient(this._notificationFetchConn);

        // Load most recent
        const notification: DbNotification | undefined =
            await this.fetchMostRecentNotification(client);
        if (!notification) return;
        if (!this._notificationFetchConn) return;

        // Check if we're out of date
        if (notification.id > this._lastNotificationId) {
            console.log('OUT OF SYNC');
            // We're out of date
            const notifications: DbNotification[] | undefined =
                await this.fetchAllMissedNotifications(client);
            if (!notifications) throw new Error('Failed catch up with changes in the database');
            for (let i = 0; i < notifications.length; i++) this.notifyRenderer(notifications[i]);
        }

        // Drop old records
        if (!this._notificationFetchConn) return;
        await this.deleteOldNotifications(client);
    };

    private onNotification: (msg: Notification) => Promise<void> = async (msg: Notification) => {
        // Grab fetch client
        if (!this._notificationFetchConn) throw new Error('Notification connection is missing');
        const client: Client = this.ensureClient(this._notificationFetchConn);

        // Deserialize notify request
        const notifyRequest: NotifyRequest = this.deserializeNotification(msg.payload);

        // Fetch the notification row
        const result: QueryResult = await client.query(<QueryConfig>{
            text: `SELECT * FROM ${TABLE_NOTIFICATIONS.name} WHERE id = ${notifyRequest.id};`,
        });
        const notification: DbNotification = <DbNotification>result.rows[0];

        // Notify
        this.notifyRenderer(notification);
    };

    private async fetchMostRecentNotification(client: Client): Promise<DbNotification | undefined> {
        const result: QueryResult = await client.query(<QueryConfig>{
            text: `SELECT * FROM ${TABLE_NOTIFICATIONS.name} ORDER BY id DESC LIMIT 1;`,
        });
        if (!result || result.rowCount === 0) return undefined;
        return result.rows[0];
    }

    private async fetchAllMissedNotifications(
        client: Client,
    ): Promise<DbNotification[] | undefined> {
        const result: QueryResult = await client.query(<QueryConfig>{
            text:
                `SELECT * FROM ${TABLE_NOTIFICATIONS.name} ` +
                `WHERE id > ${this._lastNotificationId};`,
        });
        if (!result || result.rowCount === 0) return undefined;
        return result.rows;
    }

    private async deleteOldNotifications(client: Client): Promise<void> {
        await client.query(
            `DELETE FROM ${TABLE_NOTIFICATIONS.name} WHERE timestamp < ` +
                `(extract(epoch from now()) - ${DbClientPostgres.NOTIFICATION_RETENTION_SECONDS})`,
        );
    }

    private notifyRenderer(notification: DbNotification): void {
        const appNotification: AppNotification = <AppNotification>{
            tableId: notification.table_id,
            operationId: notification.operation_id,
            rows: JSON.parse(notification.json_payload),
        };
        this._lastNotificationId = notification.id;
        const mainWindow: BrowserWindow = getMainWindow();
        mainWindow.webContents.send(API_POSTGRES_ON_NOTIFICATION, appNotification);
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
