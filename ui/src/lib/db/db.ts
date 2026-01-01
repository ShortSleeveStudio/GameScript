/**
 * Database interface for GameScript.
 *
 * This module provides the main database API that integrates with the
 * IDE extension bridge. It manages:
 * - Row view cache (singleton DbRowView per row)
 * - Table view registry
 * - CRUD operations
 * - Change notifications
 * - PostgreSQL and SQLite dialect support
 *
 * All write operations automatically notify table views via direct method calls,
 * mirroring Electron's architecture. External changes (e.g., from PostgreSQL
 * LISTEN/NOTIFY) are handled via the bridge 'dataChanged' event.
 *
 * Ported from GameScriptElectron, adapted for IDE bridge communication.
 */

import type { Row, QueryFilter, TransactionContext, DbNotificationMeta } from '@gamescript/shared';
import { query } from '@gamescript/shared';
import { get, writable, type Readable, type Writable } from 'svelte/store';
import { bridge } from '$lib/api/bridge.js';
// Note: dbConnected is set via setConnectionStore() to avoid circular imports
import {
    focusManager,
    FOCUS_MODE_MODIFY,
    FOCUS_REMOVE,
    type Focus,
    type FocusRequests,
} from '$lib/stores/focus.js';
import { EVENT_DB_COLUMN_DELETING } from '$lib/constants/events.js';
import { DATABASE_TABLES, type TableRef } from '@gamescript/shared';
import { DbRowView } from './db-view-row.svelte.js';
import type { IDbRowView } from './db-view-row-interface.js';
import { DbTableView } from './db-view-table.svelte.js';
import type { IDbTableView } from './db-view-table-interface.js';
import { toastError, toastWarning } from '$lib/stores/notifications.js';

/**
 * Database dialect for SQL generation.
 */
export type DbDialect = 'sqlite' | 'postgres';

/**
 * Main database class.
 */
class Database {
    // Row view cache: one DbRowView per row, shared across all components
    private _tableToRowView: Map<number, DbRowView<Row>>[];

    // Table view registry: tracks all active table views
    private _tableToTableView: Map<number, DbTableView<Row>>[];

    // Proxy store that forwards connection state to table views
    // Table views subscribe to this, and we forward changes from the real dbConnected store
    // This ensures table views created before setConnectionStore() still get updates
    private _isConnectedProxy: Writable<boolean>;

    // Database dialect (sqlite or postgres)
    private _dialect: DbDialect = 'sqlite';

    constructor() {
        // Initialize lookup tables for each database table
        this._tableToRowView = DATABASE_TABLES.map(() => new Map());
        this._tableToTableView = DATABASE_TABLES.map(() => new Map());
        // Create a writable that we control - this is what table views subscribe to
        // When the real connection store changes, we update this proxy
        this._isConnectedProxy = writable(false);
    }

    /**
     * Set the connection state store.
     * Called during initialization to avoid circular imports.
     * Subscribes to the real store and forwards changes to the proxy.
     */
    setConnectionStore(isConnected: Readable<boolean>): void {
        // Forward changes from the real store to our proxy
        // This way, table views created before this call will still get updates
        isConnected.subscribe((value) => {
            this._isConnectedProxy.set(value);
            // Clear row view cache on disconnect to prevent stale data
            if (!value) {
                this.clearRowViewCache();
            }
        });
    }

    /**
     * Clear all row views from the cache.
     * Called on disconnect to prevent stale data when reconnecting.
     */
    private clearRowViewCache(): void {
        for (let i = 0; i < this._tableToRowView.length; i++) {
            this._tableToRowView[i].clear();
        }
    }

    // =========================================================================
    // Dialect Management
    // =========================================================================

    /**
     * Get the current database dialect.
     */
    get dialect(): DbDialect {
        return this._dialect;
    }

    /**
     * Set the database dialect.
     */
    setDialect(dialect: DbDialect): void {
        this._dialect = dialect;
    }

