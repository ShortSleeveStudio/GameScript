import type { FieldRow, NodeRow } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
import { get } from 'svelte/store';

/**
 * View of a single node.
 */
export class NodeView {
    private _nodeRowView: IDbRowView<NodeRow>;
    private _fieldRowViews: IDbTableView<FieldRow>;

    constructor(nodeRowView: IDbRowView<NodeRow>, fieldRowViews: IDbTableView<FieldRow>) {
        this._nodeRowView = nodeRowView;
        this._fieldRowViews = fieldRowViews;
    }

    get id() {
        return this._nodeRowView.id;
    }

    get nodeRowView(): IDbRowView<NodeRow> {
        return this._nodeRowView;
    }

    get fieldTableView(): IDbTableView<FieldRow> {
        return this._fieldRowViews;
    }

    // TODO: optimize
    // This will likely be used in situations where a parent node requires fields for display
    getFieldByName(name: string): IDbRowView<FieldRow> | undefined {
        const fields: IDbRowView<FieldRow>[] = get(this._fieldRowViews);
        for (let i = 0; i < fields.length; i++) {
            if (get(fields[i]).name == name) {
                return fields[i];
            }
        }
        return undefined;
    }
}
