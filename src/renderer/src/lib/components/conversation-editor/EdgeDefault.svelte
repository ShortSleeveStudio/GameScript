<script lang="ts">
    import type { Edge } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { EdgeData } from '@lib/graph/graph-data';
    import { getElkPath } from '@lib/graph/graph-path-elk';
    import { useHandleEdgeSelect } from '@lib/graph/graph-temporary';
    import type { ElkExtendedEdge } from '@lib/vendor/elkjs/elk-api';
    import { type EdgeProps, BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/svelte';

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
    export let data: $$Props['data'] = undefined;
    // SUPPRESS WARNINGS

    const handleEdgeSelect: (id: string) => void = useHandleEdgeSelect();

    let rowView: IDbRowView<Edge>;
    let elkEdge: ElkExtendedEdge;
    $: rowView = (<EdgeData>data)?.rowView;
    $: elkEdge = (<EdgeData>data)?.elkEdge;

    $: [path, labelX, labelY] = getPath(
        {
            sourceX,
            sourceY,
            targetX,
            targetY,
            sourcePosition,
            targetPosition,
        },
        (<EdgeData>data).elkEdge,
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

    function onLabelClick(): void {
        handleEdgeSelect(id);
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

{#if rowView && $rowView.priority !== 0}
    {#if elkEdge && elkEdge.labels}
        <EdgeLabelRenderer>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-interactive-supports-focus -->
            <div
                style:transform="translate(-50%, -50%) translate({elkEdge.labels[0].x}px,{elkEdge
                    .labels[0].y}px)"
                style={'pointer-events: all;' + style}
                class="edge-label {selected ? 'edge-label-selected' : ''} nodrag nopan"
                role="button"
                on:click={onLabelClick}
            >
                {$rowView.priority}
            </div>
        </EdgeLabelRenderer>
    {:else}
        <EdgeLabelRenderer>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-interactive-supports-focus -->
            <div
                style:transform="translate(-50%, -50%) translate({labelX}px,{labelY}px)"
                style={'pointer-events: all;' + style}
                class="edge-label {selected ? 'edge-label-selected' : ''} nodrag nopan"
                role="button"
                on:click={onLabelClick}
            >
                {$rowView.priority}
            </div>
        </EdgeLabelRenderer>
    {/if}
{/if}

<style>
    .edge-label {
        position: absolute;
        background: var(--cds-layer-accent, #e0e0e0);
        padding: 10px;
        cursor: pointer;
    }
    .edge-label-selected {
        background-color: var(--xy-edge-stroke-selected-default);
    }
</style>
