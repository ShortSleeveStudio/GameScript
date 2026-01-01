<script lang="ts">
    /**
     * Default edge component - standard connection between nodes.
     *
     * Features:
     * - Priority label display (when priority !== 0)
     * - Support for ELK layout paths
     * - Fallback to Bezier curves
     * - IDbRowView for reactive edge data
     *
     * Migrated to Svelte 5 and @xyflow/svelte 1.x
     */
    import type { Edge } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { BaseEdge, EdgeLabel, getBezierPath, useSvelteFlow, type EdgeProps } from '@xyflow/svelte';
    import type { EdgeData, GraphEdge } from '../utils/types.js';
    import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';

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
        label = undefined,
        interactionWidth = undefined,
        data = undefined,
        // Unused props from EdgeProps - collected to avoid warnings
        source: _source,
        target: _target,
        animated: _animated,
        labelStyle: _labelStyle,
        sourceHandleId: _sourceHandleId,
        targetHandleId: _targetHandleId,
        type: _type,
    }: EdgeProps<GraphEdge> = $props();

    // Get Svelte Flow API for edge selection
    const { updateEdge } = useSvelteFlow();

    // Extract row view and elk edge from data
    let rowView: IDbRowView<Edge> | undefined = $derived(data?.rowView);
    let elkEdge: ElkExtendedEdge | undefined = $derived(data?.elkEdge);

    // Compute path - reactive to position changes
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
    ));

    let path = $derived(pathResult[0]);
    let labelX = $derived(pathResult[1]);
    let labelY = $derived(pathResult[2]);

    function getPath(
        params: {
            sourceX: number;
            sourceY: number;
            sourcePosition: any;
            targetX: number;
            targetY: number;
            targetPosition: any;
        },
        elkEdge?: ElkExtendedEdge,
    ): [path: string, labelX: number, labelY: number, offsetX?: number, offsetY?: number] {
        if (elkEdge && elkEdge.sections && elkEdge.sections.length > 0) {
            return getElkPath(elkEdge);
        } else {
            return getBezierPath(params);
        }
    }

    function getElkPath(elkEdge: ElkExtendedEdge): [string, number, number, number, number] {
        const sections = elkEdge.sections;
        if (!sections || sections.length === 0) {
            return ['', 0, 0, 0, 0];
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

            // Use edge labels if present, otherwise compute midpoint
            if (elkEdge.labels && elkEdge.labels.length > 0) {
                lX = elkEdge.labels[0].x ?? 0;
                lY = elkEdge.labels[0].y ?? 0;
            } else {
                lX = (startPoint.x + endPoint.x) / 2;
                lY = (startPoint.y + endPoint.y) / 2;
            }
        }

        return [pathParts.join(' '), lX, lY, 0, 0];
    }
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
    {#if rowData.priority !== 0}
        {#if elkEdge && elkEdge.labels && elkEdge.labels[0]}
            <EdgeLabel x={elkEdge.labels[0].x ?? 0} y={elkEdge.labels[0].y ?? 0}>
                <div
                    style={'pointer-events: all;' + (style ?? '')}
                    class="edge-label {selected ? 'edge-label-selected' : ''} nodrag nopan"
                >
                    {rowData.priority}
                </div>
            </EdgeLabel>
        {:else}
            <EdgeLabel x={labelX} y={labelY}>
                <div
                    style={'pointer-events: all;' + (style ?? '')}
                    class="edge-label {selected ? 'edge-label-selected' : ''} nodrag nopan"
                >
                    {rowData.priority}
                </div>
            </EdgeLabel>
        {/if}
    {/if}
{/if}

<style>
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
