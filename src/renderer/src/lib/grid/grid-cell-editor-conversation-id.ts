import { db } from '@lib/api/db/db';
import { DATABASE_TABLE_NAMES, type Row } from '@lib/api/db/db-schema';
import { Undoable, undoManager } from '@lib/utility/undo-manager';
import { get } from 'svelte/store';
import { GridCellEditorInteger } from './grid-cell-editor-integer';

export class GridCellEditorConversationId extends GridCellEditorInteger {
    getValue(): undefined {
        // Skip non-integers
        if (!this.isInteger(this._element.value)) return undefined;
        const tableId: number = this._rowView.tableId;
        const newRow = <Row>{ id: this._rowView.id };
        newRow[this._columnName] = parseInt(this._element.value);
        const oldRow = <Row>{ id: this._rowView.id };
        oldRow[this._columnName] = get(this._rowView)[this._columnName];

        db.updateRow(tableId, newRow)
            .then(() => {
                undoManager.register(
                    new Undoable(
                        `${DATABASE_TABLE_NAMES[tableId].toLowerCase()} update`,
                        async () => {
                            try {
                                await db.updateRow(tableId, oldRow);
                            } catch (e) {
                                this.throwError(e);
                            }
                        },
                        async () => {
                            try {
                                await db.updateRow(tableId, newRow);
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
