// TODO;
// import type { Db } from '@lib/api/db/db-base';
// import type { Filter } from '@lib/api/db/db-filter-interface';
// import type { DatabaseTableId, Row } from '@lib/api/db/db-schema';
// import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
// import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
// import {
//     get,
//     writable,
//     type Invalidator,
//     type Readable,
//     type Subscriber,
//     type Unsubscriber,
//     type Writable,
// } from 'svelte/store';

// export interface TableAndRows<RowType extends Row> {
//     table: IDbTableView<RowType>;
//     rows: IDbRowView<RowType>[];
// }

// // TODO: see if we can ditch this entirely
// /**Convenience class to notify if a table or its rows are updated */
// export class TableAndRowStore<RowType extends Row> implements Readable<TableAndRows<RowType>> {
//     private _db: Db;
//     private _tableId: DatabaseTableId;
//     private _filter: Filter<RowType>;
//     private _table: IDbTableView<RowType>;
//     private _unsubscribeTable: Unsubscriber;
//     private _rowIdToRowUnsubscribe: Map<number, Unsubscriber>;
//     private _interalWritable: Writable<TableAndRows<RowType>>;

//     constructor(db: Db, tableId: DatabaseTableId, filter: Filter<RowType>) {
//         this._rowIdToRowUnsubscribe = new Map();
//         this._db = db;
//         this._tableId = tableId;
//         this._filter = filter;
//         this._table = this._db.fetchTable(this._tableId, this._filter);
//         this._interalWritable = writable({ table: this._table, rows: [] });
//         this._unsubscribeTable = this._table.subscribe(this.onTableChanged);
//     }
//     subscribe(
//         run: Subscriber<TableAndRows<RowType>>,
//         invalidate?: Invalidator<TableAndRows<RowType>> | undefined,
//     ): Unsubscriber {
//         return this._interalWritable.subscribe(run, invalidate);
//     }

//     dispose(): void {
//         this._unsubscribeTable();
//         this._rowIdToRowUnsubscribe.forEach((unsub) => unsub());
//         this._rowIdToRowUnsubscribe.clear();
//         this._db.releaseTable(this._table);
//     }

//     private onTableChanged: (rows: IDbRowView<RowType>[]) => void = (
//         rows: IDbRowView<RowType>[],
//     ) => {
//         const newMap: Map<number, Unsubscriber> = new Map();
//         for (let i = 0; i < rows.length; i++) {
//             // Grab row
//             const row: IDbRowView<RowType> = rows[i];

//             // Subscribe to changes
//             let unsub: Unsubscriber | undefined = this._rowIdToRowUnsubscribe.get(row.id);
//             if (unsub) {
//                 this._rowIdToRowUnsubscribe.delete(row.id);
//             } else {
//                 unsub = row.subscribe(this.notify);
//             }
//             newMap.set(row.id, unsub);
//         }

//         // Use the old map to unsubscribe to missing rows
//         this._rowIdToRowUnsubscribe.forEach((value: Unsubscriber) => value());

//         // Set new map
//         this._rowIdToRowUnsubscribe = newMap;

//         // Update internal writable data
//         get(this._interalWritable).rows = rows;

//         // Notify
//         this.notify();
//     };

//     private notify: () => void = () => {
//         this._interalWritable.set(get(this._interalWritable));
//     };
// }
