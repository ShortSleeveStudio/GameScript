<script lang="ts">
    /**
     * Custom properties editor for nodes.
     *
     * Displays and edits node properties based on property templates.
     * Uses the DbRowView pattern for reactivity.
     *
     * Ported from GameScriptElectron (simplified - no Carbon DataTable).
     */
    import type { NodeProperty, PropertyTemplate, Row } from '@gamescript/shared';
    import { PROPERTY_TYPE_BOOLEAN } from '@gamescript/shared';
    import { query, TABLE_NODE_PROPERTIES, type IDbTableView, type IDbRowView } from '$lib/db';
    import { propertyTemplatesTable } from '$lib/tables/property-templates.js';
    import { nodeProperties, common } from '$lib/crud';
    import { onDestroy, onMount } from 'svelte';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import Button from './Button.svelte';
    import Checkbox from './Checkbox.svelte';

    interface Props {
        rowView: IDbRowView<Row>;
    }

    let { rowView }: Props = $props();

    const isLoading = new IsLoadingStore();
    let propertyTable: IDbTableView<NodeProperty> | undefined = $state();
    let selectedTemplateId: number | undefined = $state();

    // Map of template ID to template data for quick lookups
    let templateMap: Map<number, PropertyTemplate> = $state(new Map());

    onMount(() => {
        // Fetch node properties
        propertyTable = common.fetchTable<NodeProperty>(
            TABLE_NODE_PROPERTIES,
            query<NodeProperty>().where('parent').eq(rowView.id).build(),
        );
    });

    onDestroy(() => {
        if (propertyTable) common.releaseTable(propertyTable);
    });

    // Build template map for lookups (using shared table)
    $effect(() => {
        if (propertyTemplatesTable) {
            templateMap = new Map(propertyTemplatesTable.rows.map((t: IDbRowView<PropertyTemplate>) => [t.id, t.data]));
            // Set default selected template if none selected
            if (selectedTemplateId === undefined && propertyTemplatesTable.rows.length > 0) {
                selectedTemplateId = propertyTemplatesTable.rows[0].id;
            }
        }
    });

    function getTemplateName(templateId: number): string {
        return templateMap.get(templateId)?.name ?? 'Unknown';
    }

    function getTemplateType(templateId: number): number {
        return templateMap.get(templateId)?.type ?? 0;
    }

    function getPropertyValue(property: NodeProperty): string | number | boolean | null {
        const type = getTemplateType(property.template);
        switch (type) {
            case 0: return property.value_string;
            case 1: return property.value_integer;
            case 2: return property.value_decimal;
            case 3: return property.value_boolean;
            default: return null;
        }
    }

    function formatValue(value: string | number | boolean | null): string {
        if (value === null) return '';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
    }

    async function addProperty(): Promise<void> {
        if (selectedTemplateId === undefined) return;

        const template = templateMap.get(selectedTemplateId);
        if (!template) return;

        await isLoading.wrapPromise(
            nodeProperties.create({
                parent: rowView.id,
                template: selectedTemplateId,
                value_string: '',
                value_integer: 0,
                value_decimal: 0,
                value_boolean: false,
            })
        );
    }

    async function deleteProperty(propertyId: number): Promise<void> {
        await isLoading.wrapPromise(
            nodeProperties.remove(propertyId)
        );
    }

    async function updatePropertyValue(
        propertyRowView: IDbRowView<NodeProperty>,
        newValue: string
    ): Promise<void> {
        const oldProperty = propertyRowView.getValue();
        const type = getTemplateType(oldProperty.template);

        // Create updated row with new values based on type
        const newProperty = { ...oldProperty };
        switch (type) {
            case 0:
                newProperty.value_string = newValue;
                break;
            case 1:
                newProperty.value_integer = parseInt(newValue) || 0;
                break;
            case 2:
                newProperty.value_decimal = parseFloat(newValue) || 0;
                break;
            case 3:
                newProperty.value_boolean = newValue.toLowerCase() === 'true' || newValue === '1';
                break;
        }

        await isLoading.wrapPromise(
            nodeProperties.updateOne(oldProperty, newProperty)
        );
    }

    async function updateBooleanValue(
        propertyRowView: IDbRowView<NodeProperty>,
        checked: boolean
    ): Promise<void> {
        const oldProperty = propertyRowView.getValue();
        const newProperty = { ...oldProperty, value_boolean: checked };

        await isLoading.wrapPromise(
            nodeProperties.updateOne(oldProperty, newProperty)
        );
    }

    // All templates are available (multiple instances allowed per node)
    let availableTemplates = $derived(
        propertyTemplatesTable ? propertyTemplatesTable.rows : []
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
                {@const value = getPropertyValue(property)}
                {@const templateType = getTemplateType(property.template)}
                <div class="property-row">
                    <span class="property-name">{getTemplateName(property.template)}</span>
                    {#if templateType === PROPERTY_TYPE_BOOLEAN.id}
                        <div class="property-checkbox">
                            <Checkbox
                                checked={property.value_boolean ?? false}
                                disabled={$isLoading}
                                onchange={(checked) => updateBooleanValue(propRowView, checked)}
                            />
                        </div>
                    {:else}
                        <input
                            class="property-value"
                            type="text"
                            value={formatValue(value)}
                            disabled={$isLoading}
                            onblur={(e) => updatePropertyValue(propRowView, e.currentTarget.value)}
                        />
                    {/if}
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

    .property-value {
        flex: 1;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        background: var(--gs-bg-secondary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 3px;
        color: var(--gs-fg-primary);
    }

    .property-value:focus {
        outline: none;
        border-color: var(--gs-fg-link);
    }

    .property-checkbox {
        flex: 1;
        display: flex;
        align-items: center;
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
