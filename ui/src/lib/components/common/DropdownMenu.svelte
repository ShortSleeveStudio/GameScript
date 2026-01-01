<script lang="ts" module>
    // Re-export from side-car types file for backwards compatibility
    export type { MenuItem } from './DropdownMenu.types.js';
</script>

<script lang="ts">
    import type { MenuItem } from './DropdownMenu.types.js';

    /**
     * DropdownMenu component for icon-triggered menus.
     *
     * Provides a button that opens a dropdown menu with selectable items.
     * Supports:
     * - Custom trigger content (via snippet)
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
     *     onselect={handleSelect}
     * >
     *     {#snippet trigger()}<span>⚙</span>{/snippet}
     * </DropdownMenu>
     * ```
     */

    import type { Snippet } from 'svelte';
    import IconSettings from '$lib/components/icons/IconSettings.svelte';

    interface Props {
        /** Menu items to display */
        items?: MenuItem[];
        /** Whether the menu is currently open */
        open?: boolean;
        /** Menu alignment relative to trigger */
        align?: 'left' | 'right';
        /** Optional title/tooltip for the trigger button */
        title?: string;
        /** Callback when an item is selected */
        onselect?: (itemId: string) => void;
        /** Custom trigger content */
        trigger?: Snippet;
        /** Default slot for additional menu content */
        children?: Snippet;
    }

    let {
        items = [],
        open = $bindable(false),
        align = 'right',
        title = '',
        onselect,
        trigger,
        children,
    }: Props = $props();

    function toggle(): void {
        open = !open;
    }

    function close(): void {
        open = false;
    }

    function handleSelect(itemId: string): void {
        const item = items.find(i => i.id === itemId);
        if (item?.disabled) return;

        onselect?.(itemId);
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

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="dropdown-menu">
    <button
        class="dropdown-trigger"
        type="button"
        {title}
        onclick={(e) => { e.stopPropagation(); toggle(); }}
        aria-expanded={open}
        aria-haspopup="menu"
    >
        {#if trigger}
            {@render trigger()}
        {:else}
            <IconSettings size={16} />
        {/if}
    </button>
    {#if open}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div
            class="dropdown-content"
            class:dropdown-align-left={align === 'left'}
            class:dropdown-align-right={align === 'right'}
            role="menu"
            onclick={(e) => e.stopPropagation()}
        >
            {#each items as item (item.id)}
                <button
                    class="dropdown-item"
                    class:dropdown-item-danger={item.danger}
                    class:dropdown-item-disabled={item.disabled}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onclick={() => handleSelect(item.id)}
                >
                    {item.label}
                </button>
            {/each}
            {#if children}
                {@render children()}
            {/if}
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
