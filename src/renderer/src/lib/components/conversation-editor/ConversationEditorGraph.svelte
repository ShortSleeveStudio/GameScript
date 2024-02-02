<script lang="ts">
    import { get, writable, type Unsubscriber, type Writable } from 'svelte/store';
    import {
        SvelteFlow,
        Controls,
        Background,
        MiniMap,
        type SnapGrid,
        BackgroundVariant,
        type Node as FlowNode,
        type Edge as FlowEdge,
        type XYPosition,
        type Viewport,
        Position,
        type CoordinateExtent,
        type NodeOrigin,
    } from '@xyflow/svelte';
    import { onDestroy, onMount } from 'svelte';
    import type { ActionUnsubscriber } from '@lib/utility/action';
    import { focusManager, type Focus } from '@lib/stores/app/focus';
    import {
        TABLE_ID_CONVERSATIONS,
        TABLE_ID_EGDES,
        TABLE_ID_NODES,
        type Edge,
        type Node,
        type Localization,
        TABLE_ID_LOCALIZATIONS,
        TABLE_ID_ROUTINES,
        ROUTINE_TYPE_ID_USER,
        type Routine,
    } from '@lib/api/db/db-schema';
    import { db } from '@lib/api/db/db';
    import { createFilter } from '@lib/api/db/db-filter';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import {
        conversationIdToViewportKey,
        isConversationViewportKey,
    } from '@lib/constants/local-storage';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import NodeDialogue from './NodeDialogue.svelte';
    import { Button } from 'carbon-components-svelte';
    import type { DbConnection } from 'preload/api-db';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { EVENT_SHUTDOWN } from '@lib/constants/events';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import type { NodeData } from '@lib/graph/node-data';

    const DEFAULT_VIEWPORT: Viewport = <Viewport>{ x: 0, y: 0, zoom: 1 };
    const viewport: Writable<Viewport> = writable(<Viewport>{ ...DEFAULT_VIEWPORT });
    const nodes: Writable<FlowNode[]> = writable([
        // {
        //     id: '1',
        //     type: 'input',
        //     data: { label: 'Input Node' },
        //     position: { x: 0, y: 0 },
        // },
        // {
        //     id: '2',
        //     type: 'default',
        //     data: { label: 'Node' },
        //     position: { x: 0, y: 150 },
        // },
        // {
        //     id: '3',
        //     type: 'output',
        //     data: { label: 'Node' },
        //     position: { x: 0, y: 300 },
        // },
    ]);
    const edges: Writable<FlowEdge[]> = writable([
        // {
        //     id: '1-2',
        //     type: 'default',
        //     source: '1',
        //     target: '2',
        //     label: 'Edge Text',
        // },
        // {
        //     id: '2-3',
        //     type: 'smoothstep',
        //     source: '2',
        //     target: '3',
        //     label: 'Edge Text',
        // },
    ]);
    const snapGrid: SnapGrid = [30, 30];
    const nodeTypes = {
        'node-dialogue': NodeDialogue,
    };

    let focused: Focus;
    let unsubscriberFocus: ActionUnsubscriber;
    let unsubscriberNode: Unsubscriber;
    let unsubscriberEdge: Unsubscriber;
    let unsubscriberNodeView: Unsubscriber;
    let unsubscriberEdgeView: Unsubscriber;
    let nodeViews: IDbTableView<Node>;
    let edgeViews: IDbTableView<Edge>;
    let localizations: IDbTableView<Localization>;
    let isLoading: IsLoadingStore = new IsLoadingStore();

    function loadViewport(): void {
        if (focused && focused.rowView) {
            const storedString: string = localStorage.getItem(
                conversationIdToViewportKey(focused.rowView.id),
            );
            if (storedString) viewport.set(JSON.parse(storedString));
        }
    }

    function saveViewport(): void {
        if (focused && focused.rowView) {
            localStorage.setItem(
                conversationIdToViewportKey(focused.rowView.id),
                JSON.stringify(get(viewport)),
            );
        }
    }

    function onNodeViewsChanged(rowViews: IDbRowView<Node>[]): void {
        nodes.set(
            rowViews.map((rowView: IDbRowView<Node>) => {
                const node: Node = get(rowView);
                return {
                    id: node.id.toString(),
                    type: 'node-dialogue',
                    position: { x: node.positionX, y: node.positionY },
                    data: <NodeData>{
                        rowView: rowView,
                        localizations: localizations,
                    },
                };
            }),
        );
    }

    const createNode: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        if (!focused) return;

        let uiText: Localization;
        let voiceText: Localization;
        let condition: Routine;
        let code: Routine;
        let node: Node;
        await db.executeTransaction(async (conn: DbConnection) => {
            // Create uiText
            uiText = await db.createRow(
                TABLE_ID_LOCALIZATIONS,
                <Localization>{
                    parent: focused.rowView.id,
                    isSystemCreated: true,
                },
                conn,
            );
            // Create voiceText
            voiceText = await db.createRow(
                TABLE_ID_LOCALIZATIONS,
                <Localization>{
                    parent: focused.rowView.id,
                    isSystemCreated: true,
                },
                conn,
            );
            // Create condition
            condition = await db.createRow(
                TABLE_ID_ROUTINES,
                <Routine>{
                    code: '',
                    type: ROUTINE_TYPE_ID_USER,
                    isSystemCreated: true,
                },
                conn,
            );
            // Create code
            code = await db.createRow(
                TABLE_ID_ROUTINES,
                <Routine>{
                    code: '',
                    type: ROUTINE_TYPE_ID_USER,
                    isSystemCreated: true,
                },
                conn,
            );
            // Create Node
            node = await db.createRow(
                TABLE_ID_NODES,
                <Node>{
                    parent: focused.rowView.id,
                    actor: 0,
                    uiText: uiText.id,
                    voiceText: voiceText.id,
                    condition: condition.id,
                    code: code.id,
                    // Graph Stuff
                    type: 'dialogue',
                    positionX: 0,
                    positionY: 0,
                },
                conn,
            );
        });

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'node creation',
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await db.deleteRow(TABLE_ID_NODES, node, conn);
                        await db.deleteRow(TABLE_ID_ROUTINES, code, conn);
                        await db.deleteRow(TABLE_ID_ROUTINES, condition, conn);
                        await db.deleteRow(TABLE_ID_LOCALIZATIONS, voiceText, conn);
                        await db.deleteRow(TABLE_ID_LOCALIZATIONS, uiText, conn);
                    });
                }),
                isLoading.wrapOperationAsync(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await db.createRow(TABLE_ID_LOCALIZATIONS, uiText, conn);
                        await db.createRow(TABLE_ID_LOCALIZATIONS, voiceText, conn);
                        await db.createRow(TABLE_ID_ROUTINES, condition, conn);
                        await db.createRow(TABLE_ID_ROUTINES, code, conn);
                        await db.createRow(TABLE_ID_NODES, node, conn);
                    });
                }),
            ),
        );
    });

    function onEdgeViewsChanged(newEdgeViews: IDbRowView<Edge>[]): void {}

    function onNodesChanged(newNodes: FlowNode[]): void {
        // console.log(newNodes);
    }

    function onEdgesChanged(newEdges: FlowEdge[]): void {
        // console.log(newEdges);
    }

    function onFocusChanged(): void {
        const newFocus = focusManager.get(TABLE_ID_CONVERSATIONS);

        // Already focused?
        if (newFocus === focused) return;

        // Save viewport
        saveViewport();

        // Set new focus
        focused = newFocus;

        // Clear Graph
        clearGraph();

        // Nothing new to focus
        if (newFocus === undefined) return;

        // Load viewport
        loadViewport();

        // Load graph
        loadGraph();
    }

    function loadGraph(): void {
        nodeViews = db.fetchTable<Node>(
            TABLE_ID_NODES,
            createFilter<Node>().where().column('parent').eq(focused.rowView.id).endWhere().build(),
        );
        edgeViews = db.fetchTable<Edge>(
            TABLE_ID_EGDES,
            createFilter<Edge>().where().column('parent').eq(focused.rowView.id).endWhere().build(),
        );
        localizations = db.fetchTable<Localization>(
            TABLE_ID_LOCALIZATIONS,
            createFilter().where().column('parent').eq(focused.rowView.id).endWhere().build(),
        );
        unsubscriberNodeView = nodeViews.subscribe(onNodeViewsChanged);
        unsubscriberEdgeView = edgeViews.subscribe(onEdgeViewsChanged);
    }

    function clearGraph(): void {
        if (edgeViews) db.releaseTable(edgeViews);
        if (nodeViews) db.releaseTable(nodeViews);
        if (localizations) db.releaseTable(localizations);
        if (unsubscriberNodeView) unsubscriberNodeView();
        if (unsubscriberEdgeView) unsubscriberEdgeView();
        if (get(nodes).length !== 0) nodes.set([]);
        if (get(edges).length !== 0) edges.set([]);
        viewport.set(<Viewport>{ ...DEFAULT_VIEWPORT });
    }

    const onShutdown: () => void = () => {
        // Clear saved viewports on shutdown
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key: string = localStorage.key(i);
            if (isConversationViewportKey(key)) {
                localStorage.removeItem(key);
            }
        }
    };

    onMount(() => {
        unsubscriberFocus = focusManager.subscribe(onFocusChanged);
        unsubscriberNode = nodes.subscribe(onNodesChanged);
        unsubscriberEdge = edges.subscribe(onEdgesChanged);
        addEventListener(EVENT_SHUTDOWN, onShutdown);
    });
    onDestroy(() => {
        if (unsubscriberFocus) unsubscriberFocus();
        if (unsubscriberNode) unsubscriberNode();
        if (unsubscriberEdge) unsubscriberEdge();
        removeEventListener(EVENT_SHUTDOWN, onShutdown);
        clearGraph();
    });
</script>

<Button disabled={!focused} on:click={createNode}>Create Node</Button>
<div class="graph-container">
    <SvelteFlow
        {viewport}
        {nodes}
        {edges}
        {snapGrid}
        {nodeTypes}
        proOptions={{ hideAttribution: true }}
    >
        <Controls />
        <Background gap={snapGrid} variant={BackgroundVariant.Dots} />
        <MiniMap />
    </SvelteFlow>
</div>

<style>
    .graph-container {
        height: 100%;
        width: 100%;
    }
</style>
