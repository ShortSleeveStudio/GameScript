/**
 * File handlers for reading and writing files.
 *
 * Handles 'file:read' and 'file:write' messages from the webview.
 * Used for CSV import/export operations.
 *
 * Note: All file paths are resolved against the workspace root if they are relative.
 * This allows the webview to store portable relative paths (e.g., "./exports")
 * while the extension resolves them to absolute paths for file operations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import type {
  FileReadMessage,
  FileWriteMessage,
  FileCreateMessage,
  FileAppendMessage,
  FileMakeDirMessage,
  FileWriteBinaryMessage,
  FileRenameMessage,
  FileExistsMessage,
} from '@gamescript/shared';
import type { HandlerRecord, PostMessageFn } from './types.js';

/**
 * Extract a user-friendly error message from an unknown error.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Resolve a file path to an absolute path.
 * If the path is relative, it's resolved against the workspace root.
 * If no workspace is open, relative paths will fail.
 */
function resolveFilePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('Cannot resolve relative path: no workspace folder open');
  }

  return path.join(workspaceFolder.uri.fsPath, filePath);
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
        const resolvedPath = resolveFilePath(filePath);
        const content = await fs.readFile(resolvedPath, 'utf-8');

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
        const resolvedPath = resolveFilePath(filePath);
        await fs.writeFile(resolvedPath, content, 'utf-8');

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
        const resolvedPath = resolveFilePath(filePath);
        // Use Node.js fs.writeFile to create/truncate file
        // Must use same API as file:append to avoid race conditions
        await fs.writeFile(resolvedPath, '', 'utf-8');

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
        const resolvedPath = resolveFilePath(filePath);
        // Use Node.js fs.appendFile for efficient append without read-modify-write
        await fs.appendFile(resolvedPath, content, 'utf-8');

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

    'file:mkdir': async (message) => {
      const { id, dirPath } = message as FileMakeDirMessage;

      try {
        const resolvedPath = resolveFilePath(dirPath);
        await fs.mkdir(resolvedPath, { recursive: true });

        postMessage({
          type: 'file:mkdirResult',
          id,
          success: true,
        });
      } catch (error) {
        postMessage({
          type: 'file:mkdirResult',
          id,
          success: false,
          error: getErrorMessage(error, 'Unknown error creating directory'),
        });
      }
    },

    'file:writeBinary': async (message) => {
      const { id, filePath, contentBase64 } = message as FileWriteBinaryMessage;

      try {
        const resolvedPath = resolveFilePath(filePath);
        const buffer = Buffer.from(contentBase64, 'base64');
        await fs.writeFile(resolvedPath, buffer);

        postMessage({
          type: 'file:writeBinaryResult',
          id,
          success: true,
        });
      } catch (error) {
        postMessage({
          type: 'file:writeBinaryResult',
          id,
          success: false,
          error: getErrorMessage(error, 'Unknown error writing binary file'),
        });
      }
    },

    'file:rename': async (message) => {
      const { id, oldPath, newPath } = message as FileRenameMessage;

      try {
        const resolvedOldPath = resolveFilePath(oldPath);
        const resolvedNewPath = resolveFilePath(newPath);
        await fs.rename(resolvedOldPath, resolvedNewPath);

        postMessage({
          type: 'file:renameResult',
          id,
          success: true,
        });
      } catch (error) {
        postMessage({
          type: 'file:renameResult',
          id,
          success: false,
          error: getErrorMessage(error, 'Unknown error renaming file'),
        });
      }
    },

    'file:exists': async (message) => {
      const { id, filePath } = message as FileExistsMessage;

      try {
        const resolvedPath = resolveFilePath(filePath);
        await fs.access(resolvedPath);
        postMessage({
          type: 'file:existsResult',
          id,
          success: true,
          exists: true,
        });
      } catch {
        // File doesn't exist is not an error - it's a valid result
        postMessage({
          type: 'file:existsResult',
          id,
          success: true,
          exists: false,
        });
      }
    },
  };
}
