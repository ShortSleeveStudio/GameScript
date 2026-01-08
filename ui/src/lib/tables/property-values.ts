/**
 * Shared view of property values (predefined values for property templates).
 *
 * Property values allow users to define a set of predefined values for a
 * property template. When assigning a property to a node or conversation,
 * users can either select from these predefined values or enter a custom value.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { propertyValuesTable } from '$lib/tables/property-values';
 *
 *   // Get values for a specific template
 *   let templateValues = $derived(
 *     propertyValuesTable.rows.filter(v => v.data.template_id === templateId)
 *   );
 * </script>
 * ```
 */

import { type PropertyValue, TABLE_PROPERTY_VALUES } from '@gamescript/shared';
import { query, type IDbTableView } from '$lib/db';
import { common } from '$lib/crud';

/** Shared view of all property values, ordered by ID ascending. */
export const propertyValuesTable: IDbTableView<PropertyValue> = common.fetchTable(
    TABLE_PROPERTY_VALUES,
    query<PropertyValue>().orderBy('id', 'ASC').build(),
);
