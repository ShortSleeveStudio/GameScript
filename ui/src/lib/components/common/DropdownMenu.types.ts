/**
 * Menu item configuration.
 */
export interface MenuItem {
  /** Unique identifier for the item */
  id: string;
  /** Display label */
  label: string;
  /** Whether this is a danger/destructive action */
  danger?: boolean;
  /** Whether the item is disabled */
  disabled?: boolean;
}