import { BrowserWindow, IpcMainInvokeEvent, app, ipcMain } from 'electron';
import {
    API_WINDOW_CLOSE,
    API_WINDOW_IS_MAXIMIZED,
    API_WINDOW_MAXIMIZE,
    API_WINDOW_MINIMIZE,
    API_WINDOW_UNMAXIMIZE,
} from '../common/constants.js';
import { windowFromWebContents } from './ipc-common.js';

ipcMain.handle(API_WINDOW_CLOSE, async (): Promise<void> => {
    app.quit();
});
ipcMain.handle(API_WINDOW_MINIMIZE, async (event: IpcMainInvokeEvent): Promise<void> => {
    const mainWindow: BrowserWindow = windowFromWebContents(event);
    mainWindow.minimize();
});
ipcMain.handle(API_WINDOW_MAXIMIZE, async (event: IpcMainInvokeEvent): Promise<void> => {
    const mainWindow: BrowserWindow = windowFromWebContents(event);
    mainWindow.maximize();
});
ipcMain.handle(API_WINDOW_UNMAXIMIZE, async (event: IpcMainInvokeEvent): Promise<void> => {
    const mainWindow: BrowserWindow = windowFromWebContents(event);
    mainWindow.unmaximize();
});
ipcMain.handle(API_WINDOW_IS_MAXIMIZED, async (event: IpcMainInvokeEvent): Promise<boolean> => {
    const mainWindow: BrowserWindow = windowFromWebContents(event);
    return mainWindow.isMaximized();
});
