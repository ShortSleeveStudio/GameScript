import path from 'path';
import { DbClient, DbConnection, DbConnectionConfig } from '../../common/common-db-types';
import { GameExportRequest } from '../../preload/api-build';
import { doesFileExist } from '../common/common-helpers';
import { executeTransaction } from '../db/db-client';
import {
    EXPORTER_FILENAME_HELPER_DB,
    GameHelperDbExporter as GameExporterHelperDb,
} from './build-common';
import { gameHelperDbExporterDefault as gameExporterHelperDbDefault } from './game-exporter-helper-db';

/**
 * This will create a clone of the main database as an SQLite database file for use by engine
 * modules.
 */
export async function gameExport(
    mainDb: DbClient,
    helperDb: DbClient,
    payload: GameExportRequest,
): Promise<void> {
    // Ensure folders exist
    const dataDirExists: boolean = await doesFileExist(payload.dataLocation);
    if (!dataDirExists) throw new Error('Selected data export folder no longer exists');

    // Ensure DB doesn't exist
    const helperDbConfig: DbConnectionConfig = <DbConnectionConfig>{
        sqliteFile: path.join(payload.dataLocation, EXPORTER_FILENAME_HELPER_DB),
    };
    const dbExists: boolean = await doesFileExist(helperDbConfig.sqliteFile);
    if (dbExists) {
        throw new Error('Helper database already exists. Please export to an empty folder');
    }

    // Name files
    const exporterGameHelperDb: GameExporterHelperDb = gameExporterHelperDbDefault;
    try {
        await executeTransaction(helperDb, helperDbConfig, async (helperConn: DbConnection) => {
            await executeTransaction(
                mainDb,
                payload.database.databaseConfig,
                async (mainConn: DbConnection) => {
                    await exporterGameHelperDb.export(
                        mainDb,
                        helperDb,
                        payload,
                        mainConn,
                        helperConn,
                    );
                },
            );
        });
    } finally {
        await exporterGameHelperDb.teardown();
    }
}
