/**
 * Code operation handlers.
 *
 * Handles code-related messages from the webview:
 * - Get method body from conversation file
 * - Create method stub
 * - Delete method with confirmation
 * - Open method in editor
 * - Watch folder for code file changes
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type {
  CodeGetMethodMessage,
  CodeCreateMethodMessage,
  CodeDeleteMethodMessage,
  CodeDeleteMethodsSilentMessage,
  CodeRestoreMethodMessage,
  CodeDeleteFileMessage,
  CodeRestoreFileMessage,
  CodeOpenMethodMessage,
  CodeWatchFolderMessage,
} from '@gamescript/shared';
import type { HandlerRecord, PostMessageFn } from '../types.js';
import { getConversationFilePath } from './workspace-security.js';

/**
 * Code message handlers class.
 */
export class CodeHandlers {
  /** Cached code output folder path (set via code:watchFolder) */
  private _codeOutputFolder: string | null = null;

  /** Callback to set up file watcher in panel */
  private readonly _onWatchFolder: (folderPath: string | null) => void;

  constructor(
    private readonly _postMessage: PostMessageFn,
    private readonly _extensionUri: vscode.Uri,
    onWatchFolder: (folderPath: string | null) => void
  ) {
    this._onWatchFolder = onWatchFolder;
  }

  /**
   * Get all code message handlers.
   */
  getHandlers(): HandlerRecord {
    return {
      'code:getMethod': (msg) => this._handleCodeGetMethod(msg as CodeGetMethodMessage),
      'code:createMethod': (msg) => this._handleCodeCreateMethod(msg as CodeCreateMethodMessage),
      'code:deleteMethod': (msg) => this._handleCodeDeleteMethod(msg as CodeDeleteMethodMessage),
      'code:deleteMethodsSilent': (msg) => this._handleCodeDeleteMethodsSilent(msg as CodeDeleteMethodsSilentMessage),
      'code:restoreMethod': (msg) => this._handleCodeRestoreMethod(msg as CodeRestoreMethodMessage),
      'code:deleteFile': (msg) => this._handleCodeDeleteFile(msg as CodeDeleteFileMessage),
      'code:restoreFile': (msg) => this._handleCodeRestoreFile(msg as CodeRestoreFileMessage),
      'code:openMethod': (msg) => this._handleCodeOpenMethod(msg as CodeOpenMethodMessage),
      'code:watchFolder': (msg) => this._handleCodeWatchFolder(msg as CodeWatchFolderMessage),
    };
  }

  // ==========================================================================
  // Watch Folder
  // ==========================================================================

  /**
   * Set up file watcher for code files and cache the folder path.
   */
  private _handleCodeWatchFolder(message: CodeWatchFolderMessage): void {
    const { folderPath } = message;

    // Cache the folder path for use by other handlers
    this._codeOutputFolder = folderPath;

    // Notify panel to set up file watcher
    this._onWatchFolder(folderPath);
  }

  // ==========================================================================
  // Get Method
  // ==========================================================================