    /**
     * Initialize the database and set up change listeners.
     */
    init(): void {
        // Listen for data changes from the extension
        bridge.on('dataChanged', async (event) => {
            // Skip notifications when disconnected (e.g., during initialization or reconnection)
            if (!get(this._isConnectedProxy)) return;

            const tableType = DATABASE_TABLES.find((t) => t.name === event.table);
            if (!tableType) {
                toastWarning('[DB] Unknown table in dataChanged event', event.table);
                return;
            }

            // Cast rows to the appropriate type
            const rows = event.rows as Row[];

            switch (event.operation) {
                case 'insert':
                    // We have full row data from the notification
                    await this.notifyOnRowLifecycleEvent(tableType, rows);
                    break;
                case 'delete':
                    // Clear deleted rows from cache and focus, then notify table views
                    this.removeRowViewsAndFocus(tableType, rows.map((r) => r.id));
                    await this.notifyOnRowLifecycleEvent(tableType, rows);
                    break;
                case 'update':
                    // We have full row data, no need to fetch
                    await this.notifyOnRowsUpdated(tableType, rows);
                    break;
                case 'alter':
                    // Schema change (e.g., column added/removed) - reload all table views
                    await this.notifyOnTableAltered(tableType);
                    break;
            }
        });
    }

    // =========================================================================
    // Table View Management
    // =========================================================================

    /**
     * Fetch a table view with the given filter.
     * Creates a new DbTableView that will load rows matching the filter.
     */
    fetchTable<RowType extends Row>(
        tableType: TableRef,
        filter: QueryFilter<RowType>,
    ): IDbTableView<RowType> {
        // Validate tableType to catch initialization issues early
        if (!tableType || tableType.id === undefined || tableType.name === undefined) {
            toastError('[DB] fetchTable called with invalid tableType:', tableType);
            throw new Error(
                `fetchTable called with invalid tableType: ${JSON.stringify(tableType)}. ` +
                'This usually indicates a circular import or module initialization issue.'
            );
        }

        // Create view - pass `this` as the fetcher to avoid circular imports
        // Use the proxy so table views always see the current connection state
        const tableView = new DbTableView<RowType>(tableType, filter, this._isConnectedProxy, this);

        // Store it in the registry
        this.getTableViewsForTable(tableType).set(tableView.viewId, tableView);

        return tableView;
    }

    /**
     * Release a table view, disposing of its resources.
     */
    releaseTable<RowType extends Row>(tableView: IDbTableView<RowType>): void {
        const tableViewMap = this.getTableViewsForTable(tableView.tableType);
        tableViewMap.delete(tableView.viewId);
        (tableView as DbTableView<RowType>).dispose();
    }

    // =========================================================================
    // Read Operations
    // =========================================================================

    /**
     * Select rows from a table.
     */
    async select<RowType extends Row>(
        tableType: TableRef,
        filter?: QueryFilter<RowType>,
        connection?: TransactionContext,
    ): Promise<RowType[]> {
        let sql = `SELECT * FROM ${this.quoteIdentifier(tableType.name)}`;
        let params: unknown[] = [];
        if (filter) {
            sql += ` ${filter.toSqlSuffix(this._dialect)}`;
            params = filter.getParameters();
        }
        return bridge.query<RowType>(sql, params, connection);
    }

    /**
     * Select a single row by ID.
     */
    async selectById<RowType extends Row>(
        tableType: TableRef,
        id: number,
        connection?: TransactionContext,
    ): Promise<RowType | null> {
        const sql = `SELECT * FROM ${this.quoteIdentifier(tableType.name)} WHERE id = ${this.placeholder(1)}`;
        const results = await bridge.query<RowType>(sql, [id], connection);
        return results[0] ?? null;
    }

    /**
     * Count rows in a table.
     */
    async count<RowType extends Row>(
        tableType: TableRef,
        filter?: QueryFilter<RowType>,
        connection?: TransactionContext,
    ): Promise<number> {
        let sql = `SELECT COUNT(*) as count FROM ${this.quoteIdentifier(tableType.name)}`;
        let params: unknown[] = [];
        if (filter) {
            const whereClause = filter.toWhereClause(this._dialect);
            if (whereClause) {
                sql += ` WHERE ${whereClause}`;
                params = filter.getParameters();
            }
        }
        const result = await bridge.query<{ count: number }>(sql, params, connection);
        return result[0]?.count ?? 0;
    }

