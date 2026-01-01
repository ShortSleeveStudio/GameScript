<script lang="ts" context="module">
    /**
     * Tab item configuration.
     */
    export interface TabItem {
        /** Unique identifier for the tab */
        id: string;
        /** Display label for the tab */
        label: string;
        /** Optional: whether the tab is disabled */
        disabled?: boolean;
    }
</script>

<script lang="ts">
    /**
     * TabGroup component for tab-style selection.
     *
     * Provides a row of mutually exclusive tabs for switching between views.
     * Supports:
     * - Controlled selection via `selected` prop
     * - Size variants (default, small)
     * - Disabled tabs
     * - Full-width or auto-width tabs
     *
     * Usage:
     * ```svelte
     * <TabGroup
     *     tabs={[
     *         { id: 'sqlite', label: 'SQLite' },
     *         { id: 'postgres', label: 'PostgreSQL' }
     *     ]}
     *     bind:selected={selectedDbType}
     * />
     * ```
     */

    import { createEventDispatcher } from 'svelte';

    /** Array of tab items */
    export let tabs: TabItem[] = [];

    /** Currently selected tab id */
    export let selected: string = '';

    /** Size variant */
    export let size: 'default' | 'small' = 'default';

    /** Whether tabs should stretch to fill available width */
    export let fullWidth: boolean = true;

    const dispatch = createEventDispatcher<{ change: string }>();

    function selectTab(tabId: string): void {
        const tab = tabs.find(t => t.id === tabId);
        if (tab?.disabled) return;

        selected = tabId;
        dispatch('change', tabId);
    }
</script>

<div class="tab-group" class:tab-group-small={size === 'small'} class:tab-group-full-width={fullWidth}>
    {#each tabs as tab (tab.id)}
        <button
            class="tab"
            class:tab-active={selected === tab.id}
            class:tab-disabled={tab.disabled}
            type="button"
            disabled={tab.disabled}
            on:click={() => selectTab(tab.id)}
            aria-selected={selected === tab.id}
            role="tab"
        >
            {tab.label}
        </button>
    {/each}
</div>

<style>
    .tab-group {
        display: flex;
        gap: 4px;
    }

    .tab-group-full-width .tab {
        flex: 1;
    }

    .tab {
        padding: 6px 12px;
        font-size: var(--gs-font-size-small);
        font-family: inherit;
        text-align: center;
        background: var(--gs-input-bg);
        border: 1px solid var(--gs-input-border);
        border-radius: 4px;
        cursor: pointer;
        color: var(--gs-fg-primary);
        transition: background 0.15s, border-color 0.15s;
    }

    .tab:hover:not(:disabled) {
        background: var(--gs-list-hover-bg);
    }

    .tab-active {
        background: var(--gs-button-bg);
        color: var(--gs-button-fg);
        border-color: var(--gs-button-bg);
    }

    .tab-active:hover:not(:disabled) {
        background: var(--gs-button-hover-bg);
    }

    .tab-disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Small size variant */
    .tab-group-small .tab {
        padding: 4px 8px;
        font-size: var(--gs-font-size-small, 11px);
    }
</style>
