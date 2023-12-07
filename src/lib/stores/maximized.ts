import { appWindow } from '@tauri-apps/api/window';
import { readable, type Readable } from 'svelte/store';

/**
 * Boolean for if the window is maximized or not.
 */
export const maximized: Readable<boolean> = readable(false, (set) => {
	const stopPromise: Promise<() => void> = appWindow.onResized(async () => {
		set(await appWindow.isMaximized());
	});
	return async () => (await stopPromise)();
});
// TODO find a way to allow for reloading window settings that updates this maximized value
