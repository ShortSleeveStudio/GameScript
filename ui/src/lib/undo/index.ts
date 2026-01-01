/**
 * Undo/Redo system for GameScript UI.
 *
 * @example
 * ```ts
 * import { registerUndoable, undo, redo, canUndo, canRedo } from '$lib/undo';
 * import { Undoable } from '$lib/undo';
 *
 * // Register an undoable action
 * registerUndoable(new Undoable(
 *   'Update node position',
 *   async () => await updateNodePosition(nodeId, oldX, oldY),
 *   async () => await updateNodePosition(nodeId, newX, newY)
 * ));
 *
 * // Use keyboard shortcuts
 * if ($canUndo) await undo();
 * if ($canRedo) await redo();
 * ```
 */

// Undoable class and helpers
export {
  Undoable,
  createUndoable,
  createCreateUndoable,
  createDeleteUndoable,
  createUpdateUndoable,
  type UndoAction,
} from './undoable.js';

// Undo manager
export {
  // Actions
  registerUndoable,
  undo,
  redo,
  clearHistory,
  getUndoHistory,
  getRedoHistory,
  // Stores
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  isUndoing,
  isRedoing,
  isBusy,
  nextUndoDescription,
  nextRedoDescription,
  // Types
  type UndoState,
} from './manager.js';
