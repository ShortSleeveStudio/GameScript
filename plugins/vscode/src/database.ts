/**
 * DatabaseManager - SQLite and PostgreSQL abstraction layer for GameScript
 *
 * ============================================================================
 * HARD INVARIANTS - READ BEFORE MODIFYING
 * ============================================================================
 *
 * SQLite:
 * - Single writer: All write operations serialize through _enqueueSqliteWrite()
 * - One active transaction max: Nested transactions throw immediately
 * - All operations during a transaction MUST use the connectionId
 * - Operations without connectionId while a transaction is active will THROW
 * - WAL mode is enabled by default for better concurrency
 *
 * PostgreSQL:
 * - Connection pool with per-transaction client isolation
 * - Multiple concurrent transactions are supported
 * - Each transaction gets its own PoolClient
 *
 * Notifications:
 * - Eventually consistent - best-effort signals, not guarantees
 * - PostgreSQL uses LISTEN/NOTIFY with ID-based re-fetch
 * - SQLite uses manual notifyChange() calls after CRUD operations
 * - Rows may be missing or updated again between notification and fetch
 *
 * API Contracts:
 * - exec(): DDL only (CREATE, ALTER, DROP), no params, no return value
 * - run(): DML (INSERT, UPDATE, DELETE), with explicit returning option
 * - query(): SELECT statements, read-only
 * - lastID is only populated when a numeric 'id' column is explicitly returned
 *
 * ============================================================================
 */

import type { DatabaseConfig, DatabaseType } from '@gamescript/shared';
import { isKnownTableName } from '@gamescript/shared';

// These will be dynamically imported to avoid loading both drivers
interface Sqlite3Static {
  Database: new (filename: string, callback: (err: Error | null) => void) => Sqlite3Database;
}

let sqlite3: Sqlite3Static | undefined;
let pg: typeof import('pg') | undefined;

// ============================================================================
// Types
// ============================================================================

export type ChangeOperation = 'insert' | 'update' | 'delete';

export interface ChangeNotification {
  table: string;
  operation: ChangeOperation;
  /** Full row data for affected rows (matches Electron's notification pattern) */
  rows: Record<string, unknown>[];
  timestamp: number;
}

export type ChangeListener = (notification: ChangeNotification) => void;

/** Result from run() - lastID is optional since not all tables use numeric auto-increment */
export interface RunResult {
  /** Last inserted row ID (only populated if a numeric 'id' column was returned) */
  lastID?: number;
  /** Number of affected rows */
  changes: number;
  /** Rows returned from RETURNING clause (empty if returning option was false) */
  rows: unknown[];
}

// Type definitions for @vscode/sqlite3 (callback-based API)
interface Sqlite3RunContext {
  lastID: number;
  changes: number;
}

interface Sqlite3Database {
  all(sql: string, params: unknown[], callback: (err: Error | null, rows: unknown[]) => void): void;
  run(sql: string, params: unknown[], callback: (this: Sqlite3RunContext, err: Error | null) => void): void;
  get(sql: string, params: unknown[], callback: (err: Error | null, row: unknown) => void): void;
  exec(sql: string, callback: (err: Error | null) => void): void;
  close(callback: (err: Error | null) => void): void;
  configure(option: string, value: unknown): void;
}

// ============================================================================
// Promisified SQLite helpers
// ============================================================================

/**
 * Promisify sqlite3 Database methods since @vscode/sqlite3 uses callbacks.
 */
class SqliteWrapper {
  constructor(private db: Sqlite3Database) {}

  all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: Error | null, rows: unknown[]) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  run(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (this: Sqlite3RunContext, err: Error | null) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: Error | null, row: unknown) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  /** Execute DDL statements without parameters */
  exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}


// ============================================================================
// DatabaseManager
// ============================================================================

export class DatabaseManager {
  private _sqliteDb: SqliteWrapper | undefined;
  private _pgPool: import('pg').Pool | undefined;
  private _pgNotifyClient: import('pg').Client | undefined;
  private _type: DatabaseType | undefined;
  private _connected = false;
  private _sqliteFilePath: string | undefined;

