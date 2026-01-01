/**
 * Shared view of the actors table.
 *
 * This singleton provides a reactive view of all actors, ordered by ID.
 * Used by RowColumnActor and other components that need actor selection.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { actorsTable } from '$lib/tables/actors';
 *
 *   // Subscribe to actors
 *   $: actors = $actorsTable;
 * </script>
 *
 * {#each $actorsTable as actorRowView (actorRowView.id)}
 *   <option value={actorRowView.id}>{$actorRowView.name}</option>
 * {/each}
 * ```
 */

import type { Actor } from '@gamescript/shared';
import { query, TABLE_ACTORS, type IDbTableView } from '$lib/db';
import { common } from '$lib/crud';

/** Shared view of the actors table, ordered by ID ascending. */
export const actorsTable: IDbTableView<Actor> = common.fetchTable(
    TABLE_ACTORS,
    query<Actor>().orderBy('id', 'ASC').build(),
);
