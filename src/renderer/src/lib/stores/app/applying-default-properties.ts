import { writable, type Writable } from 'svelte/store';

/**This is used to lock the UI when applying default properties to conversations. */
export const isApplyingDefaultPropertiesConversations: Writable<boolean> = writable<boolean>(false);

/**This is used to lock the UI when applying default properties to actors. */
export const isApplyingDefaultPropertiesActors: Writable<boolean> = writable<boolean>(false);
