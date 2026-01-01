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
     *     on:confirm={handleDelete}
     *     on:cancel={handleCancel}
     * >
     *     All nodes using these actors will revert to the default actor.
     * </DeleteConfirmationModal>
     */
    import { createEventDispatcher } from 'svelte';
    import Modal from './Modal.svelte';

    /** Whether the modal is open */
    export let open = false;
    /** Number of items being deleted */
    export let itemCount = 1;
    /** Singular name of the item type (e.g., "actor", "locale") */
    export let itemName = 'item';
    /** Plural name of the item type (e.g., "actors", "locales") */
    export let itemNamePlural = 'items';
    /** Modal title */
    export let title = 'Are you sure?';

    const dispatch = createEventDispatcher<{
        confirm: void;
        cancel: void;
    }>();

    function handleConfirm() {
        dispatch('confirm');
    }

    function handleCancel() {
        open = false;
        dispatch('cancel');
    }

    $: displayName = itemCount === 1 ? itemName : itemNamePlural;
    $: countText = itemCount === 1 ? `1 ${itemName}` : `${itemCount} ${itemNamePlural}`;
</script>

<Modal
    bind:open
    {title}
    confirmLabel="Delete"
    confirmVariant="danger"
    size="small"
    on:confirm={handleConfirm}
    on:cancel={handleCancel}
>
    <p class="delete-modal-text">
        <slot>
            Are you sure you want to delete {countText}? This action cannot be undone.
        </slot>
    </p>
</Modal>

<style>
    .delete-modal-text {
        margin: 0;
        color: var(--gs-fg-secondary);
        line-height: 1.5;
    }
</style>
