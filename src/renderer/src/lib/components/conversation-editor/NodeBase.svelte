<script lang="ts">
    import { Handle, Position } from '@xyflow/svelte';
    // import { Handle, Position } from '@lib/vendor/flow/svelte/src/lib';
    import { PortInput, PortOutput } from 'carbon-icons-svelte';
    import { PORT_CONTAINER_THICKNESS } from '@lib/graph/graph-constants';

    export let id: number;
    export let selected: boolean;
    export let isVertical: boolean;
    export let title: string;
    export let targetPosition: Position | undefined = undefined;
    export let sourcePosition: Position | undefined = undefined;

    $: borderCss = isVertical
        ? 'border-top: none; border-bottom: none;'
        : 'border-left: none; border-right: none;';
</script>

<div class="node-container" style:flex-direction={isVertical ? 'column' : 'row'}>
    {#if targetPosition}
        <div
            class="node-port"
            style:width={isVertical ? '' : PORT_CONTAINER_THICKNESS}
            style:height={isVertical ? PORT_CONTAINER_THICKNESS : ''}
        >
            <Handle class="node-custom-port" type="target" position={targetPosition}>
                <div class="node-port-icon-container">
                    <PortInput style={isVertical ? 'transform: rotate(90deg);' : ''} />
                </div>
            </Handle>
        </div>
    {/if}

    <div class="node-content" style={borderCss}>
        <div class="node-title-bar {selected ? 'node-title-bar-selected' : ''}">
            <span class="node-title-text">[{id}] - {title}</span>
        </div>
        {#if $$slots.body}
            <div class="node-body">
                <slot name="body" />
            </div>
        {/if}
    </div>

    {#if sourcePosition}
        <div
            class="node-port"
            style:width={isVertical ? '' : PORT_CONTAINER_THICKNESS}
            style:height={isVertical ? PORT_CONTAINER_THICKNESS : ''}
        >
            <Handle class="node-custom-port" type="source" position={sourcePosition}>
                <div class="node-port-icon-container">
                    <PortOutput style={isVertical ? 'transform: rotate(90deg);' : ''} />
                </div>
            </Handle>
        </div>
    {/if}
</div>

<style>
    .node-container {
        display: flex;
        align-content: stretch;
        align-items: stretch;
    }
    .node-port {
        display: flex;
        align-content: center;
    }
    .node-content {
        width: var(--graph-node-width);
        border: 1px solid var(--cds-ui-04, #8d8d8d);
    }
    .node-port-icon-container {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        pointer-events: none;
        border: 1px solid var(--cds-ui-04, #8d8d8d);
    }
    .node-title-bar {
        background-color: var(--cds-layer-accent, #e0e0e0);
        height: var(--graph-node-title-height);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .node-title-bar-selected {
        background-color: var(--cds-hover-selected-ui);
    }
    .node-title-text {
        padding-left: 1rem;
        padding-right: 1rem;
    }
    :global(div.node-custom-port) {
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        position: relative;
        border-radius: 0;
        transform: none;
        border: none;
        opacity: 100;
        background-color: transparent;
    }
</style>
