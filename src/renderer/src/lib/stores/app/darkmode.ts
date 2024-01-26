import { LS_KEY_DARKMODE } from '@lib/constants/local-storage';
import { persisted } from '@lib/vendor/svelte-persisted-store';
import { get, writable, type Writable } from 'svelte/store';

// Media match query
const systemThemeQuery: string = '(prefers-color-scheme: dark)';

/**
 * Valid dark modes
 */
const validDarkmodes = ['System', 'Dark', 'Light'] as const;
export type Darkmode = (typeof validDarkmodes)[number];

/**
 * Darkmode is a store for the current user darkmode preference.
 */
export const darkmode: Writable<Darkmode> = persisted(LS_KEY_DARKMODE, validDarkmodes[0]);
export const isDarkMode: Writable<boolean> = writable<boolean>(true);

// Make sure schema matches, or delete the old value
if (validDarkmodes.includes(get(darkmode))) {
    darkmode.set(validDarkmodes[0]);
}

// Monitor for changes to darkmode system preference
let isSystemDarkMode: boolean = window.matchMedia(systemThemeQuery).matches;
window
    .matchMedia(systemThemeQuery)
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

function setDarkMode(isDark: boolean): void {
    // "white" | "g10" | "g80" | "g90" | "g100"
    if (isDark) {
        document.documentElement.setAttribute('theme', 'g90');
        document.documentElement.style.colorScheme = 'dark';
        isDarkMode.set(true);
    } else {
        document.documentElement.setAttribute('theme', 'g10');
        document.documentElement.style.colorScheme = 'light';
        isDarkMode.set(false);
    }
}
