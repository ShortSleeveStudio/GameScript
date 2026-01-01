/**
 * Database module exports.
 *
 * This module provides the reactive database layer for GameScript.
 * It manages row views (DbRowView) and table views (DbTableView) that
 * integrate with Svelte 5's reactivity system using runes.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { db, query, TABLE_CONVERSATIONS } from '$lib/db';
 *   import type { Conversation } from '@gamescript/shared';
 *
 *   // Fetch a table view
 *   const filter = query<Conversation>().orderBy('id', 'ASC').build();
 *   const tableView = db.fetchTable(TABLE_CONVERSATIONS, filter);
 *
 *   // Access reactive data
 *   let rows = $derived(tableView.rows);
 * </script>
 *
 * {#each tableView.rows as rowView (rowView.id)}
 *   <div>{rowView.data.name}</div>
 * {/each}
 * ```
 */

// Core database instance
export {
    db,
    type DbDialect,
} from './db.js';

// Re-export table constants and types from shared package
export {
    type TableRef as TableType,
    type TransactionContext,
    TABLE_CONVERSATIONS,
    TABLE_NODES,
    TABLE_EDGES,
    TABLE_ACTORS,
    TABLE_LOCALES,
    TABLE_LOCALIZATIONS,
    TABLE_FILTERS,
    TABLE_PROPERTY_TEMPLATES,
    TABLE_NODE_PROPERTIES,
    TABLE_VERSION,
    TABLE_LOCALE_PRINCIPAL,
    TABLE_CODE_OUTPUT_FOLDER,
    DATABASE_TABLES,
    getTableByName,
    getTableById,
} from '@gamescript/shared';

// Query building - re-export from shared
export {
    query,
    all,
    createFilterFromSpec,
    ASC,
    DESC,
    type QueryFilter,
    type QueryBuilder,
    type ConditionBuilder,
    type FilterSpec,
    type FilterValue,
    type FilterValueList,
    type OrderDirection,
} from '@gamescript/shared';

// Row View
export { DbRowView } from './db-view-row.svelte.js';
export type { IDbRowView } from './db-view-row-interface.js';

// Table View
export { DbTableView } from './db-view-table.svelte.js';
export type { IDbTableView } from './db-view-table-interface.js';

// Row Container
export { DbRowContainer, type DbRowContainerFetcher } from './db-row-container.svelte.js';
