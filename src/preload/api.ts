import { BuildApi, buildApi } from './api-build';
import { DialogApi, dialogApi } from './api-dialog';
import { FileSystemApi, fsApi } from './api-filesystem';
import { SqliteApi, sqliteApi } from './api-sqlite';
import { windowApi, type WindowApi } from './api-window';

export interface API {
    fs: FileSystemApi;
    dialog: DialogApi;
    window: WindowApi;
    sqlite: SqliteApi;
    build: BuildApi;
}

export const api = <API>{
    fs: fsApi,
    dialog: dialogApi,
    window: windowApi,
    sqlite: sqliteApi,
    build: buildApi,
};
