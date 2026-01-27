/**
 * Notification handlers for showing messages to the user.
 *
 * Handles 'notify', 'status', and 'openExternal' messages from the webview.
 */

import * as vscode from 'vscode';
import type { NotifyMessage, StatusMessage, OpenExternalMessage } from '@gamescript/shared';
import type { HandlerRecord } from './types.js';

const DEFAULT_STATUS_TIMEOUT_MS = 3000;

/**
 * Create handlers for notification messages.
 */
export function createNotificationHandlers(): HandlerRecord {
  return {
    'notify': (message) => {
      const { level, message: msg, detail } = message as NotifyMessage;
      const fullMessage = detail ? `${msg}\n\n${detail}` : msg;

      // TypeScript enforces level is 'info' | 'warning' | 'error'
      switch (level) {
        case 'error':
          vscode.window.showErrorMessage(fullMessage);
          break;
        case 'warning':
          vscode.window.showWarningMessage(fullMessage);
          break;
        case 'info':
          vscode.window.showInformationMessage(fullMessage);
          break;
      }
    },

    'status': (message) => {
      const { message: msg, timeoutMs } = message as StatusMessage;
      vscode.window.setStatusBarMessage(msg, timeoutMs ?? DEFAULT_STATUS_TIMEOUT_MS);
    },

    'openExternal': (message) => {
      const { url } = message as OpenExternalMessage;
      vscode.env.openExternal(vscode.Uri.parse(url));
    },
  };
}
