import { BrowserWindow, IpcMainInvokeEvent, WebContents } from 'electron';

// Helpers
export function windowFromWebContents(event: IpcMainInvokeEvent): BrowserWindow {
    const webContents: WebContents = event.sender;
    const mainWindow: BrowserWindow | null = BrowserWindow.fromWebContents(webContents);
    if (!mainWindow) throw new Error('Could not locate the main window');
    return mainWindow;
}
