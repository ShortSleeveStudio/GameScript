<script lang="ts">
    /**
     * Property Settings Panel.
     *
     * Expandable panel for managing property templates.
     * Follows the same pattern as TagCategorySettingsPanel:
     * - List property templates for a given entity type (nodes or conversations)
     * - Create, rename, change type, delete property templates
     * - Click a template to manage its predefined values in the Inspector
     */
    import type { PropertyTemplate, TableRef } from '@gamescript/shared';
    import { PROPERTY_TYPES, PROPERTY_TYPE_STRING } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { dbConnected } from '$lib/stores/connection.js';
    import { toastError, toastSuccess } from '$lib/stores/notifications.js';
    import { propertyTemplates as propertyTemplatesCrud } from '$lib/crud';
    import { propertyTemplatesTable } from '$lib/tables';
    import EditableList, { type TypeOption } from './EditableList.svelte';

    interface Props {
        /** Description for the property templates list */
        description: string;
        /** Human-readable entity name for UI text ("nodes" or "conversations") */
        entityName: string;
        /** The table reference for which entity type (TABLE_NODES or TABLE_CONVERSATIONS) */
        entityTable: TableRef;
        /** Function to focus a property template in the Inspector */
        focusTemplate: (id: number) => void;
        /** Currently focused template ID (for selection highlight) */
        focusedTemplateId: number | null;
    }

    let {
        description,
        entityName,
        entityTable,
        focusTemplate,
        focusedTemplateId,
    }: Props = $props();

    // ============================================================================
    // Derived State
    // ============================================================================

    /** Property templates filtered for this entity type */
    let templates = $derived(
        propertyTemplatesTable.rows.filter(t => t.data.parent === entityTable.id)
    );

    /** Type options for the dropdown */
    const propertyTypeOptions: TypeOption[] = PROPERTY_TYPES.map(t => ({
        id: t.id,
        name: t.name,
    }));

    // ============================================================================
    // Handlers
    // ============================================================================

    async function handleAddTemplate() {
        try {
            await propertyTemplatesCrud.create({
                parent: entityTable.id,
                name: 'New Property',
                type: PROPERTY_TYPE_STRING.id,
            });
            toastSuccess('Property created');
        } catch (error) {
            toastError('Failed to create property', error);
        }
    }

    async function handleRenameTemplate(payload: { rowView: IDbRowView<PropertyTemplate>; name: string }) {
        try {
            const { rowView, name } = payload;
            const oldTemplate = rowView.getValue();
            await propertyTemplatesCrud.updateOne(oldTemplate, { ...oldTemplate, name });
        } catch (error) {
            toastError('Failed to rename property', error);
        }
    }

    async function handleTemplateTypeChange(payload: { rowView: IDbRowView<PropertyTemplate>; type: number }) {
        try {
            const { rowView, type } = payload;
            const oldTemplate = rowView.getValue();
            await propertyTemplatesCrud.updateOne(oldTemplate, { ...oldTemplate, type });
        } catch (error) {
            toastError('Failed to update property type', error);
        }
    }

    async function handleDeleteTemplate(payload: { rowView: IDbRowView<PropertyTemplate> }) {
        try {
            await propertyTemplatesCrud.remove(payload.rowView.id);
            toastSuccess('Property deleted');
        } catch (error) {
            toastError('Failed to delete property', error);
        }
    }

    function handleSelectTemplate(payload: { rowView: IDbRowView<PropertyTemplate> }) {
        focusTemplate(payload.rowView.id);
    }
</script>

<div class="settings-panel">
    <EditableList
        title="Property Templates"
        {description}
        rowViews={templates}
        isConnected={$dbConnected}
        showType={true}
        typeOptions={propertyTypeOptions}
        selectable={true}
        selectedId={focusedTemplateId}
        disconnectedText="Connect to a database to manage properties."
        emptyText="No properties defined."
        addButtonLabel="+ Add Property"
        deleteModalTitle="Delete Property?"
        deleteModalText="Delete is a destructive operation that will remove all instances of this property from your {entityName}."
        onadd={handleAddTemplate}
        onrename={handleRenameTemplate}
        ontypeChange={handleTemplateTypeChange}
        ondelete={handleDeleteTemplate}
        onselect={handleSelectTemplate}
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
