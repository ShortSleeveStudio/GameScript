<script lang="ts">
    /**
     * Resizable horizontal split panel.
     *
     * Creates a left/right split with a draggable divider.
     * The right panel has a configurable min-width.
     */
    import { onMount } from 'svelte';
    import type { Snippet } from 'svelte';

    interface Props {
        /** Minimum width of the right panel in pixels */
        minRightWidth?: number;
        /** Maximum width of the right panel in pixels (0 = no max) */
        maxRightWidth?: number;
        /** Initial width of the right panel in pixels */
        initialRightWidth?: number;
        /** Local storage key for persisting width */
        storageKey?: string;
        /** Left panel content */
        left?: Snippet;
        /** Right panel content */
        right?: Snippet;
    }

    let {
        minRightWidth = 280,
        maxRightWidth = 500,
        initialRightWidth = 320,
        storageKey = 'gs-split-width',
        left,
        right,
    }: Props = $props();

    let container: HTMLElement | undefined = $state();
    let rightWidth = $state((() => initialRightWidth)());
    let isDragging = $state(false);

    // Load saved width from localStorage if available
    onMount(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed >= minRightWidth) {
                rightWidth = maxRightWidth > 0 ? Math.min(parsed, maxRightWidth) : parsed;
            }
        }
    });

    function startDrag(event: MouseEvent) {
        event.preventDefault();
        isDragging = true;

        const startX = event.clientX;
        const startWidth = rightWidth;

        function onMouseMove(e: MouseEvent) {
            if (!isDragging || !container) return;

            const containerRect = container.getBoundingClientRect();
            const delta = startX - e.clientX;
            let newWidth = startWidth + delta;

            // Apply constraints
            newWidth = Math.max(minRightWidth, newWidth);
            if (maxRightWidth > 0) {
                newWidth = Math.min(maxRightWidth, newWidth);
            }
            // Don't let right panel take more than 50% of container
            newWidth = Math.min(containerRect.width * 0.5, newWidth);

            rightWidth = newWidth;
        }

        function onMouseUp() {
            isDragging = false;
            // Save to localStorage
            localStorage.setItem(storageKey, rightWidth.toString());
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }
</script>

<div class="split-container" bind:this={container} class:dragging={isDragging}>
    <div class="left-panel">
        {#if left}
            {@render left()}
        {/if}
    </div>
    <div
        class="divider"
        onmousedown={startDrag}
        role="separator"
        aria-orientation="vertical"
        tabindex="0"
    ></div>
    <div class="right-panel" style="width: {rightWidth}px; min-width: {minRightWidth}px;">
        {#if right}
            {@render right()}
        {/if}
    </div>
</div>

<style>
    .split-container {
        display: flex;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .split-container.dragging {
        cursor: col-resize;
        user-select: none;
    }

    .left-panel {
        flex: 1;
        min-width: 200px;
        overflow: hidden;
    }

    .divider {
        width: 4px;
        background: var(--gs-border-primary);
        cursor: col-resize;
        flex-shrink: 0;
        transition: background 0.15s ease;
    }

    .divider:hover,
    .split-container.dragging .divider {
        background: var(--gs-border-focus);
    }

    .right-panel {
        flex-shrink: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
</style>
