// import type { AgPromise, IHeaderComp, IHeaderParams } from '@ag-grid-community/core';
// import type { Conversation, Filter } from '@lib/api/db/db-schema';
// import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
// import type { Unsubscriber } from 'svelte/store';
// import type { FinderContext } from './finder-context';

// /**Reactive header renderer for the finder */
// export class FinderHeaderRenderer implements IHeaderComp {
//     private _text: Text;
//     private _element: HTMLElement;
//     private _rowUnsubscriber: Unsubscriber;

//     refresh(params: IHeaderParams<Conversation, FinderContext>): boolean {
//         this.attemptSubscription(params);
//         return true;
//     }
//     getGui(): HTMLElement {
//         return this._element;
//     }
//     destroy(): void {
//         if (this._rowUnsubscriber) this._rowUnsubscriber();
//     }
//     init(params: IHeaderParams<Conversation, FinderContext>): void | AgPromise<void> {
//         this._text = document.createTextNode('');
//         this._element = document.createElement('div');
//         this._element.appendChild(this._text);
//         this.attemptSubscription(params);
//     }

//     private attemptSubscription(params: IHeaderParams<Conversation, FinderContext>): void {
//         if (this._rowUnsubscriber) this._rowUnsubscriber();
//         if ('filterRowView' in params) {
//             this._rowUnsubscriber = (<IDbRowView<Filter>>params['filterRowView']).subscribe(
//                 this.onDataChanged,
//             );
//         }
//     }

//     private onDataChanged: (row: Filter) => void = (row: Filter) => {
//         const newText: Text = document.createTextNode(row.name);
//         this._element.replaceChild(newText, this._text);
//         this._text = newText;
//     };
// }
