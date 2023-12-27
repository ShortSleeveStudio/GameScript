import { NotificationItem, showNotification } from '@lib/stores/app/notifications';
import Mousetrap from 'mousetrap';
import { undoManager } from './undo-manager';

function notifyUndoRedoBusy(): void {
    const message: string = undoManager.isBusyUndo
        ? 'Undo already in progress'
        : 'Redo already in progress';
    showNotification(new NotificationItem('info', '', message));
}

// Undo
Mousetrap.bind(['command+z', 'ctrl+z'], () => {
    if (undoManager.isBusy) {
        notifyUndoRedoBusy();
        return;
    }
    undoManager.undo();
});

// Redo
Mousetrap.bind(['command+shift+z', 'ctrl+shift+z'], () => {
    if (undoManager.isBusy) {
        notifyUndoRedoBusy();
        return;
    }
    undoManager.redo();
});
