import { writable, type Writable } from 'svelte/store';

/** Store for if actors component is visible */
export const actorsIsVisible: Writable<boolean> = writable(false);
/** Store for if build component is visible */
export const buildIsVisible: Writable<boolean> = writable(false);
/** Store for if conversation editor component is visible */
export const conversationEditorIsVisible: Writable<boolean> = writable(false);
/** Store for if conversation finder component is visible */
export const conversationFinderIsVisible: Writable<boolean> = writable(false);
/** Store for if inspector component is visible */
export const inspectorIsVisible: Writable<boolean> = writable(false);
/** Store for if localization editor component is visible */
export const localizationEditorIsVisible: Writable<boolean> = writable(false);
/** Store for if search component is visible */
export const searchIsVisible: Writable<boolean> = writable(false);
/** Store for if settings component is visible */
export const settingsIsVisible: Writable<boolean> = writable(false);
