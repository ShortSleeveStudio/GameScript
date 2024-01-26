import type { AgPromise, ICellEditorComp, ICellEditorParams } from '@ag-grid-community/core';
import { db } from '@lib/api/db/db';
import type { Row } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import { get } from 'svelte/store';
import type { FinderContext } from './finder-context';

export class GridCellEditorText implements ICellEditorComp<IDbRowView<Row>, string, FinderContext> {
    private _rowView: IDbRowView<Row>;
    private _columnName: string;
    private _element: HTMLInputElement;

    getValue(): undefined {
        const row = <Row>{ id: this._rowView.id };
        row[this._columnName] = this._element.value;
        db.updateRow(this._rowView.tableId, row); // not awaiting, but will still run
        // The update happens asynchronously
        return undefined;
    }
    afterGuiAttached(): void {
        this._element.focus();
    }
    isPopup(): boolean {
        return false;
    }
    // getPopupPosition?(): 'over' | 'under' {
    //     throw new Error('Method not implemented.');
    // }
    // isCancelBeforeStart?(): boolean {
    //     throw new Error('Method not implemented.');
    // }
    // isCancelAfterEnd?(): boolean {
    //     return true;
    // }
    // focusIn?(): void {
    //     throw new Error('Method not implemented.');
    // }
    // focusOut?(): void {
    //     throw new Error('Method not implemented.');
    // }
    // refresh?(params: ICellEditorParams<IDbRowView<RowType>, string, FinderContext>): void {
    //     throw new Error('Method not implemented.');
    // }
    getGui(): HTMLElement {
        return this._element;
    }
    destroy(): void {
        if (this._element) this._element.remove();
        if (this._rowView) this._rowView = undefined;
    }
    init(
        params: ICellEditorParams<IDbRowView<Row>, string, FinderContext>,
    ): void | AgPromise<void> {
        this._rowView = params.data;
        this._columnName = params.colDef.colId;
        this._element = document.createElement('input');
        this._element.type = 'text';
        this._element.className = 'grid-cell-editor-text';
        this._element.value = <string>get(this._rowView)[this._columnName] ?? '';
    }
}
