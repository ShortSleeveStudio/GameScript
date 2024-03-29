import { type Row, type Table } from '@common/common-schema';
import { db } from '@lib/api/db/db';
import { Undoable, undoManager } from '@lib/utility/undo-manager';
import { get } from 'svelte/store';
import { GridCellEditorInteger } from './grid-cell-editor-integer';

export class GridCellEditorConversationId extends GridCellEditorInteger {
    getValue(): undefined {
        // Skip non-integers
        if (!this.isInteger(this._element.value)) return undefined;
        const tableType: Table = this._rowView.tableType;
        const newRow = <Row>{ id: this._rowView.id };
        newRow[this._columnName] = parseInt(this._element.value);
        const oldRow = <Row>{ id: this._rowView.id };
        oldRow[this._columnName] = get(this._rowView)[this._columnName];

        db.updateRow(tableType, newRow)
            .then(() => {
                undoManager.register(
                    new Undoable(
                        `${tableType.name.toLowerCase()} update`,
                        async () => {
                            try {
                                await db.updateRow(tableType, oldRow);
                            } catch (e) {
                                this.throwError(e);
                            }
                        },
                        async () => {
                            try {
                                await db.updateRow(tableType, newRow);
                            } catch (e) {
                                this.throwError(e);
                            }
                        },
                    ),
                );
            })
            .catch((e: Error) => {
                this.throwError(e);
            });

        // The update happens asynchronously
        return undefined;
    }

    private throwError: (e: Error) => void = (e: Error) => {
        console.log(e);
        if (e && 'message' in e && e.message.includes('constraint')) {
            throw new Error('Failed to update the conversation ID. Are you sure the ID is valid?');
        }
        throw e;
    };
}
