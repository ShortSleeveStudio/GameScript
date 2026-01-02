/**
 * PostMessage bridge for communication between UI webview and IDE extension backend.
 *
 * This module provides a typed, promise-based API for:
 * - Database queries and mutations
 * - File operations (open, create)
 * - Registry scanning
 *
 * Supports multiple IDE environments:
 * - VSCode: acquireVsCodeApi() + postMessage
 * - Visual Studio (WebView2): window.chrome.webview
 * - Rider (JCEF): jbCefBrowser / cefQuery
 *
 * Falls back gracefully to standalone mode when running outside an IDE.
 */

import type {
  OutgoingMessage,
  IncomingMessage,
  DbQueryMessage,
  DbExecMessage,
  DbRunMessage,
  DbBatchMessage,
  DbBatchStatement,
  DbNotificationMeta,
  DialogOpenSqliteMessage,
  DialogSaveSqliteMessage,
  DialogOpenCsvMessage,
  DialogSaveCsvMessage,
  DialogSelectFolderMessage,
  FileReadMessage,
  FileWriteMessage,
  FileCreateMessage,
  FileAppendMessage,
  FileMakeDirMessage,
  FileWriteBinaryMessage,
  FileRenameMessage,
  FileExistsMessage,
  ScannedAction,
  ScannedCondition,
  ChangeOperation,
  FocusableTable,
  FocusItem,
  FocusSetMessage,
  CodeGetMethodMessage,
  CodeCreateMethodMessage,
  CodeDeleteMethodMessage,
  CodeDeleteMethodsSilentMessage,
  CodeRestoreMethodMessage,
  CodeDeleteFileMessage,
  CodeRestoreFileMessage,
  DatabaseType,
  DbResult,
  TransactionContext,
  DataChangeEvent,
  FocusChangeEvent,
  CodeFileChangeEvent,
  BridgeEvents,
  BridgeEventName,
} from '@gamescript/shared';

// Notifications
import { toastError, toastWarning } from '$lib/stores/notifications.js';

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert a Uint8Array to a base64 string for transport over postMessage.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface DialogResult {
  cancelled: boolean;
  filePath?: string;
}

// ============================================================================
// Types
// ============================================================================

export interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}


// ============================================================================
// Bridge Implementation
// ============================================================================

// ============================================================================
// IDE Detection and Abstraction
// ============================================================================

type IdeType = 'vscode' | 'webview2' | 'cef' | 'standalone';

interface IdeAdapter {
  type: IdeType;
  postMessage: (message: unknown) => void;
  addMessageListener: (handler: (event: MessageEvent) => void) => void;
}

/**
 * Detect which IDE environment we're running in and return an adapter.
 */
function detectIde(): IdeAdapter {
  if (typeof window === 'undefined') {
    return { type: 'standalone', postMessage: () => {}, addMessageListener: () => {} };
  }

  // VSCode webview
  if (typeof (window as unknown as { acquireVsCodeApi?: unknown }).acquireVsCodeApi === 'function') {
    // Initialize VSCode API
    if (!window.vscode) {
      const acquireVsCodeApi = (window as unknown as { acquireVsCodeApi: () => VsCodeApi }).acquireVsCodeApi;
      window.vscode = acquireVsCodeApi();
    }
    return {
      type: 'vscode',
      postMessage: (msg) => window.vscode?.postMessage(msg),
      addMessageListener: (handler) => window.addEventListener('message', handler),
    };
  }

  // Visual Studio WebView2
  const chrome = (window as unknown as { chrome?: { webview?: { postMessage: (msg: unknown) => void; addEventListener: (type: string, handler: (event: MessageEvent) => void) => void } } }).chrome;
  if (chrome?.webview) {
    return {
      type: 'webview2',
      postMessage: (msg) => chrome.webview!.postMessage(msg),
      addMessageListener: (handler) => chrome.webview!.addEventListener('message', handler),
    };
  }

  // JetBrains JCEF - check for CefSharp or jbCefBrowser
  const cef = (window as unknown as { cefQuery?: (query: { request: string }) => void; jbCefBrowser?: { postMessage: (msg: string) => void } }).cefQuery
    || (window as unknown as { jbCefBrowser?: { postMessage: (msg: string) => void } }).jbCefBrowser;
  if (cef) {
    // JCEF typically uses window.postMessage for receiving
    const jbBrowser = (window as unknown as { jbCefBrowser?: { postMessage: (msg: string) => void } }).jbCefBrowser;
    return {
      type: 'cef',
      postMessage: (msg) => {
        if (jbBrowser) {
          jbBrowser.postMessage(JSON.stringify(msg));
        } else {
          // Fallback to cefQuery
          const cefQuery = (window as unknown as { cefQuery: (query: { request: string }) => void }).cefQuery;
          cefQuery({ request: JSON.stringify(msg) });
        }
      },
      addMessageListener: (handler) => window.addEventListener('message', handler),
    };
  }

  // Standalone mode (dev server, browser)
  return { type: 'standalone', postMessage: () => {}, addMessageListener: () => {} };
}

