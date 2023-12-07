import {
	doesMatchVersion,
	localStorageStore,
	type LocalStorageValue,
} from '$lib/stores/custom/local-storage-store';
import { get, type Writable } from 'svelte/store';

// Update this whenever the schema changes in an incompatible way.
const Version: number = 0;

// Default value for darkmode
const DefaultValue: Darkmode = {
	version: Version,
	value: 'system',
};

// The darkmode setting object.
interface Darkmode extends LocalStorageValue {
	value: 'system' | 'dark' | 'light';
}

/**
 * System darkmode change handler.
 * @param eventList darkmode mediaquery information
 */
function onSystemDarkmodeChanged(eventList: MediaQueryListEvent): void {
	// Update cached value
	isSystemDarkMode = eventList.matches;
	// force an update
	darkmode.set(get(darkmode));
}

/**
 * Darkmode is a store for the current user darkmode preference.
 */
export const darkmode: Writable<Darkmode> = localStorageStore('preferences', DefaultValue);

// System darkmode change handler.
let isSystemDarkMode: boolean = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Monitor for changes to darkmode system preference.
window
	.matchMedia('(prefers-color-scheme: dark)')
	.addEventListener('change', onSystemDarkmodeChanged);

// Listen for changes to darkmode and react accordingly.
darkmode.subscribe((darkmodeValue: Darkmode) => {
	// Make sure schema matches, or delete the old value
	if (!doesMatchVersion(darkmodeValue, Version)) {
		darkmode.set(DefaultValue); // causes recursion
		return;
	}

	// Update darkmode
	switch (darkmodeValue.value) {
		case 'system':
			if (isSystemDarkMode) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
			break;
		case 'dark':
			document.documentElement.classList.add('dark');
			break;
		case 'light':
			document.documentElement.classList.remove('dark');
			break;
	}
});
