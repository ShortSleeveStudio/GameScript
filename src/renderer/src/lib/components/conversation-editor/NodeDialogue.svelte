<script lang="ts">
    import { Handle, type NodeProps } from '@xyflow/svelte';
    import type { NodeData } from '@lib/graph/graph-data';
    import type { Actor, Localization, Node } from '@lib/api/db/db-schema';
    import { actorsTable } from '@lib/tables/actors';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import NodeDialogueText from './NodeDialogueText.svelte';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import { get } from 'svelte/store';
    import { onMount } from 'svelte';

    // SUPPRESS WARNINGS
    type $$Props = NodeProps;
    export let id: $$Props['id'];
    id;
    export let dragHandle: $$Props['dragHandle'] = undefined;
    dragHandle;
    export let type: $$Props['type'] = undefined;
    type;
    export let selected: $$Props['selected'] = undefined;
    selected;
    export let isConnectable: $$Props['isConnectable'] = undefined;
    isConnectable;
    export let zIndex: $$Props['zIndex'] = undefined;
    zIndex;
    export let width: $$Props['width'] = undefined;
    width;
    export let height: $$Props['height'] = undefined;
    height;
    export let dragging: $$Props['dragging'];
    dragging;
    export let targetPosition: $$Props['targetPosition'] = undefined;
    targetPosition;
    export let sourcePosition: $$Props['sourcePosition'] = undefined;
    sourcePosition;
    export let positionAbsoluteX: $$Props['positionAbsoluteX'] = undefined;
    positionAbsoluteX;
    export let positionAbsoluteY: $$Props['positionAbsoluteY'] = undefined;
    positionAbsoluteY;
    // SUPPRESS WARNINGS

    export let data: NodeData;

    let containerElement: HTMLElement;
    let rowView: IDbRowView<Node> = data.rowView;
    let localizations: IDbTableView<Localization> = data.localizations;
    $: onDataChanged(data);
    $: actor = getActorView($rowView);
    $: voiceText = getVoiceText($localizations);

    function onDataChanged(data: NodeData): void {
        rowView = data?.rowView;
        localizations = data?.localizations;
    }

    function getActorView(node: Node): IDbRowView<Actor> {
        if (!node) return undefined;
        return actorsTable.getRowViewById(node.actor);
    }

    function getVoiceText(localizationViews: IDbRowView<Localization>[]): IDbRowView<Localization> {
        if (!localizationViews || localizationViews.length === 0) return undefined;
        return localizations.getRowViewById(get(rowView).voiceText);
    }
</script>

<div
    class="node-container {selected ? 'node-container-selected' : ''}"
    bind:this={containerElement}
>
    <div class="node-title-bar">
        <span class="node-title-text">{actor ? $actor.name : 'Loading...'}</span>
    </div>
    <div class="node-body">
        <NodeDialogueText disabled={!actor || !voiceText} localization={voiceText} />
    </div>
    <div class="node-color" style:background-color={actor ? $actor.color : ''}></div>
    <Handle type="target" position={targetPosition} />
    <Handle type="source" position={sourcePosition} />
</div>

<style>
    .node-container {
        width: var(--graph-node-width);
        display: flex;
        flex-direction: column;
        background-color: var(--cds-layer-accent, #e0e0e0);
        border: 1px solid var(--cds-ui-04, #8d8d8d);
    }
    .node-container-selected {
        background-color: var(--cds-hover-selected-ui);
        /* box-shadow: 0px 0px 10px 2px var(--cds-hover-selected-ui); */
    }
    .node-title-bar {
        height: var(--graph-node-title-height);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--cds-ui-04, #8d8d8d);
    }
    .node-title-text {
        padding-left: 0.6875rem;
        padding-right: 0.6875rem;
    }
    .node-body {
        padding: 0.6875rem 1rem;
    }
    .node-color {
        height: var(--graph-node-color-height);
        border-top: 1px solid var(--cds-ui-04, #8d8d8d);
    }
</style>
