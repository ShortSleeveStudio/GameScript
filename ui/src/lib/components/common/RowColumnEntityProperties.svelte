<script lang="ts">
    /**
     * Generic custom properties editor for entities (nodes or conversations).
     *
     * Displays and edits properties based on property templates.
     * Supports both predefined values (via PropertyCombobox) and custom freeform values.
     * Uses the DbRowView pattern for reactivity.
     *
     * This component is parameterized to work with both NodeProperty and ConversationProperty.
     */
    import type { PropertyTemplate, PropertyValue, Row, TableRef } from '@gamescript/shared';
    import {
        PROPERTY_TYPE_STRING,
        PROPERTY_TYPE_INTEGER,
        PROPERTY_TYPE_DECIMAL,
        PROPERTY_TYPE_BOOLEAN,
    } from '@gamescript/shared';
    import { query, type IDbTableView, type IDbRowView } from '$lib/db';
    import { propertyTemplatesTable, propertyValuesTable } from '$lib/tables';
    import { common } from '$lib/crud';
    import { onDestroy, onMount } from 'svelte';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import Button from './Button.svelte';
    import PropertyCombobox, { type PropertyComboboxChangePayload } from './PropertyCombobox.svelte';

    /**
     * Property entity type - must have these fields to work with this component.
     */
    interface PropertyEntity extends Row {
        parent: number;
        template: number;
        is_reference: boolean;
        reference_value: number | null;
        value_string: string | null;
        value_integer: number | null;
        value_decimal: number | null;
        value_boolean: boolean | null;
    }

    /**
     * CRUD operations interface for property entities.
     */
    interface PropertyCrud {
        create(params: {
            parent: number;
            template: number;
            is_reference: boolean;
            reference_value: number | null;
            value_string?: string;
            value_integer?: number;
            value_decimal?: number;
            value_boolean?: boolean;
        }): Promise<PropertyEntity>;
        updateOne(oldProperty: PropertyEntity, newProperty: PropertyEntity): Promise<PropertyEntity>;
        remove(propertyId: number): Promise<void>;
    }

    interface Props {
        /** The entity row view (node or conversation) */
        rowView: IDbRowView<Row>;
        /** Table reference for the entity type (TABLE_NODES or TABLE_CONVERSATIONS) */
        entityTableRef: TableRef;
        /** Table reference for the properties table */
        propertiesTableRef: TableRef;
        /** CRUD operations for the property type */
        propertyCrud: PropertyCrud;
    }

    let {
        rowView,
        entityTableRef,
        propertiesTableRef,
        propertyCrud,
    }: Props = $props();

    const isLoading = new IsLoadingStore();
    let propertyTable: IDbTableView<PropertyEntity> | undefined = $state();
    let selectedTemplateId: number | undefined = $state();

    // Map of template ID to template data for quick lookups
    let templateMap: Map<number, PropertyTemplate> = $state(new Map());

    onMount(() => {
        // Fetch properties for this entity
        propertyTable = common.fetchTable<PropertyEntity>(
            propertiesTableRef,
            query<PropertyEntity>().where('parent').eq(rowView.id).build(),
        );
    });

    onDestroy(() => {
        if (propertyTable) common.releaseTable(propertyTable);
    });

    // Build template map for lookups (filtered to this entity type's templates)
    $effect(() => {
        if (propertyTemplatesTable) {
            const entityTemplates = propertyTemplatesTable.rows.filter(
                (t: IDbRowView<PropertyTemplate>) => t.data.parent === entityTableRef.id
            );
            templateMap = new Map(entityTemplates.map((t: IDbRowView<PropertyTemplate>) => [t.id, t.data]));
            // Set default selected template if none selected
            if (selectedTemplateId === undefined && entityTemplates.length > 0) {
                selectedTemplateId = entityTemplates[0].id;
            }
        }
    });

    function getTemplateName(templateId: number): string {
        return templateMap.get(templateId)?.name ?? 'Unknown';
    }

    function getTemplateType(templateId: number): number {
        return templateMap.get(templateId)?.type ?? PROPERTY_TYPE_STRING.id;
    }

    function getPropertyValue(property: PropertyEntity): string | number | boolean | null {
        const type = getTemplateType(property.template);
        switch (type) {
            case PROPERTY_TYPE_STRING.id: return property.value_string;
            case PROPERTY_TYPE_INTEGER.id: return property.value_integer;
            case PROPERTY_TYPE_DECIMAL.id: return property.value_decimal;
            case PROPERTY_TYPE_BOOLEAN.id: return property.value_boolean;
            default: return null;
        }
    }

    /** Get predefined values for a template */
    function getValuesForTemplate(templateId: number): IDbRowView<PropertyValue>[] {
        if (!propertyValuesTable) return [];
        return propertyValuesTable.rows.filter(v => v.data.template_id === templateId);
    }

    async function addProperty(): Promise<void> {
        if (selectedTemplateId === undefined) return;

        const template = templateMap.get(selectedTemplateId);
        if (!template) return;

        // Check if there are predefined values for this template
        const predefinedValues = getValuesForTemplate(selectedTemplateId);
        const hasPredefinedValues = predefinedValues.length > 0;

        // If there are predefined values, default to selecting the first one
        // Otherwise, create with custom (empty) value
        if (hasPredefinedValues) {
            const firstValue = predefinedValues[0].data;
            await isLoading.wrapPromise(
                propertyCrud.create({
                    parent: rowView.id,
                    template: selectedTemplateId,
                    is_reference: true,
                    reference_value: firstValue.id,
                    value_string: '',
                    value_integer: 0,
                    value_decimal: 0,
                    value_boolean: false,
                })
            );
        } else {
            await isLoading.wrapPromise(
                propertyCrud.create({
                    parent: rowView.id,
                    template: selectedTemplateId,
                    is_reference: false,
                    reference_value: null,
                    value_string: '',
                    value_integer: 0,
                    value_decimal: 0,
                    value_boolean: false,
                })
            );
        }
    }

    async function deleteProperty(propertyId: number): Promise<void> {
        await isLoading.wrapPromise(
            propertyCrud.remove(propertyId)
        );
    }

    /** Handle value changes from PropertyCombobox */
    async function handlePropertyValueChange(
        propertyRowView: IDbRowView<PropertyEntity>,
        payload: PropertyComboboxChangePayload
    ): Promise<void> {
        const oldProperty = propertyRowView.getValue();
        const type = getTemplateType(oldProperty.template);

        const newProperty: PropertyEntity = {
            ...oldProperty,
            is_reference: !payload.isCustom,
            reference_value: payload.isCustom ? null : payload.referenceValueId,
        };

        // If using custom value, set the appropriate value field
        if (payload.isCustom) {
            switch (type) {
                case PROPERTY_TYPE_STRING.id:
                    newProperty.value_string = String(payload.customValue ?? '');
                    break;
                case PROPERTY_TYPE_INTEGER.id:
                    newProperty.value_integer = typeof payload.customValue === 'number'
                        ? payload.customValue
                        : parseInt(String(payload.customValue)) || 0;
                    break;
                case PROPERTY_TYPE_DECIMAL.id:
                    newProperty.value_decimal = typeof payload.customValue === 'number'
                        ? payload.customValue
                        : parseFloat(String(payload.customValue)) || 0;
                    break;
                case PROPERTY_TYPE_BOOLEAN.id:
                    newProperty.value_boolean = payload.customValue === true;
                    break;
            }
        } else {
            // Clear custom values when using reference
            newProperty.value_string = '';
            newProperty.value_integer = 0;
            newProperty.value_decimal = 0;
            newProperty.value_boolean = false;
        }

        await isLoading.wrapPromise(
            propertyCrud.updateOne(oldProperty, newProperty)
        );
    }

    // All templates for this entity type are available
    let availableTemplates = $derived(
        propertyTemplatesTable
            ? propertyTemplatesTable.rows.filter(t => t.data.parent === entityTableRef.id)
            : []
    );

    // Reactive property list
    let propertyList = $derived(propertyTable ? propertyTable.rows : []);
