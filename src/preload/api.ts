import { ConstantsApi, constantsApi } from './api-constants';
import { DialogApi, dialogApi } from './api-dialog';
import { FileSystemApi, fsApi } from './api-filesystem';
import { SqliteApi, sqliteApi } from './api-sqlite';
import { windowApi, type WindowApi } from './api-window';

export interface API {
    fs: FileSystemApi;
    dialog: DialogApi;
    window: WindowApi;
    constants: ConstantsApi;
    sqlite: SqliteApi;
}

export const api = <API>{
    fs: fsApi,
    dialog: dialogApi,
    window: windowApi,
    constants: constantsApi,
    sqlite: sqliteApi,
};
