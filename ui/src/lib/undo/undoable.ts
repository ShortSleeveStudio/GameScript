/**
 * Undoable action representation.
 *
 * An Undoable captures both the undo and redo operations for a single
 * user action, along with a description for display in the UI.
 */

/**
 * A function that performs an undo or redo operation.
 */
export type UndoAction = () => Promise<void>;

/**
 * Represents a single undoable action with both undo and redo capabilities.
 */
export class Undoable {
  private readonly _description: string;
  private readonly _undo: UndoAction;
  private readonly _redo: UndoAction;
  private readonly _timestamp: Date;

  /**
   * Create a new undoable action.
   *
   * @param description Human-readable description of the action (e.g., "Create node")
   * @param undo Function to reverse the action
   * @param redo Function to re-apply the action
   */
  constructor(description: string, undo: UndoAction, redo: UndoAction) {
    this._description = description;
    this._undo = undo;
    this._redo = redo;
    this._timestamp = new Date();
  }

  /** Human-readable description of the action */
  get description(): string {
    return this._description;
  }

  /** When the action was performed */
  get timestamp(): Date {
    return this._timestamp;
  }

  /** Execute the undo operation */
  async undo(): Promise<void> {
    await this._undo();
  }

  /** Execute the redo operation */
  async redo(): Promise<void> {
    await this._redo();
  }
}

/**
 * Helper to create an undoable from simple value changes.
 *
 * @example
 * ```ts
 * const undoable = createPropertyUndoable(
 *   'Update node position',
 *   () => updateNodePosition(nodeId, oldX, oldY),
 *   () => updateNodePosition(nodeId, newX, newY)
 * );
 * ```
 */
export function createUndoable(
  description: string,
  undoFn: UndoAction,
  redoFn: UndoAction
): Undoable {
  return new Undoable(description, undoFn, redoFn);
}

/**
 * Helper to create an undoable for a create operation.
 * Undo = delete, Redo = create again.
 *
 * @param description Action description
 * @param createFn Function that creates the entity and returns its ID
 * @param deleteFn Function that deletes the entity by ID
 * @param id The ID of the created entity (captured after creation)
 */
export function createCreateUndoable(
  description: string,
  deleteFn: (id: number) => Promise<void>,
  createFn: () => Promise<number>,
  id: number
): Undoable {
  let currentId = id;

  return new Undoable(
    description,
    // Undo: delete the created entity
    async () => {
      await deleteFn(currentId);
    },
    // Redo: recreate the entity
    async () => {
      currentId = await createFn();
    }
  );
}

/**
 * Helper to create an undoable for a delete operation.
 * Undo = restore, Redo = delete again.
 *
 * @param description Action description
 * @param restoreFn Function that restores the deleted entity
 * @param deleteFn Function that deletes the entity
 */
export function createDeleteUndoable(
  description: string,
  restoreFn: () => Promise<void>,
  deleteFn: () => Promise<void>
): Undoable {
  return new Undoable(
    description,
    // Undo: restore the deleted entity
    restoreFn,
    // Redo: delete again
    deleteFn
  );
}

/**
 * Helper to create an undoable for an update operation.
 * Undo = restore old value, Redo = apply new value.
 *
 * @param description Action description
 * @param applyOld Function that applies the old value
 * @param applyNew Function that applies the new value
 */
export function createUpdateUndoable(
  description: string,
  applyOld: () => Promise<void>,
  applyNew: () => Promise<void>
): Undoable {
  return new Undoable(description, applyOld, applyNew);
}
