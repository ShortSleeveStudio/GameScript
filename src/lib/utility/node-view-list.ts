import type { Db } from '@lib/api/db/db-base';
import {
    TABLE_NAME_FIELDS,
    TABLE_NAME_NODES,
    type FieldRow,
    type NodeRow,
} from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
import {
    get,
    writable,
    type Invalidator,
    type Readable,
    type Subscriber,
    type Unsubscriber,
    type Writable,
} from 'svelte/store';
import { createFilter } from '../api/db/db-filter';
import type { Filter } from '../api/db/db-filter-interface';
import { NodeView } from './node-view';

export class NodeViewList implements Readable<NodeView[]> {
    private _db: Db;
    private _nodeIdToFields: Map<number, IDbTableView<FieldRow>>;
    private _interalWritable: Writable<NodeView[]>;
    private _nodeTableView: IDbTableView<NodeRow>;
    private _unsubscribeNodeTableView: Unsubscriber;

    constructor(database: Db, filter: Filter<NodeRow>) {
        this._db = database;
        this._nodeIdToFields = new Map();
        this._interalWritable = writable<NodeView[]>([]);
        this._nodeTableView = this._db.fetchTable<NodeRow>(TABLE_NAME_NODES, filter);
        this._unsubscribeNodeTableView = this._nodeTableView.subscribe(this.rebuildNodeView);
    }

    subscribe(
        run: Subscriber<NodeView[]>,
        invalidate?: Invalidator<NodeView[]> | undefined,
    ): Unsubscriber {
        return this._interalWritable.subscribe(run, invalidate);
    }

    dispose(): void {
        this._nodeIdToFields.forEach((value: IDbTableView<FieldRow>) => value.dispose());
        this._nodeIdToFields.clear();
        this._unsubscribeNodeTableView();
        this._db.releaseTable(this._nodeTableView);
    }

    // TODO: performance
    private rebuildNodeView = (nodes: IDbRowView<NodeRow>[]) => {
        // Clear old node view list
        const currentNodeViews: NodeView[] = get(this._interalWritable);
        currentNodeViews.length = 0;

        // Populate node view list
        const newMap: Map<number, IDbTableView<FieldRow>> = new Map();
        for (let i = 0; i < nodes.length; i++) {
            // Grab node
            const node: IDbRowView<NodeRow> = nodes[i];

            // Fetch fields table view for each node favoring cached table views
            let fields: IDbTableView<FieldRow> = <IDbTableView<FieldRow>>(
                this._nodeIdToFields.get(node.id)
            );
            if (!fields) {
                fields = this._db.fetchTable<FieldRow>(
                    TABLE_NAME_FIELDS,
                    createFilter<FieldRow>().where('parent').is(node.id).build(),
                );
            } else {
                // We delete from this map so that what remains is a set of unused table views
                this._nodeIdToFields.delete(node.id);
            }

            // Populate the new map
            newMap.set(node.id, fields);

            // Add to node view list
            currentNodeViews.push(new NodeView(node, fields));
        }

        // Use the old map to dispose of unused table views
        this._nodeIdToFields.forEach((value: IDbTableView<FieldRow>) => value.dispose());

        // Set new map
        this._nodeIdToFields = newMap;

        // Notify
        this._interalWritable.set(currentNodeViews);
    };
}
