<script lang="ts" context="module">
    /**
     * Menu item configuration.
     */
    export interface MenuItem {
        /** Unique identifier for the item */
        id: string;
        /** Display label */
        label: string;
        /** Whether this is a danger/destructive action */
        danger?: boolean;
        /** Whether the item is disabled */
        disabled?: boolean;
    }
</script>

<script lang="ts">
    /**
     * DropdownMenu component for icon-triggered menus.
     *
     * Provides a button that opens a dropdown menu with selectable items.
     * Supports:
     * - Custom trigger content (via slot)
     * - Menu items with danger styling
     * - Disabled items
     * - Click-outside to close
     * - Keyboard escape to close
     *
     * Usage:
     * ```svelte
     * <DropdownMenu
     *     items={[
     *         { id: 'edit', label: 'Edit' },
     *         { id: 'delete', label: 'Delete', danger: true }
     *     ]}
     *     on:select={handleSelect}
     * >
     *     <span slot="trigger">⚙</span>
     * </DropdownMenu>
     * ```
     */

    import { createEventDispatcher } from 'svelte';
    import IconSettings from '$lib/components/icons/IconSettings.svelte';

    /** Menu items to display */
    export let items: MenuItem[] = [];

    /** Whether the menu is currently open */
    export let open: boolean = false;

    /** Menu alignment relative to trigger */
    export let align: 'left' | 'right' = 'right';

    /** Optional title/tooltip for the trigger button */
    export let title: string = '';

    const dispatch = createEventDispatcher<{ select: string }>();

    function toggle(): void {
        open = !open;
    }

    function close(): void {
        open = false;
    }

    function handleSelect(itemId: string): void {
        const item = items.find(i => i.id === itemId);
        if (item?.disabled) return;

        dispatch('select', itemId);
        close();
    }

    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            close();
        }
    }

    function handleClickOutside(): void {
        if (open) {
            close();
        }
    }
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} />

<div class="dropdown-menu">
    <button
        class="dropdown-trigger"
        type="button"
        {title}
        on:click|stopPropagation={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
    >
        <slot name="trigger"><IconSettings size={16} /></slot>
    </button>
    {#if open}
        <div
            class="dropdown-content"
            class:dropdown-align-left={align === 'left'}
            class:dropdown-align-right={align === 'right'}
            role="menu"
            on:click|stopPropagation
        >
            {#each items as item (item.id)}
                <button
                    class="dropdown-item"
                    class:dropdown-item-danger={item.danger}
                    class:dropdown-item-disabled={item.disabled}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    on:click={() => handleSelect(item.id)}
                >
                    {item.label}
                </button>
            {/each}
            <slot />
        </div>
    {/if}
</div>

<style>
    .dropdown-menu {
        position: relative;
        display: inline-block;
    }

    .dropdown-trigger {
        background: none;
        border: none;
        color: var(--gs-fg-primary);
        cursor: pointer;
        padding: 4px 8px;
        font-size: 12px;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .dropdown-trigger:hover {
        background: var(--gs-toolbar-hover-bg);
    }

    .dropdown-content {
        position: absolute;
        top: 100%;
        background: var(--gs-menu-bg);
        border: 1px solid var(--gs-border-menu);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        z-index: 100;
        min-width: 120px;
        overflow: hidden;
    }

    .dropdown-align-left {
        left: 0;
    }

    .dropdown-align-right {
        right: 0;
    }

    .dropdown-item {
        display: block;
        width: 100%;
        padding: 6px 12px;
        background: none;
        border: none;
        color: var(--gs-menu-fg);
        text-align: left;
        cursor: pointer;
        font-size: 12px;
        font-family: inherit;
    }

    .dropdown-item:hover:not(:disabled) {
        background: var(--gs-menu-selection-bg);
    }

    .dropdown-item-danger {
        color: var(--gs-fg-error);
    }

    .dropdown-item-disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
