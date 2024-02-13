import { LS_KEY_CONVERSATION_EDITOR_LAYOUT_VERTICAL } from '@lib/constants/local-storage';
import { persisted } from '@lib/vendor/svelte-persisted-store';
import type { Writable } from 'svelte/store';

/**Whether to layout graphs vertically or horizontally. */
export const graphLayoutVertical: Writable<boolean> = persisted(
    LS_KEY_CONVERSATION_EDITOR_LAYOUT_VERTICAL,
    false,
);
