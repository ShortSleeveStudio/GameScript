import { ipcRenderer, type OpenDialogOptions, type SaveDialogOptions } from 'electron';
import {
    API_DIALOG_AUTO_COMPLETE_OPEN,
    API_DIALOG_SQLITE_OPEN,
    API_DIALOG_SQLITE_SAVE,
} from '../common/constants';
import { fsApi } from './api-filesystem';

export interface DialogResult {
    path: string;
    baseName: string;
    fullPath: string;
    cancelled: boolean;
}

export interface DialogApi {
    sqliteDbOpen(): Promise<DialogResult>;
    sqliteDbSave(): Promise<DialogResult>;
    autoCompleteOpen(): Promise<DialogResult>;
}

export const dialogApi: DialogApi = {
    sqliteDbOpen: async () => {
        return await ipcRenderer.invoke(API_DIALOG_SQLITE_OPEN, <OpenDialogOptions>{
            title: 'Select a Database File',
            defaultPath: await fsApi.getAppDataDirectory(),
            buttonLabel: 'Open Database',
            filters: [{ extensions: ['.db'] }],
            properties: ['openFile'],
        });
    },
    sqliteDbSave: async () => {
        return await ipcRenderer.invoke(API_DIALOG_SQLITE_SAVE, <SaveDialogOptions>{
            title: 'Create a New Database File',
            defaultPath: await fsApi.getDefaultSqliteFile(),
            buttonLabel: 'Create Database',
            filters: [{ extensions: ['.db'] }],
        });
    },
    autoCompleteOpen: async () => {
        return await ipcRenderer.invoke(API_DIALOG_AUTO_COMPLETE_OPEN, <OpenDialogOptions>{
            title: 'Select a Code Directory to Scan',
            buttonLabel: 'Select Directory',
            properties: ['openDirectory'],
        });
    },
};
