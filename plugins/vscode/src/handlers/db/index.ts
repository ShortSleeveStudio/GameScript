/**
 * Database message handlers.
 *
 * Handles all database-related messages from the webview:
 * - Query, exec, run, batch operations
 * - Transaction management (begin, commit, rollback)
 * - Connection management (connect, disconnect)
 * - Change notifications
 */

import * as vscode from 'vscode';
import type {
  DbQueryMessage,
  DbExecMessage,
  DbRunMessage,
  DbBatchMessage,
  DbTransactionBeginMessage,
  DbTransactionCommitMessage,
  DbTransactionRollbackMessage,
  DbConnectMessage,
  DbNotificationMeta,
} from '@gamescript/shared';
import type { DatabaseManager } from '../../database.js';
import type { HandlerRecord, PostMessageFn } from '../types.js';

const MAX_INVALID_ROWS_TO_LOG = 3;

/**
 * Database message handlers class.
 * Stateful - owns pending transaction notifications.
 */
export class DbHandlers {
  private readonly _pendingTxNotifications = new Map<string, Array<{ meta: DbNotificationMeta; rows: unknown[] }>>();

  constructor(
    private readonly _databaseManager: DatabaseManager,
    private readonly _postMessage: PostMessageFn,
    private readonly _sendThemeState: () => void
  ) {}

  /**
   * Get all database message handlers.
   */
  getHandlers(): HandlerRecord {
    return {
      'ready': () => this._sendConnectionStatus(),
      'db:query': (msg) => this._handleDbQuery(msg as DbQueryMessage),
      'db:exec': (msg) => this._handleDbExec(msg as DbExecMessage),
      'db:run': (msg) => this._handleDbRun(msg as DbRunMessage),
      'db:batch': (msg) => this._handleDbBatch(msg as DbBatchMessage),
      'db:transaction:begin': (msg) => this._handleDbTransactionBegin(msg as DbTransactionBeginMessage),
      'db:transaction:commit': (msg) => this._handleDbTransactionCommit(msg as DbTransactionCommitMessage),
      'db:transaction:rollback': (msg) => this._handleDbTransactionRollback(msg as DbTransactionRollbackMessage),
      'db:connect': (msg) => this._handleDbConnect(msg as DbConnectMessage),
      'db:disconnect': () => this._handleDbDisconnect(),
    };
  }

  // ==========================================================================
  // Connection Status
  // ==========================================================================