    /**
     * Check if a row exists.
     */
    async exists<RowType extends Row>(
        tableType: TableRef,
        filter: QueryFilter<RowType>,
        connection?: TransactionContext,
    ): Promise<boolean> {
        const whereClause = filter.toWhereClause(this._dialect);
        if (!whereClause) return true; // Empty filter matches everything

        const sql = `SELECT 1 FROM ${this.quoteIdentifier(tableType.name)} WHERE ${whereClause} LIMIT 1`;
        const params = filter.getParameters();
        const result = await bridge.query(sql, params, connection);
        return result.length > 0;
    }

    // =========================================================================
    // Row View Operations (for reactive UI)
    // =========================================================================

    /**
     * Fetch rows and return them as IDbRowView instances.
     * This is the main method for loading data - it ensures each row
     * has exactly one DbRowView instance in the cache.
     */
    async fetchRows<RowType extends Row>(
        tableType: TableRef,
        filter: QueryFilter<RowType>,
        connection?: TransactionContext,
    ): Promise<IDbRowView<RowType>[]> {
        const rowViews: IDbRowView<RowType>[] = [];
        const results = await this.select<RowType>(tableType, filter, connection);

        // Map to row views, reusing existing ones from cache
        const rowViewMap = this.getRowViewsForTable<RowType>(tableType);

        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            let rowView = rowViewMap.get(row.id);

            if (!rowView) {
                // Create new row view and add to cache
                rowView = new DbRowView<RowType>(tableType, row, () =>
                    this.destroyRowView(tableType, row.id),
                );
                rowViewMap.set(row.id, rowView);
            } else {
                // Update existing row view with fresh data
                rowView._update(row);
            }

            rowViews.push(rowView);
        }

