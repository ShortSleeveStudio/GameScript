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
import { DialogResult } from '../preload/api-dialog.js';
import { windowFromWebContents } from './ipc-common.js';

/**
 * Result object from dialog.
 */
ipcMain.handle(
    API_DIALOG_SQLITE_OPEN,
    async (event: IpcMainInvokeEvent, payload: OpenDialogOptions): Promise<DialogResult> => {
        const mainWindow: BrowserWindow = windowFromWebContents(event);
        const result: OpenDialogReturnValue = await dialog.showOpenDialog(mainWindow, payload);
        if (result && (result.canceled || !result.filePaths || result.filePaths.length !== 1)) {
            return <DialogResult>{
                cancelled: result.canceled,
            };
        }
        return <DialogResult>{
            path: path.dirname(<string>result.filePaths[0]),
            baseName: path.basename(<string>result.filePaths[0]),
            fullPath: <string>result.filePaths[0],
            cancelled: result.canceled,
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
                cancelled: result.canceled,
            };
        }
        return <DialogResult>{
            path: path.dirname(<string>result.filePath),
            baseName: path.basename(<string>result.filePath),
            fullPath: <string>result.filePath,
            cancelled: result.canceled,
        };
    },
);
