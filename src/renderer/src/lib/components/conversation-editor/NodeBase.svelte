<script lang="ts">
    import { Handle, Position } from '@xyflow/svelte';
    // import { Handle, Position } from '@lib/vendor/flow/svelte/src/lib';
    import { PortInput, PortOutput, Settings } from 'carbon-icons-svelte';
    import { GRAPH_CONTEXT, PORT_CONTAINER_THICKNESS } from '@lib/graph/graph-constants';
    import OverflowMenuCustom from '../carbon/OverflowMenuCustom.svelte';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { Node } from '@common/common-schema';
    import { get } from 'svelte/store';
    import { getContext } from 'svelte';
    import type { GraphContext } from '@lib/graph/graph-context';

    const graphContext: GraphContext = <GraphContext>getContext(GRAPH_CONTEXT);

    export let rowView: IDbRowView<Node>;
    export let selected: boolean;
    export let isVertical: boolean;
    export let title: string;
    export let targetPosition: Position | undefined = undefined;
    export let sourcePosition: Position | undefined = undefined;
    export const onDelete: () => void = () => {
        graphContext.onDelete([<Node>{ ...get(rowView) }], []);
    };

    $: borderCssSource = isVertical ? 'border-top: none;' : 'border-left: none;';
    $: borderCssTarget = isVertical ? 'border-bottom: none;' : 'border-right: none;';
</script>

<div class="node-container" style:flex-direction={isVertical ? 'column' : 'row'}>
    {#if targetPosition}
        <div
            class="node-port"
            style:width={isVertical ? '' : PORT_CONTAINER_THICKNESS}
            style:height={isVertical ? PORT_CONTAINER_THICKNESS : ''}
        >
            <Handle class="node-custom-port" type="target" position={targetPosition}>
                <div class="node-port-icon-container" style={borderCssTarget}>
                    <PortInput style={isVertical ? 'transform: rotate(90deg);' : ''} />
                </div>
            </Handle>
        </div>
    {/if}

    <div class="node-content">
        <div class="node-title-bar {selected ? 'node-title-bar-selected' : ''}">
            <span class="node-title-id">{rowView.id}</span>
            <span class="node-title-text">{title}</span>
            <span class="nodrag">
                {#if $$slots.overflow}
                    <OverflowMenuCustom flipped icon={Settings}>
                        <slot name="overflow" />
                    </OverflowMenuCustom>
                {/if}
            </span>
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
                <div class="node-port-icon-container" style={borderCssSource}>
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
    .node-title-id {
        height: 100%;
        padding-left: 0.75rem;
        padding-right: 0.75rem;
        /* width: 2.5rem; */
        /* height: 2.5rem; */
        /* box-shadow: inset -7px 0 9px -7px rgba(0, 0, 0, 0.7); */
        /* box-shadow: 10px 0px 6px var(--cds-shadow); */
        box-shadow: 5px 0 6px -6px var(--cds-shadow);
        /* border-right: 1px solid var(--cds-ui-04, #8d8d8d); */

        display: flex;
        align-items: center;
        justify-content: center;
        /* padding-left: 1rem; */
        /* padding-right: 1rem; */
    }
    .node-title-text {
        padding-left: 1rem;
        padding-right: 1rem;
        flex-grow: 1;
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
        background-color: var(--cds-ui-01, #f4f4f4);
        /* background-color: transparent; */
    }
</style>
