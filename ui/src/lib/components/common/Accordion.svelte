<script lang="ts">
    /**
     * Accordion component for collapsible sections.
     *
     * Provides a header that toggles visibility of content below.
     * Supports:
     * - Customizable title (string or snippet)
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

    import type { Snippet } from 'svelte';

    interface Props {
        /** Title text for the accordion header */
        title?: string;
        /** Optional count to display in parentheses after title */
        count?: number;
        /** Whether the accordion is expanded */
        expanded?: boolean;
        /** Size variant */
        size?: 'default' | 'small';
        /** Callback when accordion is toggled */
        ontoggle?: (expanded: boolean) => void;
        /** Custom title content */
        titleSnippet?: Snippet;
        /** Default slot for content */
        children?: Snippet;
    }

    let {
        title = '',
        count,
        expanded = $bindable(false),
        size = 'default',
        ontoggle,
        titleSnippet,
        children,
    }: Props = $props();

    function toggle(): void {
        expanded = !expanded;
        ontoggle?.(expanded);
    }
</script>

<div class="accordion" class:accordion-small={size === 'small'}>
    <button
        class="accordion-header"
        type="button"
        onclick={toggle}
        aria-expanded={expanded}
    >
        <span class="accordion-icon">{expanded ? '▼' : '▶'}</span>
        {#if titleSnippet}
            {@render titleSnippet()}
        {:else}
            <span class="accordion-title">
                {title}{#if count !== undefined} ({count}){/if}
            </span>
        {/if}
    </button>
    {#if expanded}
        <div class="accordion-content">
            {#if children}
                {@render children()}
            {/if}
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
