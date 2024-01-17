import {
    BrowserWindow,
    IpcMainInvokeEvent,
    OpenDialogOptions,
    OpenDialogReturnValue,
    SaveDialogOptions,
    SaveDialogReturnValue,
    dialog,
    ipcMain,
} from 'electron';
import path from 'path';
import { API_DIALOG_SQLITE_OPEN, API_DIALOG_SQLITE_SAVE } from '../common/constants';
import { windowFromWebContents } from './ipc-common.js';

/**
 * Result object from dialog.
 */
export interface DialogResult {
    fileName: string;
    filePath: string;
    canceled: boolean;
}

ipcMain.handle(
    API_DIALOG_SQLITE_OPEN,
    async (event: IpcMainInvokeEvent, payload: OpenDialogOptions): Promise<DialogResult> => {
        const mainWindow: BrowserWindow = windowFromWebContents(event);
        const result: OpenDialogReturnValue = await dialog.showOpenDialog(mainWindow, payload);
        if (result && (result.canceled || !result.filePaths || result.filePaths.length !== 1)) {
            return <DialogResult>{
                canceled: result.canceled,
            };
        }
        return <DialogResult>{
            canceled: result.canceled,
            fileName: path.basename(result.filePaths[0]),
            filePath: path.dirname(result.filePaths[0]),
        };
    },
);
ipcMain.handle(
    API_DIALOG_SQLITE_SAVE,
    async (event: IpcMainInvokeEvent, payload: SaveDialogOptions): Promise<DialogResult> => {
        const mainWindow: BrowserWindow = windowFromWebContents(event);
        const result: SaveDialogReturnValue = await dialog.showSaveDialog(mainWindow, payload);
        if (result && (result.canceled || !result.filePath)) {
            return <DialogResult>{
                canceled: result.canceled,
            };
        }
        return <DialogResult>{
            canceled: result.canceled,
            fileName: path.basename(<string>result.filePath),
            filePath: path.dirname(<string>result.filePath),
        };
    },
);
