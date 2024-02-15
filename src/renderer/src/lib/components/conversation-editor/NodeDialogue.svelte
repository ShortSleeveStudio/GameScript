<script lang="ts">
    import { Position, type NodeProps } from '@xyflow/svelte';
    // import { Position, type NodeProps } from '@lib/vendor/flow/svelte/src/lib';
    import type { NodeData } from '@lib/graph/graph-data';
    import type { Actor, Localization, Node } from '@lib/api/db/db-schema';
    import { actorsTable } from '@lib/tables/actors';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import NodeDialogueText from './NodeDialogueText.svelte';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import { get } from 'svelte/store';
    import NodeBase from './NodeBase.svelte';

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

    let rowView: IDbRowView<Node> = data.rowView;
    let localizations: IDbTableView<Localization> = data.localizations;
    let isVertical: boolean = false;
    $: isVertical = sourcePosition === Position.Bottom;
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

<NodeBase
    {isVertical}
    {selected}
    title={actor ? $actor.name : 'Loading...'}
    {targetPosition}
    {sourcePosition}
>
    <svelte:fragment slot="body">
        <div class="node-color" style:background-color={actor ? $actor.color : ''}></div>
        <NodeDialogueText disabled={!actor || !voiceText} localization={voiceText} />
    </svelte:fragment>
</NodeBase>

<style>
    .node-color {
        height: var(--graph-node-color-height);
        border-bottom: 1px solid var(--cds-ui-04, #8d8d8d);
    }
</style>
