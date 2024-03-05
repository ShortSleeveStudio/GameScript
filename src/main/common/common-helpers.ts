import { BrowserWindow } from 'electron';
import fs from 'fs/promises';

export function getMainWindow(): BrowserWindow {
    const windows: BrowserWindow[] = BrowserWindow.getAllWindows();
    if (windows.length !== 1) throw new Error('Could not find main application window');
    return windows[0];
}

export async function doesFileExist(path: string): Promise<boolean> {
    try {
        await fs.stat(path);
        return true;
    } catch (err) {
        return false;
    }
}

export async function isFolder(path: string): Promise<boolean> {
    return (await fs.stat(path)).isDirectory();
}
