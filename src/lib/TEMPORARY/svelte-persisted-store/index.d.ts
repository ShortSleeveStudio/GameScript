import { Writable } from 'svelte/store';

interface Serializer<T> {
    parse(text: string): T;
    stringify(object: T): string;
}
type StorageType = 'local' | 'session';
interface Options<T> {
    serializer?: Serializer<T>;
    storage?: StorageType;
}
/** @deprecated `writable()` has been renamed to `persisted()` */
declare function writable<T>(key: string, initialValue: T, options?: Options<T>): Writable<T>;
declare function persisted<T>(key: string, initialValue: T, options?: Options<T>): Writable<T>;

export { Options, Serializer, StorageType, persisted, writable };
