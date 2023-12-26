/**
 * A function that runs during an undo event.
 */
export type UndoAction = () => void;

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

    undo(): void {
        this._undo();
    }

    redo(): void {
        this._redo();
    }
}

/**
 * Handles undo and redo functionality for the whole app.
 */
export class UndoManager {
    private _undoStack: Undoable[];
    private _redoStack: Undoable[];

    constructor() {
        this._undoStack = [];
        this._redoStack = [];
    }

    undo(): void {
        const undoable: Undoable = <Undoable>this._undoStack.pop();
        if (undoable) {
            undoable.undo();
            this._redoStack.push(undoable);
        }
    }

    redo(): void {
        const undoable: Undoable = <Undoable>this._redoStack.pop();
        if (undoable) {
            undoable.redo();
            this._undoStack.push(undoable);
        }
    }

    register(undoable: Undoable) {
        this._undoStack.push(undoable);
        this._redoStack.length = 0;
    }
}

/**Main Undo Manager instance */
export const undoManager: UndoManager = new UndoManager();
