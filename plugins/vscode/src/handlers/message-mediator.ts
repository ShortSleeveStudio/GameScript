/**
 * Message mediator for routing webview messages to handlers.
 *
 * This is the central dispatcher that replaces the giant switch statement.
 * Handlers are registered by message type and invoked when messages arrive.
 */

import type { OutgoingMessage } from '@gamescript/shared';
import type { HandlerRecord, MessageHandler } from './types.js';

export interface MessageMediatorOptions {
  /** If true, silently ignore messages with no registered handler (default: false) */
  silentNoHandler?: boolean;
}

export class MessageMediator {
  private readonly _handlers = new Map<string, MessageHandler<OutgoingMessage>>();
  private readonly _silentNoHandler: boolean;

  constructor(options?: MessageMediatorOptions) {
    this._silentNoHandler = options?.silentNoHandler ?? false;
  }

  /**
   * Register a single handler for a message type.
   */
  register(type: string, handler: MessageHandler<OutgoingMessage>): void {
    if (this._handlers.has(type)) {
      console.warn(`[MessageMediator] Handler for '${type}' already registered, overwriting`);
    }
    this._handlers.set(type, handler);
  }

  /**
   * Register multiple handlers at once.
   * @param handlers Record of message type to handler function
   */
  registerMany(handlers: HandlerRecord): void {
    for (const [type, handler] of Object.entries(handlers)) {
      this.register(type, handler);
    }
  }

  /**
   * Dispatch a message to its registered handler.
   * Behavior for unhandled messages depends on silentNoHandler option.
   */
  async handle(message: OutgoingMessage): Promise<void> {
    const handler = this._handlers.get(message.type);
    if (handler) {
      try {
        await handler(message);
      } catch (error) {
        console.error(`[MessageMediator] Handler for '${message.type}' threw:`, error);
        throw error;
      }
    } else if (!this._silentNoHandler) {
      console.warn('[MessageMediator] No handler for message type:', message.type);
    }
  }

  /**
   * Dispatch multiple messages in sequence.
   * Stops on first error.
   */
  async handleMany(messages: OutgoingMessage[]): Promise<void> {
    for (const message of messages) {
      await this.handle(message);
    }
  }

  /**
   * Dispatch multiple messages concurrently.
   * All messages are dispatched; errors are collected and thrown as AggregateError.
   */
  async handleManyConcurrent(messages: OutgoingMessage[]): Promise<void> {
    const results = await Promise.allSettled(messages.map(m => this.handle(m)));
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason);

    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} message handler(s) failed`);
    }
  }

  /**
   * Check if a handler is registered for a message type.
   */
  hasHandler(type: string): boolean {
    return this._handlers.has(type);
  }

  /**
   * Get all registered message types (useful for debugging).
   */
  getRegisteredTypes(): string[] {
    return Array.from(this._handlers.keys());
  }
}
