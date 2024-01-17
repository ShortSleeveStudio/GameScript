import { NotificationItem, notificationManager } from '@lib/stores/app/notifications';
import { dbConnected } from '@lib/stores/settings/settings';
import type { Readable } from 'svelte/motion';
import { get } from 'svelte/store';

/**
 * A function that runs during an undo event.
 */
export type UndoAction = () => Promise<void>;

/**
 * Represents a single undoable action.
 */
export class Undoable {
    private _commandString: string;
    private _redo: UndoAction;
    private _undo: UndoAction;

    constructor(commandString: string, undo: UndoAction, redo: UndoAction) {
        this._commandString = commandString;
        this._undo = undo;
        this._redo = redo;
    }

    get commandString() {
        return this._commandString;
    }

    async undo(): Promise<void> {
        await this._undo();
    }

    async redo(): Promise<void> {
        await this._redo();
    }
}

/**
 * Handles undo and redo functionality for the whole app.
 */
export class UndoManager {
    private _isBusyUndo: boolean;
    private _isBusyRedo: boolean;
    private _undoStack: Undoable[];
    private _redoStack: Undoable[];
    private _dbConnected: Readable<boolean>;

    constructor(isDbConnected: Readable<boolean>) {
        this._isBusyUndo = false;
        this._isBusyRedo = false;
        this._undoStack = [];
        this._redoStack = [];
        this._dbConnected = isDbConnected;
    }

    get isBusy() {
        return this._isBusyUndo || this._isBusyRedo;
    }

    get isBusyUndo() {
        return this._isBusyUndo;
    }

    get isBusyRedo() {
        return this._isBusyRedo;
    }

    async undo(): Promise<void> {
        if (!this.isReady()) return;
        this._isBusyUndo = true;
        const undoable: Undoable = <Undoable>this._undoStack.pop();
        if (undoable) {
            await undoable.undo();
            this._redoStack.push(undoable);
        }
        this._isBusyUndo = false;
    }

    async redo(): Promise<void> {
        if (!this.isReady()) return;
        this._isBusyRedo = true;
        const undoable: Undoable = <Undoable>this._redoStack.pop();
        if (undoable) {
            await undoable.redo();
            this._undoStack.push(undoable);
        }
        this._isBusyRedo = false;
    }

    register(undoable: Undoable) {
        this._undoStack.push(undoable);
        this._redoStack.length = 0;
    }

    private isReady(): boolean {
        if (this.isBusy) {
            this.notifyUndoRedoBusy();
            return false;
        }
        if (!get(this._dbConnected)) {
            this.notifyNotConnected();
            return false;
        }
        return true;
    }

    private notifyUndoRedoBusy(): void {
        const message: string = this.isBusyUndo
            ? 'Undo already in progress'
            : 'Redo already in progress';
        notificationManager.showNotification(new NotificationItem('info', '', message));
    }

    private notifyNotConnected(): void {
        notificationManager.showNotification(
            new NotificationItem('info', '', 'No database connection'),
        );
    }
}

/**Main Undo Manager instance */
export const undoManager: UndoManager = new UndoManager(dbConnected);
