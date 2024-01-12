import type { DatabaseTableId, Row } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { UniqueNameTracker } from '@lib/utility/unique-name-tracker';
import { writable, type Writable } from 'svelte/store';

/**Focus payload can be any required ancillary data the inspector might need. */
export interface FocusPayload {}
/**Represents the focused row. */
export interface Focus {
    tableId: DatabaseTableId;
    rowView: IDbRowView<Row>;
    payload: FocusPayload;
}
export type Focusable = Focus | undefined;

/**Currently focused row */
export const focused: Writable<Focusable> = writable<Focusable>(undefined);

/**
 * Payloads
 */
export interface FocusPayloadRoutine extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
}
export interface FocusPayloadAutoComplete extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
}
export interface FocusPayloadActor extends FocusPayload {}
