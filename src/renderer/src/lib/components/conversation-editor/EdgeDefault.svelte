<script lang="ts">
    import type { Edge } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { EdgeData } from '@lib/graph/graph-data';
    import { type EdgeProps, SmoothStepEdge } from '@xyflow/svelte';

    // SUPPRESS WARNINGS
    type $$Props = EdgeProps;
    export let id: $$Props['id'];
    id;
    export let source: $$Props['source'];
    source;
    export let target: $$Props['target'];
    target;
    // export let animated: $$Props['animated'] = false;
    // animated;
    // export let selected: $$Props['selected'] = false;
    // selected;
    // export let label: $$Props['label'] = '';
    // label;
    // export let interactionWidth: $$Props['interactionWidth'];
    // interactionWidth;
    // export let labelStyle: $$Props['labelStyle'];
    // labelStyle;
    // export let sourceHandleId: $$Props['sourceHandleId'];
    // sourceHandleId;
    // export let targetHandleId: $$Props['targetHandleId'];
    // targetHandleId;
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
    // SUPPRESS WARNINGS
    export let data: EdgeData = undefined;
    let rowView: IDbRowView<Edge>;
    $: rowView = data?.rowView;
</script>

<SmoothStepEdge
    {id}
    {sourceX}
    {sourceY}
    {targetX}
    {targetY}
    {sourcePosition}
    {targetPosition}
    label={$rowView.priority !== 0 ? `${$rowView.priority}` : ''}
/>
