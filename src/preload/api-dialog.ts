import { ipcRenderer, type OpenDialogOptions, type SaveDialogOptions } from 'electron';
import {
    API_DIALOG_AUTO_COMPLETE_OPEN,
    API_DIALOG_OPEN,
    API_DIALOG_SAVE,
} from '../common/constants';

export interface DialogResult {
    path: string;
    baseName: string;
    fullPath: string;
    cancelled: boolean;
}

export interface DialogApi {
    exportLocationDataSelect(): Promise<DialogResult>;
    exportLocationRoutinesSelect(): Promise<DialogResult>;
    exportLocationLocalizationSelect(): Promise<DialogResult>;
    importLocationLocalizationSelect(): Promise<DialogResult>;
    sqliteDbOpen(): Promise<DialogResult>;
    sqliteDbSave(): Promise<DialogResult>;
    autoCompleteOpen(): Promise<DialogResult>;
}

export const dialogApi: DialogApi = {
    exportLocationDataSelect: async () => {
        return await ipcRenderer.invoke(API_DIALOG_OPEN, <OpenDialogOptions>{
            title: 'Select the Data Export Location',
            buttonLabel: 'Select Location',
            properties: ['openDirectory'],
        });
    },
    exportLocationRoutinesSelect: async () => {
        return await ipcRenderer.invoke(API_DIALOG_OPEN, <OpenDialogOptions>{
            title: 'Select the Routines Export Location',
            buttonLabel: 'Select Location',
            properties: ['openDirectory'],
        });
    },
    exportLocationLocalizationSelect: async () => {
        return await ipcRenderer.invoke(API_DIALOG_OPEN, <OpenDialogOptions>{
            title: 'Select the Localization Export Location',
            buttonLabel: 'Select Location',
            properties: ['openDirectory'],
        });
    },
    importLocationLocalizationSelect: async () => {
        return await ipcRenderer.invoke(API_DIALOG_OPEN, <OpenDialogOptions>{
            title: 'Select the Localization Import Location',
            buttonLabel: 'Select Location',
            properties: ['openDirectory'],
        });
    },
    sqliteDbOpen: async () => {
        return await ipcRenderer.invoke(API_DIALOG_OPEN, <OpenDialogOptions>{
            title: 'Select a Database File',
            buttonLabel: 'Open Database',
            filters: [{ extensions: ['.db'] }],
            properties: ['openFile'],
        });
    },
    sqliteDbSave: async () => {
        return await ipcRenderer.invoke(API_DIALOG_SAVE, <SaveDialogOptions>{
            title: 'Create a New Database File',
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
