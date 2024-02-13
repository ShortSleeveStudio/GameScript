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
        Position,
        useStore,
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
        NODE_TYPE_ROOT,
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
    import { Button, InlineLoading, OverflowMenuItem } from 'carbon-components-svelte';
    import { EVENT_SHUTDOWN } from '@lib/constants/events';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import type { EdgeData, NodeData } from '@lib/graph/graph-data';
    import { ASC } from '@lib/api/db/db-filter-interface';
    import { TableWatcher } from '@lib/stores/utility/table-watcher';
    import { nodesDelete } from '@lib/crud/node-d';
    import { edgeCreate } from '@lib/crud/edge-c';
    import { nodesUpdate } from '@lib/crud/node-u';
    import { nodeCreate } from '@lib/crud/node-c';
    import NodeRoot from './NodeRoot.svelte';
    import WidgetContainer from '../common/WidgetContainer.svelte';
    import GridToolbar from '../common/GridToolbar.svelte';
    import { TrashCan } from 'carbon-icons-svelte';
    import { graphLayoutVertical } from '@lib/stores/graph/graph-layout';
    import ElkWorker from '@lib/vendor/elkjs/elk-worker.min.js?worker';
    import { type ELK, type ElkExtendedEdge, type ElkNode } from '@lib/vendor/elkjs/elk-api.js';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';

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
    // @ts-expect-error: I don't know how else to import this
    const ELK_LAYOUT: ELK = new ELK({
        workerFactory: () => {
            return new ElkWorker();
        },
    });

    const viewport: Writable<Viewport> = writable(<Viewport>{ ...DEFAULT_VIEWPORT });
    const nodes: Writable<FlowNode[]> = writable([]);
    const edges: Writable<FlowEdge[]> = writable([]);
    const snapGrid: SnapGrid = [30, 30];
    const nodeTypes = {};
    nodeTypes[NODE_TYPE_ROOT] = NodeRoot;
    nodeTypes[NODE_TYPE_DIALOGUE] = NodeDialogue;

    let unsubscriberFocus: ActionUnsubscriber;
    let unsubscriberLayoutVertical: Unsubscriber;
    let tableWatcherNode: TableWatcher<Node>;
    let tableWatcherEdge: TableWatcher<Edge>;
    let unsubscriberLocalizationView: Unsubscriber;
    let nodeUnsubscriber: Unsubscriber;
    let edgeUnsubscriber: Unsubscriber;
    let nodeViews: IDbTableView<Node>;
    let edgeViews: IDbTableView<Edge>;
    let localizationViews: IDbTableView<Localization>;
    let isLoading: IsLoadingStore = new IsLoadingStore();
    let isConversationInitialized: boolean = false;
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

    function getSourcePosition(isVertical: boolean): Position {
        return isVertical ? Position.Bottom : Position.Right;
    }

    function getTargetPosition(isVertical: boolean): Position {
        return isVertical ? Position.Top : Position.Left;
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
        // Grab nodes and edges to delete, this must happen before deselect since we're reusing the
        // same lists passed in
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

        // Deselect
        onCancelSelection();

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

    function onLayoutVerticalChanged(): void {
        nodes.update((nodeList: FlowNode[]) => {
            const isVertical: boolean = $graphLayoutVertical;
            for (let i = 0; i < nodeList.length; i++) {
                const node: FlowNode = nodeList[i];
                node.sourcePosition = getSourcePosition(isVertical);
                node.targetPosition = getTargetPosition(isVertical);
            }
            return nodeList;
        });
    }

    // TODO - https://github.com/xyflow/xyflow/issues/3900
    let domNode: HTMLDivElement;
    // TODO - https://github.com/xyflow/xyflow/issues/3900
    function onCreateNode(): void {
        const view: Viewport = get(viewport);
        const zoomMultiplier: number = 1 / view.zoom;
        const centerX = -view.x * zoomMultiplier + (domNode.clientWidth * zoomMultiplier) / 2;
        const centerY = -view.y * zoomMultiplier + (domNode.clientHeight * zoomMultiplier) / 2;

        console.log(view);
        console.log($nodes);
        const newNode: Node = <Node>{
            type: NODE_TYPE_DIALOGUE,
            parent: focusedRowView.id,
            isSystemCreated: false,
            positionX: centerX,
            positionY: centerY,
        };
        nodeCreate(newNode, isLoading);
    }

    function onDeleteNode(): void {
        onBeforeDelete({ nodes: nodesSelected, edges: edgesSelected });
    }

    function onCancelSelection(): void {
        // TODO - is this really it?
        nodes.update((nodeList: FlowNode[]) => {
            for (let i = 0; i < nodeList.length; i++) nodeList[i].selected = false;
            return nodeList;
        });
        edges.update((edgeList: FlowEdge[]) => {
            for (let i = 0; i < edgeList.length; i++) edgeList[i].selected = false;
            return edgeList;
        });
    }

    interface CustomElkNode extends ElkNode {
        data: NodeData;
    }

    async function onLayout(): Promise<void> {
        let flowNodes: FlowNode[] = $nodes;
        if (flowNodes.length === 0) return;
        const flowEdges: FlowEdge[] = $edges;
        const isVertical: boolean = $graphLayoutVertical;
        const graphOptions = {
            'elk.algorithm': 'layered',
            'elk.layered.spacing.nodeNodeBetweenLayers': '100',
            'elk.spacing.nodeNode': '80',
            'elk.direction': isVertical ? 'DOWN' : 'RIGHT',
        };
        const elkNodes: ElkNode[] = [];
        for (let i = 0; i < flowNodes.length; i++) {
            const node: FlowNode = flowNodes[i];
            elkNodes.push({
                id: node.id,
                width: node.computed.width,
                height: node.computed.height,
            });
        }
        const elkEdges: ElkExtendedEdge[] = [];
        for (let i = 0; i < flowEdges.length; i++) {
            const edge: FlowEdge = flowEdges[i];
            elkEdges.push({
                id: edge.id,
                sources: [edge.source],
                targets: [edge.target],
            });
        }
        // Order is preserved
        const laidOut: ElkNode = await ELK_LAYOUT.layout({
            id: 'root',
            layoutOptions: graphOptions,
            children: elkNodes,
            edges: elkEdges,
        });

        // Time has passed, grab a fresh copy of the nodes
        flowNodes = $nodes;
        const newPositions = [];
        const oldPositions = [];
        if (elkNodes.length !== laidOut.children.length) return;
        for (let i = 0; i < laidOut.children.length; i++) {
            const elkNode: CustomElkNode = <CustomElkNode>laidOut.children[i];
            const flowNode: FlowNode = flowNodes[i];
            if (elkNode.id !== flowNode.id) return; // Nodes have gone out of sync during the layout
            newPositions.push(<Node>{
                id: flowNode.data.rowView.id,
                positionX: elkNode.x,
                positionY: elkNode.y,
            });
            oldPositions.push(<Node>{
                id: flowNode.data.rowView.id,
                positionX: flowNode.position.x,
                positionY: flowNode.position.y,
            });
        }

        // Update layout
        await db.updateRows(TABLE_ID_NODES, newPositions);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'actor deletion',
                isLoading.wrapFunction(async () => {
                    await db.updateRows(TABLE_ID_NODES, oldPositions);
                }),
                isLoading.wrapFunction(async () => {
                    await db.updateRows(TABLE_ID_NODES, newPositions);
                }),
            ),
        );
    }

    function nodeCreateLocal(remote: IDbRowView<Node>): FlowNode {
        const isVertical: boolean = $graphLayoutVertical;
        const remoteNode: Node = get(remote);
        const isNotRoot: boolean = remoteNode.type !== NODE_TYPE_ROOT;
        return <FlowNode>{
            id: remote.id.toString(),
            type: remoteNode.type,
            position: { x: remoteNode.positionX, y: remoteNode.positionY },
            data: <NodeData>{
                rowView: remote,
                localizations: localizationViews,
                selected: false,
            },
            selected: false,
            deletable: isNotRoot,
            selectable: isNotRoot,
            targetPosition: isVertical ? Position.Top : Position.Left,
            sourcePosition: isVertical ? Position.Bottom : Position.Right,
        };
    }

    function nodeUpdateLocal(local: FlowNode, remoteView: IDbRowView<Node>): void {
        const remote: Node = get(remoteView);
        // Skip equality
        if (nodeIsEqual(local, remote)) return;
        console.log(`Update local node`);
        const isNotRoot: boolean = remote.type !== NODE_TYPE_ROOT;
        local.type = remote.type;
        local.deletable = isNotRoot;
        local.selectable = isNotRoot;
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
                selected: false,
            },
            selected: false,
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
    function updateSelection(): void {
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

    function onNodesChanged(nodes: FlowNode[]): void {
        let changed: boolean = false;
        for (let i = 0; i < nodes.length; i++) {
            const flowNode: FlowNode = nodes[i];
            if (flowNode.selected !== flowNode.data.selected) {
                flowNode.data.selected = flowNode.selected;
                changed = true;
            }
        }
        if (changed) {
            updateSelection();
        }
    }
    function onEdgesChanged(edges: FlowEdge[]): void {
        let changed: boolean = false;
        for (let i = 0; i < edges.length; i++) {
            const flowEdge: FlowEdge = edges[i];
            if (flowEdge.selected !== flowEdge.data.selected) {
                flowEdge.data.selected = flowEdge.selected;
                changed = true;
            }
        }
        if (changed) {
            updateSelection();
        }
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
        nodeUnsubscriber = nodes.subscribe(onNodesChanged);
        edgeUnsubscriber = edges.subscribe(onEdgesChanged);
    }

    function clearGraph(): void {
        // Order matters, we don't want subscription updates when the tables clear
        isConversationInitialized = false;
        if (nodeUnsubscriber) nodeUnsubscriber();
        if (edgeUnsubscriber) edgeUnsubscriber();
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
        // TODO - REMOVE ONCE THEY FIX domNode or height/width stores in useStore()
        domNode = <HTMLDivElement>document.getElementsByClassName('svelte-flow')[0];
        // TODO - REMOVE ONCE THEY FIX domNode or height/width stores in useStore()

        unsubscriberLayoutVertical = graphLayoutVertical.subscribe(onLayoutVerticalChanged);
        unsubscriberFocus = focusManager.subscribe(onFocusChanged);
        addEventListener(EVENT_SHUTDOWN, onShutdown);
    });
    onDestroy(() => {
        if (unsubscriberLayoutVertical) unsubscriberLayoutVertical();
        if (unsubscriberFocus) unsubscriberFocus();
        removeEventListener(EVENT_SHUTDOWN, onShutdown);
        clearGraph();
    });
