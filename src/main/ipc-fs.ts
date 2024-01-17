import { app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import {
    API_FS_APP_DATA_DIRECTORY,
    API_FS_DEFAULT_SQLITE_FILE,
    APP_NAME,
} from '../common/constants';

const DATA_DIRECTORY_NAME: string = 'studio.shortsleeve.gamescript';
const DEFAULT_SQLITE_FILE_NAME: string = `${APP_NAME}.db`;
const APP_DATA_DIRECTORY = path.join(app.getPath('appData'), DATA_DIRECTORY_NAME);
if (!fs.existsSync(APP_DATA_DIRECTORY)) {
    // Ensure the app data directory exists
    fs.mkdirSync(APP_DATA_DIRECTORY);
}
const DEFAULT_SQLITE_FILE = path.join(APP_DATA_DIRECTORY, DEFAULT_SQLITE_FILE_NAME);
ipcMain.handle(API_FS_APP_DATA_DIRECTORY, async (): Promise<string> => {
    return APP_DATA_DIRECTORY;
});
ipcMain.handle(API_FS_DEFAULT_SQLITE_FILE, async (): Promise<string> => {
    return DEFAULT_SQLITE_FILE;
});
