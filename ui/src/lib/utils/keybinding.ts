/**
 * Keyboard utility functions.
 *
 * Provides helpers for detecting common keyboard shortcuts.
 */

export interface KeyComboOptions {
    /** Require Ctrl (Windows/Linux) or Cmd (Mac) */
    ctrl?: boolean;
    /** Require Shift */
    shift?: boolean;
    /** Require Alt (Windows/Linux) or Option (Mac) */
    alt?: boolean;
}

/**
 * Check if a specific key combination was pressed.
 *
 * @param e - The keyboard event
 * @param key - The key to check (case-insensitive)
 * @param opts - Optional modifier requirements
 *
 * @example
 * // Check for Ctrl+S / Cmd+S
 * isKeyCombo(e, 's', { ctrl: true })
 *
 * @example
 * // Check for Ctrl+Shift+Z
 * isKeyCombo(e, 'z', { ctrl: true, shift: true })
 *
 * @example
 * // Check for Enter (no modifiers)
 * isKeyCombo(e, 'Enter')
 */
export function isKeyCombo(e: KeyboardEvent, key: string, opts?: KeyComboOptions): boolean {
    const needsCtrl = opts?.ctrl ?? false;
    const needsShift = opts?.shift ?? false;
    const needsAlt = opts?.alt ?? false;

    const hasCtrl = e.metaKey || e.ctrlKey;
    const hasShift = e.shiftKey;
    const hasAlt = e.altKey;

    if (needsCtrl !== hasCtrl) return false;
    if (needsShift !== hasShift) return false;
    if (needsAlt !== hasAlt) return false;

    return e.key.toLowerCase() === key.toLowerCase();
}

/**
 * Check if the save shortcut was pressed (Ctrl+S / Cmd+S).
 */
export function wasSavePressed(e: KeyboardEvent): boolean {
    return isKeyCombo(e, 's', { ctrl: true });
}

/**
 * Check if the undo shortcut was pressed (Ctrl+Z / Cmd+Z).
 */
export function wasUndoPressed(e: KeyboardEvent): boolean {
    return isKeyCombo(e, 'z', { ctrl: true });
}

/**
 * Check if the redo shortcut was pressed (Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y).
 */
export function wasRedoPressed(e: KeyboardEvent): boolean {
    return isKeyCombo(e, 'z', { ctrl: true, shift: true }) || isKeyCombo(e, 'y', { ctrl: true });
}

/**
 * Check if Enter was pressed (without modifiers).
 */
export function wasEnterPressed(e: KeyboardEvent): boolean {
    return isKeyCombo(e, 'Enter');
}
