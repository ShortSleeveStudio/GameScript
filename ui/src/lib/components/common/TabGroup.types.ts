/**
 * Tab item configuration.
 */
export interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Display label for the tab */
  label: string;
  /** Optional: whether the tab is disabled */
  disabled?: boolean;
}