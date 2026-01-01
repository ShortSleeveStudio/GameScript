/**
 * Undo Manager - handles undo/redo functionality across the application.
 *
 * The UndoManager maintains two stacks:
 * - Undo stack: Actions that can be undone (most recent at top)
 * - Redo stack: Actions that have been undone and can be redone
 *
 * When a new action is registered, the redo stack is cleared.
 *
 * ## Multiplayer Resilience
 *
 * In a multiplayer environment, an undo/redo operation may fail because
 * another user has modified or deleted the affected data. When this happens:
 * - The failed action is removed from the stack (it's no longer valid)
 * - The user is notified that the action couldn't be completed
 * - The user can try the next undo/redo action
 *
 * This "fail gracefully and skip" approach matches how collaborative tools
 * like Google Docs handle undo for structural changes.
 */

import { writable, derived, get, type Writable, type Readable } from 'svelte/store';
import { Undoable } from './undoable.js';
import { dbConnected } from '$lib/stores/connection.js';
import { notifyInfo, notifyWarning } from '$lib/stores/notifications.js';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if an error indicates a conflict (data modified by another user).
 *
 * We specifically look for:
 * - Row not found (deleted by another user)
 * - Foreign key constraint violations (referenced row was deleted)
 * - Explicit conflict markers
 *
 * We intentionally do NOT catch general constraint violations (like NOT NULL
 * or CHECK constraints) as those indicate logic errors, not multiplayer conflicts.
 */
function isConflictError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();

  // Row was deleted or doesn't exist
  if (msg.includes('not found') ||
      msg.includes('no rows') ||
      msg.includes('does not exist')) {
    return true;
  }

  // Foreign key constraint = referenced row was deleted by another user
  // Note: We specifically check for "foreign key" to avoid catching
  // other constraint types (NOT NULL, CHECK, UNIQUE) which are logic errors
  if (msg.includes('foreign key')) {
    return true;
  }

  // Explicit conflict markers from our own error messages
  if (msg.includes('conflict') ||
      msg.includes('modified by another') ||
      msg.includes('deleted by another')) {
    return true;
  }

  return false;
}

// ============================================================================
// Types
// ============================================================================

export interface UndoState {
  undoStack: Undoable[];
  redoStack: Undoable[];
  isBusy: boolean;
  busyOperation: 'undo' | 'redo' | null;
}

// ============================================================================
// State
// ============================================================================

const MAX_UNDO_STACK_SIZE = 100;

const state: Writable<UndoState> = writable({
  undoStack: [],
  redoStack: [],
  isBusy: false,
  busyOperation: null,
});

// ============================================================================
// Derived Stores
// ============================================================================

/** Whether an undo operation is available */
export const canUndo: Readable<boolean> = derived(
  [state, dbConnected],
  ([$state, $connected]) => $connected && !$state.isBusy && $state.undoStack.length > 0
);

/** Whether a redo operation is available */
export const canRedo: Readable<boolean> = derived(
  [state, dbConnected],
  ([$state, $connected]) => $connected && !$state.isBusy && $state.redoStack.length > 0
);

/** Number of actions that can be undone */
export const undoCount: Readable<number> = derived(state, ($state) => $state.undoStack.length);

/** Number of actions that can be redone */
export const redoCount: Readable<number> = derived(state, ($state) => $state.redoStack.length);

/** Whether an undo/redo operation is in progress */
export const isUndoing: Readable<boolean> = derived(
  state,
  ($state) => $state.busyOperation === 'undo'
);

export const isRedoing: Readable<boolean> = derived(
  state,
  ($state) => $state.busyOperation === 'redo'
);

export const isBusy: Readable<boolean> = derived(state, ($state) => $state.isBusy);

/** Description of the next undo action */
export const nextUndoDescription: Readable<string | null> = derived(state, ($state) => {
  const top = $state.undoStack[$state.undoStack.length - 1];
  return top?.description ?? null;
});

/** Description of the next redo action */
export const nextRedoDescription: Readable<string | null> = derived(state, ($state) => {
  const top = $state.redoStack[$state.redoStack.length - 1];
  return top?.description ?? null;
});

// ============================================================================
// Actions
// ============================================================================

/**
 * Register a new undoable action.
 * This clears the redo stack and adds the action to the undo stack.
 */
