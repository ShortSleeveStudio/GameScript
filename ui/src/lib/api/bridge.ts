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
  CodeTemplateType,
  DbResult,
  TransactionContext,
  DataChangeEvent,
  FocusChangeEvent,
  CodeFileChangeEvent,
  BridgeEvents,
  BridgeEventName,
} from '@gamescript/shared';

import {
  generateMethodStub,
  generateConversationFile,
  getFileExtension,
  getSchemaCheckSQL,
  getTableCountSQL,
  generateSchemaStatements,
} from '@gamescript/shared';

import type { DatabaseConfig } from '@gamescript/shared';

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
  timeout: ReturnType<typeof setTimeout> | null;
}


// ============================================================================
// Bridge Implementation
// ============================================================================

// ============================================================================
// IDE Detection and Abstraction
// ============================================================================

// 'cef-pending' means we're in JCEF but the bridge hasn't been injected yet
type IdeType = 'vscode' | 'webview2' | 'cef' | 'cef-pending' | 'standalone';

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

  // JetBrains JCEF - check for jbCefBrowser (injected by Rider plugin)
  const jbBrowser = (window as unknown as { jbCefBrowser?: { postMessage: (msg: string) => void } }).jbCefBrowser;
  if (jbBrowser) {
    return {
      type: 'cef',
      postMessage: (msg) => jbBrowser.postMessage(JSON.stringify(msg)),
      addMessageListener: (handler) => window.addEventListener('message', handler),
    };
  }

  // Check for JCEF environment hint (set via query param before bridge injection)
  // This allows us to distinguish "JCEF waiting for injection" from "true standalone"
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('env') === 'jcef') {
    return {
      type: 'cef-pending',
      postMessage: () => {}, // No-op until bridge is injected
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

  // Bridge readiness state
  private _readyPromise: Promise<void>;
  private _resolveReady!: () => void;
  private _isReady = false;

  constructor() {
    this._readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });
    this._ide = detectIde();

    // cef-pending must wait for bridge injection before becoming ready
    // All other types are ready immediately
    if (this._ide.type !== 'cef-pending') {
      this._markReady();
    }
  }

  /**
   * Mark the bridge as ready. Called once when the bridge becomes available.
   */
  private _markReady(): void {
    if (this._isReady) return;
    this._isReady = true;
    this._resolveReady();
  }

  /**
   * Initialize the bridge and set up message listeners.
   * Call this once when the app starts.
   */
  init(): void {
    if (this._isInitialized) return;
    this._isInitialized = true;

    // Listen for JCEF bridge injection event
    if (typeof window !== 'undefined') {
      window.addEventListener('gamescript-bridge-ready', () => {
        this.onBridgeReady();
      });
    }

    // cef-pending waits for onBridgeReady to set up listeners
    // standalone has no bridge to listen to
    if (this._ide.type === 'standalone' || this._ide.type === 'cef-pending') {
      return;
    }

    // Set up message listener and notify extension
    this._ide.addMessageListener(this.handleMessage.bind(this));
    this.postMessage({ type: 'ready' });
  }

  /**
   * Called when the JCEF bridge is injected (after page load).
   * Re-detects the IDE and sets up listeners.
   */
  private onBridgeReady(): void {
    // Re-detect IDE now that jbCefBrowser is available
    const newIde = detectIde();

    // Transition from cef-pending to cef
    if (newIde.type === 'cef' && this._ide.type === 'cef-pending') {
      this._ide = newIde;

      // Set up message listener
      this._ide.addMessageListener(this.handleMessage.bind(this));

      // Mark bridge as ready (resolves _readyPromise)
      this._markReady();

      // Notify extension that UI is ready
      this.postMessage({ type: 'ready' });
    }
  }

  /**
   * Returns a promise that resolves when the bridge is ready to send/receive messages.
   * - VS Code/WebView2: Resolves immediately (bridge available synchronously)
   * - JCEF (Rider): Resolves when bridge injection completes (env=jcef query param)
   * - Standalone: Resolves immediately (no bridge expected)
   */
  ready(): Promise<void> {
    return this._readyPromise;
  }

  /**
   * Check if running in an IDE webview context (any IDE).
   * Returns true for cef-pending since we know we're in an IDE, just waiting for bridge.
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

      case 'db:openResult':
        if (message.success) {
          this.resolveRequest(message.id, { success: true });
        } else {
          this.resolveRequest(message.id, { success: false, error: message.error });
        }
        break;

      case 'db:closeResult':
        if (message.success) {
          this.resolveRequest(message.id, undefined);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
        break;

      case 'db:startNotificationsResult':
        if (message.success) {
          this.resolveRequest(message.id, undefined);
        } else {
          this.resolveRequest(message.id, new Error(message.error));
        }
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
            fullText: message.fullText,
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

      // Edit commands from IDE (keyboard shortcuts intercepted by plugin)
      case 'edit:undo':
        this.emit('editUndo');
        break;

      case 'edit:redo':
        this.emit('editRedo');
        break;

      case 'edit:save':
        this.emit('editSave');
        break;
    }
  }

  private resolveRequest(id: string, result: unknown): void {
    const pending = this.pendingRequests.get(id);
    if (!pending) {
      toastWarning('[Bridge] No pending request for id', id);
      return;
    }

    if (pending.timeout !== null) {
      clearTimeout(pending.timeout);
    }
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

  private createRequest<T>(timeout: number | null = this.defaultTimeout): { id: string; promise: Promise<T> } {
    const id = this.generateRequestId();

    const promise = new Promise<T>((resolve, reject) => {
      // null timeout = no timeout (for dialogs waiting on user interaction)
      const timeoutId = timeout === null
        ? null
        : setTimeout(() => {
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
   * Connect to a database with full validation and initialization.
   * This is the new async connect flow that handles schema validation in the UI layer.
   *
   * @param config - Database configuration
   * @param createNew - If true, always initialize schema (for new databases)
   */
  async connect(config: DatabaseConfig, createNew = false): Promise<void> {
    if (!this.isIde) {
      throw new Error('Database connection not available in standalone mode');
    }

    const dialect = config.type === 'postgres' ? 'postgres' : 'sqlite';

    // Step 1: Open raw connection
    const openResult = await this._openConnection(config);
    if (!openResult.success) {
      throw new Error(openResult.error || 'Failed to open database connection');
    }

    try {
      // Step 2: Check if schema exists
      const schemaResult = await this.query<{ name?: string; table_name?: string }>(
        getSchemaCheckSQL(dialect)
      );
      const schemaExists = schemaResult.length > 0;

      if (schemaExists && !createNew) {
        // Schema exists, start notifications and emit connected
        await this._startNotifications();
        this.emit('connected', config.type);
        return;
      }

      if (!schemaExists) {
        // Check if database is empty
        const countResult = await this.query<{ count: number }>(getTableCountSQL(dialect));
        const tableCount = countResult[0]?.count ?? 0;

        if (tableCount > 0 && !createNew) {
          // Has tables but wrong schema - invalid database
          await this._closeConnection();
          throw new Error(
            'Database schema is invalid. The database contains data but is missing required tables.'
          );
        }
      }

      // Step 3: Initialize schema (empty db or createNew)
      await this._initializeSchema(dialect);

      // Step 4: Start notifications and emit connected
      await this._startNotifications();
      this.emit('connected', config.type);
    } catch (error) {
      // Close connection on any error
      await this._closeConnection().catch(() => {});
      throw error;
    }
  }

  /**
   * Open a raw database connection (no validation).
   * @internal
   */
  private async _openConnection(
    config: DatabaseConfig
  ): Promise<{ success: boolean; error?: string }> {
    const { id, promise } = this.createRequest<{ success: boolean; error?: string }>();
    this.postMessage({ type: 'db:open', id, config });
    return promise;
  }

  /**
   * Close the database connection.
   * @internal
   */
  private async _closeConnection(): Promise<void> {
    const { id, promise } = this.createRequest<void>();
    this.postMessage({ type: 'db:close', id });
    return promise;
  }

  /**
   * Initialize the database schema.
   * @internal
   */
  private async _initializeSchema(dialect: 'sqlite' | 'postgres'): Promise<void> {
    const statements = generateSchemaStatements(dialect);

    for (const stmt of statements) {
      if (stmt.isDDL) {
        await this.exec(stmt.sql);
      } else {
        await this.run(stmt.sql, stmt.params);
      }
    }
  }

  /**
   * Start change notifications (LISTEN/NOTIFY for PostgreSQL).
   * Called after schema validation/initialization completes.
   * @internal
   */
  private async _startNotifications(): Promise<void> {
    const { id, promise } = this.createRequest<void>();
    this.postMessage({ type: 'db:startNotifications', id });
    return promise;
  }

  /**
   * Disconnect from the current database.
   */
  async disconnect(): Promise<void> {
    if (!this.isIde) {
      return;
    }

    await this._closeConnection();
    this.emit('disconnected');
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

    const { id, promise } = this.createRequest<DialogResult>(null);

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

    const { id, promise } = this.createRequest<DialogResult>(null);

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

    const { id, promise } = this.createRequest<DialogResult>(null);

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

    const { id, promise } = this.createRequest<DialogResult>(null);

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

    const { id, promise } = this.createRequest<DialogResult>(null);

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
   * Returns both `body` (for display) and `fullText` (includes attributes, for undo).
   */
  async getMethodBody(
    conversationId: number,
    methodName: string,
    template: CodeTemplateType = 'unity'
  ): Promise<{ body: string; fullText: string; filePath: string; lineNumber: number }> {
    if (!this.isIde) {
      throw new Error('Code operations not available in standalone mode');
    }

    const fileExtension = getFileExtension(template);
    const { id, promise } = this.createRequest<{ body: string; fullText: string; filePath: string; lineNumber: number }>();

    const message: CodeGetMethodMessage = {
      type: 'code:getMethod',
      id,
      conversationId,
      methodName,
      fileExtension,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Create a method stub and open it in the IDE.
   * Generates the code in the UI and sends it to the IDE plugin for writing.
   */
  async createMethod(
    conversationId: number,
    methodName: string,
    methodType: 'condition' | 'action',
    template: CodeTemplateType = 'unity'
  ): Promise<boolean> {
    if (!this.isIde) {
      throw new Error('Code operations not available in standalone mode');
    }

    // Generate the code in the UI (shared across all IDE plugins)
    const methodStub = generateMethodStub(methodName, methodType, template);
    const fileContent = generateConversationFile(conversationId, methodStub, template);
    const fileExtension = getFileExtension(template);

    const { id, promise } = this.createRequest<boolean>();

    const message: CodeCreateMethodMessage = {
      type: 'code:createMethod',
      id,
      conversationId,
      methodName,
      fileExtension,
      methodStub,
      fileContent,
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
    methodName: string,
    template: CodeTemplateType = 'unity'
  ): Promise<{ accepted: boolean; error?: string }> {
    if (!this.isIde) {
      return { accepted: false, error: 'Code operations not available in standalone mode' };
    }

    const fileExtension = getFileExtension(template);
    const { id, promise } = this.createRequest<{ accepted: boolean; error?: string }>();

    const message: CodeDeleteMethodMessage = {
      type: 'code:deleteMethod',
      id,
      conversationId,
      methodName,
      fileExtension,
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
    methodNames: string[],
    template: CodeTemplateType = 'unity'
  ): Promise<{ deletedMethods: Record<string, string> }> {
    if (!this.isIde || methodNames.length === 0) {
      return { deletedMethods: {} };
    }

    const fileExtension = getFileExtension(template);
    const { id, promise } = this.createRequest<{ deletedMethods: Record<string, string> }>();

    const message: CodeDeleteMethodsSilentMessage = {
      type: 'code:deleteMethodsSilent',
      id,
      conversationId,
      methodNames,
      fileExtension,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Restore a previously deleted method (for undo after node delete).
   * Generates the file wrapper in case the file was completely deleted.
   */
  async restoreMethod(
    conversationId: number,
    methodName: string,
    code: string,
    template: CodeTemplateType = 'unity'
  ): Promise<void> {
    if (!this.isIde || !code) {
      return;
    }

    // Generate file content in case the file was deleted and needs to be recreated
    const fileContent = generateConversationFile(conversationId, code.trim(), template);
    const fileExtension = getFileExtension(template);

    const { id, promise } = this.createRequest<void>();

    const message: CodeRestoreMethodMessage = {
      type: 'code:restoreMethod',
      id,
      conversationId,
      methodName,
      code,
      fileExtension,
      fileContent,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Delete an entire conversation code file (for permanent conversation delete).
   * Returns the deleted content for undo.
   */
  async deleteCodeFile(
    conversationId: number,
    template: CodeTemplateType = 'unity'
  ): Promise<{ deletedContent: string }> {
    if (!this.isIde) {
      return { deletedContent: '' };
    }

    const fileExtension = getFileExtension(template);
    const { id, promise } = this.createRequest<{ deletedContent: string }>();

    const message: CodeDeleteFileMessage = {
      type: 'code:deleteFile',
      id,
      conversationId,
      fileExtension,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Restore an entire conversation code file (for undo after permanent delete).
   */
  async restoreCodeFile(
    conversationId: number,
    content: string,
    template: CodeTemplateType = 'unity'
  ): Promise<void> {
    if (!this.isIde || !content) {
      return;
    }

    const fileExtension = getFileExtension(template);
    const { id, promise } = this.createRequest<void>();

    const message: CodeRestoreFileMessage = {
      type: 'code:restoreFile',
      id,
      conversationId,
      content,
      fileExtension,
    };

    this.postMessage(message);
    return promise;
  }

  /**
   * Open a method in the IDE (go to symbol).
   */
  openMethod(
    conversationId: number,
    methodName: string,
    template: CodeTemplateType = 'unity'
  ): void {
    const fileExtension = getFileExtension(template);
    this.postMessage({
      type: 'code:openMethod',
      conversationId,
      methodName,
      fileExtension,
    });
  }

  /**
   * Set up file watcher for code files.
   * Called when the code output folder is known/changes.
   * Pass null to clear the watcher.
   */
  watchCodeFolder(folderPath: string | null, fileExtension?: string): void {
    this.postMessage({
      type: 'code:watchFolder',
      folderPath,
      fileExtension,
    });
  }

  /**
   * Set up file watcher for snapshot command files.
   * Watches for command.tmp files written by game engine plugins (Unity, Godot).
   * Called when the snapshot output folder is known/changes.
   * Pass null to clear the watcher.
   */
  watchSnapshotFolder(folderPath: string | null): void {
    this.postMessage({
      type: 'snapshot:watchFolder',
      folderPath,
    });
  }
}

// Singleton instance
export const bridge = new ExtensionBridge();
