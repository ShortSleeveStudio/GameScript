<script lang="ts" module>
    // Re-export from side-car types file for backwards compatibility
    export type { TabItem } from './TabGroup.types.js';
</script>

<script lang="ts">
    import type { TabItem } from './TabGroup.types.js';

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

    interface Props {
        /** Array of tab items */
        tabs?: TabItem[];
        /** Currently selected tab id */
        selected?: string;
        /** Size variant */
        size?: 'default' | 'small';
        /** Whether tabs should stretch to fill available width */
        fullWidth?: boolean;
        /** Callback when tab selection changes */
        onchange?: (tabId: string) => void;
    }

    let {
        tabs = [],
        selected = $bindable(''),
        size = 'default',
        fullWidth = true,
        onchange,
    }: Props = $props();

    function selectTab(tabId: string): void {
        const tab = tabs.find(t => t.id === tabId);
        if (tab?.disabled) return;

        selected = tabId;
        onchange?.(tabId);
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
            onclick={() => selectTab(tab.id)}
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
