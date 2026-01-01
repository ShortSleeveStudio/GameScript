<script lang="ts" module>
  /**
   * Reusable editable list component with reactive row view support.
   *
   * Provides a list of items with:
   * - Inline name editing (double-click to edit)
   * - Optional type dropdown
   * - Delete with confirmation modal
   * - Add button
   * - Reactive updates via IDbRowView pattern
   */

  export interface TypeOption {
    id: number;
    name: string;
  }
</script>

<script lang="ts" generics="T extends import('@gamescript/shared').Row & { name: string; type?: number }">
  import { createEventDispatcher } from 'svelte';
  import type { IDbRowView } from '$lib/db';
  import Button from './Button.svelte';
  import EditableListItem from './EditableListItem.svelte';

  // ============================================================================
  // Props
  // ============================================================================

  interface Props {
    rowViews?: IDbRowView<T>[];
    title: string;
    description: string;
    disconnectedText?: string;
    emptyText?: string;
    addButtonLabel?: string;
    deleteModalTitle?: string;
    deleteModalText?: string;
    showType?: boolean;
    typeOptions?: TypeOption[];
    isConnected?: boolean;
  }

  let {
    rowViews = [],
    title,
    description,
    disconnectedText = 'Connect to a database to manage items.',
    emptyText = 'No items defined.',
    addButtonLabel = '+ Add Item',
    deleteModalTitle = 'Delete Item?',
    deleteModalText = 'Are you sure you want to delete "{name}"?',
    showType = false,
    typeOptions = [],
    isConnected = false,
  }: Props = $props();

  // ============================================================================
  // State
  // ============================================================================

  let showDeleteModal = $state(false);
  let rowViewToDelete: IDbRowView<T> | null = $state(null);

  const dispatch = createEventDispatcher<{
    add: void;
    rename: { rowView: IDbRowView<T>; name: string };
    typeChange: { rowView: IDbRowView<T>; type: number };
    delete: { rowView: IDbRowView<T> };
  }>();

  // ============================================================================
  // Handlers
  // ============================================================================

  function handleRename(payload: { rowView: IDbRowView<T>; name: string }) {
    dispatch('rename', payload);
  }

  function handleTypeChange(payload: { rowView: IDbRowView<T>; type: number }) {
    dispatch('typeChange', payload);
  }

  function confirmDelete(payload: { rowView: IDbRowView<T> }) {
    rowViewToDelete = payload.rowView;
    showDeleteModal = true;
  }

  function cancelDelete() {
    showDeleteModal = false;
    rowViewToDelete = null;
  }

  function handleDelete() {
    if (!rowViewToDelete) return;
    dispatch('delete', { rowView: rowViewToDelete });
    cancelDelete();
  }

  function handleAdd() {
    dispatch('add');
  }

  // Convert typeOptions to Dropdown options format
  let dropdownTypeOptions = $derived(typeOptions.map(t => ({ value: t.id, label: t.name })));

  // Derive the name of the item to delete
  let deleteItemName = $derived(rowViewToDelete ? (rowViewToDelete as IDbRowView<T>).data.name : '');
</script>

<div class="section">
  <h2 class="section-title">{title}</h2>
  <p class="section-description">{description}</p>

  {#if !isConnected}
    <div class="help-text">{disconnectedText}</div>
  {:else}
    <Button variant="secondary" size="small" onclick={handleAdd}>
      {addButtonLabel}
    </Button>

    <div class="items-list">
      {#each rowViews as rowView (rowView.id)}
        <EditableListItem
          {rowView}
          {showType}
          typeOptions={dropdownTypeOptions}
          onrename={handleRename}
          ontypeChange={handleTypeChange}
          ondelete={confirmDelete}
        />
      {:else}
        <div class="empty-state">{emptyText}</div>
      {/each}
    </div>
  {/if}
</div>

{#if showDeleteModal && rowViewToDelete}
  <div class="modal-overlay" onclick={cancelDelete} onkeydown={() => {}}>
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.key === 'Escape' && cancelDelete()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <h3 id="delete-modal-title" class="modal-title">{deleteModalTitle}</h3>
      <p class="modal-text">
        {deleteModalText.replace('{name}', deleteItemName)}
      </p>
      <div class="modal-actions">
        <Button variant="secondary" onclick={cancelDelete}>
          Cancel
        </Button>
        <Button variant="danger" onclick={handleDelete}>
          Delete
        </Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .section {
    margin-bottom: 24px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--gs-fg-secondary);
    margin: 0 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--gs-border-primary);
  }

  .section-description {
    font-size: var(--gs-font-size-small);
    color: var(--gs-fg-secondary);
    margin: 0 0 12px 0;
    line-height: 1.4;
  }

  .help-text {
    margin-top: 12px;
    font-size: var(--gs-font-size-small);
    color: var(--gs-fg-secondary);
    font-style: italic;
  }

  .items-list {
    margin-top: 12px;
  }

  .empty-state {
    font-size: 12px;
    color: var(--gs-fg-secondary);
    font-style: italic;
    padding: 8px 0;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--gs-bg-primary);
    border: 1px solid var(--gs-border-primary);
    border-radius: 4px;
    padding: 16px;
    max-width: 400px;
    width: 90%;
  }

  .modal-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: var(--gs-fg-primary);
  }

  .modal-text {
    font-size: 12px;
    margin: 0 0 16px 0;
    color: var(--gs-fg-secondary);
    line-height: 1.4;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
