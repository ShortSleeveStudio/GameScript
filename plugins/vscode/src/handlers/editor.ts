/**
 * Editor handlers for file open/create operations.
 *
 * Handles 'editor:openFile' and 'editor:createFile' messages from the webview.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { EditorOpenFileMessage, EditorCreateFileMessage } from '@gamescript/shared';
import type { HandlerRecord } from './types.js';

/** Extract error message from unknown error type */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Create handlers for editor messages.
 */
export function createEditorHandlers(): HandlerRecord {
  return {
    'editor:openFile': async (message) => {
      const { filePath, lineNumber } = message as EditorOpenFileMessage;
      const uri = vscode.Uri.file(filePath);

      try {
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);

        // Navigate to line (default to first line)
        const targetLine = (lineNumber && lineNumber > 0) ? lineNumber : 1;
        const position = new vscode.Position(targetLine - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to open file '${filePath}': ${getErrorMessage(error)}`);
      }
    },

    'editor:createFile': async (message) => {
      const { filePath, content } = message as EditorCreateFileMessage;
      const uri = vscode.Uri.file(filePath);

      try {
        // Check if file already exists
        let fileExists = false;
        try {
          await vscode.workspace.fs.stat(uri);
          fileExists = true;
        } catch {
          // File doesn't exist, safe to create
        }

        if (fileExists) {
          const overwrite = await vscode.window.showWarningMessage(
            `File '${path.basename(filePath)}' already exists. Overwrite?`,
            { modal: true },
            'Overwrite'
          );
          if (overwrite !== 'Overwrite') {
            return;
          }
        }

        // Create directory if it doesn't exist
        const dir = path.dirname(filePath);
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));

        // Write file
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(uri, encoder.encode(content));

        // Open the file
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to create file '${filePath}': ${getErrorMessage(error)}`);
      }
    },
  };
}
