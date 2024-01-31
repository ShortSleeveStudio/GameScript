import type { AgPromise, ICellRendererComp, ICellRendererParams } from '@ag-grid-community/core';
import type { Conversation } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { Unsubscriber } from 'svelte/store';
import type { GridContext } from './grid-context';

/**Reactive cell renderer for the finder */
export class GridCellRenderer implements ICellRendererComp {
    private _text: Text;
    private _element: HTMLElement;
    private _columnName: string;
    private _rowUnsubscriber: Unsubscriber;

    refresh(params: ICellRendererParams<IDbRowView<Conversation>, string, GridContext>): boolean {
        this.attemptSubscription(params);
        return true;
    }
    getGui(): HTMLElement {
        return this._element;
    }
    destroy(): void {
        if (this._rowUnsubscriber) this._rowUnsubscriber();
        if (this._element) this._element.remove();
    }
    init(
        params: ICellRendererParams<IDbRowView<Conversation>, string, GridContext>,
    ): void | AgPromise<void> {
        this._columnName = params.colDef.colId;
        this._text = document.createTextNode('');
        this._element = document.createElement('div');
        this._element.appendChild(this._text);
        this.attemptSubscription(params);
    }

    private attemptSubscription(
        params: ICellRendererParams<IDbRowView<Conversation>, string, GridContext>,
    ): void {
        if (this._rowUnsubscriber) this._rowUnsubscriber();
        if (params.data) {
            this._rowUnsubscriber = params.data.subscribe(this.onDataChanged);
        }
    }

    private onDataChanged: (row: Conversation) => void = (row: Conversation) => {
        // TODO do we want to support other column types?
        const newString: string = <string>row[this._columnName] ?? '';
        const newText: Text = document.createTextNode(newString);
        this._element.replaceChild(newText, this._text);
        this._text = newText;
    };
}
