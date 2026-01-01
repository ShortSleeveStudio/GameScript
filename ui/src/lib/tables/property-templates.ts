/**
 * Shared view of property templates for nodes.
 *
 * Property templates define custom properties that can be attached to nodes,
 * such as tags, flags, or game-specific metadata.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { propertyTemplatesTable } from '$lib/tables/property-templates';
 *
 *   // Subscribe to property templates
 *   $: templates = $propertyTemplatesTable;
 * </script>
 *
 * {#each $propertyTemplatesTable as templateRowView (templateRowView.id)}
 *   <option value={templateRowView.id}>{$templateRowView.name}</option>
 * {/each}
 * ```
 */

import type { PropertyTemplate } from '@gamescript/shared';
import { query, TABLE_PROPERTY_TEMPLATES, type IDbTableView } from '$lib/db';
import { common } from '$lib/crud';

/** Shared view of all property templates, ordered by ID ascending. */
export const propertyTemplatesTable: IDbTableView<PropertyTemplate> = common.fetchTable(
    TABLE_PROPERTY_TEMPLATES,
    query<PropertyTemplate>().orderBy('id', 'ASC').build(),
);
