<script lang="ts">
    /**
     * Graph Settings Modal.
     *
     * Provides configuration for:
     * - Layout defaults (auto-layout, vertical orientation)
     * - Custom node properties (create, rename, delete property templates)
     *
     * These settings affect new conversations created locally.
     */
    import { Modal, Button, Dropdown, Checkbox, SettingsSection } from '$lib/components/common';
    import EditableList, { type TypeOption } from '$lib/components/common/EditableList.svelte';
    import { dbConnected } from '$lib/stores/connection.js';
    import { toastError, toastSuccess } from '$lib/stores/notifications.js';
    import {
        graphLayoutAutoLayoutDefault,
        graphLayoutVerticalDefault,
    } from '$lib/stores/layout-defaults.js';
    import {
        PROPERTY_TYPES,
        PROPERTY_TYPE_STRING,
        TABLE_NODES,
        type PropertyTemplate,
    } from '@gamescript/shared';
    import { propertyTemplates as propertyTemplatesCrud } from '$lib/crud';
    import { propertyTemplatesTable } from '$lib/tables';
    import type { IDbRowView } from '$lib/db';

    interface Props {
        /** Whether the modal is open */
        open: boolean;
        /** Callback when the modal is closed */
        onclose?: () => void;
    }

    let { open = $bindable(), onclose }: Props = $props();

    // ============================================================================
    // Property Templates
    // ============================================================================

    const propertyTypeOptions: TypeOption[] = PROPERTY_TYPES
        .map(t => ({ id: t.id, name: t.name }));

    async function handleAddTemplate() {
        try {
            await propertyTemplatesCrud.create({
                parent: TABLE_NODES.id,
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

    // ============================================================================
    // Layout Defaults
    // ============================================================================

    function handleOrientationChange(value: string | number) {
        $graphLayoutVerticalDefault = value === 'vertical';
    }

    function handleAutoLayoutChange(checked: boolean) {
        $graphLayoutAutoLayoutDefault = checked;
    }

    // ============================================================================
    // Modal Handlers
    // ============================================================================

    function handleClose() {
        open = false;
        onclose?.();
    }
</script>

{#if open}
    <div class="gs-modal-overlay" onclick={handleClose}>
        <div
            class="gs-modal gs-modal-medium"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.key === 'Escape' && handleClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="graph-settings-title"
        >
            <div class="modal-header">
                <h2 id="graph-settings-title" class="gs-modal-title">Graph Settings</h2>
                <button
                    class="modal-close-button"
                    type="button"
                    onclick={handleClose}
                    aria-label="Close"
                >
                    &times;
                </button>
            </div>

            <div class="gs-modal-content">
                <SettingsSection
                    title="Layout Defaults"
                    description="These settings control the default layout options for new conversations you create. They only affect new conversations created locally."
                >
                    <div class="setting-row">
                        <span class="setting-label">Default Graph Orientation</span>
                        <Dropdown
                            options={[
                                { value: 'horizontal', label: 'Horizontal' },
                                { value: 'vertical', label: 'Vertical' }
                            ]}
                            value={$graphLayoutVerticalDefault ? 'vertical' : 'horizontal'}
                            fullWidth={false}
                            onchange={handleOrientationChange}
                        />
                    </div>

                    <div class="setting-row">
                        <span class="setting-label">Default Auto-Layout</span>
                        <Checkbox
                            checked={$graphLayoutAutoLayoutDefault}
                            label="Enabled"
                            onchange={handleAutoLayoutChange}
                        />
                    </div>
                </SettingsSection>

                <EditableList
                    title="Custom Node Properties"
                    description="Custom node properties allow you to associate arbitrary primitive values with nodes in your conversation graphs. When you inspect a node, you can add as few or as many of these properties as you see fit."
                    rowViews={propertyTemplatesTable.rows}
                    isConnected={$dbConnected}
                    showType={true}
                    typeOptions={propertyTypeOptions}
                    disconnectedText="Connect to a database to manage property templates."
                    emptyText="No custom properties defined."
                    addButtonLabel="+ Add Property"
                    deleteModalTitle="Delete Property?"
                    deleteModalText='Delete is a destructive operation that will wipe out all properties of this type that you have added to your nodes.'
                    onadd={handleAddTemplate}
                    onrename={handleRenameTemplate}
                    ontypeChange={handleTemplateTypeChange}
                    ondelete={handleDeleteTemplate}
                />
            </div>

            <div class="gs-modal-actions">
                <Button variant="primary" onclick={handleClose}>
                    Done
                </Button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Overlay - absolutely positioned to cover entire viewport */
    .gs-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(2px);
    }

    /* Modal dialog */
    .gs-modal {
        background-color: var(--gs-bg-primary);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        padding: 24px;
        max-height: 90vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .gs-modal-medium {
        width: 600px;
        max-width: 90vw;
        height: 60vh;
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .gs-modal-title {
        margin: 0;
        font-size: var(--gs-font-size-large);
        font-weight: 600;
        color: var(--gs-fg-primary);
    }

    .modal-close-button {
        background: none;
        border: none;
        color: var(--gs-fg-secondary);
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    }

    .modal-close-button:hover {
        background: var(--gs-list-hover-bg);
        color: var(--gs-fg-primary);
    }

    .gs-modal-content {
        flex: 1;
        overflow-y: auto;
    }

    .gs-modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        padding-top: 8px;
        border-top: 1px solid var(--gs-border-primary);
    }

    /* Layout Defaults */
    .setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--gs-border-primary);
    }

    .setting-label {
        font-size: 12px;
        color: var(--gs-fg-primary);
    }
</style>
