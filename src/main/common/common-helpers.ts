import { BrowserWindow } from 'electron';

export function getMainWindow(): BrowserWindow {
    const windows: BrowserWindow[] = BrowserWindow.getAllWindows();
    if (windows.length !== 1) throw new Error('Could not find main application window');
    return windows[0];
}
