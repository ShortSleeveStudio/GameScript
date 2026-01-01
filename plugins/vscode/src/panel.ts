/**
 * GameScript main editor panel.
 *
 * A thin coordinator that delegates message handling to specialized handlers.
 * Uses the mediator pattern to route incoming messages.
 */

import * as vscode from 'vscode';
import type { OutgoingMessage, IncomingMessage } from '@gamescript/shared' with { 'resolution-mode': 'import' };
import { DatabaseManager } from './database.js';
import { MessageMediator } from './handlers/message-mediator.js';
import { DbHandlers } from './handlers/db/index.js';
import { CodeHandlers } from './handlers/code/index.js';
import { createDialogHandlers } from './handlers/dialog.js';
import { createFileHandlers } from './handlers/file.js';
import { createNotificationHandlers } from './handlers/notification.js';
import { createEditorHandlers } from './handlers/editor.js';
import { WebviewHtmlBuilder } from './webview/html-builder.js';
import type { PostMessageFn } from './handlers/types.js';

// Constants
const CONVERSATION_FILE_PATTERN = 'conv_*.cs';
const CONVERSATION_FILE_REGEX = /conv_(\d+)\.cs$/;

/**
 * GameScript main editor panel.
 *
 * A single webview panel containing a split layout:
 * - Left: Golden Layout with dockable panels (Graph, Conversations, etc.)
 * - Right: Fixed Inspector with connection bar
 */
export class GameScriptPanel {
  // The single main panel instance
  private static _instance: GameScriptPanel | undefined;

  /**
   * Get the current panel instance.
   */
  public static get currentPanel(): GameScriptPanel | undefined {
    return GameScriptPanel._instance;
  }

  /**
   * Send a message to the main panel.
   */
  public static sendToPanel(message: IncomingMessage): void {
    if (GameScriptPanel._instance) {
      GameScriptPanel._instance._panel.webview.postMessage(message);
    }
  }

  /**
   * Check if the main panel is currently open.
   */
  public static isOpen(): boolean {
    return GameScriptPanel._instance !== undefined;
  }

  public static readonly viewType = 'gamescript.editor';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _databaseManager: DatabaseManager;
  private readonly _mediator: MessageMediator;
  private readonly _htmlBuilder: WebviewHtmlBuilder;
  private _disposables: vscode.Disposable[] = [];
  private _changeUnsubscribe: (() => void) | undefined;
  private _errorUnsubscribe: (() => void) | undefined;
  private _hasCodeFileWatcher = false;

  /**
   * Create or show the main GameScript editor panel.
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    databaseManager: DatabaseManager
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have the panel, show it
    if (GameScriptPanel._instance) {
      GameScriptPanel._instance._panel.reveal(column);
      return;
    }

    // Create a new panel
    const panel = vscode.window.createWebviewPanel(
      GameScriptPanel.viewType,
      'GameScript',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'ui')],
      }
    );

    GameScriptPanel._instance = new GameScriptPanel(
      panel,
      extensionUri,
      databaseManager
    );
  }

  /**
   * Close the main panel.
   */
  public static close(): void {
    if (GameScriptPanel._instance) {
      GameScriptPanel._instance._panel.dispose();
    }
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    databaseManager: DatabaseManager
  ) {
    this._panel = panel;
    this._databaseManager = databaseManager;
    this._htmlBuilder = new WebviewHtmlBuilder(extensionUri);
    this._mediator = new MessageMediator();

    // Create postMessage helper
    const postMessage: PostMessageFn = (msg) => {
      this._panel.webview.postMessage(msg);
    };

    // Create and register handlers
    const dbHandlers = new DbHandlers(
      databaseManager,
      postMessage,
      () => this._sendThemeState()
    );
    const codeHandlers = new CodeHandlers(
      postMessage,
      extensionUri,
      (folderPath) => this.setupCodeFileWatcher(folderPath)
    );

    this._mediator.registerMany(dbHandlers.getHandlers());
    this._mediator.registerMany(codeHandlers.getHandlers());
    this._mediator.registerMany(createDialogHandlers(postMessage));
    this._mediator.registerMany(createFileHandlers(postMessage));
    this._mediator.registerMany(createNotificationHandlers());
    this._mediator.registerMany(createEditorHandlers());

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Track panel focus for keybindings context
    this._panel.onDidChangeViewState(
      (e) => {
        if (e.webviewPanel.active) {
          vscode.commands.executeCommand('setContext', 'gamescriptPanelFocused', true).then(undefined, (err) => {
            console.error('[Panel] Failed to set gamescriptPanelFocused context:', err);
          });
        } else {
          vscode.commands.executeCommand('setContext', 'gamescriptPanelFocused', false).then(undefined, (err) => {
            console.error('[Panel] Failed to clear gamescriptPanelFocused context:', err);
          });
        }
      },
      null,
      this._disposables
    );

    // Set context immediately if visible
    if (this._panel.active) {
      vscode.commands.executeCommand('setContext', 'gamescriptPanelFocused', true).then(undefined, (err) => {
        console.error('[Panel] Failed to set initial gamescriptPanelFocused context:', err);
      });
    }

    // Handle messages from the webview via mediator
    this._panel.webview.onDidReceiveMessage(
      async (message: OutgoingMessage) => {
        try {
          await this._mediator.handle(message);
        } catch (error) {
          console.error(`[Panel] Unhandled error in message handler for '${message.type}':`, error);
        }
      },
      null,
      this._disposables
    );

    // Subscribe to database change notifications
    this._changeUnsubscribe = this._databaseManager.onChangeNotification((notification) => {
      this._panel.webview.postMessage({
        type: 'db:changed',
        table: notification.table,
        operation: notification.operation,
        rows: notification.rows,
        timestamp: notification.timestamp,
      });
    });

    // Subscribe to critical error notifications (e.g., LISTEN disconnect)
    this._errorUnsubscribe = this._databaseManager.onError((error) => {
      this._panel.webview.postMessage({
        type: 'db:error',
        error,
      });
    });

    // Start listening for changes if connected
    if (this._databaseManager.isConnected()) {
      this._databaseManager.startChangeNotifications();
    }

    // Set up theme change listener
    this._setupThemeListener();

    // Note: Code file watcher is set up by UI via code:watchFolder message
    // when the code output folder is known
  }

