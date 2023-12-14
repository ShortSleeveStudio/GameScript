import { persisted } from '@lib/vendor/svelte-persisted-store';
import { get, type Writable } from 'svelte/store';

// Media match query
const SystemThemeQuery: string = '(prefers-color-scheme: dark)';

/**
 * Valid dark modes
 */
const ValidDarkmodes = ['System', 'Dark', 'Light'] as const;
export type Darkmode = typeof ValidDarkmodes[number];

/**
 * Darkmode is a store for the current user darkmode preference.
 */
export const darkmode: Writable<Darkmode> = persisted('preferences', ValidDarkmodes[0]);

// Make sure schema matches, or delete the old value
if (ValidDarkmodes.includes(get(darkmode))) {
	darkmode.set(ValidDarkmodes[0]);
}

// Monitor for changes to darkmode system preference
let isSystemDarkMode: boolean = window.matchMedia(SystemThemeQuery).matches;
window
	.matchMedia(SystemThemeQuery)
	.addEventListener('change', function (eventList: MediaQueryListEvent): void {
		// Update cached value
		isSystemDarkMode = eventList.matches;
		// force an update
		darkmode.set(get(darkmode));
	});

darkmode.subscribe((darkmodeValue: Darkmode) => {
	// Listen for changes to darkmode and react accordingly.
	switch (darkmodeValue) {
		case 'System':
			setDarkMode(isSystemDarkMode);
			break;
		case 'Dark':
			setDarkMode(true);
			break;
		case 'Light':
			setDarkMode(false);
			break;
	}
});

function setDarkMode(isDark: boolean) {
	// "white" | "g10" | "g80" | "g90" | "g100"
	if (isDark) {
		document.documentElement.setAttribute('theme', 'g90');
	} else {
		document.documentElement.setAttribute('theme', 'g10');
	}
}
