import {
	doesMatchVersion,
	localStorageStore,
	type LocalStorageValue,
} from '@lib/stores/custom/local-storage-store';
import { get, type Writable } from 'svelte/store';

// Update this whenever the schema changes in an incompatible way.
const Version: number = 0;

// Default value for darkmode
const DefaultValue: Darkmode = {
	version: Version,
	value: 'system',
};

// The darkmode setting object
interface Darkmode extends LocalStorageValue {
	value: 'system' | 'dark' | 'light';
}

// Define the writable store for darkmode
const darkmode: Writable<Darkmode> = localStorageStore('preferences', DefaultValue);

// Make sure schema matches, or delete the old value
if (!doesMatchVersion(get(darkmode), Version)) {
	darkmode.set(DefaultValue); // causes recursion
}

// Monitor for changes to darkmode system preference
let isSystemDarkMode: boolean = window.matchMedia('(prefers-color-scheme: dark)').matches;
window
	.matchMedia('(prefers-color-scheme: dark)')
	.addEventListener('change', function (eventList: MediaQueryListEvent): void {
		// Update cached value
		isSystemDarkMode = eventList.matches;
		// force an update
		darkmode.set(get(darkmode));
	});

darkmode.subscribe((darkmodeValue: Darkmode) => {
	// Listen for changes to darkmode and react accordingly.
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

/**
 * Darkmode is a store for the current user darkmode preference.
 */
export default darkmode;
