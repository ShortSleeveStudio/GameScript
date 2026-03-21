<script lang="ts">
    /**
     * Logic node component - a node that runs actions/conditions without speech.
     *
     * The logic node:
     * - Can be deleted
     * - Has both input and output handles (can receive and send edges)
     * - Displays "Logic" as its title
     * - Has no actor color bar or text areas (plain appearance like root)
     * - Uses IDbRowView for reactive data binding
     *
     * Logic nodes are useful for:
     * - Running actions before/after speech (sequencing)
     * - Branching logic without dialogue
     * - Triggering game events without visible text
     */
    import { Position, type NodeProps } from '@xyflow/svelte';
    import type { Node } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { RowColumnTextArea } from '$lib/components/common';
    import {
        NODE_UNDO_NOTES,
        NODE_PLACEHOLDER_NOTES,
    } from '$lib/constants/settings.js';
    import { type NodeData, type GraphNode } from '../utils/types.js';
    import NodeBase from './NodeBase.svelte';

    // Svelte 5 props - underscore prefix indicates intentionally unused
    let {
        id: _id,
        dragHandle: _dragHandle = undefined,
        type: _type = undefined,
        selected = false,
        isConnectable: _isConnectable = true,
        zIndex: _zIndex = 0,
        width: _width = 0,
        height: _height = 0,
        dragging: _dragging = false,
        targetPosition = Position.Left,
        sourcePosition = Position.Right,
        positionAbsoluteX: _positionAbsoluteX = 0,
        positionAbsoluteY: _positionAbsoluteY = 0,
        data,
    }: NodeProps<GraphNode> = $props();

    let rowView: IDbRowView<Node> = $derived(data.rowView);
    let isVertical: boolean = $derived(sourcePosition === Position.Bottom);
</script>

<NodeBase {rowView} {isVertical} {selected} title={'Logic'} {targetPosition} {sourcePosition}>
    {#snippet body()}
        <div class="nodrag nopan node-notes">
            <RowColumnTextArea
                {rowView}
                columnName="notes"
                undoText={NODE_UNDO_NOTES}
                placeholder={NODE_PLACEHOLDER_NOTES}
                rows={1}
            />
        </div>
    {/snippet}
</NodeBase>

<style>
    .node-notes {
        height: 28px;
        background: var(--gs-bg-secondary);
        border-top: 1px dashed var(--gs-border-primary);
    }

    .node-notes :global(.row-column-textarea-wrapper) {
        height: 100%;
    }

    .node-notes :global(textarea) {
        border: none !important;
        height: 100% !important;
        min-height: unset !important;
        padding: 4px 8px !important;
        resize: none !important;
        border-radius: 0 !important;
        background: transparent !important;
        font-family: monospace !important;
        font-size: 11px !important;
        color: #4ec950 !important;
    }
</style>
