<script lang="ts">
    /**
     * Dialogue node component - represents a line of dialogue.
     *
     * Features:
     * - Actor color indicator
     * - Voice text display/editing (via NodeDialogueText)
     * - UI response text display/editing (via NodeDialogueUI)
     * - Reactive data binding via IDbRowView
     *
     * Migrated to Svelte 5 and @xyflow/svelte 1.x
     */
    import { Position, type NodeProps } from '@xyflow/svelte';
    import type { Actor, Localization, Node } from '@gamescript/shared';
    import type { IDbRowView, IDbTableView } from '$lib/db';
    import { actorsTable } from '$lib/tables/actors.js';
    import { type NodeData, type GraphNode } from '../utils/types.js';
    import NodeBase from './NodeBase.svelte';
    import NodeDialogueText from './NodeDialogueText.svelte';
    import NodeDialogueUI from './NodeDialogueUI.svelte';

    // Svelte 5 props - unused props collected via rest pattern
    let {
        selected = false,
        targetPosition = Position.Left,
        sourcePosition = Position.Right,
        data,
        // Unused props from NodeProps - collected to avoid warnings
        id: _id,
        dragHandle: _dragHandle,
        type: _type,
        isConnectable: _isConnectable,
        zIndex: _zIndex,
        width: _width,
        height: _height,
        dragging: _dragging,
        positionAbsoluteX: _positionAbsoluteX,
        positionAbsoluteY: _positionAbsoluteY,
    }: NodeProps<GraphNode> = $props();

    let rowView: IDbRowView<Node> = $derived(data.rowView);
    let localizations: IDbTableView<Localization> = $derived(data.localizations);
    let isVertical: boolean = $derived(sourcePosition === Position.Bottom);

    // Get the node data reactively
    let nodeData = $derived(rowView ? rowView.data : undefined);

    // Derived state for actor and text
    let actor = $derived(nodeData ? actorsTable.getRowViewById(nodeData.actor) : undefined);
    let actorData = $derived(actor ? actor.data : undefined);

    // Derive localizations reactively - must depend on localizations.rows to re-run when table updates.
    // This is critical for undo/redo: when localizations are restored, we need to re-lookup the row views.
    let voiceText = $derived.by(() => {
        const locId = nodeData?.voice_text;
        if (!locId || !localizations) return undefined;
        // Access rows to create reactive dependency on table changes
        const _rows = localizations.rows;
        return localizations.getRowViewById(locId);
    });

    let uiText = $derived.by(() => {
        const locId = nodeData?.ui_response_text;
        if (!locId || !localizations) return undefined;
        // Access rows to create reactive dependency on table changes
        const _rows = localizations.rows;
        return localizations.getRowViewById(locId);
    });
</script>

<NodeBase
    {rowView}
    {isVertical}
    {selected}
    title={actorData?.name ?? 'Loading...'}
    {targetPosition}
    {sourcePosition}
>
    {#snippet body()}
        <div class="node-color" style:background-color={actorData?.color ?? ''}></div>
        <NodeDialogueUI disabled={!actor || !uiText} localization={uiText} />
        <div class="node-divider-text"></div>
        <NodeDialogueText disabled={!actor || !voiceText} localization={voiceText} />
    {/snippet}
</NodeBase>

<style>
    .node-color {
        height: var(--graph-node-color-height, 6px);
        border-bottom: 1px solid var(--gs-border-primary);
    }

    .node-divider-text {
        height: 0px;
        border-bottom: 1px solid var(--gs-border-primary);
    }
</style>
