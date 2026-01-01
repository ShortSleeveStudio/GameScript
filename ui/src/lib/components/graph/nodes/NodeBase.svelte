<script lang="ts">
    /**
     * Base node component providing common structure for all node types.
     *
     * Features:
     * - Input/output handles with position support
     * - Title bar with node ID and name
     * - Body snippet for custom content
     * - Overflow menu snippet for actions
     * - Integration with GraphContext for delete
     *
     * Migrated to Svelte 5 snippets
     */
    import { Handle, Position } from '@xyflow/svelte';
    import type { Node } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { getContext } from 'svelte';
    import { GRAPH_CONTEXT, PORT_CONTAINER_THICKNESS, type GraphContext } from '../utils/types.js';
    import PortInput from '$lib/components/icons/PortInput.svelte';
    import PortOutput from '$lib/components/icons/PortOutput.svelte';
    import IconDelete from '$lib/components/icons/IconDelete.svelte';
    import type { Snippet } from 'svelte';

    const graphContext = getContext<GraphContext>(GRAPH_CONTEXT);

    interface Props {
        /** Reactive row view for node data */
        rowView: IDbRowView<Node>;
        /** Whether this node is selected */
        selected?: boolean;
        /** Whether layout is vertical (affects handle positions) */
        isVertical?: boolean;
        /** Title to display in title bar */
        title: string;
        /** Position for input handle (undefined = no input handle) */
        targetPosition?: Position;
        /** Position for output handle (undefined = no output handle) */
        sourcePosition?: Position;
        /** Body content snippet */
        body?: Snippet;
        /** Whether to show the delete button (default: true) */
        showDelete?: boolean;
    }

    let {
        rowView,
        selected = false,
        isVertical = false,
        title,
        targetPosition = undefined,
        sourcePosition = undefined,
        body,
        showDelete = true,
    }: Props = $props();

    function handleDelete(): void {
        graphContext?.onDelete([{ ...rowView.getValue() }], []);
    }

    let borderCssSource = $derived(isVertical ? 'border-top: none;' : 'border-left: none;');
    let borderCssTarget = $derived(isVertical ? 'border-bottom: none;' : 'border-right: none;');
</script>

<div class="node-container" style:flex-direction={isVertical ? 'column' : 'row'}>
    {#if targetPosition}
        <div
            class="node-port"
            style:width={isVertical ? '' : PORT_CONTAINER_THICKNESS}
            style:height={isVertical ? PORT_CONTAINER_THICKNESS : ''}
        >
            <Handle class="node-custom-port" type="target" position={targetPosition}>
                <div class="node-port-icon-container" style={borderCssTarget}>
                    <PortInput style={isVertical ? 'transform: rotate(90deg);' : ''} />
                </div>
            </Handle>
        </div>
    {/if}

    <div class="node-content">
        <div class="node-title-bar {selected ? 'node-title-bar-selected' : ''}">
            <span class="node-title-id">{rowView.id}</span>
            <span class="node-title-text">{title}</span>
            {#if showDelete}
                <button
                    class="node-delete-button nodrag"
                    type="button"
                    title="Delete node"
                    onclick={handleDelete}
                >
                    <IconDelete size={14} />
                </button>
            {/if}
        </div>
        {#if body}
            <div class="node-body">
                {@render body()}
            </div>
        {/if}
    </div>

    {#if sourcePosition}
        <div
            class="node-port"
            style:width={isVertical ? '' : PORT_CONTAINER_THICKNESS}
            style:height={isVertical ? PORT_CONTAINER_THICKNESS : ''}
        >
            <Handle class="node-custom-port" type="source" position={sourcePosition}>
                <div class="node-port-icon-container" style={borderCssSource}>
                    <PortOutput style={isVertical ? 'transform: rotate(90deg);' : ''} />
                </div>
            </Handle>
        </div>
    {/if}
</div>

<style>
    .node-container {
        display: flex;
        align-content: stretch;
        align-items: stretch;
    }

    .node-port {
        display: flex;
        align-content: center;
    }

    .node-content {
        width: var(--graph-node-width, 200px);
        border: 1px solid var(--gs-border-primary);
    }

    .node-port-icon-container {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        pointer-events: none;
        border: 1px solid var(--gs-border-primary);
    }

    .node-title-bar {
        background-color: var(--gs-bg-header);
        height: var(--graph-node-title-height, 32px);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .node-title-bar-selected {
        background-color: var(--gs-list-selection-bg);
    }

    .node-title-id {
        height: 100%;
        padding-left: 0.75rem;
        padding-right: 0.75rem;
        box-shadow: 5px 0 6px -6px var(--gs-shadow);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--gs-font-size-small);
        color: var(--gs-fg-secondary);
    }

    .node-title-text {
        padding-left: 1rem;
        padding-right: 1rem;
        flex-grow: 1;
        font-size: 12px;
        color: var(--gs-fg-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .node-body {
        padding: 0;
    }

    .node-delete-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        margin-right: 4px;
        padding: 0;
        background: none;
        border: none;
        border-radius: 3px;
        color: var(--gs-fg-secondary);
        cursor: pointer;
    }

    .node-delete-button:hover {
        background: var(--gs-error-bg);
        color: var(--gs-fg-error);
    }

    :global(div.node-custom-port) {
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        position: relative;
        border-radius: 0;
        transform: none;
        border: none;
        opacity: 100;
        background-color: var(--gs-bg-primary);
    }
</style>
