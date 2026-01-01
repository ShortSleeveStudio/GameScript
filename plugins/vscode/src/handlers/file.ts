/**
 * File handlers for reading and writing files.
 *
 * Handles 'file:read' and 'file:write' messages from the webview.
 * Used for CSV import/export operations.
 */

import * as fs from 'fs/promises';
import type { FileReadMessage, FileWriteMessage, FileCreateMessage, FileAppendMessage } from '@gamescript/shared';
import type { HandlerRecord, PostMessageFn } from './types.js';

/**
 * Extract a user-friendly error message from an unknown error.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Create handlers for file read/write messages.
 * @param postMessage Function to send messages back to the webview
 */
export function createFileHandlers(postMessage: PostMessageFn): HandlerRecord {
  return {
    'file:read': async (message) => {
      const { id, filePath } = message as FileReadMessage;

      try {
        const content = await fs.readFile(filePath, 'utf-8');

        postMessage({
          type: 'file:readResult',
          id,
          success: true,
          content,
        });
      } catch (error) {
        postMessage({
          type: 'file:readResult',
          id,
          success: false,
          error: getErrorMessage(error, 'Unknown error reading file'),
        });
      }
    },

    'file:write': async (message) => {
      const { id, filePath, content } = message as FileWriteMessage;

      try {
        await fs.writeFile(filePath, content, 'utf-8');

        postMessage({
          type: 'file:writeResult',
          id,
          success: true,
        });
      } catch (error) {
        postMessage({
          type: 'file:writeResult',
          id,
          success: false,
          error: getErrorMessage(error, 'Unknown error writing file'),
        });
      }
    },

    'file:create': async (message) => {
      const { id, filePath } = message as FileCreateMessage;

      try {
        // Use Node.js fs.writeFile to create/truncate file
        // Must use same API as file:append to avoid race conditions
        await fs.writeFile(filePath, '', 'utf-8');

        postMessage({
          type: 'file:createResult',
          id,
          success: true,
        });
      } catch (error) {
        postMessage({
          type: 'file:createResult',
          id,
          success: false,
          error: getErrorMessage(error, 'Unknown error creating file'),
        });
      }
    },

    'file:append': async (message) => {
      const { id, filePath, content } = message as FileAppendMessage;

      try {
        // Use Node.js fs.appendFile for efficient append without read-modify-write
        await fs.appendFile(filePath, content, 'utf-8');

        postMessage({
          type: 'file:appendResult',
          id,
          success: true,
        });
      } catch (error) {
        postMessage({
          type: 'file:appendResult',
          id,
          success: false,
          error: getErrorMessage(error, 'Unknown error appending to file'),
        });
      }
    },
  };
}
