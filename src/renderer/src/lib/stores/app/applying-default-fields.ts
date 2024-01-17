import { writable, type Writable } from 'svelte/store';

/**This is used to lock the UI when applying default fields to conversations. */
export const isApplyingDefaultFieldsConversations: Writable<boolean> = writable<boolean>(false);

/**This is used to lock the UI when applying default fields to actors. */
export const isApplyingDefaultFieldsActors: Writable<boolean> = writable<boolean>(false);
