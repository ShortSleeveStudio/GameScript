import {
    LS_KEY_SETTINGS_ACTORS_OPEN,
    LS_KEY_SETTINGS_CONVERSATIONS_OPEN,
    LS_KEY_SETTINGS_DATABASE_OPEN,
    LS_KEY_SETTINGS_SCRIPTING_OPEN,
} from '@lib/constants/local-storage';
import { persisted } from '@lib/vendor/svelte-persisted-store';
import type { Writable } from 'svelte/store';

/** Persistent store for database settings being open. */
export const dbOpen: Writable<boolean> = persisted(LS_KEY_SETTINGS_DATABASE_OPEN, true);
/** Persistent store for conversation editor settings being open. */
export const conversationsOpen: Writable<boolean> = persisted(
    LS_KEY_SETTINGS_CONVERSATIONS_OPEN,
    false,
);
/** Persistent store for scripting settings being open. */
export const scriptingOpen: Writable<boolean> = persisted(LS_KEY_SETTINGS_SCRIPTING_OPEN, false);
/** Persistent store for actors settings being open. */
export const actorsOpen: Writable<boolean> = persisted(LS_KEY_SETTINGS_ACTORS_OPEN, false);
