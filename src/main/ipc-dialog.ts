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
import fs from 'fs/promises';
import path from 'path';
import { API_DIALOG_OPEN, API_DIALOG_SAVE } from '../common/constants.js';
import { DialogResult } from '../preload/api-dialog.js';
import { doesFileExist } from './common/common-helpers.js';
import { windowFromWebContents } from './ipc-common.js';

/**
 * Result object from dialog.
 */
ipcMain.handle(
    API_DIALOG_OPEN,
    async (event: IpcMainInvokeEvent, payload: OpenDialogOptions): Promise<DialogResult> => {
        const mainWindow: BrowserWindow = windowFromWebContents(event);
        const result: OpenDialogReturnValue = await dialog.showOpenDialog(mainWindow, payload);
        if (result && (result.canceled || !result.filePaths || result.filePaths.length !== 1)) {
            return <DialogResult>{
                cancelled: result.canceled,
            };
        }
        const isOpenDirectory: boolean = isOpenDirectoryOperation(payload);
        let thePath: string;
        let baseName: string;
        let fullPath: string;
        if (isOpenDirectory) {
            thePath = <string>result.filePaths[0];
            baseName = '';
            fullPath = '';
        } else {
            thePath = path.dirname(<string>result.filePaths[0]);
            baseName = path.basename(<string>result.filePaths[0]);
            fullPath = <string>result.filePaths[0];
        }
        return <DialogResult>{
            path: thePath,
            baseName: baseName,
            fullPath: fullPath,
            cancelled: result.canceled,
        };
    },
);
ipcMain.handle(
    API_DIALOG_SAVE,
    async (event: IpcMainInvokeEvent, payload: SaveDialogOptions): Promise<DialogResult> => {
        const mainWindow: BrowserWindow = windowFromWebContents(event);
        const result: SaveDialogReturnValue = await dialog.showSaveDialog(mainWindow, payload);
        // Delete if it already exists
        if (result.filePath && (await doesFileExist(result.filePath))) {
            await fs.unlink(result.filePath);
        }
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

function isOpenDirectoryOperation(payload: OpenDialogOptions): boolean {
    return payload.properties!.findIndex((value) => value === 'openDirectory') !== -1;
}
