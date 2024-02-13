<script lang="ts">
    import type { NodeData } from '@lib/graph/graph-data';
    import { Handle, Position, type NodeProps } from '@xyflow/svelte';

    // SUPPRESS WARNINGS
    type $$Props = NodeProps;
    export let id: $$Props['id'];
    id;
    export let dragHandle: $$Props['dragHandle'] = undefined;
    dragHandle;
    export let type: $$Props['type'] = undefined;
    type;
    export let selected: $$Props['selected'] = undefined;
    selected;
    export let isConnectable: $$Props['isConnectable'] = undefined;
    isConnectable;
    export let zIndex: $$Props['zIndex'] = undefined;
    zIndex;
    export let width: $$Props['width'] = undefined;
    width;
    export let height: $$Props['height'] = undefined;
    height;
    export let dragging: $$Props['dragging'];
    dragging;
    export let targetPosition: $$Props['targetPosition'] = undefined;
    targetPosition;
    export let sourcePosition: $$Props['sourcePosition'] = undefined;
    sourcePosition;
    export let positionAbsoluteX: $$Props['positionAbsoluteX'] = undefined;
    positionAbsoluteX;
    export let positionAbsoluteY: $$Props['positionAbsoluteY'] = undefined;
    positionAbsoluteY;
    // SUPPRESS WARNINGS

    export let data: NodeData;
</script>

<!-- data.selected in the class list is there to avoid warnings about not using "data" -->
<div class="node-container {selected ? 'node-container-selected' : ''} {data.selected}">
    <div class="node-title-bar">
        <span class="node-title-text">Start</span>
    </div>
    <Handle type="source" position={sourcePosition} />
</div>

<style>
    .node-container {
        width: var(--graph-node-width);
        display: flex;
        flex-direction: column;
        background-color: var(--cds-layer-accent, #e0e0e0);
        border: 1px solid var(--cds-ui-04, #8d8d8d);
    }
    .node-container-selected {
        background-color: var(--cds-hover-selected-ui);
        /* box-shadow: 0px 0px 10px 2px var(--cds-hover-selected-ui); */
    }
    .node-title-bar {
        height: var(--graph-node-title-height);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .node-title-text {
        padding-left: 0.6875rem;
        padding-right: 0.6875rem;
    }
</style>
