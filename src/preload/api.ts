import { BuildApi, buildApi } from './api-build';
import { CryptographyApi, cryptographyApi } from './api-cryptography';
import { DialogApi, dialogApi } from './api-dialog';
import { FileSystemApi, fsApi } from './api-filesystem';
import { postgresApi } from './api-postgres';
import { SqlApi } from './api-sql';
import { sqliteApi } from './api-sqlite';
import { SystemApi, systemApi } from './api-system';
import { TranspileApi, transpileApi } from './api-transpile';
import { windowApi, type WindowApi } from './api-window';

export interface API {
    fs: FileSystemApi;
    dialog: DialogApi;
    window: WindowApi;
    sqlite: SqlApi;
    postgres: SqlApi;
    build: BuildApi;
    system: SystemApi;
    transpile: TranspileApi;
    cryptography: CryptographyApi;
}

export const api = <API>{
    fs: fsApi,
    dialog: dialogApi,
    window: windowApi,
    sqlite: sqliteApi,
    postgres: postgresApi,
    build: buildApi,
    system: systemApi,
    transpile: transpileApi,
    cryptography: cryptographyApi,
};
