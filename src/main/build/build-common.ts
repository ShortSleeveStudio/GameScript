import { ReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { DbClient, DbConnection } from '../../common/common-db-types';
import { Localization } from '../../common/common-schema';
import { RowUpdateQueryBuilder } from '../../common/common-sql';
import {
    LOCALIZATION_FORMAT_CSV,
    LOCALIZATION_FORMAT_JSON,
    LocalizationFormatTypeId,
} from '../../common/common-types';
import {
    GameExportRequest,
    LocalizationExportRequest,
    LocalizationImportRequest,
} from '../../preload/api-build';
import { isFolder } from '../common/common-helpers';

export const EXPORTER_FILENAME_HELPER_DB: string = 'HELPER_DB___DO_NOT_SHIP.db';
export const EXPORTER_FILENAME_DATA_FILE: string = 'game.dat';
export const EXPORTER_FILENAME_PREFIX_MISC: string = 'miscellaneous';
export const EXPORTER_FILENAME_PREFIX_SINGLE: string = 'localizations';
export const EXPORTER_FILENAME_PREFIX_PER_CONVERSATION: string = 'conversation_';
export const EXPORTER_BATCH_SIZE: number = 500;
export const EXPORTER_CHARACTER_NEWLINE: string = '\r\n';
export const EXPORTER_CHARACTER_DELIMITER: string = ',';
export const EXPORTER_CHARACTER_ENCODING: string = 'utf-8';

export interface ColumnDescriptor {
    id: string;
    name: string;
}

export interface LocalizationExporter {
    setup(
        exportRequest: LocalizationExportRequest,
        columns: ColumnDescriptor[],
        headers: string[],
    ): Promise<void>;
    handleBatch(localizations: Localization[]): Promise<void>;
    teardown(): Promise<void>;
}

export interface LocalizationImporter {
    setup(
        importRequest: LocalizationImportRequest,
        columns: ColumnDescriptor[],
        headers: string[],
    ): Promise<void>;
    handleBatch(
        db: DbClient,
        fileStream: ReadStream,
        conn: DbConnection,
        queryBuilder: RowUpdateQueryBuilder,
    ): Promise<void>;
    teardown(): Promise<void>;
}

export interface GameHelperDbExporter {
    export(
        mainDb: DbClient,
        helperDb: DbClient,
        importRequest: GameExportRequest,
        mainConn: DbConnection,
        helperConn: DbConnection,
    ): Promise<void>;
    teardown(): Promise<void>;
}

export async function listFilesWithExtension(
    pathString: string,
    format: LocalizationFormatTypeId,
): Promise<string[]> {
    const fileList: string[] = await fs.readdir(pathString);
    const filesWithExtension: string[] = [];
    for (let i = 0; i < fileList.length; i++) {
        const file: string = path.join(pathString, fileList[i]);

        // Skip directories
        const isDirectory: boolean = await isFolder(file);
        if (isDirectory) continue;

        // Skip incorrect extension
        const extension = path.extname(file);
        if (format === LOCALIZATION_FORMAT_CSV.id && extension !== '.csv') continue;
        else if (format === LOCALIZATION_FORMAT_JSON.id && extension !== '.json') continue;

        // This is a file with the correct extension
        filesWithExtension.push(file);
    }
    return filesWithExtension;
}
