// import { db } from '@lib/api/db/db';
// import type { Edge, EdgeType } from '@lib/api/db/db-schema';
// import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
// import { Undoable, undoManager } from '@lib/utility/undo-manager';
// import { type Edge as FlowEdge } from '@xyflow/svelte';
// import { get } from 'svelte/store';

// interface PathOptions {
//     // Smooth Step
//     borderRadius?: number;

//     // Step Path
//     offset?: number;

//     // Bezier
//     curvature?: number;
// }

// export class EdgeViewWrapper implements FlowEdge {
//     private _rowView: IDbRowView<Edge>;
//     private _type: EdgeType;
//     private _pathOptions: PathOptions;

//     constructor(rowView: IDbRowView<Edge>, type: EdgeType, pathOptions?: PathOptions) {
//         this._rowView = rowView;
//         this._type = type;
//         this._pathOptions = pathOptions;
//     }

//     get id(): string {
//         return this._rowView.id.toString();
//     }
//     set id(newId: string) {
//         throw new Error(`Tried to set edge ID: ${newId}`);
//     }

//     get type(): string {
//         return this._type;
//     }
//     set type(type: string) {
//         throw new Error(`Tried to set edge type: ${type}`);
//     }

//     get pathOptions(): PathOptions {
//         return this._pathOptions;
//     }
//     set pathOptions(pathOptions: PathOptions) {
//         throw new Error(`Tried to set edge path options: ${pathOptions}`);
//     }

//     get source(): string {
//         return get(this._rowView).source.toString();
//     }
//     set source(source: string) {
//         const newRow: Edge = { ...get(this._rowView) };

//         // Update
//         db.updateRow(this._rowView.tableId, newRow).then(() => {
//             // Register undo/redo
//             undoManager.register(
//                 new Undoable(
//                     'graph edge update',
//                     async () => {
//                         await markRowsDeleted(selectedConversations, isRestore);
//                     },
//                     async () => {
//                         await markRowsDeleted(selectedConversations, !isRestore);
//                     },
//                 ),
//             );
//         });
//     }

//     // source: string;
//     // target: string;
//     // data: any;
// }
