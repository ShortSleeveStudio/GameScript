import type { AgPromise, ICellEditorComp, ICellEditorParams } from '@ag-grid-community/core';
import { type Row } from '@common/common-schema';
import type { DatabaseTableType } from '@common/common-types';
import { db } from '@lib/api/db/db';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import { Undoable, undoManager } from '@lib/utility/undo-manager';
import { get } from 'svelte/store';
import type { GridContext } from './grid-context';

const NON_NUMBERS = /\D/g;
export class GridCellEditorInteger
    implements ICellEditorComp<IDbRowView<Row>, number, GridContext>
{
    protected _rowView: IDbRowView<Row>;
    protected _columnName: string;
    protected _element: HTMLInputElement;

    getValue(): undefined {
        // Skip non-integers
        if (!this.isInteger(this._element.value)) return undefined;
        const tableType: DatabaseTableType = this._rowView.tableType;
        const newRow = <Row>{ id: this._rowView.id };
        newRow[this._columnName] = parseInt(this._element.value);
        const oldRow = <Row>{ id: this._rowView.id };
        oldRow[this._columnName] = get(this._rowView)[this._columnName];

        db.updateRow(tableType, newRow).then(() => {
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
    init(params: ICellEditorParams<IDbRowView<Row>, number, GridContext>): void | AgPromise<void> {
        this._rowView = params.data;
        this._columnName = params.colDef.colId;
        this._element = document.createElement('input');
        this._element.type = 'text';
        this._element.className = 'grid-cell-editor-number';
        this._element.value = <string>get(this._rowView)[this._columnName] ?? '';
        this._element.oninput = this.onInput;
    }

    private onInput: (e: Event) => void = () => {
        this._element.value = this._element.value.replace(NON_NUMBERS, '');
    };

    protected isInteger(str: unknown): boolean {
        if (typeof str !== 'string') return false;
        return !isNaN(parseInt(str));
    }
}