</script>

<div class="properties-container">
    {#if availableTemplates.length > 0}
        <div class="add-property">
            <select bind:value={selectedTemplateId} disabled={$isLoading}>
                {#each availableTemplates as templateView (templateView.id)}
                    <option value={templateView.id}>{templateView.data.name}</option>
                {/each}
            </select>
            <Button
                variant="ghost"
                size="small"
                disabled={$isLoading || selectedTemplateId === undefined}
                onclick={addProperty}
            >
                Add Property
            </Button>
        </div>
    {/if}

    {#if propertyList.length > 0}
        <div class="properties-list">
            {#each propertyList as propRowView (propRowView.id)}
                {@const property = propRowView.data}
                {@const templateType = getTemplateType(property.template)}
                {@const predefinedValues = getValuesForTemplate(property.template)}
                <div class="property-row">
                    <span class="property-name">{getTemplateName(property.template)}</span>
                    <div class="property-value-container">
                        <PropertyCombobox
                            {predefinedValues}
                            {templateType}
                            isCustom={!property.is_reference}
                            referenceValueId={property.reference_value}
                            customValue={getPropertyValue(property)}
                            disabled={$isLoading}
                            onchange={(payload) => handlePropertyValueChange(propRowView, payload)}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="small"
                        iconOnly
                        dangerHover
                        disabled={$isLoading}
                        onclick={() => deleteProperty(propRowView.id)}
                        title="Delete property"
                    >×</Button>
                </div>
            {/each}
        </div>
    {:else}
        <p class="no-properties">No custom properties</p>
    {/if}
</div>

<style>
    .properties-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .properties-list {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
    }

    .property-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem;
        background: var(--gs-bg-primary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
    }

    .property-name {
        flex: 0 0 auto;
        min-width: 80px;
        font-size: 0.75rem;
        color: var(--gs-fg-secondary);
    }

    .property-value-container {
        flex: 1;
    }

    .no-properties {
        font-size: 0.75rem;
        font-style: italic;
        color: var(--gs-fg-secondary);
        margin: 0;
    }

    .add-property {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.25rem;
    }

    .add-property select {
        flex: 1;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        background: var(--gs-bg-primary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
        color: var(--gs-fg-primary);
    }

    .add-property select:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
