<script lang="ts">
  /**
   * Reusable modal dialog component.
   *
   * Features:
   * - Absolutely positioned overlay that doesn't affect layout
   * - Click outside to close (optional)
   * - Escape key to close
   * - Customizable title and content via slots
   * - Confirm/Cancel buttons with customizable labels and variants
   */
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import Button from './Button.svelte';

  export let open = false;
  export let title: string;
  export let confirmLabel = 'Confirm';
  export let cancelLabel = 'Cancel';
  export let confirmDisabled = false;
  export let confirmVariant: 'primary' | 'danger' = 'primary';
  export let closeOnClickOutside = true;
  export let size: 'small' | 'medium' | 'large' = 'medium';

  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
    close: void;
  }>();

  function handleConfirm() {
    dispatch('confirm');
  }

  function handleCancel() {
    dispatch('cancel');
    dispatch('close');
  }

  function handleOverlayClick() {
    if (closeOnClickOutside) {
      handleCancel();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      handleCancel();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if open}
  <div class="gs-modal-overlay" on:click={handleOverlayClick}>
    <div
      class="gs-modal"
      class:gs-modal-small={size === 'small'}
      class:gs-modal-medium={size === 'medium'}
      class:gs-modal-large={size === 'large'}
      on:click|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title" class="gs-modal-title">{title}</h2>

      <div class="gs-modal-content">
        <slot />
      </div>

      <div class="gs-modal-actions">
        <Button variant="secondary" onclick={handleCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          onclick={handleConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
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

  .gs-modal-small {
    width: 400px;
    max-width: 90vw;
  }

  .gs-modal-medium {
    width: 600px;
    max-width: 90vw;
  }

  .gs-modal-large {
    width: 800px;
    max-width: 90vw;
  }

  .gs-modal-title {
    margin: 0;
    font-size: var(--gs-font-size-large);
    font-weight: 600;
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