</script>

<WidgetContainer title={focusedRowView ? $focusedRowView.name : 'Please select a conversation'}>
    <svelte:fragment slot="toolbar">
        <GridToolbar
            disabled={!isConversationInitialized}
            elementsSelected={nodesSelected.length + edgesSelected.length}
            on:cancel={onCancelSelection}
        >
            <svelte:fragment slot="overflow">
                <OverflowMenuItem text="Perform Layout" on:click={onLayout} />
                <OverflowMenuItem
                    text="Set {$graphLayoutVertical ? 'Horizontal' : 'Vertical'}"
                    on:click={() => {
                        $graphLayoutVertical = !$graphLayoutVertical;
                    }}
                />
            </svelte:fragment>

            <span slot="create">
                <Button
                    size="small"
                    on:click={onCreateNode}
                    disabled={$isLoading || !isConversationInitialized}
                    icon={$isLoading ? InlineLoading : undefined}>Add Node</Button
                >
            </span>
            <span slot="delete-restore">
                <Button icon={TrashCan} disabled={$isLoading} on:click={onDeleteNode}>Delete</Button
                >
            </span>
        </GridToolbar>
    </svelte:fragment>
    <svelte:fragment slot="widget">
        <SvelteFlowProvider>
            <SvelteFlow
                id="conversation-editor"
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
            >
                <Controls />
                <Background gap={snapGrid} variant={BackgroundVariant.Dots} />
                <MiniMap />
            </SvelteFlow>
        </SvelteFlowProvider>
    </svelte:fragment>
</WidgetContainer>
