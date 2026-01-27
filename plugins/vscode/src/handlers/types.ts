/**
 * Type definitions for message handlers.
 */

import type { OutgoingMessage, IncomingMessage } from '@gamescript/shared';
import type { DatabaseManager } from '../database.js';
import type * as vscode from 'vscode';

/**
 * Message type literal union extracted from OutgoingMessage.
 */
export type MessageType = OutgoingMessage['type'];

/**
 * Extract a specific message type from the OutgoingMessage union by its discriminant.
 */
export type ExtractMessage<T extends MessageType> = Extract<OutgoingMessage, { type: T }>;

/**
 * Handler function signature. Can be sync or async.
 */
export type MessageHandler<T extends OutgoingMessage = OutgoingMessage> =
  (message: T) => Promise<void> | void;

/**
 * Type-safe map of message type to handler function.
 * Each handler receives the specific message type for its key.
 */
export type TypedHandlerRecord = {
  [K in MessageType]?: MessageHandler<ExtractMessage<K>>;
};

/**
 * Loose handler record for runtime use.
 * Used by the mediator which stores handlers in a Map<string, handler>.
 */
export type HandlerRecord = Record<string, MessageHandler<OutgoingMessage>>;

/**
 * Function to send messages back to the webview.
 * Accepts typed IncomingMessage or generic Record for flexibility.
 */
export type PostMessageFn = (message: IncomingMessage | Record<string, unknown>) => void;

/**
 * Context provided to handlers for accessing shared dependencies.
 */
export interface HandlerContext {
  /** Send a message to the webview */
  postMessage: PostMessageFn;
  /** Database manager for DB operations */
  databaseManager: DatabaseManager;
  /** Extension URI for resolving paths */
  extensionUri: vscode.Uri;
  /** Get the first workspace folder (if any) */
  getWorkspaceFolder: () => vscode.WorkspaceFolder | undefined;
}
