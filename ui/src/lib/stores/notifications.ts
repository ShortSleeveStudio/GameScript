/**
 * Notification functions for user feedback.
 *
 * In IDE contexts (VSCode/Rider), notifications route to native IDE APIs:
 * - Errors/warnings → Native popup notifications
 * - Info/success → Status bar messages
 *
 * The old in-app banner/toast UI has been removed in favor of native IDE
 * integration for a more consistent user experience.
 */

import { bridge } from '$lib/api';

// ============================================================================
// Notification Types
// ============================================================================

export const NOTIFICATION_KINDS = ['error', 'warning', 'info', 'success'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert an unknown value to a string for display.
 * If it's an Error, extracts the message; otherwise uses String().
 */
function toDetailString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value instanceof Error) return value.message;
  return String(value);
}

// ============================================================================
// Notification Functions
// ============================================================================

/**
 * Show an error notification.
 * In IDE: Native error popup that requires dismissal.
 * Also logs to console for debugging.
 */
export function notifyError(message: unknown, title?: string): void {
  const messageStr = toDetailString(message) ?? '';
  const fullMessage = title ? `${title}: ${messageStr}` : messageStr;
  console.error(fullMessage);
  bridge.notify('error', fullMessage);
}

/**
 * Show a warning notification.
 * In IDE: Native warning popup.
 * Also logs to console for debugging.
 */
export function notifyWarning(message: unknown, title?: string): void {
  const messageStr = toDetailString(message) ?? '';
  const fullMessage = title ? `${title}: ${messageStr}` : messageStr;
  console.warn(fullMessage);
  bridge.notify('warning', fullMessage);
}

/**
 * Show an info notification.
 * In IDE: Status bar message (less intrusive).
 */
export function notifyInfo(message: string, title?: string): void {
  const fullMessage = title ? `${title}: ${message}` : message;
  bridge.showStatus(fullMessage);
}

/**
 * Show a success notification.
 * In IDE: Status bar message (less intrusive).
 */
export function notifySuccess(message: string, title?: string): void {
  const fullMessage = title ? `${title}: ${message}` : message;
  bridge.showStatus(fullMessage);
}

// ============================================================================
// Toast Functions (Aliases for API compatibility)
// ============================================================================

/**
 * Show an error toast.
 * In IDE: Native error popup.
 * Also logs to console for debugging.
 * @param details - Optional details; if an Error, uses message; otherwise converts to string
 */
export function toastError(message: string, details?: unknown): void {
  const detailStr = toDetailString(details);
  console.error(detailStr ? `${message}: ${detailStr}` : message);
  bridge.notify('error', message, detailStr);
}

/**
 * Show a warning toast.
 * In IDE: Native warning popup.
 * Also logs to console for debugging.
 * @param details - Optional details; if an Error, uses message; otherwise converts to string
 */
export function toastWarning(message: string, details?: unknown): void {
  const detailStr = toDetailString(details);
  console.warn(detailStr ? `${message}: ${detailStr}` : message);
  bridge.notify('warning', message, detailStr);
}

/**
 * Show an info toast.
 * In IDE: Status bar message.
 */
export function toastInfo(message: string): void {
  bridge.showStatus(message);
}

/**
 * Show a success toast.
 * In IDE: Status bar message.
 */
export function toastSuccess(message: string): void {
  bridge.showStatus(message);
}
