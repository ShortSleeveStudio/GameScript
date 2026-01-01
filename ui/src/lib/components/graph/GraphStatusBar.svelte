<script lang="ts">
    /**
     * Graph Status Bar.
     *
     * Displays contextual information about the current graph editor state:
     * - Conversation name (with truncation and tooltip for long names)
     * - Future: selection count, zoom level, etc.
     *
     * Positioned at the bottom of the graph editor.
     */

    interface Props {
        /** The conversation name to display */
        conversationName?: string;
        /** Number of selected nodes (for future use) */
        selectedNodeCount?: number;
        /** Number of selected edges (for future use) */
        selectedEdgeCount?: number;
    }

    let {
        conversationName = '',
        selectedNodeCount = 0,
        selectedEdgeCount = 0,
    }: Props = $props();

    // Derive total selection count
    let totalSelected = $derived(selectedNodeCount + selectedEdgeCount);
</script>

<div class="graph-status-bar">
    <div class="status-left">
        {#if conversationName}
            <span class="status-item conversation-name" title={conversationName}>
                {conversationName}
            </span>
        {:else}
            <span class="status-item status-empty">No conversation selected</span>
        {/if}
    </div>

    <div class="status-right">
        {#if totalSelected > 0}
            <span class="status-item">
                {totalSelected} selected
            </span>
        {/if}
    </div>
</div>

<style>
    .graph-status-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 12px;
        background: var(--gs-bg-tertiary);
        border-top: 1px solid var(--gs-border-secondary);
        font-size: var(--gs-font-size-small, 11px);
        color: var(--gs-fg-secondary);
        min-height: 24px;
    }

    .status-left,
    .status-right {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .status-item {
        white-space: nowrap;
    }

    .conversation-name {
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--gs-fg-primary);
    }

    .status-empty {
        font-style: italic;
    }
</style>
