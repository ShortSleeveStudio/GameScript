<script lang="ts">
    /**
     * Toggle button for enabling/disabling code methods (conditions/actions).
     *
     * This is a purpose-built toggle that:
     * - Shows "Enable" when method is off, "Disable" when on
     * - Has a "pending" state during async operations
     * - Does NOT change visual state until the operation completes
     * - Prevents optimistic updates that could desync with confirmation dialogs
     */

    interface Props {
        /** Whether the method is currently enabled */
        enabled: boolean;
        /** Whether the toggle is disabled (e.g., folder not configured) */
        disabled?: boolean;
        /** Whether an operation is in progress */
        pending?: boolean;
        /** Called when user clicks to enable */
        onEnable: () => Promise<void>;
        /** Called when user clicks to disable */
        onDisable: () => Promise<void>;
    }

    let {
        enabled,
        disabled = false,
        pending = false,
        onEnable,
        onDisable,
    }: Props = $props();

    async function handleClick(): Promise<void> {
        if (disabled || pending) return;

        if (enabled) {
            await onDisable();
        } else {
            await onEnable();
        }
    }
</script>

<button
    class="code-method-toggle"
    class:enabled
    class:pending
    disabled={disabled || pending}
    onclick={handleClick}
>
    {#if pending}
        <span class="spinner"></span>
        <span class="label">{enabled ? 'Disabling...' : 'Enabling...'}</span>
    {:else if enabled}
        <span class="label">Disable</span>
    {:else}
        <span class="label">Enable</span>
    {/if}
</button>

<style>
    .code-method-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.25rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 500;
        border-radius: 3px;
        cursor: pointer;
        transition: background-color 0.15s, border-color 0.15s;
    }

    /* Disabled (off) state - subtle appearance */
    .code-method-toggle:not(.enabled) {
        background: transparent;
        border: 1px solid var(--gs-border-primary);
        color: var(--gs-fg-secondary);
    }

    .code-method-toggle:not(.enabled):hover:not(:disabled) {
        background: var(--gs-list-hover-bg);
        color: var(--gs-fg-primary);
    }

    /* Enabled (on) state - more prominent */
    .code-method-toggle.enabled {
        background: var(--gs-accent-bg, rgba(59, 130, 246, 0.1));
        border: 1px solid var(--gs-accent-border, var(--gs-fg-link));
        color: var(--gs-fg-link);
    }

    .code-method-toggle.enabled:hover:not(:disabled) {
        background: var(--gs-accent-bg-hover, rgba(59, 130, 246, 0.2));
    }

    /* Disabled state */
    .code-method-toggle:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Pending state */
    .code-method-toggle.pending {
        cursor: wait;
    }

    .label {
        white-space: nowrap;
    }

    /* Simple spinner */
    .spinner {
        width: 0.75rem;
        height: 0.75rem;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
