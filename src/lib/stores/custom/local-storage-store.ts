import { persisted, type Options } from '$lib/TEMPORARY/svelte-persisted-store';
import type { Writable } from 'svelte/store';

/**
 * This type inforces version numbers in persisted values in case they change.
 */
export interface LocalStorageValue {
	version: number;
}

/**
 * A wrapper function around persisted() to help enforce version numbers.
 * @param key the key used in local storage
 * @param initialValue the initial value stored in local storage
 * @param options options for the persisted store
 * @returns a writable store that saves in local storage
 */
export function localStorageStore<T extends LocalStorageValue>(
	key: string,
	initialValue: T,
	options?: Options<T>,
): Writable<T> {
	return persisted(key, initialValue, options);
}

/**
 * Helper function to check if version of the stored value matches the provided value.
 * @param store store to check version of
 * @param version version you want to match in the store
 * @returns true if the version matches
 */
export function doesMatchVersion(store: any, version: number): boolean {
	return typeof store === 'object' && 'version' in store && store.version === version;
}
