import Mousetrap from 'mousetrap';
import { undoManager } from './undo-manager';

// Undo
Mousetrap.bind(['command+z', 'ctrl+z'], (e) => {
    e.preventDefault();
    undoManager.undo();
});

// Redo
Mousetrap.bind(['command+shift+z', 'ctrl+shift+z'], (e) => {
    e.preventDefault();
    undoManager.redo();
});

// Helpers
export function wasSavePressed(e: KeyboardEvent): boolean {
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        return true;
    }
    return false;
}

export function wasEnterPressed(e: KeyboardEvent): boolean {
    return e.key === 'Enter';
}
