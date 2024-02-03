import {
    DATABASE_TABLES,
    type DatabaseTableId,
    type LocalePrincipal,
    type Row,
} from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import { Action, type ActionHandler, type ActionUnsubscriber } from '@lib/utility/action';
import type { UniqueNameTracker } from '@lib/utility/unique-name-tracker';

/**Represents the focused row. */
export interface FocusData {
    tableId: DatabaseTableId;
    rowView: IDbRowView<Row>;
    payload?: FocusPayload;
}
export type Focus = FocusData | undefined;

export class FocusManager {
    private _action: Action<void>;
    private _focused: number;
    private _tableIdToLastFocus: Focus[];

    constructor() {
        this._action = new Action<void>();
        this._focused = 0;
        this._tableIdToLastFocus = DATABASE_TABLES.map(() => undefined);
    }

    subscribe(handler: ActionHandler<void>): ActionUnsubscriber {
        const unsubscriber: ActionUnsubscriber = this._action.register(handler);
        handler();
        return unsubscriber;
    }

    unsubscribe(handler: ActionHandler<void>): void {
        this._action.unregister(handler);
    }

    get(tableId?: DatabaseTableId): Focus {
        if (tableId) return this._tableIdToLastFocus[tableId];
        return this._tableIdToLastFocus[this._focused];
    }

    focus(focus: FocusData): void {
        const isNewFocus: boolean =
            focus.tableId !== this._focused ||
            this._tableIdToLastFocus[this._focused].rowView !== focus.rowView;
        this._focused = focus.tableId;
        this._tableIdToLastFocus[focus.tableId] = focus;
        if (isNewFocus) this._action.fire();
    }

    blur(tableId?: DatabaseTableId): void {
        if (tableId) this._tableIdToLastFocus[tableId] = undefined;
        this._tableIdToLastFocus[this._focused] = undefined;
        this._action.fire();
    }

    clear(): void {
        for (let i = 0; i < this._tableIdToLastFocus.length; i++) {
            this._tableIdToLastFocus[i] = undefined;
        }
        this._action.fire();
    }
}

/**
 * Payloads
 */
/**Focus payload can be any required ancillary data the inspector might need. */
export interface FocusPayload {}
export interface FocusPayloadRoutine extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
}
export interface FocusPayloadAutoComplete extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
}
export interface FocusPayloadActor extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
}
export interface FocusPayloadLocale extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
    localePrincipalRowView: IDbRowView<LocalePrincipal>;
}
export interface FocusPayloadFilter extends FocusPayload {
    uniqueNameTracker: UniqueNameTracker;
}

/**Export Singleton */
export const focusManager: FocusManager = new FocusManager();
