import { ipcRenderer } from 'electron';
import { API_FS_APP_DATA_DIRECTORY, API_FS_DEFAULT_SQLITE_FILE } from '../common/constants';

export interface FileSystemApi {
    getAppDataDirectory(): Promise<string>;
    getDefaultSqliteFile(): Promise<string>;
}

export const fsApi: FileSystemApi = {
    getAppDataDirectory: async () => {
        return await ipcRenderer.invoke(API_FS_APP_DATA_DIRECTORY);
    },
    getDefaultSqliteFile: async () => {
        return await ipcRenderer.invoke(API_FS_DEFAULT_SQLITE_FILE);
    },
};
