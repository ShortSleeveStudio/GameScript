<script lang="ts">
    import type { EdgeData } from '@lib/graph/graph-data';
    import { getElkPath } from '@lib/graph/graph-path-elk';
    import type { ElkExtendedEdge } from '@lib/vendor/elkjs/elk-api';
    import { type EdgeProps, BaseEdge, getBezierPath } from '@xyflow/svelte';
    // import { type EdgeProps, BaseEdge, getBezierPath } from '@lib/vendor/flow/svelte/src/lib';

    // SUPPRESS WARNINGS
    type $$Props = EdgeProps;
    export let id: $$Props['id'];
    id;
    export let source: $$Props['source'];
    source;
    export let target: $$Props['target'];
    target;
    export let sourceX: $$Props['sourceX'];
    sourceX;
    export let sourceY: $$Props['sourceY'];
    sourceY;
    export let sourcePosition: $$Props['sourcePosition'];
    sourcePosition;
    export let targetX: $$Props['targetX'];
    targetX;
    export let targetY: $$Props['targetY'];
    targetY;
    export let targetPosition: $$Props['targetPosition'];
    targetPosition;
    export let markerStart: $$Props['markerStart'] = undefined;
    markerStart;
    export let markerEnd: $$Props['markerEnd'] = undefined;
    markerEnd;
    export let style: $$Props['style'] = undefined;
    style;
    export let animated: $$Props['animated'] = false;
    animated;
    export let selected: $$Props['selected'] = false;
    selected;
    export let label: $$Props['label'] = undefined;
    label;
    export let interactionWidth: $$Props['interactionWidth'] = undefined;
    interactionWidth;
    export let labelStyle: $$Props['labelStyle'] = undefined;
    labelStyle;
    export let sourceHandleId: $$Props['sourceHandleId'] = undefined;
    sourceHandleId;
    export let targetHandleId: $$Props['targetHandleId'] = undefined;
    targetHandleId;
    // SUPPRESS WARNINGS

    export let data: EdgeData = undefined;
    $: [path, labelX, labelY] = getPath(
        {
            sourceX,
            sourceY,
            targetX,
            targetY,
            sourcePosition,
            targetPosition,
        },
        data.elkEdge,
    );

    function getPath(
        params: {
            sourceX;
            sourceY;
            sourcePosition;
            targetX;
            targetY;
            targetPosition;
        },
        elkEdge: ElkExtendedEdge,
    ): [path: string, labelX: number, labelY: number, offsetX: number, offsetY: number] {
        if (elkEdge) {
            return getElkPath(elkEdge);
        } else {
            return getBezierPath(params);
            // return getStraightPath(params);
            // return getSmoothStepPath(params);
        }
    }
</script>

<BaseEdge
    {id}
    {path}
    {labelX}
    {labelY}
    {label}
    {labelStyle}
    {markerStart}
    {markerEnd}
    {interactionWidth}
    {style}
/>

<!-- label={$rowView.priority !== 0 ? `${$rowView.priority}` : ''} -->
