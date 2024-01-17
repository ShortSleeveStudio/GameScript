import { is } from '@electron-toolkit/utils';
import { BrowserWindow, app } from 'electron';
import { join } from 'path';
import { API_WINDOW_ON_RESIZE } from '../common/constants';

function createWindow(): void {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 640,
        minHeight: 480,
        frame: false,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            // nodeIntegration: true,
            // sandbox: false,
        },
    });

    // mainWindow.on('ready-to-show', () => {
    //     mainWindow.show();
    // });

    // mainWindow.webContents.setWindowOpenHandler((details) => {
    //     shell.openExternal(details.url);
    //     return { action: 'deny' };
    // });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Listen for Window Events
    mainWindow.on('resize', () => {
        mainWindow.webContents.send(API_WINDOW_ON_RESIZE);
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// app.whenReady().then(() => {
//     // Set app user model id for windows
//     electronApp.setAppUserModelId('com.electron');

//     // Default open or close DevTools by F12 in development
//     // and ignore CommandOrControl + R in production.
//     // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
//     app.on('browser-window-created', (_, window) => {
//         optimizer.watchWindowShortcuts(window);
//     });

//     createWindow();

//     app.on('activate', function () {
//         // On macOS it's common to re-create a window in the app when the
//         // dock icon is clicked and there are no other windows open.
//         if (BrowserWindow.getAllWindows().length === 0) createWindow();
//     });
// });

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
// ipcMain.handle('db/select-sqlite', () => 'pong');

/**
 * Dialogs
 */
import './ipc-dialog.ts';

/**
 * FileSystem
 */
import './ipc-fs.ts';

/**
 * Window
 */
import './ipc-window.ts';
