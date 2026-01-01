<script lang="ts" generics="T extends import('@gamescript/shared').Row & { name: string; type?: number }">
  /**
   * Single item row for EditableList component.
   *
   * Renders a single row with reactive data access via rowView.data.
   */
  import type { IDbRowView } from '$lib/db';
  import Button from './Button.svelte';
  import Dropdown from './Dropdown.svelte';
  import InlineEdit from './InlineEdit.svelte';

  // ============================================================================
  // Types
  // ============================================================================

  interface DropdownOption {
    value: number;
    label: string;
  }

  interface Props {
    rowView: IDbRowView<T>;
    showType?: boolean;
    typeOptions?: DropdownOption[];
    onrename?: (payload: { rowView: IDbRowView<T>; name: string }) => void;
    ontypeChange?: (payload: { rowView: IDbRowView<T>; type: number }) => void;
    ondelete?: (payload: { rowView: IDbRowView<T> }) => void;
  }

  // ============================================================================
  // Props
  // ============================================================================

  let {
    rowView,
    showType = false,
    typeOptions = [],
    onrename,
    ontypeChange,
    ondelete,
  }: Props = $props();

  // ============================================================================
  // Handlers
  // ============================================================================

  function handleRename(newName: string) {
    if (newName) {
      onrename?.({ rowView, name: newName });
    }
  }

  function handleTypeChange(value: string | number) {
    const newType = typeof value === 'string' ? parseInt(value, 10) : value;
    ontypeChange?.({ rowView, type: newType });
  }

  function handleDelete() {
    ondelete?.({ rowView });
  }
</script>

<div class="item-row">
  <div class="item-name">
    <InlineEdit
      value={rowView.data.name}
      on:save={({ detail }) => handleRename(detail)}
    />
  </div>
  {#if showType}
    <div class="item-type">
      <Dropdown
        options={typeOptions}
        value={rowView.data.type ?? 0}
        size="small"
        onchange={handleTypeChange}
      />
    </div>
  {/if}
  <div class="item-actions">
    <Button
      variant="ghost"
      iconOnly
      dangerHover
      onclick={handleDelete}
      title="Delete"
    >×</Button>
  </div>
</div>

<style>
  .item-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid var(--gs-border-primary);
  }

  .item-name {
    flex: 1;
    min-width: 0;
  }

  .item-type {
    flex: 0 0 100px;
  }

  .item-actions {
    flex: 0 0 24px;
  }
</style>
