import Mousetrap from 'mousetrap';
import { undoManager } from './undo-manager';

// Undo
Mousetrap.bind(['command+z', 'ctrl+z'], () => {
    undoManager.undo();
});

// Redo
Mousetrap.bind(['command+shift+z', 'ctrl+shift+z'], () => {
    undoManager.redo();
});
