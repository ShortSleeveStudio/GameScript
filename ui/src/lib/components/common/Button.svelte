<script lang="ts">
    /**
     * Reusable button component with consistent styling.
     *
     * Provides standardized button variants used throughout the application:
     * - primary: Blue background for main actions (Confirm, Create, Save)
     * - secondary: Gray background for secondary actions (Cancel, Close)
     * - danger: Red background for destructive actions (Delete)
     * - ghost: Transparent with border for toggle-style buttons
     *
     * Features:
     * - Size variants (medium, small)
     * - Active state for toggle buttons
     * - Disabled state with reduced opacity
     * - Icon-only mode for compact buttons
     * - Snippets (iconLeft, iconRight) for icon+text buttons
     * - Danger hover effect for ghost icon buttons (icon turns red on hover)
     *
     * Migrated to Svelte 5 with $props() and snippets.
     */
    import type { Snippet } from 'svelte';

    interface Props {
        /** Button variant */
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
        /** Button size */
        size?: 'medium' | 'small';
        /** Whether the button shows an active/pressed state (for toggle buttons) */
        active?: boolean;
        /** Whether the button is disabled */
        disabled?: boolean;
        /** Whether this is an icon-only button (square with centered content) */
        iconOnly?: boolean;
        /** Whether to show danger hover effect (icon/text turns red on hover) */
        dangerHover?: boolean;
        /** Button type attribute */
        type?: 'button' | 'submit' | 'reset';
        /** Optional title/tooltip */
        title?: string;
        /** Click handler */
        onclick?: (event: MouseEvent) => void;
        /** Default slot content */
        children?: Snippet;
        /** Left icon snippet */
        iconLeft?: Snippet;
        /** Right icon snippet */
        iconRight?: Snippet;
    }

    let {
        variant = 'secondary',
        size = 'medium',
        active = false,
        disabled = false,
        iconOnly = false,
        dangerHover = false,
        type = 'button',
        title = '',
        onclick,
        children,
        iconLeft,
        iconRight,
    }: Props = $props();

    function handleClick(event: MouseEvent) {
        if (!disabled && onclick) {
            onclick(event);
        }
    }
</script>

<button
    class="gs-button"
    class:gs-button-primary={variant === 'primary'}
    class:gs-button-secondary={variant === 'secondary'}
    class:gs-button-danger={variant === 'danger'}
    class:gs-button-ghost={variant === 'ghost'}
    class:gs-button-small={size === 'small'}
    class:gs-button-active={active}
    class:gs-button-icon-only={iconOnly}
    class:gs-button-danger-hover={dangerHover}
    {type}
    {disabled}
    {title}
    onclick={handleClick}
>
    {#if iconLeft}
        <span class="gs-button-icon gs-button-icon-left">
            {@render iconLeft()}
        </span>
    {/if}
    {#if children}
        {@render children()}
    {/if}
    {#if iconRight}
        <span class="gs-button-icon gs-button-icon-right">
            {@render iconRight()}
        </span>
    {/if}
</button>

<style>
    /* Base button styles */
    .gs-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 4px 12px;
        font-size: 12px;
        font-family: inherit;
        border-radius: 2px;
        border: none;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
        white-space: nowrap;
    }

    .gs-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Icon wrapper */
    .gs-button-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
    }

    /* Size variants */
    .gs-button-small {
        padding: 2px 8px;
        font-size: var(--gs-font-size-small, 11px);
    }

    .gs-button-icon-only {
        width: 24px;
        height: 24px;
        padding: 0;
    }

    .gs-button-icon-only.gs-button-small {
        width: 20px;
        height: 20px;
    }

    /* Primary variant */
    .gs-button-primary {
        background: var(--gs-button-bg);
        color: var(--gs-button-fg);
    }

    .gs-button-primary:hover:not(:disabled) {
        background: var(--gs-button-hover-bg);
    }

    /* Secondary variant */
    .gs-button-secondary {
        background: var(--gs-button-secondary-bg);
        color: var(--gs-button-secondary-fg);
    }

    .gs-button-secondary:hover:not(:disabled) {
        background: var(--gs-button-secondary-hover-bg);
    }

    /* Danger variant */
    .gs-button-danger {
        background: var(--gs-error-bg);
        color: var(--gs-fg-error);
    }

    .gs-button-danger:hover:not(:disabled) {
        background: #6b2222;
    }

    /* Ghost variant */
    .gs-button-ghost {
        background: transparent;
        color: var(--gs-fg-primary);
        border: 1px solid var(--gs-border-primary);
    }

    .gs-button-ghost:hover:not(:disabled) {
        background: var(--gs-list-hover-bg);
    }

    /* Danger hover effect - for ghost buttons that should show red on hover */
    .gs-button-danger-hover:hover:not(:disabled) {
        color: var(--gs-fg-error);
    }

    /* Active state (for toggle buttons) */
    .gs-button-active {
        background: var(--gs-button-bg);
        color: var(--gs-button-fg);
    }

    .gs-button-active:hover:not(:disabled) {
        background: var(--gs-button-hover-bg);
    }

    /* Ghost active uses warning colors (like ToggleButton) */
    .gs-button-ghost.gs-button-active {
        background: var(--gs-warning-bg);
        border-color: var(--gs-warning-border);
        color: var(--gs-warning-border);
    }

    .gs-button-ghost.gs-button-active:hover:not(:disabled) {
        background: var(--gs-warning-bg);
    }
</style>
