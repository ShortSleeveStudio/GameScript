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
import {
  isIndentationBased,
  type CodeGetMethodMessage,
  type CodeCreateMethodMessage,
  type CodeDeleteMethodMessage,
  type CodeDeleteMethodsSilentMessage,
  type CodeRestoreMethodMessage,
  type CodeDeleteFileMessage,
  type CodeRestoreFileMessage,
  type CodeOpenMethodMessage,
  type CodeWatchFolderMessage,
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
  private readonly _onWatchFolder: (folderPath: string | null, fileExtension: string) => void;

  constructor(
    private readonly _postMessage: PostMessageFn,
    onWatchFolder: (folderPath: string | null, fileExtension: string) => void
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
    const { folderPath, fileExtension = '.cs' } = message;

    // Cache the folder path for use by other handlers
    this._codeOutputFolder = folderPath;

    // Notify panel to set up file watcher
    this._onWatchFolder(folderPath, fileExtension);
  }

  // ==========================================================================
  // Get Method
  // ==========================================================================

  /**
   * Get method body using VSCode's document symbol provider.
   */
  private async _handleCodeGetMethod(message: CodeGetMethodMessage): Promise<void> {
    const { id, conversationId, methodName, fileExtension } = message;

    try {
      const filePath = getConversationFilePath(conversationId, fileExtension, this._codeOutputFolder ?? undefined);
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

      // symbol.range includes attributes (per C# language server behavior)
      // body and fullText are the same since range already includes attributes
      const methodText = document.getText(method.range);

      this._postMessage({
        type: 'code:methodResult',
        id,
        success: true,
        body: methodText,
        fullText: methodText,
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
   * The UI generates the code; this handler just writes it.
   */
  private async _handleCodeCreateMethod(message: CodeCreateMethodMessage): Promise<void> {
    const { id, conversationId, fileExtension, template, methodStub, fileContent } = message;

    try {
      const filePath = getConversationFilePath(conversationId, fileExtension, this._codeOutputFolder ?? undefined);
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

      let newContent: string;
      if (fileExists) {
        // Language-specific insertion strategy:
        // - Indentation-based (GDScript): Append to end of file (no class wrapper)
        // - Brace-based (C#, C++): Insert before the last '}' (class closing brace)
        if (isIndentationBased(template)) {
          // Indentation-based: simply append with proper newline separation
          const trimmed = existingContent.trimEnd();
          newContent = trimmed + '\n\n' + methodStub + '\n';
        } else {
          // Brace-based languages: Insert method before the closing brace of the class/struct.
          // ASSUMPTION: Conversation files contain exactly one static class/struct.
          // The file structure is: comments/usings/includes, namespace (optional), single class/struct.
          // We insert before the last '}' which should be the class/struct closing brace.
          const classEndMatch = existingContent.lastIndexOf('}');
          if (classEndMatch !== -1) {
            newContent =
              existingContent.slice(0, classEndMatch) +
              '\n' +
              methodStub +
              '\n' +
              existingContent.slice(classEndMatch);
          } else {
            newContent = existingContent + '\n' + methodStub;
          }
        }
      } else {
        // Use the pre-generated file content
        newContent = fileContent;
      }

      // Create directory if needed
      const dir = path.dirname(filePath);
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));

      // Write file
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(newContent));

      // Open the file and navigate to the method
      // Use ViewColumn.Beside to open next to the GameScript panel
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);

      // Find the method position - search for the stub content since method names differ by language
      const methodIndex = newContent.indexOf(methodStub);
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
    const { id, conversationId, methodName, fileExtension } = message;

    try {
      const filePath = getConversationFilePath(conversationId, fileExtension, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      // Open document (use buffer as source of truth, not disk)
      let document: vscode.TextDocument;
      try {
        document = await vscode.workspace.openTextDocument(uri);
      } catch {
        this._postMessage({
          type: 'code:deleteResult',
          id,
          accepted: false,
          error: 'File not found',
        });
        return;
      }

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

      // symbol.range includes attributes (per C# language server behavior)
      const deletedText = document.getText(method.range);

      // Show confirmation dialog
      const confirmed = await vscode.window.showWarningMessage(
        `Delete method '${methodName}'?\n\nThis will remove:\n${deletedText.slice(0, 200)}${deletedText.length > 200 ? '...' : ''}`,
        { modal: true },
        'Delete'
      );

      if (confirmed === 'Delete') {
        // Create range to delete (from start of first line to start of line after method)
        const startLine = method.range.start.line;
        const endLine = method.range.end.line;
        const lastLine = document.lineCount - 1;

        const rangeToDelete = endLine < lastLine
          ? new vscode.Range(startLine, 0, endLine + 1, 0)
          : new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);

        // Use WorkspaceEdit for atomic deletion with proper undo/redo
        const edit = new vscode.WorkspaceEdit();
        edit.delete(uri, rangeToDelete);
        await vscode.workspace.applyEdit(edit);
        await document.save();

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
   * Uses VSCode's Document Symbol Provider for accurate method detection.
   * Optimized: sorts methods bottom-to-top and applies all deletions atomically via WorkspaceEdit.
   */
  private async _handleCodeDeleteMethodsSilent(message: CodeDeleteMethodsSilentMessage): Promise<void> {
    const { id, conversationId, methodNames, fileExtension } = message;

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

      const filePath = getConversationFilePath(conversationId, fileExtension, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      // Check if file exists
      try {
        await vscode.workspace.fs.stat(uri);
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

      // Open document (use buffer as source of truth, not disk)
      const document = await vscode.workspace.openTextDocument(uri);
      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        uri
      );

      if (!symbols || !Array.isArray(symbols)) {
        // Can't parse symbols - return empty for all
        const deletedMethods: Record<string, string> = {};
        for (const name of methodNames) {
          deletedMethods[name] = '';
        }
        this._postMessage({
          type: 'code:deleteMethodsSilentResult',
          id,
          success: true,
          deletedMethods,
        });
        return;
      }

      // Map names to symbols and filter nulls
      const targets = methodNames
        .map(name => ({ name, symbol: this._findSymbolByName(symbols, name) }))
        .filter((item): item is { name: string; symbol: vscode.DocumentSymbol } => item.symbol !== null);

      // Sort DESCENDING by start line (bottom to top)
      // This keeps line numbers valid as we build the edit
      targets.sort((a, b) => b.symbol.range.start.line - a.symbol.range.start.line);

      const deletedMethods: Record<string, string> = {};
      const edit = new vscode.WorkspaceEdit();

      // Mark methods not found as empty
      for (const name of methodNames) {
        if (!targets.some(t => t.name === name)) {
          deletedMethods[name] = '';
        }
      }

      // Build atomic edit for all deletions
      for (const { name, symbol } of targets) {
        // symbol.range includes attributes (per C# language server behavior)
        deletedMethods[name] = document.getText(symbol.range);

        // Calculate deletion range: from start of first line to start of next line (if exists)
        const startLine = symbol.range.start.line;
        const endLine = symbol.range.end.line;
        const lastLine = document.lineCount - 1;

        const deleteRange = endLine < lastLine
          ? new vscode.Range(startLine, 0, endLine + 1, 0)
          : new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);

        edit.delete(uri, deleteRange);
      }

      // Apply all deletions atomically (handles undo/redo and buffer sync)
      await vscode.workspace.applyEdit(edit);
      await document.save();

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
   * Uses WorkspaceEdit for atomic insertion that integrates with VSCode's undo/redo.
   */
  private async _handleCodeRestoreMethod(message: CodeRestoreMethodMessage): Promise<void> {
    const { id, conversationId, code, fileExtension, template, fileContent } = message;

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

      const filePath = getConversationFilePath(conversationId, fileExtension, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      // Check if file exists
      let fileExists = false;
      try {
        await vscode.workspace.fs.stat(uri);
        fileExists = true;
      } catch {
        // File doesn't exist
      }

      if (fileExists) {
        // Use document buffer as source of truth (not disk)
        const document = await vscode.workspace.openTextDocument(uri);
        const text = document.getText();

        // Language-specific insertion strategy:
        // - Indentation-based (GDScript): Append to end of file (no class wrapper)
        // - Brace-based (C#, C++): Insert before the last '}' (class closing brace)
        let insertPosition: vscode.Position;
        let codeToInsert: string;

        if (isIndentationBased(template)) {
          // Indentation-based: append to end of file with proper newline separation
          const trimmed = text.trimEnd();
          insertPosition = document.positionAt(trimmed.length);
          codeToInsert = '\n\n' + code + '\n';
        } else {
          // Brace-based languages: Find the closing brace of the class/struct
          const classEndIndex = text.lastIndexOf('}');
          if (classEndIndex === -1) {
            this._postMessage({
              type: 'code:restoreMethodResult',
              id,
              success: false,
              error: 'Could not find class closing brace',
            });
            return;
          }

          // Calculate insertion position (before the closing brace)
          insertPosition = document.positionAt(classEndIndex);

          // Ensure proper newline separation:
          // - Add newline before code if the line before } isn't empty
          // - Add newline after code to separate from }
          const lineBeforeBrace = insertPosition.line > 0
            ? document.lineAt(insertPosition.line - 1).text
            : '';
          const needsLeadingNewline = lineBeforeBrace.trim() !== '';
          codeToInsert = (needsLeadingNewline ? '\n' : '') + code + '\n';
        }

        // Use WorkspaceEdit for atomic insertion (integrates with undo/redo)
        const edit = new vscode.WorkspaceEdit();
        edit.insert(uri, insertPosition, codeToInsert);
        await vscode.workspace.applyEdit(edit);
        await document.save();
      } else {
        // File doesn't exist - create it with the pre-generated content
        const dir = path.dirname(filePath);
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));

        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(uri, encoder.encode(fileContent));
      }

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
    const { id, conversationId, fileExtension } = message;

    try {
      const filePath = getConversationFilePath(conversationId, fileExtension, this._codeOutputFolder ?? undefined);
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
    const { id, conversationId, content, fileExtension } = message;

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

      const filePath = getConversationFilePath(conversationId, fileExtension, this._codeOutputFolder ?? undefined);
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
    const { conversationId, methodName, fileExtension } = message;

    try {
      const filePath = getConversationFilePath(conversationId, fileExtension, this._codeOutputFolder ?? undefined);
      const uri = vscode.Uri.file(filePath);

      // Open document in ViewColumn.Beside to open next to the GameScript panel
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);

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
   * Handles both DocumentSymbol[] (modern) and guards against SymbolInformation[] (legacy).
   */
  private _findSymbolByName(
    symbols: vscode.DocumentSymbol[],
    name: string
  ): vscode.DocumentSymbol | null {
    for (const symbol of symbols) {
      if (symbol.name === name) {
        return symbol;
      }
      // Guard against legacy SymbolInformation format (no 'children' property)
      if ('children' in symbol && symbol.children && symbol.children.length > 0) {
        const found = this._findSymbolByName(symbol.children, name);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

}
