<script lang="ts">
    /**
     * A reusable delete confirmation modal.
     *
     * Features:
     * - Pre-configured for destructive actions
     * - Configurable item type and count
     * - Custom consequence message
     * - Danger-styled confirm button
     *
     * Usage:
     * <DeleteConfirmationModal
     *     bind:open={isDeleteModalOpen}
     *     itemCount={selectedItems.length}
     *     itemName="actor"
     *     itemNamePlural="actors"
     *     onconfirm={handleDelete}
     *     oncancel={handleCancel}
     * >
     *     All nodes using these actors will revert to the default actor.
     * </DeleteConfirmationModal>
     */
    import Modal from './Modal.svelte';

    interface Props {
        /** Whether the modal is open */
        open?: boolean;
        /** Number of items being deleted */
        itemCount?: number;
        /** Singular name of the item type (e.g., "actor", "locale") */
        itemName?: string;
        /** Plural name of the item type (e.g., "actors", "locales") */
        itemNamePlural?: string;
        /** Modal title */
        title?: string;
        /** Callback when user confirms deletion */
        onconfirm?: () => void;
        /** Callback when user cancels */
        oncancel?: () => void;
        /** Custom message content */
        children?: import('svelte').Snippet;
    }

    let {
        open = $bindable(false),
        itemCount = 1,
        itemName = 'item',
        itemNamePlural = 'items',
        title = 'Are you sure?',
        onconfirm,
        oncancel,
        children,
    }: Props = $props();

    function handleConfirm() {
        onconfirm?.();
    }

    function handleCancel() {
        open = false;
        oncancel?.();
    }

    let countText = $derived(itemCount === 1 ? `1 ${itemName}` : `${itemCount} ${itemNamePlural}`);
</script>

<Modal
    bind:open
    {title}
    confirmLabel="Delete"
    confirmVariant="danger"
    size="small"
    onconfirm={handleConfirm}
    oncancel={handleCancel}
>
    <p class="delete-modal-text">
        {#if children}
            {@render children()}
        {:else}
            Are you sure you want to delete {countText}? This action cannot be undone.
        {/if}
    </p>
</Modal>

<style>
    .delete-modal-text {
        margin: 0;
        color: var(--gs-fg-secondary);
        line-height: 1.5;
    }
</style>
