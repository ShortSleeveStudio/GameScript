import { Client, ClientConfig, QueryConfig } from 'pg';
import {
    DbClient,
    DbConnection,
    DbConnectionConfig,
    DbNotification,
    DbResult,
} from '../../common/common-db-types';

export class DbClientPostgres implements DbClient {
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
        const client: Client = <Client>this._connectionMap.get(connection.id);
        this.ensureClient(client);
        this._connectionMap.delete(connection.id);
        await client.end();
    }
    async closeAll(): Promise<void> {
        for (const [, client] of this._connectionMap) {
            await client.end();
        }
        this._connectionMap.clear();
    }
    run(
        connection: DbConnection,
        query: string,
        bindValues?: unknown[] | undefined,
    ): Promise<DbResult> {
        throw new Error('Method not implemented.');
    }
    async all<T = unknown[]>(
        connection: DbConnection,
        query: string,
        bindValues?: unknown[] | undefined,
    ): Promise<T> {
        const client: Client = <Client>this._connectionMap.get(connection.id);
        this.ensureClient(client);
        const result: QueryResult = await client.query(<QueryConfig>{
            text: query,
            values: bindValues,
        });
        return result.rows;
    }
    get<T = unknown>(
        connection: DbConnection,
        query: string,
        bindValues?: unknown[] | undefined,
    ): Promise<T> {
        throw new Error('Method not implemented.');
    }
    async exec(connection: DbConnection, query: string): Promise<void> {
        const client: Client = <Client>this._connectionMap.get(connection.id);
        this.ensureClient(client);
        await client.query(query);
    }
    notify(connection: DbConnection, notification: DbNotification): Promise<void> {
        throw new Error('Method not implemented.');
    }
    listen(connection: DbConnection): Promise<void> {
        throw new Error('Method not implemented.');
    }
    unlisten(connection: DbConnection): Promise<void> {
        throw new Error('Method not implemented.');
    }

    // private async ensureDatabaseExists(config: DbConnectionConfig): Promise<void> {
    //     const client: Client = new Client(<ClientConfig>{
    //         host: config.pgAddress,
    //         port: parseInt(config.pgPort),
    //         user: config.pgUsername,
    //         password: config.pgPassword,
    //     });

    //     // Connect
    //     await client.connect();

    //     // Ensure database
    //     const result = await client.query(<QueryConfig>{
    //         text: 'SELECT datname FROM pg_database WHERE datname = $1;',
    //         values: [config.pgDatabase],
    //         rowMode: 'array',
    //     });
    //     console.log(result);
    //     console.log('' + !result.rows);
    //     console.log('' + result.rows.length);
    //     console.log(!result.rows || result.rows.length === 0);
    //     if (!result.rows || result.rows.length === 0) {
    //         console.log('INIIINININININ');
    //         console.log("database doesn't exist, creating");
    //         await client.query(<QueryConfig>{
    //             text: 'CREATE DATABASE pg_escape_string()$1;',
    //             values: [config.pgDatabase],
    //             rowMode: 'array',
    //         });
    //     }
    //     await client.end();
    // }
    private ensureClient(client: Client) {
        if (!client) throw new Error('Could not find database client');
    }
}
export const postgres: DbClientPostgres = new DbClientPostgres();
