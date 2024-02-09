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
        type Viewport,
        type DefaultEdgeOptions,
        ConnectionLineType,
        type Connection,
        SvelteFlowProvider,
    } from '@xyflow/svelte';
    import { onDestroy, onMount } from 'svelte';
    import type { ActionUnsubscriber } from '@lib/utility/action';
    import {
        focusManager,
        type Focus,
        type FocusRequest,
        FOCUS_REPLACE,
        FOCUS_MODE_REPLACE,
        type FocusRequests,
    } from '@lib/stores/app/focus';
    import {
        TABLE_ID_CONVERSATIONS,
        TABLE_ID_EDGES,
        TABLE_ID_NODES,
        type Edge,
        type Node,
        type Localization,
        TABLE_ID_LOCALIZATIONS,
        type EdgeType,
        NODE_TYPE_DIALOGUE,
        EDGE_TYPE_SMOOTHSTEP,
        type Conversation,
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
    import { EVENT_SHUTDOWN } from '@lib/constants/events';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import type { EdgeData, NodeData } from '@lib/graph/graph-data';
    import { ASC } from '@lib/api/db/db-filter-interface';
    import { TableWatcher } from '@lib/stores/utility/table-watcher';
    import { nodesDelete } from '@lib/crud/node-d';
    import { edgeCreate } from '@lib/crud/edge-c';
    import { nodesUpdate } from '@lib/crud/node-u';
    import SvelteFlowApi from './SvelteFlowApi.svelte';
    import { nodeCreate } from '@lib/crud/node-c';

    type LocalObject = FlowNode | FlowEdge;
    type RemoteObject = Node | Edge;
    interface GraphFunctions {
        localObjectStore: Writable<LocalObject[]>;
        creatorLocal: (remoteObject: IDbRowView<RemoteObject>) => LocalObject;
        updatorLocal: (localObject: LocalObject, remoteObject: IDbRowView<RemoteObject>) => void;
    }

    const MIN_ZOOM: number = 0.1;
    const DEFAULT_VIEWPORT: Viewport = <Viewport>{ x: 0, y: 0, zoom: 1 };
    const DEFAULT_EDGE_TYPE: EdgeType = EDGE_TYPE_SMOOTHSTEP;
    const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = <DefaultEdgeOptions>{
        type: DEFAULT_EDGE_TYPE,
    };
    const NODE_FOCUS_REQUEST: FocusRequest = <FocusRequest>{
        tableId: TABLE_ID_NODES,
        type: FOCUS_REPLACE,
    };
    const EDGE_FOCUS_REQUEST: FocusRequest = <FocusRequest>{
        tableId: TABLE_ID_EDGES,
        type: FOCUS_REPLACE,
    };
    const viewport: Writable<Viewport> = writable(<Viewport>{ ...DEFAULT_VIEWPORT });
    const nodes: Writable<FlowNode[]> = writable([]);
    const edges: Writable<FlowEdge[]> = writable([]);
    const snapGrid: SnapGrid = [30, 30];
    const nodeTypes = {
        dialogue: NodeDialogue,
    };

    let unsubscriberFocus: ActionUnsubscriber;
    let tableWatcherNode: TableWatcher<Node>;
    let tableWatcherEdge: TableWatcher<Edge>;
    let unsubscriberLocalizationView: Unsubscriber;
    let nodeViews: IDbTableView<Node>;
    let edgeViews: IDbTableView<Edge>;
    let localizationViews: IDbTableView<Localization>;
    let isLoading: IsLoadingStore = new IsLoadingStore();
    let isConversationInitialized: boolean = false;
    let deleteKeyPressed: Writable<boolean>;
    let focusedRowView: IDbRowView<Conversation>;
    $: {
        if (focusedRowView && (focusedRowView.isDisposed || $focusedRowView.isDeleted)) {
            changeFocus(undefined);
        }
    }

    const graphFunctionsNodes: GraphFunctions = {
        localObjectStore: nodes,
        creatorLocal: nodeCreateLocal,
        updatorLocal: nodeUpdateLocal,
    };
    const graphFunctionsEdges: GraphFunctions = {
        localObjectStore: edges,
        creatorLocal: edgeCreateLocal,
        updatorLocal: edgeUpdateLocal,
    };

    function loadViewport(): void {
        if (focusedRowView) {
            const storedString: string = localStorage.getItem(
                conversationIdToViewportKey(focusedRowView.id),
            );
            if (storedString) viewport.set(JSON.parse(storedString));
        }
    }

    function saveViewport(): void {
        if (focusedRowView) {
            localStorage.setItem(
                conversationIdToViewportKey(focusedRowView.id),
                JSON.stringify(get(viewport)),
            );
        }
    }

    function onEdgeCreate(connection: Connection): FlowEdge {
        // Sanity
        const [source, target] = parseConnection(connection);

        // Create edge
        edgeCreate(
            <Edge>{
                parent: focusedRowView.id,
                // Graph Stuff
                type: DEFAULT_EDGE_TYPE,
                source: source,
                target: target,
            },
            isLoading,
        ).catch((error) => {
            changeFocus(undefined);
            throw error;
        });

        // Wait for an update from the backend to really create the edge
        return undefined;
    }

    function onBeforeDelete(params: { nodes: FlowNode[]; edges: FlowEdge[] }): boolean {
        // Grab nodes and edges to delete
        const nodes: Node[] = params.nodes.map(
            (flowNode: FlowNode) => <Node>{ ...get(flowNode.data.rowView) },
        );
        const edges: Edge[] = params.edges.map(
            (flowEdge: FlowEdge) => <Edge>{ ...get(flowEdge.data.rowView) },
        );

        // Delete
        nodesDelete(nodes, edges, isLoading).catch((error) => {
            changeFocus(undefined);
            throw error;
        });

        // Wait for an update from the backend to really delete anything
        return false;
    }

    function onNodeDragStop(
        event: CustomEvent<{ event: MouseEvent; node: FlowNode; nodes: FlowNode[] }>,
    ): void {
        const flowNodes: FlowNode[] = event.detail.nodes;
        const oldNodes: Node[] = [];
        const newNodes: Node[] = [];
        for (let i = 0; i < flowNodes.length; i++) {
            const flowNode: FlowNode = flowNodes[i];
            const originalNode: Node = get(flowNode.data.rowView);
            // Skip nodes that haven't moved
            if (
                flowNode.position.x === originalNode.positionX &&
                flowNode.position.y === originalNode.positionY
            ) {
                continue;
            }
            oldNodes.push(<Node>{ ...originalNode });
            const newNode = <Node>{ ...originalNode };
            newNode.positionX = flowNode.position.x;
            newNode.positionY = flowNode.position.y;
            newNodes.push(newNode);
        }
        nodesUpdate(oldNodes, newNodes, isLoading).catch((error) => {
            changeFocus(undefined);
            throw error;
        });
    }

    function onSelectionChanged(
        event: CustomEvent<{ nodes: FlowNode[]; edges: FlowEdge[] }>,
    ): void {
        const eventNodes: FlowNode[] = event.detail.nodes;
        const eventEdges: FlowEdge[] = event.detail.edges;
        NODE_FOCUS_REQUEST.focus = new Map();
        EDGE_FOCUS_REQUEST.focus = new Map();
        for (let i = 0; i < eventNodes.length; i++) {
            NODE_FOCUS_REQUEST.focus.set(eventNodes[i].data.rowView.id, {
                rowView: eventNodes[i].data.rowView,
            });
        }
        for (let i = 0; i < eventEdges.length; i++) {
            EDGE_FOCUS_REQUEST.focus.set(eventEdges[i].data.rowView.id, {
                rowView: eventEdges[i].data.rowView,
            });
        }
        focusManager.focus(<FocusRequests>{
            type: FOCUS_MODE_REPLACE,
            requests: [NODE_FOCUS_REQUEST, EDGE_FOCUS_REQUEST],
        });
    }

    // TODO
    function onCreateNode(): void {
        const newNode: Node = <Node>{
            type: NODE_TYPE_DIALOGUE,
            positionX: 0,
            positionY: 0,
            parent: focusedRowView.id,
        };
        nodeCreate(newNode, isLoading);
    }
    // TODO

    function nodeCreateLocal(remote: IDbRowView<Node>): FlowNode {
        const remoteNode: Node = get(remote);
        return <FlowNode>{
            id: remote.id.toString(),
            type: remoteNode.type,
            position: { x: remoteNode.positionX, y: remoteNode.positionY },
            data: <NodeData>{
                rowView: remote,
                localizations: localizationViews,
            },
        };
    }

    function nodeUpdateLocal(local: FlowNode, remoteView: IDbRowView<Node>): void {
        const remote: Node = get(remoteView);
        // Skip equality
        if (nodeIsEqual(local, remote)) return;
        console.log(`Update local node`);
        local.type = remote.type;
        if (isNodeDragging()) return; // TODO - test using just this node's dragging flag
        local.position.x = remote.positionX;
        local.position.y = remote.positionY;
    }

    function nodeIsEqual(local: FlowNode, remote: Node): boolean {
        return (
            local.type === remote.type &&
            local.position.x === remote.positionX &&
            local.position.y === remote.positionY
        );
    }

    function isNodeDragging(): boolean {
        const flowNodes: FlowNode[] = get(nodes);
        for (let i = 0; i < flowNodes.length; i++) {
            if (flowNodes[i].dragging) {
                return true;
            }
        }
        return false;
    }

    function edgeCreateLocal(remote: IDbRowView<Edge>): FlowEdge {
        const remoteEdge: Edge = get(remote);
        return <FlowEdge>{
            id: remote.id.toString(),
            type: remoteEdge.type,
            source: remoteEdge.source.toString(),
            target: remoteEdge.target.toString(),
            data: <EdgeData>{
                rowView: remote,
                localizations: localizationViews,
            },
        };
    }

    function edgeUpdateLocal(local: FlowEdge, remoteView: IDbRowView<Edge>): void {
        const remote: Edge = get(remoteView);
        // Skip equality
        if (edgeIsEqual(local, remote)) return;
        console.log(`Update local edge`);
        local.type = remote.type;
        local.source = remote.source.toString();
        local.target = remote.target.toString();
    }

    function edgeIsEqual(local: FlowEdge, remote: Edge): boolean {
        return (
            local.type === remote.type &&
            local.source === remote.source.toString() &&
            local.target === remote.target.toString()
        );
    }

    function parseConnection(connection: Connection): readonly [source: number, target: number] {
        const source: number = parseInt(connection.source);
        const target: number = parseInt(connection.target);
        if (isNaN(source) || isNaN(target)) {
            throw new Error(
                `New edge had invalid source ${connection.source} or target (${connection.target})`,
            );
        }
        return [source, target];
    }

    function runReconciliation(isForNodes: boolean): void {
        let graphFunctions: GraphFunctions;
        let localWritable: Writable<LocalObject[]>;
        let remoteWritable: IDbTableView<RemoteObject>;
        if (isForNodes) {
            graphFunctions = graphFunctionsNodes;
            localWritable = nodes;
            remoteWritable = nodeViews;
        } else {
            graphFunctions = graphFunctionsEdges;
            localWritable = edges;
            remoteWritable = edgeViews;
        }

        let localObjects: LocalObject[] = get(localWritable);
        let remoteObjects: IDbRowView<RemoteObject>[] = get(remoteWritable);
        const newObjects: LocalObject[] = [];
        let l: number = 0;
        let r: number = 0;
        for (; l < localObjects.length || r < remoteObjects.length; ) {
            const localObject: LocalObject = l < localObjects.length ? localObjects[l] : undefined;
            const remoteObject: IDbRowView<RemoteObject> =
                r < remoteObjects.length ? remoteObjects[r] : undefined;

            // Compare
            const localId: number = localObject ? parseInt(localObject.id) : Infinity;
            const remoteId: number = remoteObject ? remoteObject.id : Infinity;
            if (localId === remoteId) {
                // Update Local (if not equal)
                graphFunctions.updatorLocal(localObject, remoteObject);
                newObjects.push(localObject);
                l++;
                r++;
            } else if (localId < remoteId) {
                // Delete Local
                // Simply don't add to list
                console.log(`Delete local ${isForNodes ? 'node' : 'edge'}`);
                l++;
            } else {
                // remoteNode.id < localId
                // Create Local
                console.log(`Create local ${isForNodes ? 'node' : 'edge'}`);
                newObjects.push(graphFunctions.creatorLocal(remoteObject));
                r++;
            }
        }

        // Update the local store
        graphFunctions.localObjectStore.set(newObjects);
    }

    function onNodeViewsChanged(): void {
        if (isConversationInitialized) runReconciliation(true);
        else updateIsConversationInitialized();
    }

    function onEdgeViewsChanged(): void {
        if (isConversationInitialized) runReconciliation(false);
        else updateIsConversationInitialized();
    }

    function onLocalizationsChanged(): void {
        // it doesn't matter that we picked nodes, it'll trigger edge recon too
        onNodeViewsChanged();
    }

    // TODO - remove once they implement onselectionchanged
    let nodesSelected: FlowNode[] = [];
    let edgesSelected: FlowEdge[] = [];
    function onNodeClicked(): void {
        updateSelection();
    }
    function onEdgeClicked(): void {
        updateSelection();
    }
    async function updateSelection(): Promise<void> {
        nodesSelected.length = 0;
        const nodeList: FlowNode[] = get(nodes);
        for (let i = 0; i < nodeList.length; i++) {
            if (nodeList[i].selected) nodesSelected.push(nodeList[i]);
        }
        edgesSelected.length = 0;
        const edgeList: FlowEdge[] = get(edges);
        for (let i = 0; i < edgeList.length; i++) {
            if (edgeList[i].selected) edgesSelected.push(edgeList[i]);
        }
        onSelectionChanged(
            new CustomEvent<{ nodes: FlowNode[]; edges: FlowEdge[] }>('xy-selection-changed', {
                detail: { nodes: nodesSelected, edges: edgesSelected },
            }),
        );
    }
    // TODO - remove once they implement onselectionchanged

    function updateIsConversationInitialized(): void {
        if (!isConversationInitialized) {
            isConversationInitialized =
                nodeViews &&
                edgeViews &&
                localizationViews &&
                nodeViews.isInitialized &&
                edgeViews.isInitialized &&
                localizationViews.isInitialized;
            if (isConversationInitialized) {
                // We need to play catch up
                runReconciliation(true);
                runReconciliation(false);
            }
        }
    }

    function onFocusChanged(): void {
        // Find focused conversations
        let newFocusedConversation: IDbRowView<Conversation> = undefined;
        const conversationFocus: Map<number, Focus> = focusManager.get()[TABLE_ID_CONVERSATIONS];
        if (conversationFocus.size === 1) {
            newFocusedConversation = conversationFocus.values().next().value.rowView;
        }
        if (newFocusedConversation) changeFocus(newFocusedConversation);
    }

    function changeFocus(newFocus: IDbRowView<Conversation>): void {
        // Skip if already focused
        if (newFocus === focusedRowView) return;

        // Save viewport
        saveViewport();

        // Set new focus
        focusedRowView = newFocus;

        // Clear Graph
        clearGraph();

        // Nothing new to focus
        if (focusedRowView === undefined) return;

        // Load viewport
        loadViewport();

        // Load graph
        loadGraph();
    }

    function loadGraph(): void {
        nodeViews = db.fetchTable<Node>(
            TABLE_ID_NODES,
            createFilter<Node>()
                .where()
                .column('parent')
                .eq(focusedRowView.id)
                .endWhere()
                .orderBy('id', ASC)
                .build(),
        );
        edgeViews = db.fetchTable<Edge>(
            TABLE_ID_EDGES,
            createFilter<Edge>()
                .where()
                .column('parent')
                .eq(focusedRowView.id)
                .endWhere()
                .orderBy('id', ASC)
                .build(),
        );
        localizationViews = db.fetchTable<Localization>(
            TABLE_ID_LOCALIZATIONS,
            createFilter().where().column('parent').eq(focusedRowView.id).endWhere().build(),
        );
        tableWatcherNode = new TableWatcher(nodeViews);
        tableWatcherNode.subscribe(onNodeViewsChanged);
        tableWatcherEdge = new TableWatcher(edgeViews);
        tableWatcherEdge.subscribe(onEdgeViewsChanged);
        unsubscriberLocalizationView = localizationViews.subscribe(onLocalizationsChanged);
    }

    function clearGraph(): void {
        // Order matters, we don't want subscription updates when the tables clear
        isConversationInitialized = false;
        if (tableWatcherNode) tableWatcherNode.dispose();
        if (tableWatcherEdge) tableWatcherEdge.dispose();
        if (unsubscriberLocalizationView) unsubscriberLocalizationView();
        if (edgeViews) db.releaseTable(edgeViews);
        if (nodeViews) db.releaseTable(nodeViews);
        if (localizationViews) db.releaseTable(localizationViews);
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
        addEventListener(EVENT_SHUTDOWN, onShutdown);
    });
    onDestroy(() => {
        if (unsubscriberFocus) unsubscriberFocus();
        removeEventListener(EVENT_SHUTDOWN, onShutdown);
        clearGraph();
    });
