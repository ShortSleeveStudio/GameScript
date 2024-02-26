import type { Row } from '@common/common-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
import { Action, type ActionHandler, type ActionUnsubscriber } from '@lib/utility/action';
import { type Unsubscriber } from 'svelte/store';

/**Convenience class to notify if a table or its rows are updated */
export class TableWatcher<RowType extends Row> {
    private _action: Action<IDbTableView<RowType>>;
    private _table: IDbTableView<RowType>;
    private _unsubscribeTable: Unsubscriber;
    private _rowIdToRowUnsubscribe: Map<number, Unsubscriber>;

    constructor(table: IDbTableView<RowType>) {
        this._table = table;
        this._action = new Action<IDbTableView<RowType>>();
        this._rowIdToRowUnsubscribe = new Map();
        this._unsubscribeTable = this._table.subscribe(this.onTableChanged);
    }

    subscribe(handler: ActionHandler<IDbTableView<RowType>>): ActionUnsubscriber {
        const unsubscriber: ActionUnsubscriber = this._action.register(handler);
        handler(this._table);
        return unsubscriber;
    }

    unsubscribe(handler: ActionHandler<IDbTableView<RowType>>): void {
        this._action.unregister(handler);
    }

    unsubscribeAll(): void {
        this._action.unregisterAll();
    }

    dispose(): void {
        this._action.unregisterAll();
        this._unsubscribeTable();
        this._rowIdToRowUnsubscribe.forEach((unsub) => unsub());
        this._rowIdToRowUnsubscribe.clear();
    }

    private onTableChanged: (rows: IDbRowView<RowType>[]) => void = (
        rows: IDbRowView<RowType>[],
    ) => {
        const newMap: Map<number, Unsubscriber> = new Map();
        for (let i = 0; i < rows.length; i++) {
            // Grab row
            const row: IDbRowView<RowType> = rows[i];

            // Subscribe to changes
            let unsub: Unsubscriber | undefined = this._rowIdToRowUnsubscribe.get(row.id);
            if (unsub) {
                this._rowIdToRowUnsubscribe.delete(row.id);
            } else {
                unsub = row.subscribe(this.notify);
            }
            newMap.set(row.id, unsub);
        }

        // Use the old map to unsubscribe to missing rows
        this._rowIdToRowUnsubscribe.forEach((value: Unsubscriber) => value());

        // Set new map
        this._rowIdToRowUnsubscribe = newMap;

        // Notify
        this.notify();
    };

    private notify: () => void = () => {
        this._action.fire(this._table);
    };
}
