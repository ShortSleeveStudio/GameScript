/**
 * Layout defaults store.
 *
 * Stores user preferences for graph layout settings.
 * These are persisted in localStorage and used when creating new conversations.
 *
 * Ported from GameScriptElectron/src/renderer/src/lib/stores/graph/graph-layout.ts
 */

import { persisted } from '$lib/vendor/svelte-persisted-store';
import type { Writable } from 'svelte/store';

// Storage keys - namespaced to avoid conflicts
const LS_KEY_LAYOUT_AUTO_DEFAULT = 'gamescript:layout-auto-default';
const LS_KEY_LAYOUT_VERTICAL_DEFAULT = 'gamescript:layout-vertical-default';
const LS_KEY_MINIMAP_VISIBLE = 'gamescript:minimap-visible';

/** Default graph auto-layout toggle state (enabled or disabled). */
export const graphLayoutAutoLayoutDefault: Writable<boolean> = persisted(
  LS_KEY_LAYOUT_AUTO_DEFAULT,
  true
);

/** Default graph orientation (vertical or horizontal). */
export const graphLayoutVerticalDefault: Writable<boolean> = persisted(
  LS_KEY_LAYOUT_VERTICAL_DEFAULT,
  false
);

/** Whether the minimap is visible in the graph editor. */
export const graphMinimapVisible: Writable<boolean> = persisted(
  LS_KEY_MINIMAP_VISIBLE,
  true
);
