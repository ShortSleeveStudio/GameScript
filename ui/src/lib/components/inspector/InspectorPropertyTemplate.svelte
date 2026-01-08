<script lang="ts">
    /**
     * Inspector panel for property template rows.
     *
     * Displays:
     * - Template ID (read-only)
     * - Template name (editable)
     * - Template type (editable dropdown)
     * - List of predefined values for this template (add, rename, delete)
     */
    import type { PropertyTemplate, PropertyValue } from '@gamescript/shared';
    import {
        PROPERTY_TYPES,
        PROPERTY_TYPE_STRING,
        PROPERTY_TYPE_INTEGER,
        PROPERTY_TYPE_DECIMAL,
        PROPERTY_TYPE_BOOLEAN,
    } from '@gamescript/shared';
    import type { IDbRowView, IDbTableView } from '$lib/db';
    import {
        RowColumnId,
        RowColumnInput,
        InspectorField,
        Dropdown,
    } from '$lib/components/common';
    import EditableList from '$lib/components/common/EditableList.svelte';
    import { dbConnected } from '$lib/stores/connection.js';
    import { toastError, toastSuccess } from '$lib/stores/notifications.js';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { propertyTemplates as propertyTemplatesCrud, propertyValues as propertyValuesCrud } from '$lib/crud';

    interface Props {
        rowView: IDbRowView<PropertyTemplate>;
        valuesTable: IDbTableView<PropertyValue>;
    }

    let { rowView, valuesTable }: Props = $props();

    const isLoading = new IsLoadingStore();

    // Filter property values to only show those belonging to this template
    let templateValues = $derived(
        valuesTable.rows.filter(v => v.data.template_id === rowView.id)
    );

    // Get the current template type for display
    let currentType = $derived(rowView.data.type);

    // Check if this is a boolean template (booleans don't need predefined values)
    let isBoolean = $derived(currentType === PROPERTY_TYPE_BOOLEAN.id);

    // Type options for the dropdown
    let typeOptions = $derived(
        PROPERTY_TYPES.map(t => ({ value: t.id, label: t.name }))
    );

    // ============================================================================
    // Template Type Handler
    // ============================================================================

    async function handleTypeChange(newType: number | string) {
        if (typeof newType === 'string') return;
        if (newType === currentType) return;

        try {
            const oldTemplate = rowView.getValue();
            await isLoading.wrapPromise(
                propertyTemplatesCrud.updateOne(oldTemplate, { ...oldTemplate, type: newType })
            );
        } catch (error) {
            toastError('Failed to update property type', error);
        }
    }

    // ============================================================================
    // Property Value Handlers
    // ============================================================================

    async function handleAddValue() {
        try {
            const template = rowView.data;
            // Create default value based on template type
            const params: Parameters<typeof propertyValuesCrud.create>[0] = {
                template_id: rowView.id,
            };

            // Set appropriate default value based on type
            // Note: Boolean templates don't have predefined values (only true/false)
            switch (template.type) {
                case PROPERTY_TYPE_STRING.id:
                    params.value_string = 'New Value';
                    break;
                case PROPERTY_TYPE_INTEGER.id:
                    params.value_integer = 0;
                    break;
                case PROPERTY_TYPE_DECIMAL.id:
                    params.value_decimal = 0.0;
                    break;
            }

            await isLoading.wrapPromise(propertyValuesCrud.create(params));
            toastSuccess('Property value created');
        } catch (error) {
            toastError('Failed to create property value', error);
        }
    }

    async function handleRenameValue(payload: { rowView: IDbRowView<PropertyValue>; name: string }) {
        try {
            const { rowView: valueRowView, name } = payload;
            const value = valueRowView.getValue();
            const template = rowView.data;

            // Update the appropriate value field based on template type
            // Note: Boolean templates don't have predefined values (only true/false)
            const updatedValue = { ...value };
            switch (template.type) {
                case PROPERTY_TYPE_STRING.id:
                    updatedValue.value_string = name;
                    break;
                case PROPERTY_TYPE_INTEGER.id:
                    updatedValue.value_integer = parseInt(name, 10) || 0;
                    break;
                case PROPERTY_TYPE_DECIMAL.id:
                    updatedValue.value_decimal = parseFloat(name) || 0;
                    break;
            }

            await isLoading.wrapPromise(propertyValuesCrud.updateOne(value, updatedValue));
        } catch (error) {
            toastError('Failed to rename property value', error);
        }
    }

    async function handleDeleteValue(payload: { rowView: IDbRowView<PropertyValue> }) {
        try {
            await isLoading.wrapPromise(propertyValuesCrud.remove(payload.rowView.id));
            toastSuccess('Property value deleted');
        } catch (error) {
            toastError('Failed to delete property value', error);
        }
    }

    // Get display value for a property value based on template type
    // Note: Boolean case not needed since boolean templates don't have predefined values
    function getDisplayValue(value: PropertyValue): string {
        const template = rowView.data;
        switch (template.type) {
            case PROPERTY_TYPE_STRING.id:
                return value.value_string ?? '';
            case PROPERTY_TYPE_INTEGER.id:
                return value.value_integer?.toString() ?? '0';
            case PROPERTY_TYPE_DECIMAL.id:
                return value.value_decimal?.toString() ?? '0';
            default:
                return '';
        }
    }
</script>

<h2>Property Template</h2>

<InspectorField label="ID">
    <RowColumnId {rowView} />
</InspectorField>

<InspectorField label="Name">
    <RowColumnInput
        {rowView}
        columnName="name"
        undoText="Rename property template"
    />
</InspectorField>

<InspectorField label="Type">
    <Dropdown
        options={typeOptions}
        value={currentType}
        disabled={$isLoading}
        onchange={handleTypeChange}
    />
</InspectorField>

{#if !isBoolean}
    <div class="property-values-section">
        <EditableList
            title="Predefined Values"
            description="Optional predefined values for this property. Users can select from these or enter custom values."
            rowViews={templateValues}
            isConnected={$dbConnected}
            disconnectedText="Connect to a database to manage property values."
            emptyText="No predefined values. Users will enter values manually."
            addButtonLabel="+ Add Value"
            deleteModalTitle="Delete Property Value?"
            deleteModalText="Properties using this value will be skipped during export until they are updated to a different value."
            onadd={handleAddValue}
            onrename={handleRenameValue}
            ondelete={handleDeleteValue}
            getDisplayName={getDisplayValue}
        />
    </div>
{:else}
    <p class="boolean-note">Boolean properties don't need predefined values.</p>
{/if}

<style>
    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gs-fg-primary);
    }

    .property-values-section {
        margin-top: 1.5rem;
    }

    .boolean-note {
        margin-top: 1.5rem;
        font-size: 0.75rem;
        color: var(--gs-fg-secondary);
        font-style: italic;
    }
</style>
