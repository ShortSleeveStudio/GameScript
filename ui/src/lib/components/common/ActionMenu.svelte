<script lang="ts" module>
    /**
     * Action menu item types.
     */

    /** Base interface for all menu items */
    interface ActionMenuItemBase {
        /** Unique identifier for the item */
        id: string;
        /** Display label */
        label: string;
        /** Whether the item is disabled */
        disabled?: boolean;
    }

    /** Button-style menu item - triggers an action when clicked */
    export interface ActionMenuItemButton extends ActionMenuItemBase {
        type: 'button';
        /** Whether this is a danger/destructive action */
        danger?: boolean;
    }

    /** Toggle-style menu item - shows a checkmark when active */
    export interface ActionMenuItemToggle extends ActionMenuItemBase {
        type: 'toggle';
        /** Whether the toggle is currently active/checked */
        checked: boolean;
    }

    /** Separator between menu items */
    export interface ActionMenuItemSeparator {
        type: 'separator';
    }

    /** Union type for all menu item types */
    export type ActionMenuItem = ActionMenuItemButton | ActionMenuItemToggle | ActionMenuItemSeparator;
</script>

<script lang="ts">
    /**
     * ActionMenu component for context-menu style dropdowns.
     *
     * Unlike DropdownMenu (which is for icon-triggered menus), ActionMenu is
     * designed for toolbar actions with support for:
     * - Button items (trigger an action)
     * - Toggle items (show checkmark when active)
     * - Separators between groups
     * - Keyboard navigation (Escape to close)
     * - Click-outside to close
     *
     * Usage:
     * ```svelte
     * <ActionMenu
     *     items={[
     *         { type: 'toggle', id: 'auto-layout', label: 'Auto Layout', checked: isAutoLayout },
     *         { type: 'toggle', id: 'vertical', label: 'Vertical', checked: isVertical },
     *         { type: 'separator' },
     *         { type: 'button', id: 'delete', label: 'Delete Selection', danger: true }
     *     ]}
     *     onselect={handleSelect}
     * >
     *     View
     * </ActionMenu>
     * ```
     */

    import type { Snippet } from 'svelte';

    interface Props {
        /** Menu items to display */
        items: ActionMenuItem[];
        /** Menu alignment relative to trigger */
        align?: 'left' | 'right';
        /** Whether the button is disabled */
        disabled?: boolean;
        /** Optional title/tooltip for the trigger button */
        title?: string;
        /** Callback when an item is selected */
        onselect?: (itemId: string) => void;
        /** Button content */
        children?: Snippet;
    }

    let {
        items,
        align = 'right',
        disabled = false,
        title = '',
        onselect,
        children,
    }: Props = $props();

    let open = $state(false);

    function toggle(): void {
        if (!disabled) {
            open = !open;
        }
    }

    function close(): void {
        open = false;
    }

    function handleSelect(item: ActionMenuItem): void {
        if (item.type === 'separator') return;
        if (item.disabled) return;

        onselect?.(item.id);
        close();
    }

    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape' && open) {
            close();
        }
    }

    function handleClickOutside(): void {
        if (open) {
            close();
        }
    }

    function isToggle(item: ActionMenuItem): item is ActionMenuItemToggle {
        return item.type === 'toggle';
    }

    function isButton(item: ActionMenuItem): item is ActionMenuItemButton {
        return item.type === 'button';
    }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="action-menu">
    <button
        class="action-menu-trigger"
        class:action-menu-trigger-open={open}
        type="button"
        {title}
        {disabled}
        onclick={(e) => { e.stopPropagation(); toggle(); }}
        aria-expanded={open}
        aria-haspopup="menu"
    >
        {#if children}
            {@render children()}
        {:else}
            Actions
        {/if}
        <span class="action-menu-arrow">{open ? '▲' : '▼'}</span>
    </button>
    {#if open}
        <div
            class="action-menu-content"
            class:action-menu-align-left={align === 'left'}
            class:action-menu-align-right={align === 'right'}
            role="menu"
            onclick={(e) => e.stopPropagation()}
        >
            {#each items as item, index}
                {#if item.type === 'separator'}
                    <div class="action-menu-separator" role="separator"></div>
                {:else}
                    <button
                        class="action-menu-item"
                        class:action-menu-item-danger={isButton(item) && item.danger}
                        class:action-menu-item-disabled={item.disabled}
                        type="button"
                        role="menuitem"
                        disabled={item.disabled}
                        onclick={() => handleSelect(item)}
                    >
                        {#if isToggle(item)}
                            <span class="action-menu-check">
                                {item.checked ? '✓' : ''}
                            </span>
                        {/if}
                        <span class="action-menu-label">{item.label}</span>
                    </button>
                {/if}
            {/each}
        </div>
    {/if}
</div>

<style>
    .action-menu {
        position: relative;
        display: inline-block;
    }

    .action-menu-trigger {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: var(--gs-button-secondary-bg);
        color: var(--gs-button-secondary-fg);
        border: none;
        border-radius: 2px;
        font-size: 12px;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s;
    }

    .action-menu-trigger:hover:not(:disabled) {
        background: var(--gs-button-secondary-hover-bg);
    }

    .action-menu-trigger:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .action-menu-trigger-open {
        background: var(--gs-button-secondary-hover-bg);
    }

    .action-menu-arrow {
        font-size: 8px;
        opacity: 0.7;
    }

    .action-menu-content {
        position: absolute;
        top: calc(100% + 4px);
        background: var(--gs-menu-bg);
        border: 1px solid var(--gs-border-menu);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        z-index: 100;
        min-width: 160px;
        overflow: hidden;
        padding: 4px 0;
    }

    .action-menu-align-left {
        left: 0;
    }

    .action-menu-align-right {
        right: 0;
    }

    .action-menu-item {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 6px 12px;
        background: none;
        border: none;
        color: var(--gs-menu-fg);
        text-align: left;
        cursor: pointer;
        font-size: 12px;
        font-family: inherit;
        gap: 8px;
    }

    .action-menu-item:hover:not(:disabled) {
        background: var(--gs-menu-selection-bg);
    }

    .action-menu-item-danger {
        color: var(--gs-fg-error);
    }

    .action-menu-item-disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .action-menu-check {
        width: 16px;
        text-align: center;
        font-size: 12px;
    }

    .action-menu-label {
        flex: 1;
    }

    .action-menu-separator {
        height: 1px;
        background: var(--gs-border-primary);
        margin: 4px 8px;
    }
</style>
