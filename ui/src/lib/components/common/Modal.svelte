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
   *
   * Styles are defined in theme.css under .gs-modal-* classes.
   */
  import { onMount, onDestroy } from 'svelte';
  import Button from './Button.svelte';

  interface Props {
    open?: boolean;
    title: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmDisabled?: boolean;
    confirmVariant?: 'primary' | 'danger';
    closeOnClickOutside?: boolean;
    size?: 'small' | 'medium' | 'large';
    onconfirm?: () => void;
    oncancel?: () => void;
    onclose?: () => void;
    children?: import('svelte').Snippet;
  }

  let {
    open = $bindable(false),
    title,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmDisabled = false,
    confirmVariant = 'primary',
    closeOnClickOutside = true,
    size = 'medium',
    onconfirm,
    oncancel,
    onclose,
    children,
  }: Props = $props();

  function handleConfirm() {
    onconfirm?.();
  }

  function handleCancel() {
    oncancel?.();
    onclose?.();
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
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="gs-modal-overlay" onclick={handleOverlayClick}>
    <div
      class="gs-modal"
      class:gs-modal-small={size === 'small'}
      class:gs-modal-medium={size === 'medium'}
      class:gs-modal-large={size === 'large'}
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title" class="gs-modal-title">{title}</h2>

      <div class="gs-modal-content">
        {#if children}
          {@render children()}
        {/if}
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

<!-- Styles are defined in theme.css under .gs-modal-* classes -->
