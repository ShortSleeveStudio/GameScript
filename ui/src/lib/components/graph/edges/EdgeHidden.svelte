<script lang="ts" module>
    /**
     * Module-level state for tracking hidden edges per source node.
     * This is used to position multiple hidden edge tags correctly when
     * multiple hidden edges originate from the same node.
     *
     * Migrated to Svelte 5 module state.
     */
    const nodeToHiddenEdges: Map<number, Set<string>> = new Map();
    let hiddenEdgeToIndex = $state<Map<string, number>>(new Map());

    function addToHiddenEdges(nodeId: number, edgeId: string): void {
        let edgeIdSet = nodeToHiddenEdges.get(nodeId);
        if (!edgeIdSet) {
            edgeIdSet = new Set<string>();
            nodeToHiddenEdges.set(nodeId, edgeIdSet);
        }
        edgeIdSet.add(edgeId);
        updateHiddenEdgeToIndexMap(edgeIdSet);
    }

    function removeFromHiddenEdges(nodeId: number, edgeId: string): void {
        const edgeIdSet = nodeToHiddenEdges.get(nodeId);
        if (!edgeIdSet) return;
        edgeIdSet.delete(edgeId);
        if (edgeIdSet.size === 0) {
            nodeToHiddenEdges.delete(nodeId);
        }
        updateHiddenEdgeToIndexMap(edgeIdSet, edgeId);
    }

    function updateHiddenEdgeToIndexMap(edgeIdSet: Set<string>, edgeToDelete?: string): void {
        const newMap = new Map(hiddenEdgeToIndex);
        if (edgeToDelete) newMap.delete(edgeToDelete);
        let index = 0;
        for (const edgeId of edgeIdSet) {
            newMap.set(edgeId, index++);
        }
        hiddenEdgeToIndex = newMap;
    }

    export function getHiddenEdgeIndex(edgeId: string): number | undefined {
        return hiddenEdgeToIndex.get(edgeId);
    }
</script>

<script lang="ts">
    /**
     * Hidden edge component - represents a collapsed sequence of nodes.
     *
     * Hidden edges display a "tag" showing the target node ID, positioned
     * near the source node. When multiple hidden edges originate from the
     * same node, they are spaced apart to avoid overlap.
     *
     * Migrated to Svelte 5 and @xyflow/svelte 1.x
     */
    import type { Edge } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import {
        BaseEdge,
        EdgeLabel,
        getBezierPath,
        Position,
        type EdgeProps,
    } from '@xyflow/svelte';
    import type { EdgeData, GraphEdge } from '../utils/types.js';
    import { TAG_DISTANCE_TO_NODE, TAG_HEIGHT, TAG_WIDTH } from '../utils/types.js';
    import type { ElkExtendedEdge, ElkPoint } from 'elkjs/lib/elk-api';
    import { onDestroy, onMount } from 'svelte';

    // Svelte 5 props - unused props collected via rest pattern
    let {
        id,
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        markerStart = undefined,
        markerEnd = undefined,
        style = undefined,
        selected = false,
        interactionWidth = undefined,
        data = undefined,
        // Unused props from EdgeProps - collected to avoid warnings
        source: _source,
        target: _target,
        animated: _animated,
        label: _label,
        labelStyle: _labelStyle,
        sourceHandleId: _sourceHandleId,
        targetHandleId: _targetHandleId,
        type: _type,
    }: EdgeProps<GraphEdge> = $props();

    // Derived state from data
    let rowView: IDbRowView<Edge> | undefined = $derived(data?.rowView);
    let elkEdge: ElkExtendedEdge | undefined = $derived(data?.elkEdge);
    let elkEdgeEndpoint: ElkPoint | undefined = $derived(elkEdge?.sections?.[elkEdge.sections.length - 1]?.endPoint);
    let isVertical: boolean = $derived(sourcePosition === Position.Bottom);

    // Compute path - reactive to position changes
    // Returns [path, labelX, labelY, currentTargetX, currentTargetY]
    let pathResult = $derived(getPath(
        {
            sourceX,
            sourceY,
            targetX,
            targetY,
            sourcePosition,
            targetPosition,
        },
        elkEdge,
        hiddenEdgeToIndex,
    ));

    let path = $derived(pathResult[0]);
    let labelX = $derived(pathResult[1]);
    let labelY = $derived(pathResult[2]);
    let currentTargetX = $derived(pathResult[3]);
    let currentTargetY = $derived(pathResult[4]);

    function getPath(
        params: {
            sourceX: number;
            sourceY: number;
            sourcePosition: any;
            targetX: number;
            targetY: number;
            targetPosition: any;
        },
        elkEdge: ElkExtendedEdge | undefined,
        hiddenEdgeToIndexMap: Map<string, number>,
    ): [path: string, labelX: number, labelY: number, targetX: number, targetY: number] {
        const spacing = (isVertical ? TAG_WIDTH : TAG_HEIGHT) * 2;
        let position: number | undefined = undefined;
        const index = hiddenEdgeToIndexMap.get(id);
        if (index !== undefined && rowView) {
            const count = nodeToHiddenEdges.get(rowView.data.source)?.size ?? 1;
            const halfSpace = ((count - 1) * spacing) / 2;
            position = index * spacing - halfSpace;
        }

        // Create a mutable copy of params for modification
        const p = { ...params };

        if (isVertical) {
            p.targetX = p.sourceX;
            p.targetY = p.sourceY + TAG_DISTANCE_TO_NODE;
            if (position !== undefined) {
                p.targetX += position;
            }
        } else {
            p.targetX = p.sourceX + TAG_DISTANCE_TO_NODE;
            p.targetY = p.sourceY;
            if (position !== undefined) {
                p.targetY += position;
            }
        }

        if (elkEdge) {
            const [path, lX, lY] = getElkPath(elkEdge);
            return [path, lX, lY, p.targetX, p.targetY];
        } else {
            const [path, lX, lY] = getBezierPath(p);
            return [path, lX, lY, p.targetX, p.targetY];
        }
    }

    function getElkPath(elkEdge: ElkExtendedEdge): [string, number, number] {
        const sections = elkEdge.sections;
        if (!sections || sections.length === 0) {
            return ['', 0, 0];
        }

        let pathParts: string[] = [];
        let lX = 0;
        let lY = 0;

        for (const section of sections) {
            const { startPoint, endPoint, bendPoints } = section;

            pathParts.push(`M ${startPoint.x} ${startPoint.y}`);

            if (bendPoints && bendPoints.length > 0) {
                for (const bend of bendPoints) {
                    pathParts.push(`L ${bend.x} ${bend.y}`);
                }
            }

            pathParts.push(`L ${endPoint.x} ${endPoint.y}`);

            if (elkEdge.labels && elkEdge.labels.length > 0) {
                lX = elkEdge.labels[0].x ?? 0;
                lY = elkEdge.labels[0].y ?? 0;
            } else {
                lX = (startPoint.x + endPoint.x) / 2;
                lY = (startPoint.y + endPoint.y) / 2;
            }
        }

        return [pathParts.join(' '), lX, lY];
    }

    onMount(() => {
        if (rowView) {
            addToHiddenEdges(rowView.data.source, id);
        }
    });

    onDestroy(() => {
        if (rowView) {
            removeFromHiddenEdges(rowView.data.source, id);
        }
    });
