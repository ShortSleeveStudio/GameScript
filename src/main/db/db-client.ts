import {
    DbClient,
    DbConnection,
    DbConnectionConfig,
    DbTransaction,
} from '../../common/common-db-types';

export async function executeTransaction(
    db: DbClient,
    config: DbConnectionConfig,
    transaction: DbTransaction,
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
