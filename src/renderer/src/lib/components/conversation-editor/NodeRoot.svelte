<script lang="ts">
    import type { NodeData } from '@lib/graph/graph-data';
    import { Position, type NodeProps } from '@xyflow/svelte';
    import NodeBase from './NodeBase.svelte';

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
    data;

    let isVertical: boolean = false;
    $: isVertical = sourcePosition === Position.Bottom;
</script>

<NodeBase {isVertical} {selected} title={'Start'} {sourcePosition}></NodeBase>
