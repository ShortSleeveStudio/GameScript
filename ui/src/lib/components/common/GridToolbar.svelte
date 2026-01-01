<script lang="ts">
    /**
     * A standardized toolbar layout for grid panels.
     *
     * Provides the structural layout with left and right sections.
     * Content is provided via named slots for flexibility.
     *
     * Features:
     * - Flexbox layout with space-between
     * - Left slot for primary actions (new button, selection actions)
     * - Right slot for secondary actions (table options, toggles)
     * - Consistent padding and gap spacing
     *
     * Usage:
     * <GridToolbar>
     *     <svelte:fragment slot="left">
     *         <Button variant="primary">+ New</Button>
     *         {#if selectedCount > 0}
     *             <span class="selection-info">{selectedCount} selected</span>
     *             <Button variant="danger">Delete</Button>
     *         {/if}
     *     </svelte:fragment>
     *     <svelte:fragment slot="right">
     *         <Button variant="ghost">Table Options</Button>
     *     </svelte:fragment>
     * </GridToolbar>
     */
</script>

<div class="grid-toolbar">
    <div class="grid-toolbar-left">
        <slot name="left" />
    </div>
    <div class="grid-toolbar-right">
        <slot name="right" />
    </div>
</div>

<style>
    .grid-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid var(--gs-border-primary);
        background: var(--gs-bg-primary);
        gap: 8px;
        flex-shrink: 0;
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
</style>
