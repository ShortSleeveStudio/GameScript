<script lang="ts">
    /**
     * Root node component - the starting point of every conversation.
     *
     * The root node:
     * - Cannot be deleted
     * - Has no input handle (it's the start)
     * - Has only an output handle
     * - Displays "Start" as its title
     * - Uses IDbRowView for reactive data binding
     *
     * Migrated to Svelte 5 and @xyflow/svelte 1.x
     */
    import { Position, type NodeProps } from '@xyflow/svelte';
    import type { Node } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
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
        targetPosition: _targetPosition = undefined,
        sourcePosition = Position.Right,
        positionAbsoluteX: _positionAbsoluteX = 0,
        positionAbsoluteY: _positionAbsoluteY = 0,
        data,
    }: NodeProps<GraphNode> = $props();

    let rowView: IDbRowView<Node> = $derived(data.rowView);
    let isVertical: boolean = $derived(sourcePosition === Position.Bottom);
</script>

<NodeBase {rowView} {isVertical} {selected} title={'Start'} {sourcePosition} showDelete={false}></NodeBase>
