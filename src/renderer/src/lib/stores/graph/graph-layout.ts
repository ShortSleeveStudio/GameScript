import {
    LS_KEY_CONVERSATION_EDITOR_LAYOUT_AUTO_DEFAULT,
    LS_KEY_CONVERSATION_EDITOR_LAYOUT_VERTICAL_DEFAULT,
} from '@lib/constants/local-storage';
import { persisted } from '@lib/vendor/svelte-persisted-store';
import type { Writable } from 'svelte/store';

/**Default graph auto-layout toggle state (enabled or disabled). */
export const graphLayoutAutoLayoutDefault: Writable<boolean> = persisted(
    LS_KEY_CONVERSATION_EDITOR_LAYOUT_AUTO_DEFAULT,
    false,
);

/**Default graph orientation (vertical or horizontal). */
export const graphLayoutVerticalDefault: Writable<boolean> = persisted(
    LS_KEY_CONVERSATION_EDITOR_LAYOUT_VERTICAL_DEFAULT,
    false,
);