</script>

<BaseEdge
    {path}
    {markerStart}
    {markerEnd}
    {interactionWidth}
    {style}
/>

{#if rowView}
    {@const rowData = rowView.data}
    {#if elkEdge && elkEdge.labels && elkEdge.labels[0]}
        {#if rowData.priority !== 0}
            <EdgeLabel x={elkEdge.labels[0].x ?? 0} y={elkEdge.labels[0].y ?? 0}>
                <div
                    style={'pointer-events: all;' + (style ?? '')}
                    class="edge-label {selected ? 'edge-label-selected' : ''} nodrag nopan"
                >
                    {rowData.priority}
                </div>
            </EdgeLabel>
        {/if}
        <EdgeLabel
            x={elkEdgeEndpoint?.x ?? currentTargetX}
            y={elkEdgeEndpoint?.y ?? currentTargetY}
        >
            <div
                style={'pointer-events: all;' + (style ?? '')}
                style:width={'calc(var(--graph-node-width, 200px) / 2)'}
                style:height={'var(--graph-node-title-height, 32px)'}
                style:transform="translate({isVertical ? '-50%' : '0%'}, {isVertical ? '0%' : '-50%'})"
                class="edge-target nodrag nopan {selected ? 'edge-target-selected' : ''}"
            >
                <div class="edge-target-text">
                    {rowData.target}
                </div>
            </div>
        </EdgeLabel>
    {:else}
        {#if rowData.priority !== 0}
            <EdgeLabel x={labelX} y={labelY}>
                <div
                    style={'pointer-events: all;' + (style ?? '')}
                    class="edge-label {selected ? 'edge-label-selected' : ''} nodrag nopan"
                >
                    {rowData.priority}
                </div>
            </EdgeLabel>
        {/if}
        <EdgeLabel x={currentTargetX} y={currentTargetY}>
            <div
                style={'pointer-events: all;' + (style ?? '')}
                style:width={'calc(var(--graph-node-width, 200px) / 2)'}
                style:height={'var(--graph-node-title-height, 32px)'}
                style:transform="translate({isVertical ? '-50%' : '0%'}, {isVertical ? '0%' : '-50%'})"
                class="edge-target nodrag nopan {selected ? 'edge-target-selected' : ''}"
            >
                <div class="edge-target-text">
                    {rowData.target}
                </div>
            </div>
        </EdgeLabel>
    {/if}
{/if}

<style>
    .edge-target {
        position: absolute;
        display: flex;
        align-items: center;
        justify-items: center;
        background-color: var(--gs-bg-header);
        border: 1px solid var(--gs-border-primary);
        cursor: pointer;
    }

    .edge-target-selected {
        background-color: var(--gs-list-selection-bg);
    }

    .edge-target-text {
        width: 100%;
        text-align: center;
        font-size: 12px;
        color: var(--gs-fg-primary);
    }

    .edge-label {
        position: absolute;
        background: var(--gs-bg-header);
        padding: 10px;
        cursor: pointer;
        transform: translate(-50%, -50%);
    }

    .edge-label-selected {
        background-color: var(--gs-list-selection-bg);
    }
</style>
