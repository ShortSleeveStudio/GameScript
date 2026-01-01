<script lang="ts">
    /**
     * Conversation Finder Settings Modal.
     *
     * Provides configuration for:
     * - Conversation filters (create, rename, delete filter columns)
     *
     * Filters become custom columns in the Conversation Finder grid.
     */
    import { Button, SettingsSection } from '$lib/components/common';
    import EditableList from '$lib/components/common/EditableList.svelte';
    import { dbConnected } from '$lib/stores/connection.js';
    import { toastError, toastSuccess } from '$lib/stores/notifications.js';
    import { filters as filtersCrud } from '$lib/crud';
    import { filtersTable } from '$lib/tables';
    import type { IDbRowView } from '$lib/db';
    import type { Filter } from '@gamescript/shared';

    interface Props {
        /** Whether the modal is open */
        open: boolean;
        /** Callback when the modal is closed */
        onclose?: () => void;
    }

    let { open = $bindable(), onclose }: Props = $props();

    // ============================================================================
    // Filters
    // ============================================================================

    async function handleAddFilter() {
        try {
            await filtersCrud.create('New Filter');
            toastSuccess('Filter created');
        } catch (error) {
            toastError('Failed to create filter', error);
        }
    }

    async function handleRenameFilter(event: CustomEvent<{ rowView: IDbRowView<Filter>; name: string }>) {
        try {
            const { rowView, name } = event.detail;
            const filter = rowView.getValue();
            await filtersCrud.updateOne(filter, { ...filter, name });
        } catch (error) {
            toastError('Failed to rename filter', error);
        }
    }

    async function handleDeleteFilter(event: CustomEvent<{ rowView: IDbRowView<Filter> }>) {
        try {
            await filtersCrud.remove(event.detail.rowView.id);
            toastSuccess('Filter deleted');
        } catch (error) {
            toastError('Failed to delete filter', error);
        }
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
            aria-labelledby="cf-settings-title"
        >
            <div class="modal-header">
                <h2 id="cf-settings-title" class="gs-modal-title">Conversation Finder Settings</h2>
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
                <EditableList
                    title="Conversation Filters"
                    description="Filters allow you to create custom columns in the Conversation Finder for tagging and categorizing conversations. Each filter becomes a column where you can tag conversations with a unique value."
                    rowViews={filtersTable.rows}
                    isConnected={$dbConnected}
                    disconnectedText="Connect to a database to manage filters."
                    emptyText="No filters defined."
                    addButtonLabel="+ Add Filter"
                    deleteModalTitle="Delete Filter?"
                    deleteModalText='Delete is a destructive operation that will wipe out all tags you have added to your conversations for this filter.'
                    on:add={handleAddFilter}
                    on:rename={handleRenameFilter}
                    on:delete={handleDeleteFilter}
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
</style>
