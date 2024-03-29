import type { AgPromise, ICellEditorComp, ICellEditorParams } from '@ag-grid-community/core';
import { type Row } from '@common/common-schema';
import type { Table } from '@common/common-types';
import { db } from '@lib/api/db/db';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import { Undoable, undoManager } from '@lib/utility/undo-manager';
import { get } from 'svelte/store';
import type { GridContext } from './grid-context';

export class GridCellEditorText implements ICellEditorComp<IDbRowView<Row>, string, GridContext> {
    private _rowView: IDbRowView<Row>;
    private _columnName: string;
    private _element: HTMLInputElement;

    getValue(): undefined {
        const tableType: Table = this._rowView.tableType;
        const newRow = <Row>{ id: this._rowView.id };
        newRow[this._columnName] = this._element.value;
        const oldRow = <Row>{ id: this._rowView.id };
        oldRow[this._columnName] = get(this._rowView)[this._columnName];

        db.updateRow(tableType, newRow)
            .then(() => {
                undoManager.register(
                    new Undoable(
                        `${tableType.name.toLowerCase()} update`,
                        async () => {
                            await db.updateRow(tableType, oldRow);
                        },
                        async () => {
                            await db.updateRow(tableType, newRow);
                        },
                    ),
                );
            })
            .catch((onRejected: unknown) => {
                throw new Error(onRejected?.toString());
            });

        // The update happens asynchronously
        return undefined;
    }
    afterGuiAttached(): void {
        this._element.focus();
    }
    isPopup(): boolean {
        return false;
    }
    getGui(): HTMLElement {
        return this._element;
    }
    destroy(): void {
        if (this._element) this._element.remove();
        if (this._rowView) this._rowView = undefined;
    }
    init(params: ICellEditorParams<IDbRowView<Row>, string, GridContext>): void | AgPromise<void> {
        this._rowView = params.data;
        this._columnName = params.colDef.colId;
        this._element = document.createElement('input');
        this._element.type = 'text';
        this._element.className = 'grid-cell-editor-text';
        this._element.value = <string>get(this._rowView)[this._columnName] ?? '';
    }
}