  // ==========================================================================
  // Theme Management
  // ==========================================================================

  /**
   * Set up a listener for VSCode theme changes.
   */
  private _setupThemeListener() {
    const themeChangeListener = vscode.window.onDidChangeActiveColorTheme((theme) => {
      this._sendThemeState(theme.kind);
    });
    this._disposables.push(themeChangeListener);
  }

  /**
   * Send the current theme state to the webview.
   */
  private _sendThemeState(themeKind?: vscode.ColorThemeKind) {
    const kind = themeKind ?? vscode.window.activeColorTheme.kind;
    const isDark = kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;

    this._panel.webview.postMessage({
      type: 'theme:changed',
      isDark,
    });
  }

  // ==========================================================================
  // File Watcher
  // ==========================================================================

  /** The current code file watcher, if any */
  private _codeFileWatcher: vscode.FileSystemWatcher | undefined;

  /**
   * Set up a file watcher for conversation code files.
   * Called by the UI when the code output folder is known/changes.
   *
   * @param folderPath - Relative path to watch, or null to clear the watcher
   */
  public setupCodeFileWatcher(folderPath: string | null): void {
    // Dispose existing watcher if any
    if (this._codeFileWatcher) {
      this._codeFileWatcher.dispose();
      this._codeFileWatcher = undefined;
      this._hasCodeFileWatcher = false;
    }

    // If no folder path, just clear
    if (!folderPath) {
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      console.warn('[Panel] Cannot set up code file watcher: no workspace folder');
      return;
    }

    try {
      // Normalize the folder path - handle "." meaning workspace root
      const normalizedPath = folderPath === '.' ? '' : folderPath.replace(/^\.\//, '');
      const globPattern = normalizedPath ? `${normalizedPath}/${CONVERSATION_FILE_PATTERN}` : CONVERSATION_FILE_PATTERN;

      const pattern = new vscode.RelativePattern(
        workspaceFolder,
        globPattern
      );

      this._codeFileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

      this._codeFileWatcher.onDidChange((uri: vscode.Uri) => {
        const match = uri.fsPath.match(CONVERSATION_FILE_REGEX);
        if (match) {
          const conversationId = parseInt(match[1], 10);
          this._panel.webview.postMessage({
            type: 'code:fileChanged',
            conversationId,
          });
        }
      });

      this._codeFileWatcher.onDidCreate((uri: vscode.Uri) => {
        const match = uri.fsPath.match(CONVERSATION_FILE_REGEX);
        if (match) {
          const conversationId = parseInt(match[1], 10);
          this._panel.webview.postMessage({
            type: 'code:fileChanged',
            conversationId,
          });
        }
      });

      this._hasCodeFileWatcher = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(
        `Failed to set up code file watcher: ${errorMsg}. Code preview updates will not work.`
      );
      console.error('[Panel] Failed to set up code file watcher:', error);
    }
  }

  // ==========================================================================
  // Webview HTML
  // ==========================================================================

  private _update() {
    this._panel.title = 'GameScript';
    this._panel.webview.html = this._htmlBuilder.getHtml(this._panel.webview);
  }

  // ==========================================================================
  // Disposal
  // ==========================================================================

  public dispose() {
    GameScriptPanel._instance = undefined;

    vscode.commands.executeCommand('setContext', 'gamescriptPanelFocused', false).then(undefined, (err) => {
      console.error('[Panel] Failed to clear gamescriptPanelFocused context on dispose:', err);
    });

    if (this._changeUnsubscribe) {
      this._changeUnsubscribe();
      this._changeUnsubscribe = undefined;
    }
    if (this._errorUnsubscribe) {
      this._errorUnsubscribe();
      this._errorUnsubscribe = undefined;
    }

    if (this._codeFileWatcher) {
      this._codeFileWatcher.dispose();
      this._codeFileWatcher = undefined;
    }
    this._hasCodeFileWatcher = false;

    this._panel.dispose();

    this._disposables.forEach(d => d.dispose());
    this._disposables = [];
  }
}
