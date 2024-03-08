import path from 'path';
import { DbClient, DbConnection, DbConnectionConfig } from '../../common/common-db-types';
import { GameExportRequest } from '../../preload/api-build';
import { doesFileExist } from '../common/common-helpers';
import { executeTransaction } from '../db/db-client';
import {
    EXPORTER_FILENAME_HELPER_DB,
    GameCodeExporter as GameExporterCode,
    GameDataExporter as GameExporterData,
    GameHelperDbExporter as GameExporterHelperDb,
} from './build-common';
import { gameExporterCodeAntlr } from './game-exporter-code';
import { gameExporterDataMsgPack } from './game-exporter-data-msgpack';
import { gameHelperDbExporterDefault as gameExporterHelperDbDefault } from './game-exporter-helper-db';

/**
 * This will do the following in order:
 * 1) Create an sqlite database with all row IDs re-written to be sequential so they can be
 *    stored in an array for fast lookup.
 * 2) Export all routines transpiled into the native language selected.
 * 3) Export all game data in a format to be used by the actual game at runtime.
 * @param db GameScript database
 * @param payload Game export request
 */
export async function gameExport(db: DbClient, payload: GameExportRequest): Promise<void> {
    // Ensure folders exist
    const dataDirExists: boolean = await doesFileExist(payload.dataLocation);
    if (!dataDirExists) throw new Error('Selected data export folder no longer exists');
    const codeDirExists: boolean = await doesFileExist(payload.codeLocation);
    if (!codeDirExists) throw new Error('Selected routine export folder no longer exists');

    // Ensure DB doesn't exist
    const helperDbConfig: DbConnectionConfig = <DbConnectionConfig>{
        sqliteFile: path.join(payload.dataLocation, EXPORTER_FILENAME_HELPER_DB),
    };
    // const dbExists: boolean = await doesFileExist(helperDbConfig.sqliteFile);
    // if (dbExists) {
    //     throw new Error('Helper database already exists. Please export to an empty folder');
    // }

    // Name files
    const exporterGameHelperDb: GameExporterHelperDb = gameExporterHelperDbDefault;
    const exporterGameCode: GameExporterCode = gameExporterCodeAntlr;
    const exporterGameData: GameExporterData = gameExporterDataMsgPack;
    try {
        await executeTransaction(db, helperDbConfig, async (helperConn: DbConnection) => {
            // Create Helper DB
            // await executeTransaction(
            //     db,
            //     payload.database.databaseConfig,
            //     async (mainConn: DbConnection) => {
            //         await exporterGameHelperDb.export(db, payload, mainConn, helperConn);
            //     },
            // );

            // Code Export
            await exporterGameCode.export(db, payload, helperConn);

            // Data Export
            // await exporterGameData.export(db, payload, mainConn, helperConn);
        });
    } finally {
        await exporterGameHelperDb.teardown();
        await exporterGameCode.teardown();
        await exporterGameData.teardown();
    }
}