export function registerUndoable(undoable: Undoable): void {
  state.update((s) => {
    // Clear redo stack when new action is registered
    const newUndoStack = [...s.undoStack, undoable];

    // Limit stack size
    if (newUndoStack.length > MAX_UNDO_STACK_SIZE) {
      newUndoStack.shift();
    }

    return {
      ...s,
      undoStack: newUndoStack,
      redoStack: [],
    };
  });
}

/**
 * Undo the most recent action.
 *
 * If the undo fails (e.g., due to concurrent modification by another user),
 * the action is removed from the stack and the user is notified.
 */
export async function undo(): Promise<boolean> {
  const currentState = get(state);

  // Check preconditions
  if (!get(dbConnected)) {
    notifyWarning('Cannot undo: No database connection');
    return false;
  }

  if (currentState.isBusy) {
    notifyInfo(
      currentState.busyOperation === 'undo'
        ? 'Undo already in progress'
        : 'Redo already in progress'
    );
    return false;
  }

  if (currentState.undoStack.length === 0) {
    notifyInfo('Nothing to undo');
    return false;
  }

  // Get the action to undo
  const undoable = currentState.undoStack[currentState.undoStack.length - 1];

  // Mark as busy
  state.update((s) => ({ ...s, isBusy: true, busyOperation: 'undo' }));

  try {
    await undoable.undo();

    // Success: Move from undo stack to redo stack
    state.update((s) => ({
      ...s,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, undoable],
      isBusy: false,
      busyOperation: null,
    }));

    return true;
  } catch (error) {
    // Failed: Remove the invalid action from undo stack (don't move to redo)
    // This handles cases where another user modified/deleted the data
    state.update((s) => ({
      ...s,
      undoStack: s.undoStack.slice(0, -1),
      isBusy: false,
      busyOperation: null,
    }));

    const message = error instanceof Error ? error.message : 'Unknown error';
    if (isConflictError(error)) {
      notifyInfo(`Cannot undo "${undoable.description}" - data was modified by another user`);
    } else {
      notifyWarning('Undo failed', message);
    }

    return false;
  }
}

/**
 * Redo the most recently undone action.
 *
 * If the redo fails (e.g., due to concurrent modification by another user),
 * the action is removed from the stack and the user is notified.
 */
export async function redo(): Promise<boolean> {
  const currentState = get(state);

  // Check preconditions
  if (!get(dbConnected)) {
    notifyWarning('Cannot redo: No database connection');
    return false;
  }

  if (currentState.isBusy) {
    notifyInfo(
      currentState.busyOperation === 'undo'
        ? 'Undo already in progress'
        : 'Redo already in progress'
    );
    return false;
  }

  if (currentState.redoStack.length === 0) {
    notifyInfo('Nothing to redo');
    return false;
  }

  // Get the action to redo
  const undoable = currentState.redoStack[currentState.redoStack.length - 1];

  // Mark as busy
  state.update((s) => ({ ...s, isBusy: true, busyOperation: 'redo' }));

  try {
    await undoable.redo();

    // Success: Move from redo stack to undo stack
    state.update((s) => ({
      ...s,
      undoStack: [...s.undoStack, undoable],
      redoStack: s.redoStack.slice(0, -1),
      isBusy: false,
      busyOperation: null,
    }));

    return true;
  } catch (error) {
    // Failed: Remove the invalid action from redo stack (don't move to undo)
    // This handles cases where another user modified/deleted the data
    state.update((s) => ({
      ...s,
      redoStack: s.redoStack.slice(0, -1),
      isBusy: false,
      busyOperation: null,
    }));

    const message = error instanceof Error ? error.message : 'Unknown error';
    if (isConflictError(error)) {
      notifyInfo(`Cannot redo "${undoable.description}" - data was modified by another user`);
    } else {
      notifyWarning('Redo failed', message);
    }

    return false;
  }
}

/**
 * Clear all undo/redo history.
 * Call this when switching conversations or databases.
 */
export function clearHistory(): void {
  state.set({
    undoStack: [],
    redoStack: [],
    isBusy: false,
    busyOperation: null,
  });
}

/**
 * Get the current undo history (for debugging or UI display).
 */
export function getUndoHistory(): Undoable[] {
  return get(state).undoStack.slice().reverse(); // Most recent first
}

/**
 * Get the current redo history (for debugging or UI display).
 */
export function getRedoHistory(): Undoable[] {
  return get(state).redoStack.slice().reverse(); // Most recent first
}
