<script lang="ts">
    /**
     * Displays tag category fields in the inspector.
     *
     * For each tag category, shows a dropdown to select a tag value.
     * Handles the update via the provided CRUD operations.
     *
     * Usage:
     * <InspectorTagFields
     *     rowView={conversationRowView}
     *     categoriesTable={conversationTagCategoriesTable}
     *     valuesTable={conversationTagValuesTable}
     *     crud={conversations}
     * />
     */
    import type { Row, BaseTagCategory, BaseTagValue } from '@gamescript/shared';
    import { tagCategoryIdToColumn } from '@gamescript/shared';
    import type { IDbRowView, IDbTableView } from '$lib/db';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { toastError } from '$lib/stores/notifications.js';
    import Accordion from './Accordion.svelte';
    import InspectorField from './InspectorField.svelte';
    import Dropdown from './Dropdown.svelte';

    interface EntityCrud<T extends Row> {
        updateOne: (oldRow: T, newRow: T) => Promise<T>;
    }

    interface Props {
        /** The entity row view (conversation or localization) */
        rowView: IDbRowView<Row>;
        /** Table view of tag categories */
        categoriesTable: IDbTableView<BaseTagCategory>;
        /** Table view of tag values */
        valuesTable: IDbTableView<BaseTagValue>;
        /** CRUD operations for the entity */
        crud: EntityCrud<Row>;
    }

    let { rowView, categoriesTable, valuesTable, crud }: Props = $props();

    const isLoading = new IsLoadingStore();

    // Build a map of categoryId -> array of values for that category
    let valuesByCategory = $derived.by(() => {
        const map = new Map<number, BaseTagValue[]>();
        for (const rv of valuesTable.rows) {
            const value = rv.data;
            const existing = map.get(value.category_id);
            if (existing) {
                existing.push(value);
            } else {
                map.set(value.category_id, [value]);
            }
        }
        return map;
    });

    async function handleTagChange(categoryId: number, newValueId: number | null): Promise<void> {
        const columnName = tagCategoryIdToColumn(categoryId);
        const oldRow = rowView.getValue();
        const currentValue = oldRow[columnName as keyof typeof oldRow] as number | null;

        if (currentValue === newValueId) return;

        try {
            const newRow = { ...oldRow, [columnName]: newValueId };
            await isLoading.wrapPromise(crud.updateOne(oldRow, newRow as Row));
        } catch (err) {
            toastError('Failed to update tag', err);
        }
    }

    function getDropdownValue(categoryId: number): number | string {
        const columnName = tagCategoryIdToColumn(categoryId);
        const row = rowView.data;
        const value = row[columnName as keyof typeof row] as number | null;
        return value ?? '';
    }

    function getDropdownOptions(categoryId: number): { value: number | string; label: string }[] {
        const values = valuesByCategory.get(categoryId) ?? [];
        const options: { value: number | string; label: string }[] = [
            { value: '', label: '(None)' },
        ];
        for (const v of values) {
            options.push({ value: v.id, label: v.name });
        }
        return options;
    }
</script>

{#if categoriesTable.rows.length > 0}
    <div class="inspector-tag-fields">
        <Accordion title="Tags" count={categoriesTable.rows.length} size="small">
            {#each categoriesTable.rows as categoryRowView (categoryRowView.id)}
                {@const category = categoryRowView.data}
                <InspectorField label={category.name}>
                    <Dropdown
                        options={getDropdownOptions(category.id)}
                        value={getDropdownValue(category.id)}
                        disabled={$isLoading}
                        onchange={(value) => handleTagChange(category.id, value === '' ? null : value as number)}
                    />
                </InspectorField>
            {/each}
        </Accordion>
    </div>
{/if}

<style>
    .inspector-tag-fields {
        margin-top: 0.75rem;
    }
</style>
