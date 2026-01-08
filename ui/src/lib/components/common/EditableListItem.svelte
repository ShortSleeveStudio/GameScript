<script lang="ts" generics="T extends import('@gamescript/shared').Row & { name?: string; type?: number }">
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
    selectable?: boolean;
    selected?: boolean;
    onrename?: (payload: { rowView: IDbRowView<T>; name: string }) => void;
    ontypeChange?: (payload: { rowView: IDbRowView<T>; type: number }) => void;
    ondelete?: (payload: { rowView: IDbRowView<T> }) => void;
    onselect?: (payload: { rowView: IDbRowView<T> }) => void;
    /** Optional function to get display name for items without a 'name' property */
    getDisplayName?: (data: T) => string;
  }

  // ============================================================================
  // Props
  // ============================================================================

  let {
    rowView,
    showType = false,
    typeOptions = [],
    selectable = false,
    selected = false,
    onrename,
    ontypeChange,
    ondelete,
    onselect,
    getDisplayName,
  }: Props = $props();

  // Compute display name - use getDisplayName if provided, otherwise use name property
  let displayName = $derived(
    getDisplayName ? getDisplayName(rowView.data) : (rowView.data.name ?? '')
  );

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

  function handleRowClick() {
    if (selectable) {
      onselect?.({ rowView });
    }
  }
</script>

<div
  class="item-row"
  class:selectable
  class:selected
  onclick={handleRowClick}
  onkeydown={(e) => e.key === 'Enter' && handleRowClick()}
  role={selectable ? 'button' : undefined}
  tabindex={selectable ? 0 : undefined}
>
  <div class="item-name">
    <InlineEdit
      value={displayName}
      onsave={handleRename}
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
    padding: 6px 8px;
    border-bottom: 1px solid var(--gs-border-primary);
    margin: 0 -8px;
  }

  .item-row.selectable {
    cursor: pointer;
    border-radius: 4px;
    border: 1px solid var(--gs-border-primary);
    margin: 2px -8px;
    transition: background-color 0.1s, border-color 0.1s;
  }

  .item-row.selectable:hover {
    background: var(--gs-list-hover-bg);
    border-color: var(--gs-border-secondary);
  }

  .item-row.selected {
    background: var(--gs-list-selected-bg);
    border-color: var(--gs-border-focus);
  }

  .item-row.selected:hover {
    background: var(--gs-list-selected-bg);
    border-color: var(--gs-border-focus);
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