</script>

<div class="graph-container">
    <div class="graph-title-bar">
        <h4>{focusedRowView ? $focusedRowView.name : 'Please select a conversation'}</h4>
        <Button size="small" disabled={!focusedRowView || $isLoading} on:click={onCreateNode}
            >Create Node [REMOTE]</Button
        >
    </div>
    <div class="graph-editor">
        <SvelteFlowProvider>
            <SvelteFlow
                {viewport}
                {nodes}
                {edges}
                {snapGrid}
                {nodeTypes}
                defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                connectionLineType={ConnectionLineType.SmoothStep}
                minZoom={MIN_ZOOM}
                proOptions={{ hideAttribution: true }}
                onedgecreate={onEdgeCreate}
                onbeforedelete={onBeforeDelete}
                on:selectionchange={onSelectionChanged}
                on:nodedragstop={onNodeDragStop}
                on:nodeclick={onNodeClicked}
                on:edgeclick={onEdgeClicked}
            >
                <Controls />
                <Background gap={snapGrid} variant={BackgroundVariant.Dots} />
                <MiniMap />
            </SvelteFlow>
            <!-- TODO -->
            <SvelteFlowApi bind:deleteKeyPressed />
        </SvelteFlowProvider>
    </div>
</div>

<style>
    .graph-container {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
    }
    .graph-title-bar {
    }
    .graph-editor {
        flex-grow: 1;
    }
</style>
