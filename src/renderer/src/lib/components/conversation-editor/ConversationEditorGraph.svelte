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
        Position,
        useStore,
        type FitViewOptions,
    } from '@xyflow/svelte';
    import { onDestroy, onMount, setContext, tick } from 'svelte';
    import type { ActionUnsubscriber } from '@lib/utility/action';
    import {
        focusManager,
        type Focus,
        type FocusRequest,
        FOCUS_REPLACE,
        FOCUS_MODE_REPLACE,
        type FocusRequests,
        type FocusPayloadGraphElement,
    } from '@lib/stores/app/focus';
    import {
        type Edge,
        type Node,
        type Localization,
        type Conversation,
    } from '@common/common-schema';
    import { db } from '@lib/api/db/db';
    import { createFilter } from '@lib/api/db/db-filter';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import {
        conversationIdToViewportKey,
        isConversationViewportKey,
    } from '@lib/constants/local-storage';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import NodeDialogue from './NodeDialogue.svelte';
    import { Button, InlineLoading, NumberInput, OverflowMenuItem } from 'carbon-components-svelte';
    import {
        EVENT_DOCK_SELECTION_REQUEST,
        EVENT_SHUTDOWN,
        type DockSelectionRequest,
        EVENT_DOCK_SELECTION_CHANGED,
        type DockSelectionChanged,
        EVENT_COPY,
        EVENT_PASTE,
    } from '@lib/constants/events';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import type { EdgeData, NodeData } from '@lib/graph/graph-data';
    import { ASC } from '@lib/api/db/db-filter-interface';
    import { TableWatcher } from '@lib/stores/utility/table-watcher';
    import { nodesDelete } from '@lib/crud/node-d';
    import { edgeCreate } from '@lib/crud/edge-c';
    import { nodesUpdate } from '@lib/crud/node-u';
    import { nodesCreate } from '@lib/crud/node-c';
    import NodeRoot from './NodeRoot.svelte';
    import WidgetContainer from '../common/WidgetContainer.svelte';
    import GridToolbar from '../common/GridToolbar.svelte';
    import ElkWorker from '@lib/vendor/elkjs/elk-worker.min.js?worker';
    import {
        type ELK,
        type ElkExtendedEdge,
        type ElkLabel,
        type ElkNode,
        type ElkPort,
    } from '@lib/vendor/elkjs/elk-api.js';
    import EdgeDefault from './EdgeDefault.svelte';
    import { conversationUpdate } from '@lib/crud/conversation-u';
    import { updateNodeInternals } from '@lib/graph/graph-temporary';
    import { GRAPH_CONTEXT } from '@lib/graph/graph-constants';
    import type { GraphContext } from '@lib/graph/graph-context';
    import { LAYOUT_ID_CONVERSATION_EDITOR } from '@lib/constants/default-layout';
    import {
        EDGE_TYPE_DEFAULT,
        TABLE_CONVERSATIONS,
        TABLE_EDGES,
        TABLE_LOCALIZATIONS,
        TABLE_NODES,
        type EdgeTypeName,
        NODE_TYPE_DIALOGUE,
        NODE_TYPE_ROOT,
        type NodeTypeName,
        EDGE_TYPE_HIDDEN,
    } from '@common/common-types';
    import EdgeHidden from './EdgeHidden.svelte';
    import { TAG_HEIGHT, TAG_WIDTH } from '@lib/constants/graph';
    import { defaultRoutine } from '@lib/stores/settings/settings';
    import { actorsTable } from '@lib/tables/actors';
    import SelectItemCustom from '../carbon/SelectItemCustom.svelte';
    import SelectCustom from '../carbon/SelectCustom.svelte';
    import { DB_DEFAULT_ACTOR_ID } from '@common/common-db-initialization';
    import { findDockable, type DockableInfo } from '../app/Dockable.svelte';
    import { createCopyData, pasteCopyData } from '@lib/graph/graph-copy-paste';

    type LocalObject = FlowNode | FlowEdge;
    type RemoteObject = Node | Edge;
    interface GraphFunctions {
        localObjectStore: Writable<LocalObject[]>;
        creatorLocal: (remoteObject: IDbRowView<RemoteObject>) => LocalObject;
        updatorLocal: (localObject: LocalObject, remoteObject: IDbRowView<RemoteObject>) => boolean;
    }

    const NEW_NODE_SPACING: number = 350;
    const SHADOW_NODE_SUFFIX: string = '_';
    const MIN_ZOOM: number = 0.1;
    const DEFAULT_VIEWPORT: Viewport = <Viewport>{ x: 0, y: 0, zoom: 1 };
    const DEFAULT_EDGE_TYPE: EdgeTypeName = EDGE_TYPE_DEFAULT.name;
    const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = <DefaultEdgeOptions>{
        type: <ConnectionLineType>DEFAULT_EDGE_TYPE,
    };
    const NODE_FOCUS_REQUEST: FocusRequest = <FocusRequest>{
        tableType: TABLE_NODES,
        type: FOCUS_REPLACE,
    };
    const EDGE_FOCUS_REQUEST: FocusRequest = <FocusRequest>{
        tableType: TABLE_EDGES,
        type: FOCUS_REPLACE,
    };
    const GRAPH_FOCUS_PAYLOAD: FocusPayloadGraphElement = <FocusPayloadGraphElement>{
        requestIsFromGraph: true,
    };
    // @ts-expect-error: I don't know how else to import this
    const ELK_LAYOUT: ELK = new ELK({
        workerFactory: () => {
            return new ElkWorker();
        },
    });

    const { width, height, domNode, updateNodeDimensions, nodeLookup, fitView } = useStore();
    // TODO - https://github.com/xyflow/xyflow/issues/3910
    // const updateNodeInternals: (id: string | string[]) => void = useUpdateNodeInternals();
    const viewport: Writable<Viewport> = writable(<Viewport>{ ...DEFAULT_VIEWPORT });
    const nodes: Writable<FlowNode[]> = writable([]);
    const edges: Writable<FlowEdge[]> = writable([]);
    const snapGrid: SnapGrid = [30, 30];
    const nodeTypes = {};
    nodeTypes[NODE_TYPE_ROOT.name] = NodeRoot;
    nodeTypes[NODE_TYPE_DIALOGUE.name] = NodeDialogue;
    const edgeTypes = {};
    edgeTypes[EDGE_TYPE_DEFAULT.name] = EdgeDefault;
    edgeTypes[EDGE_TYPE_HIDDEN.name] = EdgeHidden;

    let actorToAddId: number = DB_DEFAULT_ACTOR_ID;
    let nodesToAddCount: number = 1;
    let currentLayoutAuto: boolean = false;
    let currentLayoutVertical: boolean = false;
    let unsubscriberFocus: ActionUnsubscriber;
    let tableWatcherConversation: TableWatcher<Conversation>;
    let tableWatcherNode: TableWatcher<Node>;
    let tableWatcherEdge: TableWatcher<Edge>;
    let unsubscriberConversationTable: Unsubscriber;
    let unsubscriberNodeTable: Unsubscriber;
    let unsubscriberEdgeTable: Unsubscriber;
    let unsubscriberLocalizationTable: Unsubscriber;
    let nodeUnsubscriber: Unsubscriber;
    let edgeUnsubscriber: Unsubscriber;
    let conversationUnsubscriber: Unsubscriber;
    let conversationViews: IDbTableView<Conversation>;
    let nodeViews: IDbTableView<Node>;
    let edgeViews: IDbTableView<Edge>;
    let localizationViews: IDbTableView<Localization>;
    let isLoading: IsLoadingStore = new IsLoadingStore();
    let isConversationInitialized: boolean = false;
    let focusedConversationId: number | undefined = undefined;
    let focusedRowView: IDbRowView<Conversation> = undefined;
    $: {
        if (focusedRowView && (focusedRowView.isDisposed || $focusedRowView.is_deleted)) {
            blur();
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
        if (focusedConversationId) {
            const storedString: string = localStorage.getItem(
                conversationIdToViewportKey(focusedConversationId),
            );
            if (storedString) viewport.set(JSON.parse(storedString));
        }
    }

    function saveViewport(): void {
        if (focusedConversationId) {
            localStorage.setItem(
                conversationIdToViewportKey(focusedConversationId),
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

    async function setAutoLayout(isAuto: boolean): Promise<void> {
        const conversation: Conversation = get(focusedRowView);
        if (conversation.is_layout_auto === isAuto) return;

        // Update conversation
        const oldConversation: Conversation = <Conversation>{
            id: conversation.id,
            is_layout_auto: conversation.is_layout_auto,
        };
        const newConversation: Conversation = <Conversation>{
            id: conversation.id,
            is_layout_auto: isAuto,
        };
        await conversationUpdate(newConversation, oldConversation, isLoading);
    }

    async function setVerticalLayout(isVertical: boolean): Promise<void> {
        const conversation: Conversation = get(focusedRowView);
        if (conversation.is_layout_vertical === isVertical) return;

        // Update conversation
        const oldConversation: Conversation = <Conversation>{
            id: conversation.id,
            is_layout_vertical: conversation.is_layout_vertical,
        };
        const newConversation: Conversation = <Conversation>{
            id: conversation.id,
            is_layout_vertical: isVertical,
        };
        await conversationUpdate(newConversation, oldConversation, isLoading);

        // Update layout
        void onLayout();
    }

    function isValidConnection(edge: FlowEdge | Connection): boolean {
        // Ensure no self-connection
        if (edge.source === edge.target) return false;

        // Ensure no duplicate edges
        const flowEdges: FlowEdge[] = get(edges);
        for (let i = 0; i < flowEdges.length; i++) {
            const flowEdge: FlowEdge = flowEdges[i];
            if (flowEdge.source === edge.source && flowEdge.target === edge.target) {
                return false;
            }
        }
        return true;
    }

    function onEdgeCreate(connection: Connection): FlowEdge {
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
            blur();
            throw error;
        });

        // Wait for an update from the backend to really create the edge
        return undefined;
    }

    function onDeleteSelection(): void {
        void onBeforeDelete({ nodes: nodesSelected, edges: edgesSelected });
    }

    async function onDelete(nodes: Node[], edges: Edge[]): Promise<void> {
        nodesDelete(nodes, edges, isLoading).catch((error) => {
            blur();
            throw error;
        });
    }

    async function onBeforeDelete(params: {
        nodes: FlowNode[];
        edges: FlowEdge[];
    }): Promise<boolean> {
        // Grab nodes and edges to delete, this must happen before deselect since we're reusing the
        // same lists passed in
        const nodes: Node[] = params.nodes.map(
            (flowNode: FlowNode) => <Node>{ ...get((<NodeData>flowNode.data).rowView) },
        );
        const edges: Edge[] = params.edges.map(
            (flowEdge: FlowEdge) => <Edge>{ ...get((<EdgeData>flowEdge.data).rowView) },
        );

        // Delete
        void onDelete(nodes, edges);

        // Deselect
        onSelectExclusive();

        // Wait for an update from the backend to really delete anything
        return false;
    }

    function onNodeDragStop(
        event: CustomEvent<{ event: MouseEvent; targetNode: FlowNode; nodes: FlowNode[] }>,
    ): void {
        const flowNodes: FlowNode[] = event.detail.nodes;
        const oldNodes: Node[] = [];
        const newNodes: Node[] = [];
        for (let i = 0; i < flowNodes.length; i++) {
            const flowNode: FlowNode = flowNodes[i];
            const originalNode: Node = get((<NodeData>flowNode.data).rowView);
            // Skip nodes that haven't moved
            if (
                flowNode.position.x === originalNode.position_x &&
                flowNode.position.y === originalNode.position_y
            ) {
                continue;
            }
            // Skip nodes that are not draggable
            if (!flowNode.draggable) {
                // TODO - https://github.com/xyflow/xyflow/issues/3911
                continue;
            }
            oldNodes.push(<Node>{ ...originalNode });
            const newNode = <Node>{ ...originalNode };
            newNode.position_x = flowNode.position.x;
            newNode.position_y = flowNode.position.y;
            newNodes.push(newNode);
        }
        // If there were no updates, exit
        if (newNodes.length === 0) return;
        nodesUpdate(oldNodes, newNodes, isLoading, true).catch((error) => {
            blur();
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
            NODE_FOCUS_REQUEST.focus.set((<NodeData>eventNodes[i].data).rowView.id, <Focus>{
                rowId: (<NodeData>eventNodes[i].data).rowView.id,
                payload: GRAPH_FOCUS_PAYLOAD,
            });
        }
        for (let i = 0; i < eventEdges.length; i++) {
            EDGE_FOCUS_REQUEST.focus.set((<EdgeData>eventEdges[i].data).rowView.id, <Focus>{
                rowId: (<EdgeData>eventEdges[i].data).rowView.id,
                payload: GRAPH_FOCUS_PAYLOAD,
            });
        }
        focusManager.focus(<FocusRequests>{
            type: FOCUS_MODE_REPLACE,
            requests: [NODE_FOCUS_REQUEST, EDGE_FOCUS_REQUEST],
        });
    }

    function onCreateNode(type: NodeTypeName): void {
        const view: Viewport = get(viewport);
        const zoomMultiplier: number = 1 / view.zoom;
        const centerX = -view.x * zoomMultiplier + (get(width) * zoomMultiplier) / 2;
        const centerY = -view.y * zoomMultiplier + (get(height) * zoomMultiplier) / 2;

        const newNodes: Node[] = [];
        for (let i = 0; i < nodesToAddCount; i++) {
            newNodes.push(<Node>{
                type: type,
                actor: actorToAddId,
                parent: focusedRowView.id,
                is_system_created: false,
                code_override: get(defaultRoutine),
                position_x: currentLayoutVertical ? centerX + NEW_NODE_SPACING * i : centerX,
                position_y: currentLayoutVertical ? centerY : centerY + NEW_NODE_SPACING * i,
            });
        }
        void nodesCreate(newNodes, isLoading);
    }

    function onSelectExclusive(nodeSet?: Set<FlowNode>, edgeSet?: Set<FlowEdge>): void {
        nodes.update((nodeList: FlowNode[]) => {
            for (let i = 0; i < nodeList.length; i++) {
                const node: FlowNode = nodeList[i];
                node.selected = nodeSet && nodeSet.has(node);
            }
            return nodeList;
        });
        edges.update((edgeList: FlowEdge[]) => {
            for (let i = 0; i < edgeList.length; i++) {
                const edge: FlowEdge = edgeList[i];
                edge.selected = edgeSet && edgeSet.has(edge);
            }
            return edgeList;
        });
    }

    interface CustomElkNode extends ElkNode {
        data: NodeData;
    }

    function portIdFromSourceAndTarget(source: string, target: string): string {
        return source + '.' + target;
    }

    function addToNodeToPortMap<T>(map: Map<string, T[]>, nodeId: string, port: T): void {
        let list: T[] = map.get(nodeId);
        if (!list) {
            list = [];
            map.set(nodeId, list);
        }
        list.push(port);
    }

    async function onLayout(): Promise<void> {
        // Don't layout if we're not doing auto-layout
        if (!focusedRowView || !get(focusedRowView).is_layout_auto) return;

        // Grab current nodes and edges, return if there are none
        let flowNodes: FlowNode[] = get(nodes);
        if (flowNodes.length === 0) return;
        let flowEdges: FlowEdge[] = get(edges);
        let shadowNodes: FlowNode[] = [];
        let allNodes: FlowNode[] = [...flowNodes];

        // Create all elk edges and remember all connected nodes
        const isVertical: boolean = get(focusedRowView).is_layout_vertical;
        const connectedNodeIds: Set<string> = new Set();
        const elkEdges: ElkExtendedEdge[] = [];
        const nodeIdToPorts: Map<string, ElkPort[]> = new Map();
        const sourcePortSide: string = isVertical ? 'SOUTH' : 'EAST';
        const targetPortSide: string = isVertical ? 'NORTH' : 'WEST';

        for (let i = 0; i < flowEdges.length; i++) {
            const edge: FlowEdge = flowEdges[i];

            // Hidden edges have shadow nodes
            const isHidden: boolean = edge.type === EDGE_TYPE_HIDDEN.name;

            // Record connected nodes
            connectedNodeIds.add(edge.source);
            let shadowNodeId: string;
            if (isHidden) {
                // Create shadow node for layout of hidden edges
                shadowNodeId = edge.source + '_' + edge.target + SHADOW_NODE_SUFFIX;
                shadowNodes.push(<FlowNode>{
                    id: shadowNodeId,
                    computed: {
                        width: TAG_WIDTH,
                        height: TAG_HEIGHT,
                    },
                });
                connectedNodeIds.add(shadowNodeId);
            } else {
                connectedNodeIds.add(edge.target);
            }

            // Record ports
            const sourcePort: string = portIdFromSourceAndTarget(edge.source, edge.target);
            addToNodeToPortMap(nodeIdToPorts, edge.source, <ElkPort>{
                id: sourcePort,
                layoutOptions: {
                    'elk.port.side': sourcePortSide,
                },
            });
            const edgeTarget: string = isHidden ? shadowNodeId : edge.target;
            const targetPort: string = portIdFromSourceAndTarget(edgeTarget, edge.source);
            addToNodeToPortMap(nodeIdToPorts, edgeTarget, <ElkPort>{
                id: targetPort,
                layoutOptions: {
                    'elk.port.side': targetPortSide,
                },
            });

            elkEdges.push({
                id: edge.id,
                sources: [sourcePort],
                targets: [targetPort],
                labels: <ElkLabel[]>[{ text: ' ' }],
            });
        }
        allNodes.push(...shadowNodes);

        // Create elk edges to be laid out
        const elkNodes: ElkNode[] = [];
        let computedWidth: number = 100;
        let computedHeight: number = 100;
        for (let i = 0; i < allNodes.length; i++) {
            const node: FlowNode = allNodes[i];
            // Disconnected nodes don't get layout, and remain draggable
            let width: number = 0;
            let height: number = 0;
            if (!connectedNodeIds.has(node.id)) {
                // Node size is 0 to keep from affecting layout
                node.draggable = true;
            } else {
                node.draggable = false;
                if (node.computed.height === undefined || node.computed.height === undefined) {
                    await updateNodeInternals([node.id], get(domNode), updateNodeDimensions);
                    await onLayout();
                    return;
                }
                width = node.computed.width;
                height = node.computed.height;
            }

            // Generate port list
            elkNodes.push({
                id: node.id,
                width: width,
                height: height,
                ports: nodeIdToPorts.get(node.id) ?? [],
                layoutOptions: {
                    'elk.portConstraints': 'FIXED_SIDE',
                },
            });
            computedWidth = Math.max(node.computed.width, computedWidth);
            computedHeight = Math.max(node.computed.height, computedHeight);
        }

        // Update draggability
        nodes.set(flowNodes);

        // Perform layout (order is preserved)
        const graphOptions = {
            'elk.algorithm': 'layered',
            'elk.layered.spacing.nodeNodeBetweenLayers': isVertical
                ? `${computedHeight / 5}`
                : `${computedWidth / 5}`,
            'elk.spacing.nodeNode': isVertical ? `${computedWidth / 3}` : `${computedHeight / 3}`,
            'elk.direction': isVertical ? 'DOWN' : 'RIGHT',
            'elk.edgeLabels.placement:': 'CENTER',
            'elk.spacing.edgeLabel': '0',
            'elk.spacing.edgeEdge': '40',
            'elk.spacing.edgeNode': '40',
            'elk.layered.spacing.edgeEdgeBetweenLayers': '40',
            'elk.layered.spacing.edgeNodeBetweenLayers': '40',
            // 'elk.layered.edgeLabels.centerLabelPlacementStrategy': 'SPACE_EFFICIENT_LAYER',
        };
        const laidOut: ElkNode = await ELK_LAYOUT.layout({
            id: 'root',
            layoutOptions: graphOptions,
            children: elkNodes,
            edges: elkEdges,
        });
        if (!get(focusedRowView).is_layout_auto) return;

        // Time has passed, grab a fresh copy of the nodes
        flowNodes = get(nodes);
        flowEdges = get(edges);

        // Add in shadow nodes created for hidden edges
        allNodes = [...flowNodes, ...shadowNodes];

        // Store positions for undo/redo
        const newPositions = [];
        const oldPositions = [];
        for (let i = 0; i < laidOut.children.length; i++) {
            // Ensure flow node exists since the await
            if (i >= allNodes.length) {
                await onLayout();
                return;
            }
            const elkNode: CustomElkNode = <CustomElkNode>laidOut.children[i];
            const flowNode: FlowNode = allNodes[i];
            // Skip updating disconnected nodes
            if (!connectedNodeIds.has(flowNode.id)) continue;
            // Skip updating shadow nodes
            if (flowNode.id.endsWith(SHADOW_NODE_SUFFIX)) continue;
            // Nodes have gone out of sync during the layout
            if (elkNode.id !== flowNode.id) {
                await onLayout();
                return;
            }
            // Skip nodes that are already in the same position
            if (elkNode.x === flowNode.position.x && elkNode.y === flowNode.position.y) continue;
            newPositions.push(<Node>{
                id: (<NodeData>flowNode.data).rowView.id,
                position_x: elkNode.x,
                position_y: elkNode.y,
            });
            oldPositions.push(<Node>{
                id: (<NodeData>flowNode.data).rowView.id,
                position_x: flowNode.position.x,
                position_y: flowNode.position.y,
            });
        }

        // Update layout
        if (newPositions.length !== 0) {
            try {
                await nodesUpdate(oldPositions, newPositions, isLoading, true);
            } catch (error) {
                blur();
                throw error;
            }
            if (!get(focusedRowView).is_layout_auto) return;
        }

        // Time has passed, grab a fresh copy of the nodes
        flowNodes = get(nodes);
        flowEdges = get(edges);

        // Draw the edges
        for (let i = 0; i < laidOut.edges.length; i++) {
            const flowEdge: FlowEdge = flowEdges[i];
            const elkEdge: ElkExtendedEdge = laidOut.edges[i];
            // Edges have gone out of sync during the layout
            if (elkEdge.id !== flowEdge.id) {
                await onLayout();
                return;
            }
            // The object must be replaced to trigger a refresh
            (<EdgeData>flowEdge.data) = { ...(<EdgeData>flowEdge.data), elkEdge: elkEdge };
        }
        edges.set(flowEdges);
    }

    function nodeCreateLocal(remote: IDbRowView<Node>): FlowNode {
        const isVertical: boolean = get(focusedRowView).is_layout_vertical;
        const remoteNode: Node = get(remote);
        const isNotRoot: boolean = remoteNode.type !== NODE_TYPE_ROOT.name;
        return <FlowNode>{
            id: remote.id.toString(),
            type: remoteNode.type,
            position: { x: remoteNode.position_x, y: remoteNode.position_y },
            data: <NodeData>{
                rowView: remote,
                localizations: localizationViews,
                selected: false,
            },
            selected: false,
            deletable: isNotRoot,
            selectable: isNotRoot,
            draggable: true,
            targetPosition: getTargetPosition(isVertical),
            sourcePosition: getSourcePosition(isVertical),
        };
    }

    function nodeUpdateLocal(local: FlowNode, remoteView: IDbRowView<Node>): boolean {
        const remote: Node = get(remoteView);
        // Skip equality
        if (
            local.type === remote.type &&
            local.position.x === remote.position_x &&
            local.position.y === remote.position_y
        )
            return false;
        const isNotRoot: boolean = remote.type !== NODE_TYPE_ROOT.name;
        local.type = remote.type;
        local.deletable = isNotRoot;
        local.selectable = isNotRoot;
        if (isNodeDragging()) return true;
        local.position.x = remote.position_x;
        local.position.y = remote.position_y;
        return true;
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

    function edgeUpdateLocal(local: FlowEdge, remoteView: IDbRowView<Edge>): boolean {
        const remote: Edge = get(remoteView);
        // Skip equality
        if (
            local.type === remote.type &&
            local.source === remote.source.toString() &&
            local.target === remote.target.toString()
        )
            return false;
        local.type = remote.type;
        local.source = remote.source.toString();
        local.target = remote.target.toString();
        return true;
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
        let wasCreationOrDeletion: boolean = false;
        let wasUpdate: boolean = false;
        for (; l < localObjects.length || r < remoteObjects.length; ) {
            const localObject: LocalObject = l < localObjects.length ? localObjects[l] : undefined;
            const remoteObject: IDbRowView<RemoteObject> =
                r < remoteObjects.length ? remoteObjects[r] : undefined;

            // Compare
            const localId: number = localObject ? parseInt(localObject.id) : Infinity;
            const remoteId: number = remoteObject ? remoteObject.id : Infinity;
            if (localId === remoteId) {
                // Update Local (if not equal)
                wasUpdate = graphFunctions.updatorLocal(localObject, remoteObject) || wasUpdate;
                newObjects.push(localObject);
                l++;
                r++;
            } else if (localId < remoteId) {
                // Delete Local
                // Simply don't add to list
                l++;
                wasCreationOrDeletion = true;
            } else {
                // remoteNode.id < localId
                // Create Local
                newObjects.push(graphFunctions.creatorLocal(remoteObject));
                r++;
                wasCreationOrDeletion = true;
            }
        }

        // Update the local store
        graphFunctions.localObjectStore.set(newObjects);

        // Update layout if edges were created or deleted
        if ((wasCreationOrDeletion || wasUpdate) && !isForNodes && isConversationInitialized) {
            void onLayout();
        }
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

    function onConversationTableChanged(): void {
        // Blur if conversation was deleted
        const conversations: IDbRowView<Conversation>[] = get(conversationViews);
        if (conversations.length !== 1) {
            void changeFocus(true);
            return;
        }
        const conversationView: IDbRowView<Conversation> = conversations[0];
        const conversation: Conversation = get(conversationView);
        if (conversation.is_deleted) {
            void changeFocus(true);
            return;
        }
        // Make sure focused row view is set
        if (focusedRowView !== conversationView) {
            focusedRowView = conversationView;
        }
    }

    async function onConversationModified(conversation: Conversation): Promise<void> {
        // Skip undefined conversations
        if (!conversation) return;

        // Is layout required
        let isLayoutRequired: boolean = false;

        // Handle vertical layout changes
        if (conversation.is_layout_vertical !== currentLayoutVertical) {
            const nodeIds: string[] = [];
            nodes.update((nodeList: FlowNode[]) => {
                for (let i = 0; i < nodeList.length; i++) {
                    const node: FlowNode = nodeList[i];
                    node.sourcePosition = getSourcePosition(conversation.is_layout_vertical);
                    node.targetPosition = getTargetPosition(conversation.is_layout_vertical);
                    nodeIds.push(node.id);
                }
                return nodeList;
            });
            await updateNodeInternals(nodeIds, get(domNode), updateNodeDimensions);
        }

        // Handle auto-layout changes
        if (conversation.is_layout_auto !== currentLayoutAuto) {
            if (conversation.is_layout_auto) {
                // Perform layout
                isLayoutRequired = true;
            } else {
                // Destroy all the generated edges
                const flowEdges: FlowEdge[] = get(edges);
                for (let i = 0; i < flowEdges.length; i++) {
                    const flowEdge: FlowEdge = flowEdges[i];
                    (<EdgeData>flowEdge.data).elkEdge = undefined;
                    // Have to replace the object to trigger update
                    (<EdgeData>flowEdge.data) = { ...(<EdgeData>flowEdge.data) };
                }
                edges.set(flowEdges);

                // Enable movement
                const flowNodes: FlowNode[] = get(nodes);
                for (let i = 0; i < flowNodes.length; i++) {
                    flowNodes[i].draggable = true;
                }
                nodes.set(flowNodes);
            }
        }

        // Layout if necessary
        // i.e. layout was enabled, or vertical/horizontal changed during auto-layout
        if (
            isLayoutRequired ||
            (conversation.is_layout_auto &&
                conversation.is_layout_vertical !== currentLayoutVertical)
        ) {
            await onLayout();
        }

        // Update state
        currentLayoutAuto = conversation.is_layout_auto;
        currentLayoutVertical = conversation.is_layout_vertical;
    }

    function blur(): void {
        void changeFocus(true);
    }

    function onFocusChanged(): void {
        // Find focused conversations
        const focusMap: readonly Map<number, Focus>[] = focusManager.get();

        // Conversation focus
        let newFocusedConversation: number | undefined = undefined;
        const conversationFocus: Map<number, Focus> = focusMap[TABLE_CONVERSATIONS.id];
        if (conversationFocus.size === 1) {
            newFocusedConversation = conversationFocus.values().next().value.rowId;

            // Request dock selection
            dispatchEvent(
                new CustomEvent(EVENT_DOCK_SELECTION_REQUEST, {
                    detail: <DockSelectionRequest>{ layoutId: LAYOUT_ID_CONVERSATION_EDITOR },
                }),
            );
        }

        // Node focus
        const nodeMap: Map<number, Focus> = focusMap[TABLE_NODES.id];
        let newFocusedNodes: number[] = [];
        if (nodeMap.size !== 0) {
            for (const focus of nodeMap.values()) {
                const payload: FocusPayloadGraphElement = <FocusPayloadGraphElement>focus.payload;
                // If there's no payload or it's a request from the graph, ignore it
                if (!payload || payload.requestIsFromGraph) continue;
                newFocusedNodes.push(focus.rowId);
            }
        }
        void changeFocus(false, newFocusedConversation, newFocusedNodes);
    }

    async function changeFocus(
        isBlur: boolean,
        newFocusedConversation?: number,
        newFocusedNodes?: number[], // we automatically fit these to view
    ): Promise<void> {
        // Make sure conversation is set correctly
        if (!isBlur) {
            if (newFocusedConversation === undefined) {
                newFocusedConversation = focusedConversationId;
            }
        } else if (newFocusedConversation !== undefined) {
            throw new Error('New conversation focus set during a blur operation');
        }

        // Skip if already focused
        if (focusedConversationId !== newFocusedConversation) {
            // Save viewport
            saveViewport();

            // Clear Graph
            clearGraph();

            // Set new focus
            focusedConversationId = newFocusedConversation;

            // Nothing new to focus (blur)
            if (focusedConversationId !== undefined) {
                // Load viewport
                loadViewport();

                // Load graph
                try {
                    await loadGraph();
                } catch (error) {
                    void changeFocus(true);
                    throw new Error(error);
                }

                // Create watchers
                tableWatcherConversation = new TableWatcher(conversationViews);
                tableWatcherNode = new TableWatcher(nodeViews);
                tableWatcherEdge = new TableWatcher(edgeViews);

                // Setup and run reconciliation
                tableWatcherConversation.subscribe(onConversationTableChanged);
                tableWatcherNode.subscribe(() => runReconciliation(true));
                tableWatcherEdge.subscribe(() => runReconciliation(false));

                // Catch up
                await tick();

                // Bail early if we've already blurred or the conversation is otherwise not there
                if (!focusedRowView) {
                    void changeFocus(true);
                    return;
                }

                // Update conversation auto-layout / vertical settings
                const focusedConversation: Conversation = get(focusedRowView);
                currentLayoutAuto = !focusedConversation.is_layout_auto; // To trigger a change
                currentLayoutVertical = !focusedConversation.is_layout_vertical; // To trigger a change
                isConversationInitialized = true; // this allows layout to happen

                // Duplicate call here to allow for the awaiting
                await onConversationModified(focusedConversation);
                conversationUnsubscriber = focusedRowView.subscribe(onConversationModified);
            } else if (!blur) {
                throw new Error('Conversation focus set to undefined during a non-blur');
            }
        }

        // Handle node/edge zoom
        if (focusedRowView && newFocusedNodes.length > 0) {
            const lookup = get(nodeLookup);
            const focusedFlowNodes: FlowNode[] = [];
            const selectedFlowNodes: Set<FlowNode> = new Set();
            for (const focusedNode of newFocusedNodes) {
                const flowNode: FlowNode = <FlowNode>lookup.get(focusedNode.toString());
                focusedFlowNodes.push(flowNode);
                selectedFlowNodes.add(flowNode);
            }
            if (focusedFlowNodes.length > 0) {
                // Select Node
                onSelectExclusive(selectedFlowNodes);

                // Focus on Node
                fitView(<FitViewOptions>{
                    duration: 1000,
                    nodes: focusedFlowNodes,
                });
            }
        }
    }

    async function loadGraph(): Promise<void> {
        return new Promise((resolve, reject) => {
            conversationViews = db.fetchTable(
                TABLE_CONVERSATIONS,
                createFilter<Conversation>()
                    .where()
                    .column('id')
                    .eq(focusedConversationId)
                    .endWhere()
                    .build(),
            );
            nodeViews = db.fetchTable<Node>(
                TABLE_NODES,
                createFilter<Node>()
                    .where()
                    .column('parent')
                    .eq(focusedConversationId)
                    .endWhere()
                    .orderBy('id', ASC)
                    .build(),
            );
            edgeViews = db.fetchTable<Edge>(
                TABLE_EDGES,
                createFilter<Edge>()
                    .where()
                    .column('parent')
                    .eq(focusedConversationId)
                    .endWhere()
                    .orderBy('id', ASC)
                    .build(),
            );
            localizationViews = db.fetchTable<Localization>(
                TABLE_LOCALIZATIONS,
                createFilter()
                    .where()
                    .column('parent')
                    .eq(focusedConversationId)
                    .endWhere()
                    .build(),
            );

            // Monitor tables until all are loaded and the resolve promise
            const onChange: () => void = () => {
                if (
                    conversationViews?.isInitialized &&
                    nodeViews?.isInitialized &&
                    edgeViews?.isInitialized &&
                    localizationViews?.isInitialized
                ) {
                    // Unsubscribe all temporary change handlers
                    unsubscriberConversationTable();
                    unsubscriberNodeTable();
                    unsubscriberEdgeTable();
                    unsubscriberLocalizationTable();

                    // Make sure the conversation exists
                    if (get(conversationViews).length !== 1) {
                        reject('Failed to load conversation');
                    }
                    resolve();
                }
            };
            unsubscriberConversationTable = conversationViews.subscribe(onChange);
            unsubscriberNodeTable = nodeViews.subscribe(onChange);
            unsubscriberEdgeTable = edgeViews.subscribe(onChange);
            unsubscriberLocalizationTable = localizationViews.subscribe(onChange);

            // Subscribe to nodes, edges, and localization changes
            nodeUnsubscriber = nodes.subscribe(onNodesChanged);
            edgeUnsubscriber = edges.subscribe(onEdgesChanged);
        });
    }

    function clearGraph(): void {
        // Order matters, we don't want subscription updates when the tables clear
        isConversationInitialized = false;
        // TODO
        nodesSelected.length = 0;
        edgesSelected.length = 0;
        // TODO
        currentLayoutAuto = false;
        currentLayoutVertical = false;
        focusedRowView = undefined;
        if (nodeUnsubscriber) nodeUnsubscriber();
        if (edgeUnsubscriber) edgeUnsubscriber();
        if (conversationUnsubscriber) conversationUnsubscriber();
        if (unsubscriberConversationTable) unsubscriberConversationTable();
        if (tableWatcherConversation) tableWatcherConversation.dispose();
        if (tableWatcherNode) tableWatcherNode.dispose();
        if (tableWatcherEdge) tableWatcherEdge.dispose();
        if (unsubscriberNodeTable) unsubscriberNodeTable();
        if (unsubscriberEdgeTable) unsubscriberEdgeTable();
        if (unsubscriberLocalizationTable) unsubscriberLocalizationTable();
        if (conversationViews) db.releaseTable(conversationViews);
        if (edgeViews) db.releaseTable(edgeViews);
        if (nodeViews) db.releaseTable(nodeViews);
        if (localizationViews) db.releaseTable(localizationViews);
        if (get(nodes).length !== 0) nodes.set([]);
        if (get(edges).length !== 0) edges.set([]);
        viewport.set(<Viewport>{ ...DEFAULT_VIEWPORT });
    }

    setContext(GRAPH_CONTEXT, <GraphContext>{
        onDelete: onDelete,
    });

    function isEditorVisible(): boolean {
        const dockable: DockableInfo = findDockable(LAYOUT_ID_CONVERSATION_EDITOR);
        return dockable && dockable.currentContainer && dockable.currentContainer.visible;
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

    const onDockFocusChanged: (e: CustomEvent<DockSelectionChanged>) => void = (
        e: CustomEvent<DockSelectionChanged>,
    ) => {
        if (e.detail.layoutId !== LAYOUT_ID_CONVERSATION_EDITOR) {
            if (!isEditorVisible() && (nodesSelected.length > 0 || edgesSelected.length > 0)) {
                onSelectExclusive();
            }
        }
    };

    const onCopy: (e: ClipboardEvent) => Promise<void> = async () => {
        if (document.activeElement !== document.body) return;
        if (nodesSelected.length === 0 && edgesSelected.length === 0) return;
        void createCopyData(isLoading, nodesSelected, edgesSelected, $viewport);
    };

    const onPaste: (e: ClipboardEvent) => void = () => {
        if (document.activeElement !== document.body) return;
        if (!isConversationInitialized) return;
        void pasteCopyData(isLoading, focusedConversationId, $viewport);
    };

    onMount(() => {
        unsubscriberFocus = focusManager.subscribe(onFocusChanged);
        addEventListener(EVENT_SHUTDOWN, onShutdown);
        addEventListener(EVENT_DOCK_SELECTION_CHANGED, onDockFocusChanged);
        addEventListener(EVENT_COPY, onCopy);
        addEventListener(EVENT_PASTE, onPaste);
    });
    onDestroy(() => {
        if (unsubscriberFocus) unsubscriberFocus();
        removeEventListener(EVENT_SHUTDOWN, onShutdown);
        removeEventListener(EVENT_DOCK_SELECTION_CHANGED, onDockFocusChanged);
        removeEventListener(EVENT_COPY, onCopy);
        removeEventListener(EVENT_PASTE, onPaste);
        clearGraph();
    });
</script>

<WidgetContainer title={focusedRowView ? $focusedRowView.name : 'Please select a conversation'}>
    <svelte:fragment slot="toolbar">
        <GridToolbar
            disabled={!isConversationInitialized}
            elementsSelected={nodesSelected.length + edgesSelected.length}
            on:cancel={() => onSelectExclusive()}
        >
            <svelte:fragment slot="overflow">
                <OverflowMenuItem
                    text="{!focusedRowView || $focusedRowView.is_layout_auto
                        ? 'Disable'
                        : 'Enable'} Layout"
                    on:click={() => setAutoLayout(!$focusedRowView.is_layout_auto)}
                />
                <OverflowMenuItem
                    text="Layout {!focusedRowView || $focusedRowView.is_layout_vertical
                        ? 'Horizontal'
                        : 'Vertical'}"
                    on:click={() => {
                        void setVerticalLayout(!$focusedRowView.is_layout_vertical);
                    }}
                />
                <OverflowMenuItem
                    danger
                    disabled={nodesSelected.length === 0 && edgesSelected.length === 0}
                    text="Delete Selection"
                    on:click={onDeleteSelection}
                />
            </svelte:fragment>

            <span slot="create">
                <span style="display:flex;">
                    <NumberInput
                        size="sm"
                        hideLabel
                        min={1}
                        max={10}
                        disabled={$isLoading || !isConversationInitialized}
                        bind:value={nodesToAddCount}
                    />
                    <SelectCustom
                        size="sm"
                        disabled={$isLoading || !isConversationInitialized}
                        hideLabel
                        bind:selected={actorToAddId}
                    >
                        {#each $actorsTable as actor (actor.id)}
                            <SelectItemCustom
                                rowView={actor}
                                columnNameText={'name'}
                                columnNameValue={'id'}
                            />
                        {/each}
                    </SelectCustom>
                    <Button
                        size="small"
                        on:click={() => onCreateNode(NODE_TYPE_DIALOGUE.name)}
                        disabled={$isLoading || !isConversationInitialized}
                        icon={$isLoading ? InlineLoading : undefined}>Add Node</Button
                    >
                </span>
            </span>
        </GridToolbar>
    </svelte:fragment>
    <svelte:fragment slot="widget">
        <SvelteFlow
            id="conversation-editor"
            {viewport}
            {nodes}
            {edges}
            {snapGrid}
            {nodeTypes}
            {edgeTypes}
            {isValidConnection}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            connectionLineType={!focusedRowView || $focusedRowView.is_layout_auto
                ? ConnectionLineType.Step
                : ConnectionLineType.Bezier}
            minZoom={MIN_ZOOM}
            proOptions={{ hideAttribution: true }}
            onedgecreate={onEdgeCreate}
            onbeforedelete={onBeforeDelete}
            on:selectionchange={onSelectionChanged}
            on:nodedragstop={onNodeDragStop}
            connectionRadius={50}
            zoomOnDoubleClick={false}
        >
            <Controls showLock={false} />
            <Background gap={snapGrid} variant={BackgroundVariant.Dots} />
            <MiniMap />
        </SvelteFlow>
    </svelte:fragment>
</WidgetContainer>