// ============================================================================
// Bridge Implementation
// ============================================================================

class ExtensionBridge {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private listeners = new Map<BridgeEventName, Set<(...args: unknown[]) => void>>();
  private requestIdCounter = 0;
  private readonly defaultTimeout = 30000; // 30 seconds

  private _ide: IdeAdapter;
  private _isInitialized = false;

  constructor() {
    this._ide = detectIde();
  }

  /**
   * Initialize the bridge and set up message listeners.
   * Call this once when the app starts.
   */
  init(): void {
    if (this._isInitialized) return;
    this._isInitialized = true;

    if (this._ide.type === 'standalone') {
      return;
    }

    // Listen for messages from extension
    this._ide.addMessageListener(this.handleMessage.bind(this));

    // Notify extension that UI is ready
    this.postMessage({ type: 'ready' });
  }

  /**
   * Check if running in an IDE webview context (any IDE).
   */
  get isIde(): boolean {
    return this._ide.type !== 'standalone';
  }

  /**
   * Check if running in VSCode webview context.
   * @deprecated Use isIde for IDE-agnostic checks
   */
  get isVsCode(): boolean {
    return this._ide.type === 'vscode';
  }

  /**
   * Get the detected IDE type.
   */
  get ideType(): IdeType {
    return this._ide.type;
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Subscribe to bridge events.
   */
  on<E extends BridgeEventName>(event: E, callback: BridgeEvents[E]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (...args: unknown[]) => void);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as (...args: unknown[]) => void);
    };
  }

  /**
   * Emit an event to all subscribers.
   */
  private emit<E extends BridgeEventName>(event: E, ...args: Parameters<BridgeEvents[E]>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  // ==========================================================================
  // Message Handling
  // ==========================================================================

  private handleMessage(event: MessageEvent<IncomingMessage>): void {
    const message = event.data;

    switch (message.type) {
      case 'connected':
        this.emit('connected', message.dbType);
        break;

      case 'disconnected':
        this.emit('disconnected');
        break;

      case 'db:queryResult':
        this.resolveRequest(message.id, message.success ? message.data : new Error(message.error));
        break;

      case 'db:execResult':
        this.resolveRequest(message.id, message.success ? undefined : new Error(message.error));
        break;

      case 'db:runResult':
        if (message.success) {
          this.resolveRequest(message.id, { lastID: message.lastID, changes: message.changes, rows: message.rows });
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'db:batchResult':
        if (message.success) {
          this.resolveRequest(message.id, message.insertIds ?? []);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'db:transactionBeginResult':
        this.resolveRequest(message.id, message.success ? message.context : new Error(message.error));
        break;

      case 'db:transactionCommitResult':
        this.resolveRequest(message.id, message.success ? undefined : new Error(message.error));
        break;

      case 'db:transactionRollbackResult':
        this.resolveRequest(message.id, message.success ? undefined : new Error(message.error));
        break;

      case 'db:error':
        this.emit('error', message.error);
        break;

      case 'scanner:results':
        this.emit('registryUpdated', message.actions, message.conditions);
        break;

      case 'scanner:error':
        this.emit('error', message.error);
        break;

      case 'registryUpdated':
        this.emit('registryUpdated', message.actions, message.conditions);
        break;

      case 'db:changed':
        this.emit('dataChanged', {
          table: message.table,
          operation: message.operation,
          rows: message.rows,
          timestamp: message.timestamp,
        });
        break;

      case 'dialog:result':
        this.resolveRequest(message.id, {
          cancelled: message.cancelled,
          filePath: message.filePath,
        } as DialogResult);
        break;

      case 'focus:broadcast':
        this.emit('focusChanged', {
          table: message.table,
          items: message.items,
        });
        break;

      case 'code:methodResult':
        if (message.success) {
          this.resolveRequest(message.id, {
            body: message.body,
            filePath: message.filePath,
            lineNumber: message.lineNumber,
          });
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'code:createResult':
        if (message.success) {
          this.resolveRequest(message.id, true);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'code:deleteResult':
        this.resolveRequest(message.id, {
          accepted: message.accepted,
          error: message.error,
        });
        break;

      case 'code:deleteMethodsSilentResult':
        if (message.success) {
          this.resolveRequest(message.id, { deletedMethods: message.deletedMethods });
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'code:restoreMethodResult':
        if (message.success) {
          this.resolveRequest(message.id, undefined);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'code:deleteFileResult':
        if (message.success) {
          this.resolveRequest(message.id, { deletedContent: message.deletedContent });
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'code:restoreFileResult':
        if (message.success) {
          this.resolveRequest(message.id, undefined);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'code:fileChanged':
        this.emit('codeFileChanged', { conversationId: message.conversationId });
        break;

      case 'theme:changed':
        this.emit('themeChanged', message.isDark);
        break;

      case 'file:readResult':
        if (message.success) {
          this.resolveRequest(message.id, message.content);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'file:writeResult':
        if (message.success) {
          this.resolveRequest(message.id, undefined);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'file:createResult':
        if (message.success) {
          this.resolveRequest(message.id, undefined);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'file:appendResult':
        if (message.success) {
          this.resolveRequest(message.id, undefined);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'file:mkdirResult':
        if (message.success) {
          this.resolveRequest(message.id, undefined);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'file:writeBinaryResult':
        if (message.success) {
          this.resolveRequest(message.id, undefined);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'file:renameResult':
        if (message.success) {
          this.resolveRequest(message.id, undefined);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'file:existsResult':
        if (message.success) {
          this.resolveRequest(message.id, message.exists);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;
    }
  }

  private resolveRequest(id: string, result: unknown): void {
    const pending = this.pendingRequests.get(id);
    if (!pending) {
      toastWarning('[Bridge] No pending request for id', id);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(id);

    if (result instanceof Error) {
      pending.reject(result);
    } else {
      pending.resolve(result);
    }
  }

  private postMessage(message: OutgoingMessage): void {
    if (!this.isIde) {
      toastWarning('[Bridge] Cannot post message: not in IDE context');
      return;
    }
    this._ide.postMessage(message);
  }

  private generateRequestId(): string {
    return `req_${++this.requestIdCounter}_${Date.now()}`;
  }

  private createRequest<T>(timeout = this.defaultTimeout): { id: string; promise: Promise<T> } {
    const id = this.generateRequestId();

    const promise = new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${id} timed out after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: timeoutId,
      });
    });

    return { id, promise };
  }

  // ==========================================================================
  // Database Operations
  // ==========================================================================

  /**
   * Execute a SELECT query and return rows.
   * @param sql - SQL query to execute
   * @param params - Optional parameters for the SQL query
   * @param context - Optional transaction context
   */
  async query<T = unknown>(sql: string, params?: unknown[], context?: TransactionContext): Promise<T[]> {
    if (!this.isIde) {
      throw new Error('Database queries not available in standalone mode');
    }

    const { id, promise } = this.createRequest<T[]>();

    const message: DbQueryMessage = {
      type: 'db:query',
      id,
      sql,
      params,
      context,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Execute a DDL statement (CREATE TABLE, ALTER TABLE, DROP, etc.).
   * DDL only - no parameters supported. For DML with params, use run().
   * @param sql - SQL statement to execute
   * @param notificationMeta - Optional notification metadata (auto-generated by CRUD methods)
   * @param context - Optional transaction context
   */
  async exec(sql: string, notificationMeta?: DbNotificationMeta, context?: TransactionContext): Promise<void> {
    if (!this.isIde) {
      throw new Error('Database operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<void>();

    const message: DbExecMessage = {
      type: 'db:exec',
      id,
      sql,
      notificationMeta,
      context,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE statement.
   * Returns the last inserted ID (if available) and number of affected rows.
   * @param sql - SQL statement to execute
   * @param params - Optional parameters for the SQL statement
   * @param returning - If true, expects SQL to have RETURNING clause and will return rows
   * @param notificationMeta - Optional notification metadata (auto-generated by CRUD methods)
   * @param context - Optional transaction context
   */
  async run(sql: string, params?: unknown[], returning?: boolean, notificationMeta?: DbNotificationMeta, context?: TransactionContext): Promise<DbResult> {
    if (!this.isIde) {
      throw new Error('Database operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<DbResult>();

    const message: DbRunMessage = {
      type: 'db:run',
      id,
      sql,
      params,
      returning,
      notificationMeta,
      context,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Execute multiple statements in a single transaction.
   * All statements succeed or all fail together.
   *
   * @param statements - Array of SQL statements with optional params
   * @returns Array of inserted IDs (for INSERT statements)
   */
  async batch(statements: DbBatchStatement[]): Promise<number[]> {
    if (!this.isIde) {
      throw new Error('Database operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<number[]>();

    const message: DbBatchMessage = {
      type: 'db:batch',
      id,
      statements,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Execute a function within a database transaction.
   * All operations within the transaction are executed atomically.
   * If any operation fails, all changes are rolled back.
   *
   * Matches Electron's transaction pattern where the backend manages the connection.
   * Pass the transaction context to CRUD operations to execute them within the transaction.
   *
   * @example
   * ```ts
   * await bridge.transaction(async (txContext) => {
   *     // Pass txContext to CRUD operations
   *     await db.createRow('nodes', { name: 'Test' }, txContext);
   *     await db.updateRow('conversations', 1, { updated_at: Date.now() }, txContext);
   * });
   * ```
   */
  async transaction(fn: (txContext: TransactionContext) => Promise<void>): Promise<void> {
    if (!this.isIde) {
      throw new Error('Database transactions not available in standalone mode');
    }

    // Begin transaction - backend creates connection and starts transaction
    const { id: beginId, promise: beginPromise } = this.createRequest<TransactionContext>();
    this.postMessage({
      type: 'db:transaction:begin',
      id: beginId,
    });
    const txContext = await beginPromise;

    // Execute transaction callback
    try {
      await fn(txContext);

      // Commit transaction
      const { id: commitId, promise: commitPromise } = this.createRequest<void>();
      this.postMessage({
        type: 'db:transaction:commit',
        id: commitId,
        context: txContext,
      });
      await commitPromise;
    } catch (error) {
      // Rollback on error
      try {
        const { id: rollbackId, promise: rollbackPromise } = this.createRequest<void>();
        this.postMessage({
          type: 'db:transaction:rollback',
          id: rollbackId,
          context: txContext,
        });
        await rollbackPromise;
      } catch (rollbackError) {
        toastError('[Bridge] Failed to rollback transaction:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * Notify that a table's schema has been altered (e.g., column added/removed).
   * This triggers a reload of all table views for that table.
   *
   * This matches Electron's DB_OP_ALTER notification pattern.
   */
  notifyTableAltered(tableName: string): void {
    this.emit('dataChanged', {
      table: tableName,
      operation: 'alter',
      rows: [],
      timestamp: Date.now(),
    });
  }

  /**
   * Connect to a database.
   * @param config - Database configuration
   * @param createNew - If true, create a new database (initialize schema)
   */
  connect(
    config: {
      type: DatabaseType;
      path?: string;
      host?: string;
      port?: number;
      database?: string;
      username?: string;
      password?: string;
    },
    createNew = false
  ): void {
    this.postMessage({ type: 'db:connect', config, createNew });
  }

  /**
   * Disconnect from the current database.
   */
  disconnect(): void {
    this.postMessage({ type: 'db:disconnect' });
  }

  // ==========================================================================
  // Dialog Operations
  // ==========================================================================

  /**
   * Show a file open dialog for SQLite databases.
   * @returns Promise with the selected file path, or cancelled: true if cancelled
   */
  async openSqliteDialog(): Promise<DialogResult> {
    if (!this.isIde) {
      return { cancelled: true };
    }

    const { id, promise } = this.createRequest<DialogResult>();

    const message: DialogOpenSqliteMessage = {
      type: 'dialog:openSqlite',
      id,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Show a file save dialog for creating a new SQLite database.
   * @returns Promise with the selected file path, or cancelled: true if cancelled
   */
  async saveSqliteDialog(): Promise<DialogResult> {
    if (!this.isIde) {
      return { cancelled: true };
    }

    const { id, promise } = this.createRequest<DialogResult>();

    const message: DialogSaveSqliteMessage = {
      type: 'dialog:saveSqlite',
      id,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Show a file open dialog for CSV files.
   * @returns Promise with the selected file path, or cancelled: true if cancelled
   */
  async openCsvDialog(): Promise<DialogResult> {
    if (!this.isIde) {
      return { cancelled: true };
    }

    const { id, promise } = this.createRequest<DialogResult>();

    const message: DialogOpenCsvMessage = {
      type: 'dialog:openCsv',
      id,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Show a file save dialog for CSV files.
   * @param defaultFilename - Optional default filename to suggest
   * @returns Promise with the selected file path, or cancelled: true if cancelled
   */
  async saveCsvDialog(defaultFilename?: string): Promise<DialogResult> {
    if (!this.isIde) {
      return { cancelled: true };
    }

    const { id, promise } = this.createRequest<DialogResult>();

    const message: DialogSaveCsvMessage = {
      type: 'dialog:saveCsv',
      id,
      defaultFilename,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Show a folder selection dialog.
   * @param title - Optional title for the dialog
   * @returns Promise with the selected folder path, or cancelled: true if cancelled
   */
  async selectFolderDialog(title?: string): Promise<DialogResult> {
    if (!this.isIde) {
      return { cancelled: true };
    }

    const { id, promise } = this.createRequest<DialogResult>();

    const message: DialogSelectFolderMessage = {
      type: 'dialog:selectFolder',
      id,
      title,
    };

    this.postMessage(message);
    return promise;
  }

  // ==========================================================================
  // File Operations
  // ==========================================================================

  /**
   * Read a file's content.
   * @param filePath - Absolute path to the file
   * @returns Promise with file content as string
   */
  async readFile(filePath: string): Promise<string> {
    if (!this.isIde) {
      throw new Error('File operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<string>();

    const message: FileReadMessage = {
      type: 'file:read',
      id,
      filePath,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Write content to a file.
   * @param filePath - Absolute path to the file
   * @param content - Content to write
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.isIde) {
      throw new Error('File operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<void>();

    const message: FileWriteMessage = {
      type: 'file:write',
      id,
      filePath,
      content,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Create an empty file (for streaming writes).
   * Overwrites if file exists.
   * @param filePath - Absolute path to the file
   */
  async createEmptyFile(filePath: string): Promise<void> {
    if (!this.isIde) {
      throw new Error('File operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<void>();

    const message: FileCreateMessage = {
      type: 'file:create',
      id,
      filePath,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Append content to a file (for streaming writes).
   * Creates file if it doesn't exist.
   * @param filePath - Absolute path to the file
   * @param content - Content to append
   */
  async appendFile(filePath: string, content: string): Promise<void> {
    if (!this.isIde) {
      throw new Error('File operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<void>();

    const message: FileAppendMessage = {
      type: 'file:append',
      id,
      filePath,
      content,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Create a directory (and parent directories if needed).
   * @param dirPath - Absolute path to the directory
   */
  async makeDirectory(dirPath: string): Promise<void> {
    if (!this.isIde) {
      throw new Error('File operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<void>();

    const message: FileMakeDirMessage = {
      type: 'file:mkdir',
      id,
      dirPath,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Write binary content to a file.
   * @param filePath - Absolute path to the file
   * @param content - Binary content as Uint8Array
   */
  async writeBinaryFile(filePath: string, content: Uint8Array): Promise<void> {
    if (!this.isIde) {
      throw new Error('File operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<void>();

    // Convert Uint8Array to base64 for transport over postMessage
    const contentBase64 = uint8ArrayToBase64(content);

    const message: FileWriteBinaryMessage = {
      type: 'file:writeBinary',
      id,
      filePath,
      contentBase64,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Rename/move a file atomically.
   * @param oldPath - Current file path
   * @param newPath - New file path
   */
  async renameFile(oldPath: string, newPath: string): Promise<void> {
    if (!this.isIde) {
      throw new Error('File operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<void>();

    const message: FileRenameMessage = {
      type: 'file:rename',
      id,
      oldPath,
      newPath,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Check if a file exists.
   * @param filePath - Absolute path to check
   */
  async fileExists(filePath: string): Promise<boolean> {
    if (!this.isIde) {
      throw new Error('File operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<boolean>();

    const message: FileExistsMessage = {
      type: 'file:exists',
      id,
      filePath,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Open a file in the IDE editor.
   */
  openFile(filePath: string, lineNumber?: number): void {
    this.postMessage({
      type: 'editor:openFile',
      filePath,
      lineNumber,
    });
  }

  /**
   * Create a new file with content and open it.
   */
  createFile(filePath: string, content: string): void {
    this.postMessage({
      type: 'editor:createFile',
      filePath,
      content,
    });
  }

  // ==========================================================================
  // Registry Operations
  // ==========================================================================

  /**
   * Trigger a scan of the workspace for actions and conditions.
   */
  scanRegistry(): void {
    this.postMessage({ type: 'scanner:scan' });
  }

  // ==========================================================================
  // Native Notifications
  // ==========================================================================

  /**
   * Show a native IDE notification (info/warning/error popup).
   * Use for important messages that need user attention.
   */
  notify(level: 'info' | 'warning' | 'error', message: string, detail?: string): void {
    this.postMessage({ type: 'notify', level, message, detail });
  }

  /**
   * Show a brief status bar message.
   * Use for low-priority feedback (e.g., "Saved", "Node created").
   */
  showStatus(message: string, timeoutMs = 3000): void {
    this.postMessage({ type: 'status', message, timeoutMs });
  }

  // ==========================================================================
  // Focus Operations (cross-panel selection sync)
  // ==========================================================================

  /**
   * Set focus on items of a specific table.
   * This broadcasts the focus change to all panels via the extension.
   */
  setFocus(table: FocusableTable, items: FocusItem[]): void {
    if (!this.isIde) {
      // In standalone mode, just emit locally
      this.emit('focusChanged', { table, items });
      return;
    }

    const message: FocusSetMessage = {
      type: 'focus:set',
      table,
      items,
    };

    this.postMessage(message);
  }

  // ==========================================================================
  // Code Operations (IDE integration for node/edge methods)
  // ==========================================================================

  /**
   * Get the body of a method for preview display.
   * Uses IDE symbol provider to find and extract the method body.
   */
  async getMethodBody(
    conversationId: number,
    methodName: string
  ): Promise<{ body: string; filePath: string; lineNumber: number }> {
    if (!this.isIde) {
      throw new Error('Code operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<{ body: string; filePath: string; lineNumber: number }>();

    const message: CodeGetMethodMessage = {
      type: 'code:getMethod',
      id,
      conversationId,
      methodName,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Create a method stub and open it in the IDE.
   */
  async createMethod(
    conversationId: number,
    methodName: string,
    methodType: 'condition' | 'action'
  ): Promise<boolean> {
    if (!this.isIde) {
      throw new Error('Code operations not available in standalone mode');
    }

    const { id, promise } = this.createRequest<boolean>();

    const message: CodeCreateMethodMessage = {
      type: 'code:createMethod',
      id,
      conversationId,
      methodName,
      methodType,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Delete a method with diff preview.
   * Returns whether the user accepted or rejected the deletion.
   */
  async deleteMethod(
    conversationId: number,
    methodName: string
  ): Promise<{ accepted: boolean; error?: string }> {
    if (!this.isIde) {
      return { accepted: false, error: 'Code operations not available in standalone mode' };
    }

    const { id, promise } = this.createRequest<{ accepted: boolean; error?: string }>();

    const message: CodeDeleteMethodMessage = {
      type: 'code:deleteMethod',
      id,
      conversationId,
      methodName,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Delete multiple methods without confirmation (for programmatic deletion during node delete).
   * Returns a map of method name to deleted code for undo.
   * All methods are deleted in a single file operation to avoid stale symbol issues.
   */
  async deleteMethodsSilent(
    conversationId: number,
    methodNames: string[]
  ): Promise<{ deletedMethods: Record<string, string> }> {
    if (!this.isIde || methodNames.length === 0) {
      return { deletedMethods: {} };
    }

    const { id, promise } = this.createRequest<{ deletedMethods: Record<string, string> }>();

    const message: CodeDeleteMethodsSilentMessage = {
      type: 'code:deleteMethodsSilent',
      id,
      conversationId,
      methodNames,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Restore a previously deleted method (for undo after node delete).
   */
  async restoreMethod(
    conversationId: number,
    methodName: string,
    code: string
  ): Promise<void> {
    if (!this.isIde || !code) {
      return;
    }

    const { id, promise } = this.createRequest<void>();

    const message: CodeRestoreMethodMessage = {
      type: 'code:restoreMethod',
      id,
      conversationId,
      methodName,
      code,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Delete an entire conversation code file (for permanent conversation delete).
   * Returns the deleted content for undo.
   */
  async deleteCodeFile(conversationId: number): Promise<{ deletedContent: string }> {
    if (!this.isIde) {
      return { deletedContent: '' };
    }

    const { id, promise } = this.createRequest<{ deletedContent: string }>();

    const message: CodeDeleteFileMessage = {
      type: 'code:deleteFile',
      id,
      conversationId,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Restore an entire conversation code file (for undo after permanent delete).
   */
  async restoreCodeFile(conversationId: number, content: string): Promise<void> {
    if (!this.isIde || !content) {
      return;
    }

    const { id, promise } = this.createRequest<void>();

    const message: CodeRestoreFileMessage = {
      type: 'code:restoreFile',
      id,
      conversationId,
      content,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Open a method in the IDE (go to symbol).
   */
  openMethod(conversationId: number, methodName: string): void {
    this.postMessage({
      type: 'code:openMethod',
      conversationId,
      methodName,
    });
  }

  /**
   * Set up file watcher for code files.
   * Called when the code output folder is known/changes.
   * Pass null to clear the watcher.
   */
  watchCodeFolder(folderPath: string | null): void {
    this.postMessage({
      type: 'code:watchFolder',
      folderPath,
    });
  }
}

// Singleton instance
export const bridge = new ExtensionBridge();
