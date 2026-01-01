<script lang="ts">
    /**
     * Simple tooltip component.
     *
     * Displays a tooltip with additional information when hovering over the trigger text.
     * Automatically chooses direction (top/bottom) based on available viewport space.
     * Lightweight alternative to Carbon's Tooltip for IDE webview environments.
     */
    export let triggerText: string;
    export let align: 'start' | 'center' | 'end' = 'start';
    /** Preferred direction - will flip if not enough space */
    export let direction: 'top' | 'bottom' = 'top';

    let isVisible = false;
    let triggerElement: HTMLElement;
    let actualDirection: 'top' | 'bottom' = direction;

    // Minimum space needed above/below for tooltip (approximate tooltip height + gap)
    const MIN_SPACE = 100;

    function show(): void {
        // Calculate best direction based on available space
        if (triggerElement) {
            const rect = triggerElement.getBoundingClientRect();
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;

            if (direction === 'top') {
                // Prefer top, but flip to bottom if not enough space
                actualDirection = spaceAbove < MIN_SPACE && spaceBelow > spaceAbove ? 'bottom' : 'top';
            } else {
                // Prefer bottom, but flip to top if not enough space
                actualDirection = spaceBelow < MIN_SPACE && spaceAbove > spaceBelow ? 'top' : 'bottom';
            }
        }
        isVisible = true;
    }

    function hide(): void {
        isVisible = false;
    }
</script>

<span
    class="tooltip-trigger"
    role="button"
    tabindex="0"
    bind:this={triggerElement}
    on:mouseenter={show}
    on:mouseleave={hide}
    on:focus={show}
    on:blur={hide}
>
    <span class="trigger-text">{triggerText}</span>
    {#if isVisible}
        <div
            class="tooltip-content"
            class:align-start={align === 'start'}
            class:align-center={align === 'center'}
            class:align-end={align === 'end'}
            class:direction-top={actualDirection === 'top'}
            class:direction-bottom={actualDirection === 'bottom'}
        >
            <slot />
        </div>
    {/if}
</span>

<style>
    .tooltip-trigger {
        position: relative;
        display: inline-block;
        cursor: help;
    }

    .trigger-text {
        border-bottom: 1px dotted var(--gs-fg-secondary);
    }

    .tooltip-content {
        position: absolute;
        z-index: 100;
        min-width: 200px;
        max-width: 300px;
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
        line-height: 1.4;
        color: var(--gs-fg-primary);
        background: var(--gs-bg-secondary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .direction-bottom {
        top: calc(100% + 4px);
    }

    .direction-top {
        bottom: calc(100% + 4px);
    }

    .align-start {
        left: 0;
    }

    .align-center {
        left: 50%;
        transform: translateX(-50%);
    }

    .align-end {
        right: 0;
    }

    .tooltip-content :global(p) {
        margin: 0 0 0.5rem 0;
    }

    .tooltip-content :global(p:last-child) {
        margin-bottom: 0;
    }
</style>
