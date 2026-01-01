/**
 * Dialog handlers for file open/save dialogs.
 *
 * Handles dialog messages from the webview:
 * - 'dialog:openSqlite' / 'dialog:saveSqlite' - SQLite database files
 * - 'dialog:openCsv' / 'dialog:saveCsv' - CSV files for import/export
 * - 'dialog:selectFolder' - Folder selection dialog
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { DialogOpenSqliteMessage, DialogSaveSqliteMessage, DialogOpenCsvMessage, DialogSaveCsvMessage, DialogSelectFolderMessage } from '@gamescript/shared';
import type { HandlerRecord, PostMessageFn } from './types.js';

/** Supported SQLite file extensions */
const SQLITE_EXTENSIONS = ['db', 'sqlite', 'sqlite3'];

/** CSV file extension */
const CSV_EXTENSIONS = ['csv'];

/**
 * Create handlers for dialog messages.
 * @param postMessage Function to send messages back to the webview
 */
export function createDialogHandlers(postMessage: PostMessageFn): HandlerRecord {
  /** Helper to send dialog result */
  function postResult(id: string, cancelled: boolean, filePath?: string): void {
    postMessage({ type: 'dialog:result', id, cancelled, filePath });
  }

  return {
    'dialog:openSqlite': async (message) => {
      const { id } = message as DialogOpenSqliteMessage;

      const result = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'SQLite Database': SQLITE_EXTENSIONS,
          'All Files': ['*'],
        },
        title: 'Open SQLite Database',
      });

      if (result && result.length > 0) {
        postResult(id, false, result[0].fsPath);
      } else {
        postResult(id, true);
      }
    },

    'dialog:saveSqlite': async (message) => {
      const { id } = message as DialogSaveSqliteMessage;

      const result = await vscode.window.showSaveDialog({
        filters: {
          'SQLite Database': SQLITE_EXTENSIONS,
        },
        title: 'Create New SQLite Database',
      });

      if (result) {
        // Ensure file has a valid SQLite extension
        let filePath = result.fsPath;
        const hasValidExtension = SQLITE_EXTENSIONS.some(ext =>
          filePath.toLowerCase().endsWith(`.${ext}`)
        );
        if (!hasValidExtension) {
          filePath += '.db';
        }
        postResult(id, false, filePath);
      } else {
        postResult(id, true);
      }
    },

    'dialog:openCsv': async (message) => {
      const { id } = message as DialogOpenCsvMessage;

      const result = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'CSV Files': CSV_EXTENSIONS,
          'All Files': ['*'],
        },
        title: 'Import Localizations from CSV',
      });

      if (result && result.length > 0) {
        postResult(id, false, result[0].fsPath);
      } else {
        postResult(id, true);
      }
    },

    'dialog:saveCsv': async (message) => {
      const { id, defaultFilename } = message as DialogSaveCsvMessage;

      const result = await vscode.window.showSaveDialog({
        filters: {
          'CSV Files': CSV_EXTENSIONS,
        },
        title: 'Export Localizations to CSV',
        defaultUri: defaultFilename ? vscode.Uri.file(defaultFilename) : undefined,
      });

      if (result) {
        // Ensure file has .csv extension
        let filePath = result.fsPath;
        if (!filePath.toLowerCase().endsWith('.csv')) {
          filePath += '.csv';
        }
        postResult(id, false, filePath);
      } else {
        postResult(id, true);
      }
    },

    'dialog:selectFolder': async (message) => {
      const { id, title } = message as DialogSelectFolderMessage;

      // Get workspace folder for computing relative paths
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

      const result = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Folder',
        title: title || 'Select Folder',
        // Default to workspace folder if available
        defaultUri: workspaceFolder?.uri,
      });

      if (result && result.length > 0) {
        const absolutePath = result[0].fsPath;

        // Convert to relative path if within workspace
        if (workspaceFolder) {
          const workspaceRoot = workspaceFolder.uri.fsPath;
          const relativePath = path.relative(workspaceRoot, absolutePath);

          // Check if path is within workspace (doesn't start with ..)
          if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
            // Use '.' if the user selected the workspace root itself (relative path is empty)
            const finalPath = relativePath === '' ? '.' : relativePath;
            postResult(id, false, finalPath);
            return;
          }
        }

        // Path is outside workspace - show error and return cancelled
        vscode.window.showErrorMessage('Selected folder must be within the workspace.');
        postResult(id, true);
      } else {
        postResult(id, true);
      }
    },
  };
}
