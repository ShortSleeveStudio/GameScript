<script lang="ts">
    /**
     * Reusable toggle button component.
     *
     * Displays a ghost-styled button that shows an active state when toggled on.
     * Used for Show Deleted, Search & Replace, Vertical Layout toggles, etc.
     */
    import type { Snippet } from 'svelte';

    interface Props {
        /** Whether the toggle is currently active */
        active?: boolean;
        /** Whether the button is disabled */
        disabled?: boolean;
        /** Click handler */
        onclick?: () => void;
        /** Tooltip text */
        title?: string;
        /** Button content */
        children?: Snippet;
    }

    let {
        active = false,
        disabled = false,
        onclick,
        title,
        children,
    }: Props = $props();
</script>

<button
    class="toggle-button"
    class:active
    {disabled}
    {onclick}
    {title}
>
    {#if children}
        {@render children()}
    {/if}
</button>

<style>
    .toggle-button {
        padding: 4px 12px;
        background: transparent;
        border: 1px solid var(--gs-border-primary);
        color: var(--gs-fg-primary);
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
    }

    .toggle-button:hover:not(:disabled) {
        background: var(--gs-list-hover-bg);
    }

    .toggle-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .toggle-button.active {
        background: var(--gs-warning-bg);
        border-color: var(--gs-warning-border);
        color: var(--gs-warning-border);
    }

    .toggle-button.active:hover:not(:disabled) {
        background: var(--gs-warning-bg);
    }
</style>
