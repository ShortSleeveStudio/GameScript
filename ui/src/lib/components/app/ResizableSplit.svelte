<script lang="ts">
    /**
     * Resizable horizontal split panel.
     *
     * Creates a left/right split with a draggable divider.
     * The right panel has a configurable min-width.
     */
    import { onMount } from 'svelte';

    /** Minimum width of the right panel in pixels */
    export let minRightWidth = 280;

    /** Maximum width of the right panel in pixels (0 = no max) */
    export let maxRightWidth = 500;

    /** Initial width of the right panel in pixels */
    export let initialRightWidth = 320;

    /** Local storage key for persisting width */
    export let storageKey = 'gs-split-width';

    let container: HTMLElement;
    let rightWidth = initialRightWidth;
    let isDragging = false;

    // Load saved width from localStorage
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
            if (!isDragging) return;

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
        <slot name="left" />
    </div>
    <div
        class="divider"
        onmousedown={startDrag}
        role="separator"
        aria-orientation="vertical"
        tabindex="0"
    ></div>
    <div class="right-panel" style="width: {rightWidth}px; min-width: {minRightWidth}px;">
        <slot name="right" />
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
