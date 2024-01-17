import { readable, type Readable } from 'svelte/store';

/**
 * Boolean store for if the window is maximized or not.
 */
export const maximized: Readable<boolean> = readable(
    await window.api.window.isMaximized(),
    (set) => {
        const resizeHandler: () => Promise<void> = async () => {
            console.log('CAALED');
            set(await window.api.window.isMaximized());
        };
        window.api.window.onResizeRegister(resizeHandler);
        return () => window.api.window.onResizeUnregister(resizeHandler);
    },
);
