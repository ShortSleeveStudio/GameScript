import type { Writable } from 'svelte/store';

export interface SelectContext {
    selected: Writable<string>;
}
