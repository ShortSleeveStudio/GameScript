import { writable, type Writable } from 'svelte/store';

/**This is used to lock the UI when important stuff is happening. */
export const isApplyingDefaultFields: Writable<boolean> = writable<boolean>(false);