  // Change notification support
  private _changeListeners: Set<ChangeListener> = new Set();

  // Error notification support (for critical failures like LISTEN disconnect)
  private _errorListeners: Set<(error: string) => void> = new Set();

  // Transaction management
  private _nextTransactionId = 1;

  // SQLite: Track the single active transaction (SQLite only supports one at a time)
  private _sqliteActiveTransaction: {
    id: string;
    startTime: number;
    stack: string;
  } | null = null;

  // PostgreSQL: Multiple concurrent transactions supported
  private _pgTransactions: Map<string, { client: import('pg').PoolClient; startTime: number }> = new Map();

  // SQLite operation queue to serialize ALL operations (reads, writes, DDL) during transactions
  private _sqliteOperationQueue: Promise<unknown> = Promise.resolve();

  // Development mode detection
  private _isDev = process.env.NODE_ENV === 'development' || process.env.VSCODE_DEBUG_MODE === 'true';

  // Leak detection interval (dev mode only)
  private _leakDetectionInterval: ReturnType<typeof setInterval> | undefined;
  private readonly TRANSACTION_LEAK_THRESHOLD_MS = 30000; // 30 seconds

  constructor() {
    // Start leak detection in dev mode
    if (this._isDev) {
      this._startLeakDetection();
    }
  }

  // ==========================================================================
  // Leak Detection (Development Mode)
  // ==========================================================================

  private _startLeakDetection(): void {
    this._leakDetectionInterval = setInterval(() => {
      this._checkForLeakedTransactions();
    }, 10000); // Check every 10 seconds
  }

  private _checkForLeakedTransactions(): void {
    const now = Date.now();

    // Check SQLite transaction
    if (this._sqliteActiveTransaction) {
      const age = now - this._sqliteActiveTransaction.startTime;
      if (age > this.TRANSACTION_LEAK_THRESHOLD_MS) {
        console.warn(
          `[DatabaseManager] WARNING: SQLite transaction ${this._sqliteActiveTransaction.id} has been open for ${Math.round(age / 1000)}s\n` +
          `Started at:\n${this._sqliteActiveTransaction.stack}`
        );
      }
    }

    // Check PostgreSQL transactions
    for (const [id, tx] of this._pgTransactions.entries()) {
      const age = now - tx.startTime;
      if (age > this.TRANSACTION_LEAK_THRESHOLD_MS) {
        console.warn(
          `[DatabaseManager] WARNING: PostgreSQL transaction ${id} has been open for ${Math.round(age / 1000)}s`
        );
      }
    }
  }

  // ==========================================================================
  // SQLite Operation Serialization
  // ==========================================================================

  /**
   * Enqueue an operation for SQLite to ensure serial execution.
   * ALL SQLite operations go through this queue when a transaction is active.
   */
  private _enqueueSqliteOperation<T>(fn: () => Promise<T>): Promise<T> {
    const result = this._sqliteOperationQueue.then(fn);
    // Keep the chain alive even if one operation fails
    this._sqliteOperationQueue = result.catch(() => {});
    return result;
  }

