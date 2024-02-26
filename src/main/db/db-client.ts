import {
    DbConnection,
    DbConnectionConfig,
    DbResult,
    Transaction,
} from '../../common/common-types-db';

export interface DbClient {
    open(config: DbConnectionConfig): Promise<DbConnection>;
    close(connectionId: DbConnection): Promise<void>;
    closeAll(): Promise<void>;
    run(connectionId: DbConnection, query: string, bindValues?: unknown[]): Promise<DbResult>;
    all(connectionId: DbConnection, query: string, bindValues?: unknown[]): Promise<unknown[]>;
    get(connectionId: DbConnection, query: string, bindValues?: unknown[]): Promise<unknown>;
    exec(connectionId: DbConnection, query: string): Promise<void>;
}

export async function executeTransaction(
    db: DbClient,
    config: DbConnectionConfig,
    transaction: Transaction,
): Promise<void> {
    let wasError: boolean = false;
    let conn: DbConnection | undefined;
    try {
        conn = await db.open(config);
        await db.exec(conn, 'BEGIN;');
        await transaction(conn);
    } catch (err) {
        wasError = true;
        if (conn) await db.exec(conn, 'ROLLBACK;');
        throw err;
    } finally {
        if (conn) {
            if (!wasError) {
                await db.exec(conn, 'COMMIT;');
            }
            await db.close(conn);
        }
    }
}