        return rowViews;
    }

    /**
     * Get a single row view by ID, fetching from DB if not in cache.
     */
    async getRowView<RowType extends Row>(
        tableType: TableRef,
        id: number,
        connection?: TransactionContext,
    ): Promise<IDbRowView<RowType> | undefined> {
        // Check cache first
        const rowViewMap = this.getRowViewsForTable<RowType>(tableType);
        const existing = rowViewMap.get(id);
        if (existing) {
            return existing;
        }

        // Fetch from database
        const filter = query<RowType>()
            .where('id' as keyof RowType)
            .eq(id)
            .build();

        const rowViews = await this.fetchRows<RowType>(tableType, filter, connection);
        return rowViews[0];
    }

    // =========================================================================
    // Create Operations
    // =========================================================================

    /**
     * Insert a new row and return the full inserted row.
     */
    async insert<RowType extends Row>(
        tableType: TableRef,
        data: Omit<RowType, 'id'>,
        connection?: TransactionContext,
    ): Promise<RowType> {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const columnList = columns.map((c) => this.quoteIdentifier(c)).join(', ');
        const placeholders = columns.map((_, i) => this.placeholder(i + 1)).join(', ');

        const sql = `INSERT INTO ${this.quoteIdentifier(tableType.name)} (${columnList}) VALUES (${placeholders}) RETURNING *`;
        const meta: DbNotificationMeta = {
            table: tableType.name,
            operation: 'insert',
        };
        const result = await bridge.run(sql, values, true, meta, connection);
        return result.rows[0] as RowType;
    }

    /**
     * Insert a row with a specific ID (for undo/restore operations).
     * Preserves the exact row including its original ID.
     */
    async insertWithId<RowType extends Row>(
        tableType: TableRef,
        data: RowType,
        connection?: TransactionContext,
    ): Promise<RowType> {
        // When inserting with ID, we include the id in the data
        return this.insert<RowType>(tableType, data as Omit<RowType, 'id'>, connection);
    }

    /**
     * Insert multiple rows with their specific IDs (for undo/restore operations).
     * Runs within a transaction for atomicity.
     */
    async insertMany<RowType extends Row>(
        tableType: TableRef,
        rows: RowType[],
        connection?: TransactionContext,
    ): Promise<RowType[]> {
        if (rows.length === 0) return [];

        const results: RowType[] = [];

        const doInserts = async (tx: TransactionContext) => {
            for (const row of rows) {
                const result = await this.insertWithId<RowType>(tableType, row, tx);
                results.push(result);
            }
        };

        if (connection) {
            await doInserts(connection);
        } else {
            await bridge.transaction(doInserts);
        }

        return results;
    }

    // =========================================================================
    // Update Operations
    // =========================================================================

    /**
     * Update multiple complete rows and return the updated rows.
     * Each row must include its id. Runs within a transaction for atomicity.
     */
    async updateRows<RowType extends Row>(
        tableType: TableRef,
        rows: RowType[],
        connection?: TransactionContext,
    ): Promise<RowType[]> {
        if (rows.length === 0) return [];

        const results: RowType[] = [];

        const doUpdates = async (tx: TransactionContext) => {
            for (const row of rows) {
                const { id, ...data } = row;
                const columns = Object.keys(data);
                const values = Object.values(data);

                if (columns.length === 0) {
                    // No changes, just fetch current row
                    const current = await bridge.query<RowType>(
                        `SELECT * FROM ${this.quoteIdentifier(tableType.name)} WHERE id = ${this.placeholder(1)}`,
                        [id],
                        tx
                    );
                    if (current[0]) results.push(current[0]);
                    continue;
                }

                const setClauses = columns.map((col, i) =>
                    `${this.quoteIdentifier(col)} = ${this.placeholder(i + 1)}`
                ).join(', ');
                const sql = `UPDATE ${this.quoteIdentifier(tableType.name)} SET ${setClauses} WHERE id = ${this.placeholder(columns.length + 1)} RETURNING *`;

                const meta: DbNotificationMeta = {
                    table: tableType.name,
                    operation: 'update',
                };
                const result = await bridge.run(sql, [...values, id], true, meta, tx);
                if (result.rows[0]) {
                    results.push(result.rows[0] as RowType);
                }
            }
        };

        if (connection) {
            // Already in a transaction
            await doUpdates(connection);
        } else {
            // Wrap in transaction for atomicity
            await bridge.transaction(doUpdates);
        }

        return results;
    }

    /**
     * Update a single complete row and return the updated row.
     */
    async updateRow<RowType extends Row>(
        tableType: TableRef,
        row: RowType,
        connection?: TransactionContext,
    ): Promise<RowType> {
        const results = await this.updateRows<RowType>(tableType, [row], connection);
        if (results.length === 0) {
            throw new Error(`Row ${row.id} not found in ${tableType.name}`);
        }
        return results[0];
    }

    /**
     * Update specific fields of a row by ID.
     */
    async updatePartial<RowType extends Row>(
        tableType: TableRef,
        id: number,
        data: Partial<Omit<RowType, 'id'>>,
        connection?: TransactionContext,
    ): Promise<RowType> {
        const columns = Object.keys(data);
        const values = Object.values(data);
        if (columns.length === 0) {
            const result = await this.selectById<RowType>(tableType, id, connection);
            if (!result) throw new Error(`Row ${id} not found in ${tableType.name}`);
            return result;
        }

        const setClauses = columns.map((col, i) =>
            `${this.quoteIdentifier(col)} = ${this.placeholder(i + 1)}`
        ).join(', ');
        const sql = `UPDATE ${this.quoteIdentifier(tableType.name)} SET ${setClauses} WHERE id = ${this.placeholder(columns.length + 1)} RETURNING *`;

        const meta: DbNotificationMeta = {
            table: tableType.name,
            operation: 'update',
        };
        const result = await bridge.run(sql, [...values, id], true, meta, connection);
        return result.rows[0] as RowType;
    }

    // =========================================================================
    // Delete Operations
    // =========================================================================

    /**
     * Delete rows by ID(s).
     */
    async delete(
        tableType: TableRef,
        ids: number | number[],
        connection?: TransactionContext,
    ): Promise<void> {
        const idArray = Array.isArray(ids) ? ids : [ids];
        if (idArray.length === 0) return;

        const placeholders = idArray.map((_, i) => this.placeholder(i + 1)).join(', ');
        const sql = `DELETE FROM ${this.quoteIdentifier(tableType.name)} WHERE id IN (${placeholders}) RETURNING *`;
        const meta: DbNotificationMeta = {
            table: tableType.name,
            operation: 'delete',
        };
        await bridge.run(sql, idArray, true, meta, connection);
    }

    /**
     * Delete rows matching a filter.
     * Uses 'alter' notification to trigger full table view reload since this is a bulk operation.
     */
    async deleteWhere<RowType extends Row>(
        tableType: TableRef,
        filter: QueryFilter<RowType>,
        connection?: TransactionContext,
    ): Promise<void> {
        const whereClause = filter.toWhereClause(this._dialect);
        const filterParams = filter.getParameters();

        if (!whereClause) {
            throw new Error('deleteWhere requires a filter with WHERE clause');
        }

        const sql = `DELETE FROM ${this.quoteIdentifier(tableType.name)} WHERE ${whereClause}`;
        const meta: DbNotificationMeta = {
            table: tableType.name,
            operation: 'alter', // Use 'alter' to trigger full reload
        };
        await bridge.run(sql, filterParams, false, meta, connection);
    }

    // =========================================================================
    // Bulk Operations
    // =========================================================================

    /**
     * Search and replace text in a specific column.
     * Replaces all occurrences of `search` with `replace` in the specified column.
     * Uses 'alter' notification to trigger full table view reload since this is a bulk operation.
     */
    async searchAndReplace<RowType extends Row>(
        tableType: TableRef,
        filter: QueryFilter<RowType>,
        column: keyof RowType & string,
        search: string,
        replace: string,
        connection?: TransactionContext,
    ): Promise<void> {
        const whereClause = filter.toWhereClause(this._dialect);
        const filterParams = filter.getParameters();
        const sql = `UPDATE ${this.quoteIdentifier(tableType.name)} SET ${this.quoteIdentifier(column)} = REPLACE(${this.quoteIdentifier(column)}, ${this.placeholder(1)}, ${this.placeholder(2)})${whereClause ? ` WHERE ${whereClause}` : ''}`;

        // Use 'alter' to trigger full reload since bulk updates affect many rows
        const meta: DbNotificationMeta = {
            table: tableType.name,
            operation: 'alter',
        };
        // This is DML (UPDATE) with params, use run() not exec()
        await bridge.run(sql, [search, replace, ...filterParams], false, meta, connection);
    }

    /**
     * Set a column to null for all rows matching a filter condition.
     * Used for clearing FK references (e.g., when deleting a tag value).
     * Uses 'alter' notification to trigger full table view reload since this is a bulk operation.
     */
    async clearColumnWhere<RowType extends Row>(
        tableType: TableRef,
        column: string,
        filter: QueryFilter<RowType>,
        connection?: TransactionContext,
    ): Promise<void> {
        const whereClause = filter.toWhereClause(this._dialect);
        const filterParams = filter.getParameters();

        if (!whereClause) {
            throw new Error('clearColumnWhere requires a filter with WHERE clause');
        }

        const sql = `UPDATE ${this.quoteIdentifier(tableType.name)} SET ${this.quoteIdentifier(column)} = NULL WHERE ${whereClause}`;

        // Use 'alter' to trigger full reload since bulk updates affect many rows
        const meta: DbNotificationMeta = {
            table: tableType.name,
            operation: 'alter',
        };
        await bridge.run(sql, filterParams, false, meta, connection);
    }

    // =========================================================================
    // Schema Modification
    // =========================================================================

    /**
     * Add a column to a table.
     * Used for dynamic schema changes (locale columns, filter columns).
     */
    async addColumn(
        tableType: TableRef,
        columnName: string,
        columnType: string,
        connection?: TransactionContext,
    ): Promise<void> {
        const sql = `ALTER TABLE ${this.quoteIdentifier(tableType.name)} ADD COLUMN ${this.quoteIdentifier(columnName)} ${columnType}`;
        const meta: DbNotificationMeta = {
            table: tableType.name,
            operation: 'alter',
        };
        await bridge.exec(sql, meta, connection);
    }

    /**
     * Drop a column from a table.
     * Used for dynamic schema changes (locale columns, filter columns).
     */
    async dropColumn(
        tableType: TableRef,
        columnName: string,
        connection?: TransactionContext,
    ): Promise<void> {
        const sql = `ALTER TABLE ${this.quoteIdentifier(tableType.name)} DROP COLUMN ${this.quoteIdentifier(columnName)}`;
        const meta: DbNotificationMeta = {
            table: tableType.name,
            operation: 'alter',
        };
        await bridge.exec(sql, meta, connection);

        // Dispatch event for frontend to clear filters/sorts on this column
        dispatchEvent(new CustomEvent(EVENT_DB_COLUMN_DELETING, {
            detail: { tableType, columnName }
        }));
    }

    // =========================================================================
    // Transaction Support
    // =========================================================================

    async transaction(fn: (txContext: TransactionContext) => Promise<void>): Promise<void> {
        return bridge.transaction(fn);
    }

    // =========================================================================
    // SQL Helpers
    // =========================================================================

    /**
     * Quote an identifier (table/column name) for SQL.
     * Both SQLite and PostgreSQL use double quotes for identifiers.
     */
    quoteIdentifier(name: string): string {
        return `"${name}"`;
    }

    /**
     * Get placeholder syntax for the current dialect.
     */
    placeholder(index: number): string {
        if (this._dialect === 'postgres') {
            return `$${index}`;
        }
        return '?';
    }

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    private getTableViewsForTable<RowType extends Row>(
        tableType: TableRef,
    ): Map<number, DbTableView<RowType>> {
        return this._tableToTableView[tableType.id] as Map<number, DbTableView<RowType>>;
    }

    private getRowViewsForTable<RowType extends Row>(
        tableType: TableRef,
    ): Map<number, DbRowView<RowType>> {
        return this._tableToRowView[tableType.id] as Map<number, DbRowView<RowType>>;
    }

    private destroyRowView(tableType: TableRef, rowId: number): void {
        const rowViews = this._tableToRowView[tableType.id];
        if (rowViews) {
            rowViews.delete(rowId);
        }
    }

    /**
     * Remove row views from cache and clear them from focus.
     * Called when rows are deleted to ensure UI state stays consistent.
     */
    private removeRowViewsAndFocus(tableType: TableRef, ids: number[]): void {
        const rowViews = this._tableToRowView[tableType.id];
        const focusMap = new Map<number, Focus>();

        for (const id of ids) {
            if (rowViews?.has(id)) {
                // Add to focus removal map
                focusMap.set(id, { rowId: id });
                // Remove from cache
                rowViews.delete(id);
            }
        }

        // Remove deleted rows from focus if any were focused
        if (focusMap.size > 0) {
            focusManager.focus({
                type: FOCUS_MODE_MODIFY,
                requests: [{
                    tableType,
                    focus: focusMap,
                    type: FOCUS_REMOVE,
                }],
            } as FocusRequests);
        }
    }

    /**
     * Handle row lifecycle events (create/delete).
     * Only reloads table views whose filters would be affected by the changed rows.
     *
     * All callers must provide full row data, enabling precise filter checking
     * for both creates and deletes. For deletes, callers must fetch the rows
     * before deleting them from the database.
     */
    private async notifyOnRowLifecycleEvent<RowType extends Row>(
        tableType: TableRef,
        rows: RowType[],
    ): Promise<void> {
        const tableViews = this.getTableViewsForTable<RowType>(tableType);
        if (tableViews.size === 0) return;

        for (const tableView of tableViews.values()) {
            // Use wouldAffectRows with the full row data for precise filtering
            if (tableView.filter.wouldAffectRows(rows)) {
                await tableView._onReloadRequired();
            }
        }
    }

    /**
     * Handle row update events.
     * Updates the cached row views directly with the provided data.
     */
    private async notifyOnRowsUpdated<RowType extends Row>(
        tableType: TableRef,
        rows: RowType[],
    ): Promise<void> {
        const rowViewMap = this.getRowViewsForTable<RowType>(tableType);

        // Update cached row views directly with the provided data
        for (const row of rows) {
            const rowView = rowViewMap.get(row.id);
            if (rowView) {
                rowView._update(row);
            }
        }
    }

    /**
     * Handle table alter events (bulk operations, schema changes).
     * Reloads all table views for the affected table.
     */
    private async notifyOnTableAltered(tableType: TableRef): Promise<void> {
        const tableViews = this.getTableViewsForTable(tableType);
        for (const tableView of tableViews.values()) {
            await tableView._onReloadRequired();
        }
    }

    /**
     * Reload all table views (e.g., after reconnection).
     */
    async reloadAllTables(): Promise<void> {
        for (let i = 0; i < this._tableToTableView.length; i++) {
            const tableViewMap = this._tableToTableView[i];
            for (const tableView of tableViewMap.values()) {
                await tableView._onReloadRequired();
            }
        }
    }
}

// Singleton instance
export const db = new Database();
