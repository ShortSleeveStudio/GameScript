<script lang="ts">
    /**
     * Accordion component for collapsible sections.
     *
     * Provides a header that toggles visibility of content below.
     * Supports:
     * - Customizable title (string or slot)
     * - Expanded/collapsed state (controlled or uncontrolled)
     * - Size variants (default, small)
     * - Optional item count badge
     *
     * Usage:
     * ```svelte
     * <Accordion title="Other Locales" count={3}>
     *     <p>Content here</p>
     * </Accordion>
     * ```
     */

    import { createEventDispatcher } from 'svelte';

    /** Title text for the accordion header */
    export let title: string = '';

    /** Optional count to display in parentheses after title */
    export let count: number | undefined = undefined;

    /** Whether the accordion is expanded */
    export let expanded: boolean = false;

    /** Size variant */
    export let size: 'default' | 'small' = 'default';

    const dispatch = createEventDispatcher<{ toggle: boolean }>();

    function toggle(): void {
        expanded = !expanded;
        dispatch('toggle', expanded);
    }
</script>

<div class="accordion" class:accordion-small={size === 'small'}>
    <button
        class="accordion-header"
        type="button"
        on:click={toggle}
        aria-expanded={expanded}
    >
        <span class="accordion-icon">{expanded ? '▼' : '▶'}</span>
        {#if $$slots.title}
            <slot name="title" />
        {:else}
            <span class="accordion-title">
                {title}{#if count !== undefined} ({count}){/if}
            </span>
        {/if}
    </button>
    {#if expanded}
        <div class="accordion-content">
            <slot />
        </div>
    {/if}
</div>

<style>
    .accordion {
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
        overflow: hidden;
    }

    .accordion-header {
        width: 100%;
        padding: 0.5rem;
        background: var(--gs-bg-secondary);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--gs-fg-primary);
        text-align: left;
    }

    .accordion-header:hover {
        background: var(--gs-bg-hover);
    }

    .accordion-icon {
        font-size: 0.625rem;
        flex-shrink: 0;
    }

    .accordion-title {
        flex: 1;
    }

    .accordion-content {
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        background: var(--gs-bg-primary);
    }

    /* Small size variant */
    .accordion-small .accordion-header {
        padding: 0.375rem 0.5rem;
        font-size: var(--gs-font-size-small, 11px);
    }

    .accordion-small .accordion-icon {
        font-size: 0.5rem;
    }

    .accordion-small .accordion-content {
        padding: 0.5rem;
        gap: 0.5rem;
    }
</style>