  private async _sendConnectionStatus(): Promise<void> {
    const isConnected = this._databaseManager.isConnected();
    const dbType = this._databaseManager.getType();

    this._postMessage({
      type: isConnected ? 'connected' : 'disconnected',
      dbType: dbType ?? null,
    });

    // Also send current theme state on initial connection
    this._sendThemeState();
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  private async _handleDbQuery(message: DbQueryMessage): Promise<void> {
    try {
      const result = await this._databaseManager.query(message.sql, message.params, message.context?.id);
      this._postMessage({
        type: 'db:queryResult',
        id: message.id,
        success: true,
        data: result,
      });
    } catch (error) {
      this._postMessage({
        type: 'db:queryResult',
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async _handleDbExec(message: DbExecMessage): Promise<void> {
    try {
      await this._databaseManager.exec(message.sql, message.context?.id);

      // exec() doesn't return rows, so use empty array
      await this._queueOrSendNotification(message.notificationMeta, [], message.context?.id);

      this._postMessage({
        type: 'db:execResult',
        id: message.id,
        success: true,
      });
    } catch (error) {
      this._postMessage({
        type: 'db:execResult',
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async _handleDbRun(message: DbRunMessage): Promise<void> {
    try {
      const result = await this._databaseManager.run(
        message.sql,
        message.params,
        message.returning,
        message.context?.id
      );

      // Send notification if we have rows OR if it's an alter operation (bulk ops don't return rows)
      if (result.rows.length > 0 || message.notificationMeta?.operation === 'alter') {
        await this._queueOrSendNotification(message.notificationMeta, result.rows, message.context?.id);
      }

      this._postMessage({
        type: 'db:runResult',
        id: message.id,
        success: true,
        lastID: result.lastID,
        changes: result.changes,
        rows: result.rows,
      });
    } catch (error) {
      this._postMessage({
        type: 'db:runResult',
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async _handleDbBatch(message: DbBatchMessage): Promise<void> {
    try {
      const insertIds: (number | undefined)[] = [];
      const notifications: Array<{ meta: DbNotificationMeta; rows: unknown[] }> = [];

      // Execute all statements in a transaction
      await this._databaseManager.transaction(async (connectionId) => {
        for (const stmt of message.statements) {
          const result = await this._databaseManager.run(stmt.sql, stmt.params, undefined, connectionId);
          insertIds.push(result.lastID);

          if (stmt.notificationMeta) {
            notifications.push({
              meta: stmt.notificationMeta,
              rows: result.rows,
            });
          }
        }
      });

      // Send all notifications after transaction commits
      for (const notification of notifications) {
        await this._handleNotificationMeta(notification.meta, notification.rows);
      }

      this._postMessage({
        type: 'db:batchResult',
        id: message.id,
        success: true,
        insertIds,
      });
    } catch (error) {
      this._postMessage({
        type: 'db:batchResult',
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==========================================================================
  // Transaction Management
  // ==========================================================================

  private async _handleDbTransactionBegin(message: DbTransactionBeginMessage): Promise<void> {
    try {
      const connectionId = await this._databaseManager.beginTransaction();

      this._postMessage({
        type: 'db:transactionBeginResult',
        id: message.id,
        success: true,
        context: { id: connectionId },
      });
    } catch (error) {
      this._postMessage({
        type: 'db:transactionBeginResult',
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async _handleDbTransactionCommit(message: DbTransactionCommitMessage): Promise<void> {
    try {
      const connectionId = message.context.id;

      // Commit the transaction
      await this._databaseManager.commitTransaction(connectionId);

      // Send deferred notifications now that transaction is committed
      const pending = this._pendingTxNotifications.get(connectionId);
      if (pending) {
        this._pendingTxNotifications.delete(connectionId);

        // Consolidate notifications by (table, operation) to reduce notification count
        const consolidated = this._consolidateNotifications(pending);
        for (const { meta, rows } of consolidated) {
          await this._handleNotificationMeta(meta, rows);
        }
      }

      this._postMessage({
        type: 'db:transactionCommitResult',
        id: message.id,
        success: true,
      });
    } catch (error) {
      // Clear pending notifications on failure
      this._pendingTxNotifications.delete(message.context.id);
      this._postMessage({
        type: 'db:transactionCommitResult',
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async _handleDbTransactionRollback(message: DbTransactionRollbackMessage): Promise<void> {
    try {
      const connectionId = message.context.id;

      // Clear pending notifications - don't send on rollback
      this._pendingTxNotifications.delete(connectionId);

      // Rollback the transaction
      await this._databaseManager.rollbackTransaction(connectionId);

      this._postMessage({
        type: 'db:transactionRollbackResult',
        id: message.id,
        success: true,
      });
    } catch (error) {
      this._pendingTxNotifications.delete(message.context.id);
      this._postMessage({
        type: 'db:transactionRollbackResult',
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  private async _handleDbConnect(message: DbConnectMessage): Promise<void> {
    try {
      await this._databaseManager.connect(message.config, message.createNew);
      await this._sendConnectionStatus();
      await this._databaseManager.startChangeNotifications();
    } catch (error) {
      console.error(`[DbHandlers] Connection error:`, error);
      this._postMessage({
        type: 'db:error',
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }

  private async _handleDbDisconnect(): Promise<void> {
    try {
      await this._databaseManager.dispose();
      await this._sendConnectionStatus();
    } catch (error) {
      this._postMessage({
        type: 'db:error',
        error: error instanceof Error ? error.message : 'Disconnect failed',
      });
    }
  }

  // ==========================================================================
  // Notification Helpers
  // ==========================================================================

  /**
   * Queue or send a notification based on transaction state.
   * Defers notifications during transactions until commit.
   */
  private async _queueOrSendNotification(
    meta: DbNotificationMeta | undefined,
    rows: unknown[],
    txId?: string
  ): Promise<void> {
    if (!meta) return;

    if (txId) {
      // Defer notification until transaction commits
      let pending = this._pendingTxNotifications.get(txId);
      if (!pending) {
        pending = [];
        this._pendingTxNotifications.set(txId, pending);
      }
      pending.push({ meta, rows });
    } else {
      // No transaction - send immediately
      await this._handleNotificationMeta(meta, rows);
    }
  }

  /**
   * Consolidate notifications by (table, operation), merging rows.
   * Matches Electron's combineAndBroadcastNotifications pattern.
   */
  private _consolidateNotifications(
    pending: Array<{ meta: DbNotificationMeta; rows: unknown[] }>
  ): Array<{ meta: DbNotificationMeta; rows: unknown[] }> {
    const grouped = new Map<string, { meta: DbNotificationMeta; rows: unknown[] }>();

    for (const { meta, rows } of pending) {
      const key = `${meta.table}:${meta.operation}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.rows.push(...rows);
      } else {
        grouped.set(key, { meta, rows: [...rows] });
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * Handle notification metadata from frontend operations.
   * Rows are now provided from RETURNING clause results.
   *
   * SQLite mode: Sends rows directly to local webview
   * PostgreSQL mode: Sends NOTIFY to propagate to all clients (including self via LISTEN)
   */
  private async _handleNotificationMeta(meta: DbNotificationMeta | undefined, rows?: unknown[]): Promise<void> {
    if (!meta) return;

    const isPostgres = this._databaseManager.getType() === 'postgres';
    const rowData = rows || [];

    // For ALTER operations
    if (meta.operation === 'alter') {
      // Always notify local webview for ALTER (both SQLite and PostgreSQL)
      this._postMessage({
        type: 'db:changed',
        table: meta.table,
        operation: 'alter',
        rows: [],
        timestamp: Date.now(),
      });

      // PostgreSQL: Also send NOTIFY to propagate to other clients
      if (isPostgres) {
        await this._databaseManager.sendPostgresNotify(meta.table, 'alter');
      }
      return;
    }

    // For INSERT/UPDATE/DELETE
    if (rowData.length === 0) {
      // No row data provided - trigger full reload
      if (!isPostgres) {
        this._postMessage({
          type: 'db:changed',
          table: meta.table,
          operation: meta.operation,
          rows: [],
          timestamp: Date.now(),
        });
      } else {
        await this._databaseManager.sendPostgresNotify(meta.table, meta.operation);
      }
      return;
    }

    // Validate rows before using them
    const validatedRows = this._validateRows(rowData);

    if (isPostgres) {
      // PostgreSQL: Extract IDs from validated rows and send NOTIFY with batched IDs
      const affectedIds = validatedRows.map((row) => row.id);
      await this._databaseManager.sendPostgresNotify(meta.table, meta.operation, affectedIds);
    } else {
      // SQLite: Send validated rows directly to local webview
      this._postMessage({
        type: 'db:changed',
        table: meta.table,
        operation: meta.operation,
        rows: validatedRows,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Type guard to validate that a value is a valid Row with an id.
   */
  private _isValidRow(value: unknown): value is Record<string, unknown> & { id: number } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof (value as Record<string, unknown>).id === 'number'
    );
  }

  /**
   * Validate and cast rows to the expected format with typed id field.
   * Filters out any invalid rows and logs warnings.
   */
  private _validateRows(rows: unknown[]): Array<Record<string, unknown> & { id: number }> {
    const validRows: Array<Record<string, unknown> & { id: number }> = [];
    let invalidCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (this._isValidRow(row)) {
        validRows.push(row);
      } else {
        invalidCount++;
        if (invalidCount <= MAX_INVALID_ROWS_TO_LOG) {
          console.warn(`[DbHandlers] Invalid row at index ${i}, skipping:`, row);
        }
      }
    }

    if (invalidCount > MAX_INVALID_ROWS_TO_LOG) {
      console.warn(`[DbHandlers] Skipped ${invalidCount - MAX_INVALID_ROWS_TO_LOG} additional invalid rows`);
    }

    if (invalidCount > 0 && validRows.length === 0) {
      vscode.window.showWarningMessage(
        `Database operation returned ${invalidCount} invalid row(s). Data may not be displayed correctly.`
      );
    }

    return validRows;
  }
}
