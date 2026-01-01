<script lang="ts">
    /**
     * Generic inspector panel for tag category rows.
     *
     * Used for both ConversationTagCategory and LocalizationTagCategory.
     * Displays:
     * - Category ID (read-only)
     * - Category name (editable)
     * - List of tag values for this category (add, rename, delete)
     */
    import type { BaseTagCategory, BaseTagValue } from '@gamescript/shared';
    import type { IDbRowView, IDbTableView } from '$lib/db';
    import type { TagValueCrud } from '$lib/crud/crud-tag-factory.js';
    import {
        RowColumnId,
        RowColumnInput,
        InspectorField,
    } from '$lib/components/common';
    import EditableList from '$lib/components/common/EditableList.svelte';
    import { dbConnected } from '$lib/stores/connection.js';
    import { toastError, toastSuccess } from '$lib/stores/notifications.js';

    interface Props {
        rowView: IDbRowView<BaseTagCategory>;
        valuesTable: IDbTableView<BaseTagValue>;
        /** CRUD operations for tag values (uses factory-generated interface) */
        crud: TagValueCrud<BaseTagValue>;
        /** Description text for the values list (e.g., "conversations" or "localizations") */
        entityName?: string;
    }

    let {
        rowView,
        valuesTable,
        crud,
        entityName = 'items',
    }: Props = $props();

    // Filter tag values to only show those belonging to this category
    let categoryValues = $derived(
        valuesTable.rows.filter(v => v.data.category_id === rowView.id)
    );

    // ============================================================================
    // Tag Value Handlers
    // ============================================================================

    async function handleAddValue() {
        try {
            await crud.create(rowView.id, 'New Value');
            toastSuccess('Tag value created');
        } catch (error) {
            toastError('Failed to create tag value', error);
        }
    }

    async function handleRenameValue(payload: { rowView: IDbRowView<BaseTagValue>; name: string }) {
        try {
            const { rowView: valueRowView, name } = payload;
            const value = valueRowView.getValue();
            await crud.updateOne(value, { ...value, name });
        } catch (error) {
            toastError('Failed to rename tag value', error);
        }
    }

    async function handleDeleteValue(payload: { rowView: IDbRowView<BaseTagValue> }) {
        try {
            await crud.remove(payload.rowView.id);
            toastSuccess('Tag value deleted');
        } catch (error) {
            toastError('Failed to delete tag value', error);
        }
    }
</script>

<h2>Tag Category</h2>

<InspectorField label="ID">
    <RowColumnId {rowView} />
</InspectorField>

<InspectorField label="Name">
    <RowColumnInput
        {rowView}
        columnName="name"
        undoText="Rename tag category"
    />
</InspectorField>

<div class="tag-values-section">
    <EditableList
        title="Tag Values"
        description="Values that can be assigned to {entityName} for this category."
        rowViews={categoryValues}
        isConnected={$dbConnected}
        disconnectedText="Connect to a database to manage tag values."
        emptyText="No tag values defined."
        addButtonLabel="+ Add Value"
        deleteModalTitle="Delete Tag Value?"
        deleteModalText="This will remove the tag value from all {entityName} that use it."
        onadd={handleAddValue}
        onrename={handleRenameValue}
        ondelete={handleDeleteValue}
    />
</div>

<style>
    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gs-fg-primary);
    }

    .tag-values-section {
        margin-top: 1.5rem;
    }
</style>
