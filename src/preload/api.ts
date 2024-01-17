import { OpenDialogOptions, SaveDialogOptions, ipcRenderer } from 'electron';
import {
    API_DIALOG_SQLITE_OPEN,
    API_DIALOG_SQLITE_SAVE,
    API_FS_APP_DATA_DIRECTORY,
    API_FS_DEFAULT_SQLITE_FILE,
    API_WINDOW_CLOSE,
    API_WINDOW_IS_MAXIMIZED,
    API_WINDOW_MAXIMIZE,
    API_WINDOW_MINIMIZE,
    API_WINDOW_ON_RESIZE,
    API_WINDOW_UNMAXIMIZE,
    APP_NAME,
} from '../common/constants';
import { DialogResult } from '../main/ipc-dialog';

export interface API {
    fs: FileSystem;
    dialog: Dialog;
    window: Window;
    constants: Constants;
}
export interface FileSystem {
    getAppDataDirectory(): Promise<string>;
    getDefaultSqliteFile(): Promise<string>;
}
export interface Dialog {
    sqliteDbOpen(): Promise<DialogResult>;
    sqliteDbSave(): Promise<DialogResult>;
}
export interface Window {
    close(): Promise<void>;
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    unmaximize(): Promise<void>;
    isMaximized(): Promise<boolean>;
    onResizeRegister(callback: () => void): void;
    onResizeUnregister(callback: () => void): void;
}
export interface Constants {
    APP_NAME: string;
}

export const fs: FileSystem = {
    getAppDataDirectory: async () => {
        return await ipcRenderer.invoke(API_FS_APP_DATA_DIRECTORY);
    },
    getDefaultSqliteFile: async () => {
        return await ipcRenderer.invoke(API_FS_DEFAULT_SQLITE_FILE);
    },
};

const dialog: Dialog = {
    sqliteDbOpen: async () => {
        return await ipcRenderer.invoke(API_DIALOG_SQLITE_OPEN, <OpenDialogOptions>{
            title: 'Select a Database File',
            defaultPath: await api.fs.getAppDataDirectory(),
            buttonLabel: 'Open Database',
            filters: [{ extensions: ['.db'] }],
            properties: ['openFile'],
        });
    },
    sqliteDbSave: async () => {
        return await ipcRenderer.invoke(API_DIALOG_SQLITE_SAVE, <SaveDialogOptions>{
            title: 'Create a New Database File',
            defaultPath: await api.fs.getDefaultSqliteFile(),
            buttonLabel: 'Create Database',
            filters: [{ extensions: ['.db'] }],
        });
    },
};

const window: Window = {
    close: async () => {
        await ipcRenderer.invoke(API_WINDOW_CLOSE);
    },
    minimize: async function (): Promise<void> {
        await ipcRenderer.invoke(API_WINDOW_MINIMIZE);
    },
    maximize: async function (): Promise<void> {
        await ipcRenderer.invoke(API_WINDOW_MAXIMIZE);
    },
    unmaximize: async function (): Promise<void> {
        await ipcRenderer.invoke(API_WINDOW_UNMAXIMIZE);
    },
    isMaximized: async function (): Promise<boolean> {
        return await ipcRenderer.invoke(API_WINDOW_IS_MAXIMIZED);
    },
    onResizeRegister: function (callback: () => void): void {
        ipcRenderer.addListener(API_WINDOW_ON_RESIZE, callback);
    },
    onResizeUnregister: function (callback: () => void): void {
        ipcRenderer.removeListener(API_WINDOW_ON_RESIZE, callback);
    },
};

const constants: Constants = {
    APP_NAME: APP_NAME,
};

export const api = <API>{
    fs: fs,
    dialog: dialog,
    window: window,
    constants: constants,
};
