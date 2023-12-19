import { mainWindow } from '@lib/api/system/window';
import { readable, type Readable } from 'svelte/store';

/**
 * Boolean store for if the window is maximized or not.
 */
export const maximized: Readable<boolean> = readable(await mainWindow.isMaximized(), (set) => {
    const stopPromise: Promise<() => void> = mainWindow.onResized(async () => {
        set(await mainWindow.isMaximized());
    });
    return async () => (await stopPromise)();
});
