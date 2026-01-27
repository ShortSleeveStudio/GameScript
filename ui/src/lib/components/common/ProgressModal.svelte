<script lang="ts">
  /**
   * Progress modal for long-running operations.
   * Shows phase, progress bar, stats, and cancel button.
   *
   * Used for CSV import/export operations that may process
   * hundreds of thousands of rows.
   */
  import type { OperationPhase } from '@gamescript/shared';
  import Button from './Button.svelte';

  interface Props {
    open?: boolean;
    title: string;
    phase?: OperationPhase;
    current?: number;
    total?: number;
    stats?: {
      updated?: number;
      inserted?: number;
      exported?: number;
      skipped?: number;
      errors?: number;
    };
    errorMessages?: string[];
    canCancel?: boolean;
    oncancel?: () => void;
    onclose?: () => void;
  }

  let {
    open = false,
    title,
    phase = 'preparing',
    current = 0,
    total = 0,
    stats = {},
    errorMessages = [],
    canCancel = true,
    oncancel,
    onclose,
  }: Props = $props();

  const percentage = $derived(total > 0 ? Math.round((current / total) * 100) : 0);
  const isComplete = $derived(phase === 'complete' || phase === 'failed' || phase === 'cancelled');
  const phaseLabel = $derived({
    preparing: 'Preparing...',
    validating: 'Validating...',
    processing: 'Processing...',
    uploading: 'Uploading...',
    downloading: 'Downloading...',
    complete: 'Complete',
    failed: 'Failed',
    cancelled: 'Cancelled',
  }[phase]);

  function handleCancel() {
    oncancel?.();
  }

  function handleClose() {
    onclose?.();
  }

  function handleOverlayClick() {
    if (isComplete) {
      handleClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (isComplete) {
        handleClose();
      } else if (canCancel) {
        handleCancel();
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="gs-modal-overlay" onclick={handleOverlayClick}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="gs-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <h2 class="gs-modal-title">{title}</h2>

      <div class="progress-content">
        <!-- Phase indicator -->
        <div class="phase-label" class:phase-error={phase === 'failed'} class:phase-cancelled={phase === 'cancelled'}>
          {phaseLabel}
        </div>

        <!-- Progress bar -->
        {#if total > 0}
          <div class="progress-bar-container">
            <div
              class="progress-bar"
              class:progress-bar-error={phase === 'failed'}
              class:progress-bar-cancelled={phase === 'cancelled'}
              style="width: {percentage}%"
            ></div>
          </div>
          <div class="progress-text">
            {current.toLocaleString()} / {total.toLocaleString()} ({percentage}%)
          </div>
        {/if}

        <!-- Stats -->
        <div class="stats">
          {#if stats.exported !== undefined}
            <span class="stat">Exported: {stats.exported.toLocaleString()}</span>
          {/if}
          {#if stats.updated !== undefined}
            <span class="stat">Updated: {stats.updated.toLocaleString()}</span>
          {/if}
          {#if stats.inserted !== undefined}
            <span class="stat">Inserted: {stats.inserted.toLocaleString()}</span>
          {/if}
          {#if stats.skipped !== undefined && stats.skipped > 0}
            <span class="stat stat-warning">Skipped: {stats.skipped.toLocaleString()}</span>
          {/if}
          {#if stats.errors !== undefined && stats.errors > 0}
            <span class="stat stat-error">Errors: {stats.errors.toLocaleString()}</span>
          {/if}
        </div>

        <!-- Error messages -->
        {#if errorMessages.length > 0}
          <div class="error-list">
            <strong>Errors:</strong>
            <ul>
              {#each errorMessages.slice(0, 10) as msg}
                <li>{msg}</li>
              {/each}
              {#if errorMessages.length > 10}
                <li class="error-more">... and {errorMessages.length - 10} more</li>
              {/if}
            </ul>
          </div>
        {/if}
      </div>

      <div class="gs-modal-actions">
        {#if isComplete}
          <Button variant="primary" onclick={handleClose}>Close</Button>
        {:else}
          <Button variant="secondary" onclick={handleCancel} disabled={!canCancel}>
            Cancel
          </Button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
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

  .gs-modal {
    background-color: var(--gs-bg-primary);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    padding: 24px;
    width: 450px;
    max-width: 90vw;
  }

  .gs-modal-title {
    margin: 0 0 16px 0;
    font-size: var(--gs-font-size-large);
    font-weight: 600;
    color: var(--gs-fg-primary);
  }

  .progress-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .phase-label {
    font-weight: 500;
    color: var(--gs-fg-secondary);
  }

  .phase-label.phase-error {
    color: var(--gs-error, #ff4444);
  }

  .phase-label.phase-cancelled {
    color: var(--gs-warning, #ffaa00);
  }

  .progress-bar-container {
    height: 8px;
    background: var(--gs-bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: var(--gs-accent-primary);
    transition: width 0.2s ease-out;
  }

  .progress-bar.progress-bar-error {
    background: var(--gs-error, #ff4444);
  }

  .progress-bar.progress-bar-cancelled {
    background: var(--gs-warning, #ffaa00);
  }

  .progress-text {
    font-size: 0.9em;
    color: var(--gs-fg-secondary);
    text-align: center;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 0.9em;
  }

  .stat {
    color: var(--gs-fg-secondary);
  }

  .stat-warning {
    color: var(--gs-warning, #ffaa00);
  }

  .stat-error {
    color: var(--gs-error, #ff4444);
  }

  .error-list {
    background: rgba(255, 68, 68, 0.1);
    border: 1px solid var(--gs-error, #ff4444);
    border-radius: 4px;
    padding: 12px;
    font-size: 0.85em;
    max-height: 150px;
    overflow-y: auto;
  }

  .error-list ul {
    margin: 8px 0 0 0;
    padding-left: 20px;
  }

  .error-list li {
    margin: 4px 0;
    color: var(--gs-fg-secondary);
  }

  .error-list .error-more {
    font-style: italic;
    color: var(--gs-fg-tertiary);
  }

  .gs-modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding-top: 16px;
    border-top: 1px solid var(--gs-border-primary);
    margin-top: 16px;
  }
</style>
