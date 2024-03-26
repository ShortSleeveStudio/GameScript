import { LAYOUT_ID_SEARCH } from '@lib/constants/default-layout';
import { EVENT_DOCK_SELECTION_REQUEST, type DockSelectionRequest } from '@lib/constants/events';
import Mousetrap from 'mousetrap';
import { undoManager } from './undo-manager';

// Undo
Mousetrap.bind(['command+z', 'ctrl+z'], (e) => {
    e.preventDefault();
    void undoManager.undo();
});

// Redo
Mousetrap.bind(['command+shift+z', 'ctrl+shift+z'], (e) => {
    e.preventDefault();
    void undoManager.redo();
});

// Find
Mousetrap.bind(['command+f', 'ctrl+f'], (e) => {
    e.preventDefault();
    dispatchEvent(
        new CustomEvent(EVENT_DOCK_SELECTION_REQUEST, {
            detail: <DockSelectionRequest>{ layoutId: LAYOUT_ID_SEARCH },
        }),
    );
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
