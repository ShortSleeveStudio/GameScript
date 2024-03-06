<script lang="ts" context="module">
    const nodeToHiddenEdges: Map<number, Set<string>> = new Map();
    const hiddenEdgeToIndex: Writable<Map<string, number>> = writable(new Map());

    function addToHiddenEdges(nodeId: number, edgeId: string): void {
        let edgeIdSet: Set<string> = nodeToHiddenEdges.get(nodeId);
        if (!edgeIdSet) {
            edgeIdSet = new Set<string>();
            nodeToHiddenEdges.set(nodeId, edgeIdSet);
        }
        edgeIdSet.add(edgeId);

        // Update hidden edge to index
        updateHiddenEdgeToIndexMap(edgeIdSet);
    }

    function removeFromHiddenEdges(nodeId: number, edgeId: string): void {
        let edgeIdSet: Set<string> = nodeToHiddenEdges.get(nodeId);
        if (!edgeIdSet) return;
        edgeIdSet.delete(edgeId);
        if (edgeIdSet.size === 0) {
            nodeToHiddenEdges.delete(nodeId);
        }

        // Update hidden edge to index
        updateHiddenEdgeToIndexMap(edgeIdSet, edgeId);
    }

    function updateHiddenEdgeToIndexMap(edgeIdSet: Set<string>, edgeToDelete?: string): void {
        hiddenEdgeToIndex.update((map) => {
            if (edgeToDelete) map.delete(edgeToDelete);
            let index: number = 0;
            for (const edgeId of edgeIdSet) {
                map.set(edgeId, index++);
            }
            return map;
        });
    }
</script>

<script lang="ts">
    import type { Edge } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { TAG_DISTANCE_TO_NODE, TAG_HEIGHT, TAG_WIDTH } from '@lib/constants/graph';
    import type { EdgeData } from '@lib/graph/graph-data';
    import { getElkPath } from '@lib/graph/graph-path-elk';
    import type { ElkExtendedEdge, ElkPoint } from '@lib/vendor/elkjs/elk-api';
    import {
        type EdgeProps,
        BaseEdge,
        getBezierPath,
        EdgeLabelRenderer,
        Position,
    } from '@xyflow/svelte';
    import { onDestroy, onMount } from 'svelte';
    import { get, writable, type Writable } from 'svelte/store';
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

    let rowView: IDbRowView<Edge>;
    let elkEdge: ElkExtendedEdge;
    let elkEdgeEndpoint: ElkPoint;
    let isVertical: boolean = false;
    let currentTargetX: number;
    let currentTargetY: number;
    $: rowView = data?.rowView;
    $: elkEdge = data?.elkEdge;
    $: elkEdgeEndpoint = elkEdge?.sections[elkEdge.sections.length - 1].endPoint;
    $: isVertical = sourcePosition === Position.Bottom;

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
        $hiddenEdgeToIndex,
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
        hiddenEdgeToIndexMap: Map<string, number>,
    ): [path: string, labelX: number, labelY: number, offsetX: number, offsetY: number] {
        const spacing: number = (isVertical ? TAG_WIDTH : TAG_HEIGHT) * 2;
        let position: number | undefined = undefined;
        const index: number = hiddenEdgeToIndexMap.get(id);
        if (index !== undefined) {
            const count: number = nodeToHiddenEdges.get(get(rowView).source).size;
            const halfSpace: number = ((count - 1) * spacing) / 2;
            position = index * spacing - halfSpace;
        }

        if (elkEdge) {
            if (isVertical) {
                params.targetX = params.sourceX;
                params.targetY = params.sourceY + TAG_DISTANCE_TO_NODE;
                if (index !== undefined) {
                    params.targetX += position;
                }
            } else {
                params.targetX = params.sourceX + TAG_DISTANCE_TO_NODE;
                params.targetY = params.sourceY;
                if (index !== undefined) {
                    params.targetY += position;
                }
            }
            currentTargetX = params.targetX;
            currentTargetY = params.targetY;

            return getElkPath(elkEdge);
        } else {
            if (isVertical) {
                params.targetX = params.sourceX;
                params.targetY = params.sourceY + TAG_DISTANCE_TO_NODE;
                if (index !== undefined) {
                    params.targetX += position;
                }
            } else {
                params.targetX = params.sourceX + TAG_DISTANCE_TO_NODE;
                params.targetY = params.sourceY;
                if (index !== undefined) {
                    params.targetY += position;
                }
            }
            currentTargetX = params.targetX;
            currentTargetY = params.targetY;
            return getBezierPath(params);
        }
    }

    onMount(() => {
        addToHiddenEdges(get(rowView).source, id);
    });

    onDestroy(() => {
        removeFromHiddenEdges(get(rowView).source, id);
    });
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

{#if rowView}
    {#if elkEdge && elkEdge.labels}
        <EdgeLabelRenderer>
            {#if $rowView.priority !== 0}
                <div
                    style:transform="translate(-50%, -50%) translate({elkEdge.labels[0]
                        .x}px,{elkEdge.labels[0].y}px)"
                    class="edge-label {selected ? 'edge-label-selected' : ''} nodrag nopan"
                >
                    {$rowView.priority}
                </div>
            {/if}
            <div
                style:transform="translate({isVertical ? '-50%' : '0%'}, {isVertical
                    ? '0%'
                    : '-50%'}) translate({elkEdgeEndpoint.x}px,{elkEdgeEndpoint.y}px)"
                class="edge-target nodrag nopan {selected ? 'edge-target-selected' : ''}"
                style:width={'calc(var(--graph-node-width) / 2)'}
                style:height={'var(--graph-node-title-height)'}
            >
                <div class="edge-target-text">
                    {$rowView.target}
                </div>
            </div>
        </EdgeLabelRenderer>
    {:else}
        <EdgeLabelRenderer>
            {#if $rowView.priority !== 0}
                <div
                    style:transform="translate(-50%, -50%) translate({labelX}px,{labelY}px)"
                    class="edge-label {selected ? 'edge-label-selected' : ''} nodrag nopan"
                >
                    {$rowView.priority}
                </div>
            {/if}
            <div
                style:transform="translate({isVertical ? '-50%' : '0%'}, {isVertical
                    ? '0%'
                    : '-50%'}) translate({currentTargetX}px,{currentTargetY}px)"
                class="edge-target nodrag nopan {selected ? 'edge-target-selected' : ''}"
                style:width={'calc(var(--graph-node-width) / 2)'}
                style:height={'var(--graph-node-title-height)'}
            >
                <div class="edge-target-text">
                    {$rowView.target}
                </div>
            </div>
        </EdgeLabelRenderer>
    {/if}
{/if}

<style>
    .edge-target {
        position: absolute;
        display: flex;
        align-items: center;
        justify-items: center;
        background-color: var(--cds-layer-accent, #e0e0e0);
        border: 1px solid var(--cds-ui-04, #8d8d8d);
    }

    .edge-target-selected {
        background-color: var(--xy-edge-stroke-selected-default);
    }

    .edge-target-text {
        /* padding-left: 0.75rem; */
        /* padding-right: 0.75rem; */
        width: 100%;
        text-align: center;
    }

    .edge-label {
        position: absolute;
        background: var(--cds-layer-accent, #e0e0e0);
        padding: 10px;
        /* border-radius: 5px; */
    }
    .edge-label-selected {
        background-color: var(--xy-edge-stroke-selected-default);
    }
</style>