  /**
   * Validate that SQLite operations are properly scoped to transactions.
   * Throws if a transaction is active but no connectionId was provided.
   */
  private _validateSqliteTransactionScope(connectionId?: string): void {
    if (this._sqliteActiveTransaction && !connectionId) {
      throw new Error(
        `[DatabaseManager] SQLite operation attempted without connectionId while transaction ${this._sqliteActiveTransaction.id} is active.\n` +
        `All operations during a transaction must use the transaction's connectionId.\n` +
        `Transaction started at:\n${this._sqliteActiveTransaction.stack}`
      );
    }

    if (connectionId && !this._sqliteActiveTransaction) {
      throw new Error(
        `[DatabaseManager] SQLite connectionId '${connectionId}' provided but no active transaction exists.`
      );
    }

    if (connectionId && this._sqliteActiveTransaction && connectionId !== this._sqliteActiveTransaction.id) {
      throw new Error(
        `[DatabaseManager] SQLite connectionId '${connectionId}' does not match active transaction '${this._sqliteActiveTransaction.id}'.`
      );
    }
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  public isConnected(): boolean {
    return this._connected;
  }

  public getType(): DatabaseType | undefined {
    return this._type;
  }

  /**
   * Open a raw database connection (no validation or schema initialization).
   * Schema validation and initialization is handled by the UI layer.
   */
  public async open(config: DatabaseConfig): Promise<void> {
    await this.dispose();

    try {
      if (config.type === 'sqlite') {
        if (!config.filepath) {
          throw new Error('[DatabaseManager] SQLite filepath is required');
        }

        // Dynamic import - ESM import of CJS module wraps exports in 'default'
        if (!sqlite3) {
          const module = await import('@vscode/sqlite3');
          sqlite3 = module.default || module;
        }

        // Open database (creates file if it doesn't exist)
        const db = await new Promise<Sqlite3Database>((resolve, reject) => {
          const database = new sqlite3!.Database(config.filepath!, (err: Error | null) => {
            if (err) reject(err);
            else resolve(database);
          });
        });

        // Configure busy timeout to allow waiting for locks
        db.configure('busyTimeout', 30000); // 30 second timeout

        this._sqliteDb = new SqliteWrapper(db);
        this._sqliteFilePath = config.filepath;
        this._type = 'sqlite';
        this._connected = true;

        // Enable WAL mode for better concurrency
        await this._sqliteDb.exec('PRAGMA journal_mode = WAL');

      } else if (config.type === 'postgres') {
        if (!config.host || !config.database || !config.user) {
          throw new Error('[DatabaseManager] PostgreSQL host, database, and user are required');
        }

        // Dynamic import
        if (!pg) {
          pg = await import('pg');
        }

        this._pgPool = new pg.Pool({
          host: config.host,
          port: config.port ?? 5432,
          database: config.database,
          user: config.user,
          password: config.password,
        });

        // Test connection
        const client = await this._pgPool.connect();
        client.release();

        this._type = 'postgres';
        this._connected = true;
      }
    } catch (error) {
      this._connected = false;
      throw error;
    }
  }

  /**
   * Close the database connection.
   * Alias for dispose() but named consistently with open().
   */
  public async close(): Promise<void> {
    await this.dispose();
  }

  // ==========================================================================
  // Database Operations
  // ==========================================================================

  /**
   * Execute a SELECT query and return rows.
   *
   * For SQLite: Reads are safe with or without a transaction context (WAL mode).
   * If connectionId is provided, the read participates in that transaction.
   * If not provided during an active transaction, the read queues and executes
   * after the transaction completes.
   */
  public async query<T = unknown>(sql: string, params?: unknown[], connectionId?: string): Promise<T[]> {
    if (!this._connected) {
      throw new Error('[DatabaseManager] Database not connected');
    }

    if (this._type === 'sqlite') {
      // Note: We intentionally skip _validateSqliteTransactionScope for reads.
      // With WAL mode, concurrent readers are safe. A SELECT without connectionId
      // during an active transaction will queue behind it via _enqueueSqliteOperation
      // and execute after the transaction completes. This is correct behavior -
      // it allows table view reloads and other read operations to proceed without
      // requiring explicit transaction participation.

      if (!this._sqliteDb) {
        throw new Error('[DatabaseManager] SQLite database not initialized');
      }

      // If in a transaction, serialize through the queue
      if (this._sqliteActiveTransaction) {
        return this._enqueueSqliteOperation(async () => {
          return this._sqliteDb!.all<T>(sql, params);
        });
      }

      // Outside transaction, execute directly.
      // NOTE: With WAL mode enabled, readers safely see the last committed state
      // while a single writer is serialized via the operation queue. This is
      // intentionally NOT enqueued - concurrent reads are safe and performant.
      return this._sqliteDb.all<T>(sql, params);
    } else if (this._type === 'postgres') {
      const connection = this._getPostgresConnection(connectionId);
      const result = await connection.query(sql, params);
      return result.rows as T[];
    }

    throw new Error('[DatabaseManager] No database connection');
  }

  /**
   * Execute DDL statements (CREATE TABLE, ALTER TABLE, DROP, etc.)
   *
   * This method is for schema modifications only - no parameters supported.
   * For DML statements (INSERT, UPDATE, DELETE), use run().
   *
   * For SQLite: If a transaction is active, connectionId MUST be provided.
   */
  public async exec(sql: string, connectionId?: string): Promise<void> {
    if (!this._connected) {
      throw new Error('[DatabaseManager] Database not connected');
    }

    if (this._type === 'sqlite') {
      this._validateSqliteTransactionScope(connectionId);

      if (!this._sqliteDb) {
        throw new Error('[DatabaseManager] SQLite database not initialized');
      }

      // Always serialize DDL through the queue
      await this._enqueueSqliteOperation(async () => {
        await this._sqliteDb!.exec(sql);
      });
    } else if (this._type === 'postgres') {
      const connection = this._getPostgresConnection(connectionId);
      await connection.query(sql);
    } else {
      throw new Error('[DatabaseManager] No database connection');
    }
  }

  /**
   * Execute DML statements (INSERT, UPDATE, DELETE).
   *
   * @param sql - SQL statement to execute
   * @param params - Parameters for the SQL statement
   * @param returning - If true, expects SQL to have RETURNING clause and will return rows
   * @param connectionId - Transaction connection ID (required if transaction is active)
   *
   * For SQLite: If a transaction is active, connectionId MUST be provided.
   */
  public async run(
    sql: string,
    params?: unknown[],
    returning?: boolean,
    connectionId?: string
  ): Promise<RunResult> {
    if (!this._connected) {
      throw new Error('[DatabaseManager] Database not connected');
    }

    const expectReturning = returning ?? false;

    if (this._type === 'sqlite') {
      this._validateSqliteTransactionScope(connectionId);

      if (!this._sqliteDb) {
        throw new Error('[DatabaseManager] SQLite database not initialized');
      }

      // Always serialize writes through the queue
      return this._enqueueSqliteOperation(async () => {
        if (expectReturning) {
          // Use .all() to get rows from RETURNING clause
          const rows = await this._sqliteDb!.all(sql, params);
          const changes = rows.length;
          // Only set lastID if we have rows and they have a numeric 'id' field
          const firstRow = rows[0] as Record<string, unknown> | undefined;
          const lastID = firstRow && typeof firstRow.id === 'number' ? firstRow.id : undefined;
          return { lastID, changes, rows };
        } else {
          // Use .run() for lastID and changes (no RETURNING clause)
          const result = await this._sqliteDb!.run(sql, params);
          return { lastID: result.lastID, changes: result.changes, rows: [] };
        }
      });
    } else if (this._type === 'postgres') {
      const connection = this._getPostgresConnection(connectionId);
      const result = await connection.query(sql, params);
      const rows = result.rows || [];
      const changes = result.rowCount ?? 0;
      // PostgreSQL may return BIGINT as string, so coerce if present
      const firstRow = rows[0] as Record<string, unknown> | undefined;
      const rawId = firstRow?.id;
      const lastID = rawId !== undefined && rawId !== null ? Number(rawId) : undefined;
      return { lastID, changes, rows };
    }

    throw new Error('[DatabaseManager] No database connection');
  }

  /**
   * Get a PostgreSQL client (either transaction client or pool for query).
   */
  private _getPostgresConnection(connectionId?: string): import('pg').PoolClient | import('pg').Pool {
    if (connectionId) {
      const tx = this._pgTransactions.get(connectionId);
      if (!tx) {
        throw new Error(`[DatabaseManager] PostgreSQL transaction ${connectionId} not found`);
      }
      return tx.client;
    }

    if (!this._pgPool) {
      throw new Error('[DatabaseManager] PostgreSQL pool not connected');
    }
    return this._pgPool;
  }

  // ==========================================================================
  // Transaction Management
  // ==========================================================================

  /**
   * Execute a function within a database transaction.
   *
   * All database operations within the callback MUST use the provided connectionId.
   * For SQLite, operations without connectionId during a transaction will throw.
   */
  public async transaction<T>(fn: (connectionId: string) => Promise<T>): Promise<T> {
    const connectionId = await this.beginTransaction();
    try {
      const result = await fn(connectionId);
      await this.commitTransaction(connectionId);
      return result;
    } catch (error) {
      // Always attempt rollback on error
      try {
        await this.rollbackTransaction(connectionId);
      } catch (rollbackError) {
        console.error('[DatabaseManager] Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * Begin a new transaction and return a connection ID.
   *
   * For SQLite: Only ONE transaction can be active at a time.
   * Nested transactions are NOT supported and will throw.
   */
  public async beginTransaction(): Promise<string> {
    if (!this._connected) {
      throw new Error('[DatabaseManager] Database not connected');
    }

    const connectionId = `tx_${this._nextTransactionId++}`;
    const stack = new Error().stack || 'No stack available';
    const startTime = Date.now();

    if (this._type === 'sqlite') {
      // STRICT: No nested transactions for SQLite
      if (this._sqliteActiveTransaction) {
        throw new Error(
          `[DatabaseManager] Cannot start transaction ${connectionId}: SQLite transaction ${this._sqliteActiveTransaction.id} is already active.\n` +
          `SQLite does not support nested transactions.\n` +
          `Existing transaction started at:\n${this._sqliteActiveTransaction.stack}`
        );
      }

      if (!this._sqliteDb) {
        throw new Error('[DatabaseManager] SQLite database not initialized');
      }

      // Begin the transaction
      // BEGIN IMMEDIATE acquires a RESERVED lock up-front,
      // preventing deadlocks caused by deferred writes later.
      await this._enqueueSqliteOperation(async () => {
        await this._sqliteDb!.run('BEGIN IMMEDIATE');
      });

      this._sqliteActiveTransaction = {
        id: connectionId,
        startTime,
        stack,
      };
    } else if (this._type === 'postgres' && this._pgPool) {
      // PostgreSQL supports multiple concurrent transactions
      const client = await this._pgPool.connect();
      await client.query('BEGIN');
      this._pgTransactions.set(connectionId, { client, startTime });
    } else {
      throw new Error('[DatabaseManager] No database connection');
    }

    return connectionId;
  }

  /**
   * Commit a transaction by connection ID.
   */
  public async commitTransaction(connectionId: string): Promise<void> {
    if (this._type === 'sqlite') {
      if (!this._sqliteActiveTransaction || this._sqliteActiveTransaction.id !== connectionId) {
        throw new Error(`[DatabaseManager] SQLite transaction ${connectionId} not found or not active`);
      }

      await this._enqueueSqliteOperation(async () => {
        await this._sqliteDb!.run('COMMIT');
      });

      this._sqliteActiveTransaction = null;
    } else if (this._type === 'postgres') {
      const tx = this._pgTransactions.get(connectionId);
      if (!tx) {
        throw new Error(`[DatabaseManager] PostgreSQL transaction ${connectionId} not found`);
      }

      await tx.client.query('COMMIT');
      tx.client.release();
      this._pgTransactions.delete(connectionId);
    } else {
      throw new Error('[DatabaseManager] No database connection');
    }
  }

  /**
   * Rollback a transaction by connection ID.
   */
  public async rollbackTransaction(connectionId: string): Promise<void> {
    if (this._type === 'sqlite') {
      if (!this._sqliteActiveTransaction || this._sqliteActiveTransaction.id !== connectionId) {
        throw new Error(`[DatabaseManager] SQLite transaction ${connectionId} not found or not active`);
      }

      await this._enqueueSqliteOperation(async () => {
        await this._sqliteDb!.run('ROLLBACK');
      });

      this._sqliteActiveTransaction = null;
    } else if (this._type === 'postgres') {
      const tx = this._pgTransactions.get(connectionId);
      if (!tx) {
        throw new Error(`[DatabaseManager] PostgreSQL transaction ${connectionId} not found`);
      }

      await tx.client.query('ROLLBACK');
      tx.client.release();
      this._pgTransactions.delete(connectionId);
    } else {
      throw new Error('[DatabaseManager] No database connection');
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  public async dispose(): Promise<void> {
    // Stop leak detection
    if (this._leakDetectionInterval) {
      clearInterval(this._leakDetectionInterval);
      this._leakDetectionInterval = undefined;
    }

    this.stopChangeNotifications();

    // Log any leaked transactions before cleanup
    if (this._sqliteActiveTransaction) {
      console.warn(
        `[DatabaseManager] Disposing with active SQLite transaction ${this._sqliteActiveTransaction.id}\n` +
        `Transaction started at:\n${this._sqliteActiveTransaction.stack}`
      );
      try {
        await this._sqliteDb?.run('ROLLBACK');
      } catch (error) {
        console.error('[DatabaseManager] Error rolling back leaked SQLite transaction:', error);
      }
      this._sqliteActiveTransaction = null;
    }

    for (const [id, tx] of this._pgTransactions.entries()) {
      console.warn(`[DatabaseManager] Disposing with active PostgreSQL transaction ${id}`);
      try {
        await tx.client.query('ROLLBACK');
        tx.client.release();
      } catch (error) {
        console.error(`[DatabaseManager] Error closing PostgreSQL transaction ${id}:`, error);
      }
    }
    this._pgTransactions.clear();

    if (this._sqliteDb) {
      await this._sqliteDb.close();
      this._sqliteDb = undefined;
    }

    if (this._pgPool) {
      await this._pgPool.end();
      this._pgPool = undefined;
    }

    if (this._pgNotifyClient) {
      await this._pgNotifyClient.end();
      this._pgNotifyClient = undefined;
    }

    this._type = undefined;
    this._connected = false;
    this._sqliteFilePath = undefined;
  }

  // ==========================================================================
  // Change Notification Support
  // ==========================================================================

  /**
   * Subscribe to database change notifications.
   *
   * IMPORTANT: Notifications are eventually consistent.
   * - They are best-effort signals, not delivery guarantees
   * - Rows may be missing, modified, or deleted between notification and fetch
   * - Use notifications to trigger UI updates, not for data integrity
   *
   * Returns an unsubscribe function.
   */
  public onChangeNotification(listener: ChangeListener): () => void {
    this._changeListeners.add(listener);
    return () => this._changeListeners.delete(listener);
  }

  /**
   * Subscribe to critical error notifications (e.g., LISTEN disconnect).
   * Returns an unsubscribe function.
   */
  public onError(listener: (error: string) => void): () => void {
    this._errorListeners.add(listener);
    return () => this._errorListeners.delete(listener);
  }

  /**
   * Emit a change notification to all listeners.
   */
  private emitChange(notification: ChangeNotification): void {
    for (const listener of this._changeListeners) {
      try {
        listener(notification);
      } catch (error) {
        console.error('[DatabaseManager] Change listener error:', error);
      }
    }
  }

  /**
   * Emit an error notification to all listeners.
   */
  private emitError(error: string): void {
    for (const listener of this._errorListeners) {
      try {
        listener(error);
      } catch (err) {
        console.error('[DatabaseManager] Error listener error:', err);
      }
    }
  }

  /**
   * Start listening for database changes.
   * For PostgreSQL: Uses LISTEN/NOTIFY
   * For SQLite: Uses manual notifyChange() calls after CRUD operations
   */
  public async startChangeNotifications(): Promise<void> {
    if (this._type === 'postgres') {
      await this.startPostgresNotifications();
    }
    // SQLite: No automatic notifications - use notifyChange() after CRUD operations
  }

  /**
   * Stop listening for database changes.
   */
  public stopChangeNotifications(): void {
    if (this._pgNotifyClient) {
      this._pgNotifyClient.end();
      this._pgNotifyClient = undefined;
    }
  }

  // --------------------------------------------------------------------------
  // PostgreSQL LISTEN/NOTIFY
  // --------------------------------------------------------------------------

  private async startPostgresNotifications(): Promise<void> {
    if (!pg || !this._pgPool) return;

    // Create a dedicated client for LISTEN (can't use pool for persistent listen)
    // Extract only the connection options we need
    const { host, port, database, user, password } = this._pgPool.options;
    this._pgNotifyClient = new pg.Client({ host, port, database, user, password });
    await this._pgNotifyClient.connect();

    // Handle LISTEN client errors - critical failures for notification system
    this._pgNotifyClient.on('error', (err) => {
      console.error('[DatabaseManager] PostgreSQL LISTEN client error:', err);
      this.emitError(`Database notification system error: ${err.message}`);
    });

    this._pgNotifyClient.on('end', () => {
      console.error('[DatabaseManager] PostgreSQL LISTEN client disconnected');
      this.emitError('Database notification system disconnected');
    });

    // Listen for notifications on the 'gamescript_changes' channel
    this._pgNotifyClient.on('notification', async (msg) => {
      if (msg.channel === 'gamescript_changes' && msg.payload) {
        try {
          const data = JSON.parse(msg.payload);

          // Validate table name to prevent SQL injection (uses canonical source from @gamescript/shared)
          if (typeof data.table !== 'string' || !isKnownTableName(data.table)) {
            console.warn(`[DatabaseManager] Unknown table in notification: ${data.table}`);
            return;
          }

          // Notification payload contains table, operation, and ids array
          // Fetch the full row data for affected IDs (eventually consistent)
          let rows: Record<string, unknown>[] = [];

          if (data.ids && Array.isArray(data.ids) && data.ids.length > 0 && data.operation !== 'delete') {
            try {
              const MAX_IDS_PER_BATCH = 100; // Stays well under 8KB NOTIFY payload limit

              if (data.ids.length > MAX_IDS_PER_BATCH) {
                // Fetch in batches to avoid query size limits
                for (let i = 0; i < data.ids.length; i += MAX_IDS_PER_BATCH) {
                  const batch = data.ids.slice(i, i + MAX_IDS_PER_BATCH);
                  const placeholders = batch.map((_id: number, idx: number) => `$${idx + 1}`).join(', ');
                  const result = await this.query<Record<string, unknown>>(
                    `SELECT * FROM "${data.table}" WHERE id IN (${placeholders})`,
                    batch
                  );
                  rows.push(...result);
                }
              } else {
                // Single query for small arrays
                const placeholders = data.ids.map((_id: number, i: number) => `$${i + 1}`).join(', ');
                const result = await this.query<Record<string, unknown>>(
                  `SELECT * FROM "${data.table}" WHERE id IN (${placeholders})`,
                  data.ids
                );
                rows = result;
              }
            } catch (error) {
              // Notifications are eventually consistent - failures are expected
              console.warn(`[DatabaseManager] Failed to fetch row data for notification:`, error);
            }
          }

          this.emitChange({
            table: data.table,
            operation: data.operation,
            rows,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('[DatabaseManager] Failed to parse notification payload:', error);
        }
      }
    });

    await this._pgNotifyClient.query('LISTEN gamescript_changes');
    console.log('[DatabaseManager] PostgreSQL: Listening for change notifications');
  }

  /**
   * Manually emit a change notification (for when CRUD operations complete).
   * This is useful when the database doesn't have triggers set up.
   * @param rows Full row data for affected rows
   */
  public notifyChange(table: string, operation: ChangeOperation, rows: Record<string, unknown>[]): void {
    // Validate table name for consistency with PostgreSQL notifications
    if (!isKnownTableName(table)) {
      console.warn(`[DatabaseManager] notifyChange called with unknown table: ${table}`);
      return;
    }
    this.emitChange({
      table,
      operation,
      rows,
      timestamp: Date.now(),
    });
  }

  /**
   * Send a PostgreSQL NOTIFY message for a database change.
   * This is used by the metadata-based notification system to propagate changes
   * from one client to other connected clients.
   *
   * @param table Table name
   * @param operation Operation type
   * @param ids Array of affected row IDs (for INSERT/UPDATE/DELETE)
   */
  public async sendPostgresNotify(table: string, operation: string, ids?: number[]): Promise<void> {
    if (this._type !== 'postgres' || !this._pgPool) {
      return; // Only for PostgreSQL
    }

    try {
      const notification = JSON.stringify({
        table,
        operation,
        ids: ids ?? [],
      });

      await this._pgPool.query('SELECT pg_notify($1, $2)', ['gamescript_changes', notification]);
    } catch (error) {
      console.warn('[DatabaseManager] Failed to send PostgreSQL NOTIFY:', error);
    }
  }
}
