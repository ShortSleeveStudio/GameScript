/**
 * Action menu item types.
 */

/** Base interface for all menu items */
interface ActionMenuItemBase {
  /** Unique identifier for the item */
  id: string;
  /** Display label */
  label: string;
  /** Whether the item is disabled */
  disabled?: boolean;
}

/** Button-style menu item - triggers an action when clicked */
export interface ActionMenuItemButton extends ActionMenuItemBase {
  type: 'button';
  /** Whether this is a danger/destructive action */
  danger?: boolean;
}

/** Toggle-style menu item - shows a checkmark when active */
export interface ActionMenuItemToggle extends ActionMenuItemBase {
  type: 'toggle';
  /** Whether the toggle is currently active/checked */
  checked: boolean;
}

/** Separator between menu items */
export interface ActionMenuItemSeparator {
  type: 'separator';
}

/** Union type for all menu item types */
export type ActionMenuItem = ActionMenuItemButton | ActionMenuItemToggle | ActionMenuItemSeparator;