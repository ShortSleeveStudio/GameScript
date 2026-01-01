import { writable, type Writable } from 'svelte/store';

/**
 * Layout visibility stores for Golden Layout panels.
 * Note: Inspector is now a fixed panel (not in Golden Layout), so it has no visibility store.
 */

/** Store for if conversation editor (graph) component is visible */
export const conversationEditorIsVisible: Writable<boolean> = writable(false);
/** Store for if conversation finder component is visible */
export const conversationFinderIsVisible: Writable<boolean> = writable(false);
/** Store for if localization editor component is visible */
export const localizationEditorIsVisible: Writable<boolean> = writable(false);
/** Store for if actor manager component is visible */
export const actorManagerIsVisible: Writable<boolean> = writable(false);
/** Store for if locale manager component is visible */
export const localeManagerIsVisible: Writable<boolean> = writable(false);
