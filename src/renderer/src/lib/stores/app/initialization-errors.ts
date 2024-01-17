import { writable, type Writable } from 'svelte/store';

/**Global store for errors that occur during application initialization */
export const appInitializationErrors: Writable<Error[]> = writable([]);
