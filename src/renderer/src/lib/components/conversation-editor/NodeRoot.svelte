<script lang="ts">
    import type { NodeData } from '@lib/graph/graph-data';
    import { Position, type NodeProps } from '@xyflow/svelte';
    // import { Position, type NodeProps } from '@lib/vendor/flow/svelte/src/lib';
    import NodeBase from './NodeBase.svelte';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { Node } from '@common/common-schema';

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
    let rowView: IDbRowView<Node> = data.rowView;
    let isVertical: boolean = false;
    $: isVertical = sourcePosition === Position.Bottom;
</script>

<NodeBase {rowView} {isVertical} {selected} title={'Start'} {sourcePosition}></NodeBase>
