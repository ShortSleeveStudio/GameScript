<script lang="ts">
    /**
     * A standardized toolbar layout for grid panels.
     *
     * Provides the structural layout with left and right sections,
     * plus optional expandable content that slides down from the toolbar.
     *
     * Features:
     * - Flexbox layout with space-between
     * - Left snippet for primary actions (new button, selection actions)
     * - Right snippet for secondary actions (table options, toggles)
     * - Expandable content area that slides down when expanded
     * - When expanded, left/right content is hidden and replaced with expanded header
     * - Consistent padding and gap spacing
     *
     * Usage:
     * <GridToolbar expanded={settingsExpanded}>
     *     {#snippet left()}
     *         <Button variant="primary">+ New</Button>
     *     {/snippet}
     *     {#snippet right()}
     *         <Button onclick={() => settingsExpanded = !settingsExpanded}>
     *             Settings
     *         </Button>
     *     {/snippet}
     *     {#snippet expandedHeader()}
     *         <span>Settings</span>
     *     {/snippet}
     *     {#snippet expandedToggle()}
     *         <Button onclick={() => settingsExpanded = false}>Close</Button>
     *     {/snippet}
     *     {#snippet expandedContent()}
     *         <SettingsPanel />
     *     {/snippet}
     * </GridToolbar>
     */
    import type { Snippet } from 'svelte';

    interface Props {
        /** Whether the expandable content is shown */
        expanded?: boolean;
        /** Left section content (hidden when expanded) */
        left?: Snippet;
        /** Right section content (hidden when expanded) */
        right?: Snippet;
        /** Header content shown when expanded (left side) */
        expandedHeader?: Snippet;
        /** Toggle button shown when expanded (right side) */
        expandedToggle?: Snippet;
        /** Expandable content area */
        expandedContent?: Snippet;
    }

    let { expanded = false, left, right, expandedHeader, expandedToggle, expandedContent }: Props = $props();
</script>

<div class="grid-toolbar-container">
    <div class="grid-toolbar">
        {#if expanded}
            <div class="grid-toolbar-left">
                {#if expandedHeader}
                    {@render expandedHeader()}
                {/if}
            </div>
            <div class="grid-toolbar-right">
                {#if expandedToggle}
                    {@render expandedToggle()}
                {/if}
            </div>
        {:else}
            <div class="grid-toolbar-left">
                {#if left}
                    {@render left()}
                {/if}
            </div>
            <div class="grid-toolbar-right">
                {#if right}
                    {@render right()}
                {/if}
            </div>
        {/if}
    </div>

    {#if expanded && expandedContent}
        <div class="grid-toolbar-expanded">
            {@render expandedContent()}
        </div>
    {/if}
</div>

<style>
    .grid-toolbar-container {
        flex-shrink: 0;
    }

    .grid-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid var(--gs-border-primary);
        background: var(--gs-bg-primary);
        gap: 8px;
    }

    .grid-toolbar-left {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .grid-toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .grid-toolbar-expanded {
        background: var(--gs-bg-secondary);
        border-bottom: 1px solid var(--gs-border-primary);
    }
</style>
