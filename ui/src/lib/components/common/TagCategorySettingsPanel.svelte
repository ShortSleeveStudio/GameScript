<script lang="ts">
    /**
     * Expandable Tag Category Settings Panel.
     *
     * Replaces the modal approach with an inline expandable panel that
     * slides down from the toolbar. This allows the Inspector to remain
     * visible and interactive while managing tag categories.
     *
     * Features:
     * - Expands down from toolbar when settings button is clicked
     * - Create, rename, delete tag categories
     * - Click a category to manage its values in the Inspector
     * - Settings button becomes toggle to collapse
     */
    import type { BaseTagCategory } from '@gamescript/shared';
    import type { IDbRowView, IDbTableView } from '$lib/db';
    import type { TagCategoryCrud } from '$lib/crud/crud-tag-factory.js';
    import { dbConnected } from '$lib/stores/connection.js';
    import { toastError, toastSuccess } from '$lib/stores/notifications.js';
    import EditableList from './EditableList.svelte';

    interface Props {
        /** Description for the tag categories list */
        description: string;
        /** Entity name for delete confirmation (e.g., "conversations", "localizations") */
        entityName: string;
        /** Table view containing tag categories */
        categoriesTable: IDbTableView<BaseTagCategory>;
        /** CRUD operations for tag categories (uses factory-generated interface) */
        crud: TagCategoryCrud<BaseTagCategory>;
        /** Function to focus a tag category in the Inspector */
        focusCategory: (id: number) => void;
        /** Currently focused category ID (for selection highlight) */
        focusedCategoryId: number | null;
    }

    let {
        description,
        entityName,
        categoriesTable,
        crud,
        focusCategory,
        focusedCategoryId,
    }: Props = $props();

    // ============================================================================
    // Tag Categories
    // ============================================================================

    async function handleAddTagCategory() {
        try {
            await crud.create('New Tag Category');
            toastSuccess('Tag category created');
        } catch (error) {
            toastError('Failed to create tag category', error);
        }
    }

    async function handleRenameTagCategory(payload: { rowView: IDbRowView<BaseTagCategory>; name: string }) {
        try {
            const { rowView, name } = payload;
            const category = rowView.getValue();
            await crud.updateOne(category, { ...category, name });
        } catch (error) {
            toastError('Failed to rename tag category', error);
        }
    }

    async function handleDeleteTagCategory(payload: { rowView: IDbRowView<BaseTagCategory> }) {
        try {
            await crud.remove(payload.rowView.id);
            toastSuccess('Tag category deleted');
        } catch (error) {
            toastError('Failed to delete tag category', error);
        }
    }

    function handleSelectTagCategory(payload: { rowView: IDbRowView<BaseTagCategory> }) {
        focusCategory(payload.rowView.id);
    }
</script>

<div class="settings-panel">
    <EditableList
        title="Tag Categories"
        {description}
        rowViews={categoriesTable.rows}
        isConnected={$dbConnected}
        disconnectedText="Connect to a database to manage tag categories."
        emptyText="No tag categories defined."
        addButtonLabel="+ Add Tag Category"
        deleteModalTitle="Delete Tag Category?"
        deleteModalText="Delete is a destructive operation that will remove all tag assignments for this category from your {entityName}."
        selectable={true}
        selectedId={focusedCategoryId}
        onadd={handleAddTagCategory}
        onrename={handleRenameTagCategory}
        ondelete={handleDeleteTagCategory}
        onselect={handleSelectTagCategory}
    />
</div>

<style>
    .settings-panel {
        padding: 12px;
        background: var(--gs-bg-secondary);
        border-bottom: 1px solid var(--gs-border-primary);
        max-height: 300px;
        overflow-y: auto;
    }
</style>