  /**
   * Get method body using VSCode's document symbol provider.
   */
  private async _handleCodeGetMethod(message: CodeGetMethodMessage): Promise<void> {
    const { id, conversationId, methodName } = message;

    try {
      const filePath = getConversationFilePath(conversationId, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      // Check if file exists
      try {
        await vscode.workspace.fs.stat(uri);
      } catch {
        this._postMessage({
          type: 'code:methodResult',
          id,
          success: false,
          error: 'Code file not found. Enable a condition or action to create it.',
        });
        return;
      }

      // Open document and get symbols with retry
      // The language server may not be ready immediately after file creation
      const document = await vscode.workspace.openTextDocument(uri);
      let symbols: vscode.DocumentSymbol[] | undefined;
      const maxRetries = 3;
      const retryDelayMs = 500;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
          'vscode.executeDocumentSymbolProvider',
          uri
        );

        if (symbols && Array.isArray(symbols) && symbols.length > 0) {
          break;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }

      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        this._postMessage({
          type: 'code:methodResult',
          id,
          success: false,
          error: 'Code preview unavailable - language server loading. Try again in a moment.',
        });
        return;
      }

      // Find the method by name (search recursively in case it's nested in a class)
      const method = this._findSymbolByName(symbols, methodName);

      if (!method) {
        this._postMessage({
          type: 'code:methodResult',
          id,
          success: false,
          error: `Method '${methodName}' not found`,
        });
        return;
      }

      // Return the full method text (signature + body).
      // We don't attempt to extract just the body because regex-based extraction
      // is unreliable with nested braces, lambdas, and string literals.
      const methodText = document.getText(method.range);

      this._postMessage({
        type: 'code:methodResult',
        id,
        success: true,
        body: methodText,
        filePath,
        lineNumber: method.range.start.line + 1,
      });
    } catch (error) {
      this._postMessage({
        type: 'code:methodResult',
        id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==========================================================================
  // Create Method
  // ==========================================================================

  /**
   * Create a method stub and open it in the IDE.
   */
  private async _handleCodeCreateMethod(message: CodeCreateMethodMessage): Promise<void> {
    const { id, conversationId, methodName, methodType } = message;

    try {
      const filePath = getConversationFilePath(conversationId, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      let existingContent = '';
      let fileExists = false;

      // Check if file exists and read content
      try {
        const fileData = await vscode.workspace.fs.readFile(uri);
        existingContent = new TextDecoder().decode(fileData);
        fileExists = true;
      } catch {
        // File doesn't exist, will create new
      }

      // Generate the method stub
      const stub = this._generateMethodStub(methodName, methodType, conversationId);

      let newContent: string;
      if (fileExists) {
        // Insert method before the closing brace of the class.
        // ASSUMPTION: Conversation files contain exactly one static class.
        // The file structure is: comments/usings, namespace (optional), single class.
        // We insert before the last '}' which should be the class closing brace.
        const classEndMatch = existingContent.lastIndexOf('}');
        if (classEndMatch !== -1) {
          newContent =
            existingContent.slice(0, classEndMatch) +
            '\n' +
            stub +
            '\n' +
            existingContent.slice(classEndMatch);
        } else {
          newContent = existingContent + '\n' + stub;
        }
      } else {
        // Create new file with class wrapper
        newContent = this._generateConversationFile(conversationId, stub);
      }

      // Create directory if needed
      const dir = path.dirname(filePath);
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));

      // Write file
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(newContent));

      // Open the file and navigate to the method
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      // Find the method position
      const methodIndex = newContent.indexOf(methodName);
      if (methodIndex !== -1) {
        const position = document.positionAt(methodIndex);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
      }

      this._postMessage({
        type: 'code:createResult',
        id,
        success: true,
      });
    } catch (error) {
      this._postMessage({
        type: 'code:createResult',
        id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==========================================================================
  // Delete Method
  // ==========================================================================

  /**
   * Delete a method with diff preview.
   */
  private async _handleCodeDeleteMethod(message: CodeDeleteMethodMessage): Promise<void> {
    const { id, conversationId, methodName } = message;

    try {
      const filePath = getConversationFilePath(conversationId, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      // Read existing content
      let existingContent: string;
      try {
        const fileData = await vscode.workspace.fs.readFile(uri);
        existingContent = new TextDecoder().decode(fileData);
      } catch {
        this._postMessage({
          type: 'code:deleteResult',
          id,
          accepted: false,
          error: 'File not found',
        });
        return;
      }

      // Open document and get symbols to find method range
      const document = await vscode.workspace.openTextDocument(uri);
      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        uri
      );

      if (!symbols || !Array.isArray(symbols)) {
        this._postMessage({
          type: 'code:deleteResult',
          id,
          accepted: false,
          error: 'Could not parse symbols',
        });
        return;
      }

      const method = this._findSymbolByName(symbols, methodName);
      if (!method) {
        // Method not found, nothing to delete
        this._postMessage({
          type: 'code:deleteResult',
          id,
          accepted: true,
        });
        return;
      }

      // Expand range to include attribute on line above
      let startLine = method.range.start.line;
      if (startLine > 0) {
        const prevLine = document.lineAt(startLine - 1).text;
        if (prevLine.includes('[Node')) {
          startLine--;
        }
      }

      // Create new content without the method
      const rangeToDelete = new vscode.Range(
        new vscode.Position(startLine, 0),
        new vscode.Position(method.range.end.line + 1, 0)
      );
      const newContent =
        existingContent.slice(0, document.offsetAt(rangeToDelete.start)) +
        existingContent.slice(document.offsetAt(rangeToDelete.end));

      // Show diff and ask for confirmation
      const deletedText = document.getText(rangeToDelete);
      const confirmed = await vscode.window.showWarningMessage(
        `Delete method '${methodName}'?\n\nThis will remove:\n${deletedText.slice(0, 200)}${deletedText.length > 200 ? '...' : ''}`,
        { modal: true },
        'Delete'
      );

      if (confirmed === 'Delete') {
        // Write the new content
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(uri, encoder.encode(newContent));

        this._postMessage({
          type: 'code:deleteResult',
          id,
          accepted: true,
        });
      } else {
        this._postMessage({
          type: 'code:deleteResult',
          id,
          accepted: false,
        });
      }
    } catch (error) {
      this._postMessage({
        type: 'code:deleteResult',
        id,
        accepted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==========================================================================
  // Delete Methods Silent (for programmatic deletion during node delete)
  // ==========================================================================

  /**
   * Delete multiple methods without confirmation, returning the deleted code for each.
   * All methods are deleted in a single file operation to avoid stale symbol issues.
   */
  private async _handleCodeDeleteMethodsSilent(message: CodeDeleteMethodsSilentMessage): Promise<void> {
    const { id, conversationId, methodNames } = message;

    try {
      if (methodNames.length === 0) {
        this._postMessage({
          type: 'code:deleteMethodsSilentResult',
          id,
          success: true,
          deletedMethods: {},
        });
        return;
      }

      const filePath = getConversationFilePath(conversationId, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      // Read existing content
      let existingContent: string;
      try {
        const fileData = await vscode.workspace.fs.readFile(uri);
        existingContent = new TextDecoder().decode(fileData);
      } catch {
        // File doesn't exist - nothing to delete
        this._postMessage({
          type: 'code:deleteMethodsSilentResult',
          id,
          success: true,
          deletedMethods: {},
        });
        return;
      }

      // Open document and get symbols to find method ranges
      const document = await vscode.workspace.openTextDocument(uri);
      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        uri
      );

      if (!symbols || !Array.isArray(symbols)) {
        // Can't parse symbols - return empty
        this._postMessage({
          type: 'code:deleteMethodsSilentResult',
          id,
          success: true,
          deletedMethods: {},
        });
        return;
      }

      // Find all methods and their ranges
      const deletedMethods: Record<string, string> = {};
      const rangesToDelete: Array<{ start: number; end: number }> = [];

      for (const methodName of methodNames) {
        const method = this._findSymbolByName(symbols, methodName);
        if (!method) {
          // Method not found - record empty string
          deletedMethods[methodName] = '';
          continue;
        }

        // Expand range to include attribute on line above
        let startLine = method.range.start.line;
        if (startLine > 0) {
          const prevLine = document.lineAt(startLine - 1).text;
          if (prevLine.includes('[Node')) {
            startLine--;
          }
        }

        const rangeToDelete = new vscode.Range(
          new vscode.Position(startLine, 0),
          new vscode.Position(method.range.end.line + 1, 0)
        );

        // Capture the code being deleted
        deletedMethods[methodName] = document.getText(rangeToDelete);

        // Store the byte offsets for deletion
        rangesToDelete.push({
          start: document.offsetAt(rangeToDelete.start),
          end: document.offsetAt(rangeToDelete.end),
        });
      }

      // Sort ranges in reverse order so we can delete from end to start
      // (this keeps earlier offsets valid as we delete)
      rangesToDelete.sort((a, b) => b.start - a.start);

      // Remove all ranges from content
      let newContent = existingContent;
      for (const range of rangesToDelete) {
        newContent = newContent.slice(0, range.start) + newContent.slice(range.end);
      }

      // Write the new content once
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(newContent));

      this._postMessage({
        type: 'code:deleteMethodsSilentResult',
        id,
        success: true,
        deletedMethods,
      });
    } catch (error) {
      this._postMessage({
        type: 'code:deleteMethodsSilentResult',
        id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==========================================================================
  // Restore Method (for undo after node delete)
  // ==========================================================================

  /**
   * Restore a previously deleted method.
   */
  private async _handleCodeRestoreMethod(message: CodeRestoreMethodMessage): Promise<void> {
    const { id, conversationId, code } = message;

    try {
      if (!code) {
        // Nothing to restore
        this._postMessage({
          type: 'code:restoreMethodResult',
          id,
          success: true,
        });
        return;
      }

      const filePath = getConversationFilePath(conversationId, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      let existingContent = '';
      let fileExists = false;

      try {
        const fileData = await vscode.workspace.fs.readFile(uri);
        existingContent = new TextDecoder().decode(fileData);
        fileExists = true;
      } catch {
        // File doesn't exist
      }

      let newContent: string;
      if (fileExists) {
        // Insert method before the closing brace of the class
        const classEndMatch = existingContent.lastIndexOf('}');
        if (classEndMatch !== -1) {
          newContent =
            existingContent.slice(0, classEndMatch) +
            code +
            existingContent.slice(classEndMatch);
        } else {
          newContent = existingContent + '\n' + code;
        }
      } else {
        // Create new file - wrap in conversation class
        // Extract just the method body (the code includes the attribute)
        newContent = this._generateConversationFile(conversationId, code.trim());
      }

      // Create directory if needed
      const dir = path.dirname(filePath);
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));

      // Write file
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(newContent));

      this._postMessage({
        type: 'code:restoreMethodResult',
        id,
        success: true,
      });
    } catch (error) {
      this._postMessage({
        type: 'code:restoreMethodResult',
        id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==========================================================================
  // Delete File (for conversation permanent delete)
  // ==========================================================================

  /**
   * Delete an entire conversation code file, returning the content for undo.
   */
  private async _handleCodeDeleteFile(message: CodeDeleteFileMessage): Promise<void> {
    const { id, conversationId } = message;

    try {
      const filePath = getConversationFilePath(conversationId, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      // Read existing content
      let deletedContent = '';
      try {
        const fileData = await vscode.workspace.fs.readFile(uri);
        deletedContent = new TextDecoder().decode(fileData);
      } catch {
        // File doesn't exist - nothing to delete
        this._postMessage({
          type: 'code:deleteFileResult',
          id,
          success: true,
          deletedContent: '',
        });
        return;
      }

      // Delete the file
      await vscode.workspace.fs.delete(uri);

      this._postMessage({
        type: 'code:deleteFileResult',
        id,
        success: true,
        deletedContent,
      });
    } catch (error) {
      this._postMessage({
        type: 'code:deleteFileResult',
        id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==========================================================================
  // Restore File (for undo after conversation permanent delete)
  // ==========================================================================

  /**
   * Restore an entire conversation code file.
   */
  private async _handleCodeRestoreFile(message: CodeRestoreFileMessage): Promise<void> {
    const { id, conversationId, content } = message;

    try {
      if (!content) {
        // Nothing to restore
        this._postMessage({
          type: 'code:restoreFileResult',
          id,
          success: true,
        });
        return;
      }

      const filePath = getConversationFilePath(conversationId, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      // Create directory if needed
      const dir = path.dirname(filePath);
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));

      // Write file
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(content));

      this._postMessage({
        type: 'code:restoreFileResult',
        id,
        success: true,
      });
    } catch (error) {
      this._postMessage({
        type: 'code:restoreFileResult',
        id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==========================================================================
  // Open Method
  // ==========================================================================

  /**
   * Open a method in the IDE using Go to Symbol.
   * Note: This is a fire-and-forget operation - no response is sent to webview.
   */
  private async _handleCodeOpenMethod(message: CodeOpenMethodMessage): Promise<void> {
    const { conversationId, methodName } = message;

    try {
      const filePath = getConversationFilePath(conversationId, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      // Open document
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      // Get symbols and find method
      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        uri
      );

      if (!symbols || !Array.isArray(symbols)) {
        console.warn(`[CodeHandlers] Could not parse symbols for ${filePath} when opening method ${methodName}`);
        return;
      }

      const method = this._findSymbolByName(symbols, methodName);
      if (method) {
        const position = method.range.start;
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(method.range, vscode.TextEditorRevealType.InCenter);
      } else {
        console.warn(`[CodeHandlers] Method ${methodName} not found in ${filePath}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CodeHandlers] Failed to open method '${methodName}':`, error);
      vscode.window.showErrorMessage(`Failed to open method '${methodName}': ${errorMsg}`);
    }
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Recursively find a symbol by name.
   */
  private _findSymbolByName(
    symbols: vscode.DocumentSymbol[],
    name: string
  ): vscode.DocumentSymbol | null {
    for (const symbol of symbols) {
      if (symbol.name === name) {
        return symbol;
      }
      if (symbol.children && symbol.children.length > 0) {
        const found = this._findSymbolByName(symbol.children, name);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Generate a method stub for a condition or action.
   */
  private _generateMethodStub(
    methodName: string,
    methodType: 'condition' | 'action',
    conversationId: number
  ): string {
    const attributeName = methodType === 'condition' ? 'NodeCondition' : 'NodeAction';
    const nodeId = methodName.replace(/^Node_(\d+)_(Condition|Action)$/, '$1');

    if (methodType === 'condition') {
      return `    [${attributeName}(${conversationId}, ${nodeId})]
    public static bool ${methodName}(IDialogueContext ctx)
    {
        // TODO: Implement condition
        return true;
    }`;
    } else {
      return `    [${attributeName}(${conversationId}, ${nodeId})]
    public static async Awaitable ${methodName}(IDialogueContext ctx)
    {
        // TODO: Implement action
    }`;
    }
  }

  /**
   * Generate a new conversation code file.
   */
  private _generateConversationFile(conversationId: number, initialMethod: string): string {
    return `// Auto-generated by GameScript
// Conversation ID: ${conversationId}

using GameScript;
using UnityEngine;

public static class Conversation_${conversationId}
{
${initialMethod}
}
`;
  }
}
