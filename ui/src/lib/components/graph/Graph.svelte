<script lang="ts">
    /**
     * Main graph editor component for conversation visualization.
     *
     * Ported from GameScriptElectron ConversationEditorGraph.svelte.
     * Uses IDbRowView/IDbTableView pattern for reactive data binding.
     *
     * Migrated to Svelte 5 runes and @xyflow/svelte 1.x API.
     */
    import {
        SvelteFlow,
        Controls,
        ControlButton,
        Background,
        MiniMap,
        useSvelteFlow,
        type SnapGrid,
        BackgroundVariant,
        type Node as FlowNode,
        type Edge as FlowEdge,
        type Viewport,
        type DefaultEdgeOptions,
        ConnectionLineType,
        type Connection,
        Position,
        type FitViewOptions,
        type InternalNode,
    } from '@xyflow/svelte';
    import '@xyflow/svelte/dist/style.css';
    import { onDestroy, onMount, setContext, tick, untrack } from 'svelte';
    import type {
        Edge as DbEdge,
        Node as DbNode,
        Localization,
        Conversation,
    } from '@gamescript/shared';

    // Database imports
    import {
        query,
        TABLE_CONVERSATIONS,
        TABLE_NODES,
        TABLE_EDGES,
        TABLE_LOCALIZATIONS,
        type IDbTableView,
        type IDbRowView,
    } from '$lib/db';

    // Components
    import NodeRoot from './nodes/NodeRoot.svelte';
    import NodeDialogue from './nodes/NodeDialogue.svelte';
    import EdgeDefault from './edges/EdgeDefault.svelte';
    import EdgeHidden from './edges/EdgeHidden.svelte';

    // Types and utilities
    import {
        type NodeData,
        type EdgeData,
        NODE_TYPES,
        EDGE_TYPES,
        GRAPH_CONTEXT,
        type GraphContext,
        TAG_WIDTH,
        TAG_HEIGHT,
        NODE_DIMENSIONS,
        type NodeTypeName,
        type GraphNode,
        type GraphEdge,
    } from './utils/types.js';
    import { createUpdateNodeInternals } from './utils/node-internals.js';

    // ELK layout engine
    import ELK from 'elkjs/lib/elk.bundled.js';
    import type {
        ElkNode,
        ElkExtendedEdge,
        ElkPort,
        ElkLabel,
    } from 'elkjs/lib/elk-api';

    // Extended ELK node with our data
    interface CustomElkNode extends ElkNode {
        data?: NodeData;
    }

    // Stores and focus
    import {
        focusManager,
        type Focus,
        type FocusRequest,
        FOCUS_REPLACE,
        FOCUS_MODE_REPLACE,
        FOCUS_SOURCE_GRAPH,
        type FocusRequests,
        type FocusPayloadGraphElement,
        type ActionUnsubscriber,
    } from '$lib/stores/focus.js';

    // CRUD operations
    import { nodes as nodescrud, edges as edgescrud, conversations, createCopyData, pasteCopyData, common, deleteGraphSelection } from '$lib/crud';

    // Tables
    import { actorsTable } from '$lib/tables/actors.js';
    import { codeTemplateTableView, getCodeTemplate } from '$lib/tables';
    import type { CodeTemplateType } from '@gamescript/shared';

    // Notifications
    import { toastError } from '$lib/stores/notifications.js';

    // Layout preferences
    import { graphMinimapVisible } from '$lib/stores/layout-defaults.js';

    // Constants
    import {
        conversationIdToViewportKey,
        isConversationViewportKey,
    } from '$lib/constants/local-storage.js';
    import { LAYOUT_ID_CONVERSATION_EDITOR } from '$lib/constants/default-layout.js';
    import {
        EVENT_DOCK_SELECTION_CHANGED,
        requestDockSelection,
        type DockSelectionChanged,
    } from '$lib/constants/events.js';

    // Dockable
    import { findDockable } from '$lib/components/app/Dockable.svelte';

    // Common components
    import { Button, Dropdown, ActionMenu, type ActionMenuItem } from '$lib/components/common';

    // Graph-specific components
    import GraphSettingsModal from './GraphSettingsModal.svelte';
    import GraphStatusBar from './GraphStatusBar.svelte';

    // Icons
    import IconSettings from '$lib/components/icons/IconSettings.svelte';

    // ============================================================================
    // Types
    // ============================================================================

    type LocalObject = FlowNode | FlowEdge;
    type RemoteObject = DbNode | DbEdge;

    interface GraphFunctions {
        getLocal: () => LocalObject[];
        setLocal: (items: LocalObject[]) => void;
        creatorLocal: (remoteObject: IDbRowView<RemoteObject>) => LocalObject;
        /** Returns new object if changed, null if no update needed */
        updatorLocal: (localObject: LocalObject, remoteObject: IDbRowView<RemoteObject>) => LocalObject | null;
    }

    // ============================================================================
    // Constants
    // ============================================================================

    const NEW_NODE_SPACING: number = 350;
    const SHADOW_NODE_SUFFIX: string = '_';
    const MIN_ZOOM: number = 0.1;
    const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
    const DEFAULT_EDGE_TYPE: string = EDGE_TYPES.DEFAULT;
    const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = {
        type: DEFAULT_EDGE_TYPE,
    };
    const snapGrid: SnapGrid = [30, 30];

    const GRAPH_FOCUS_PAYLOAD: FocusPayloadGraphElement = {
        requestIsFromGraph: true,
    };

    // Action menu item types
    const MENU_ITEM_TOGGLE = 'toggle' as const;
    const MENU_ITEM_BUTTON = 'button' as const;
    const MENU_ITEM_SEPARATOR = 'separator' as const;

    // View menu action IDs
    const VIEW_MENU_AUTO_LAYOUT = 'auto-layout';
    const VIEW_MENU_VERTICAL = 'vertical';
    const VIEW_MENU_CLEAR_SELECTION = 'clear-selection';
    const VIEW_MENU_DELETE_SELECTION = 'delete-selection';

    // ELK layout engine instance
    const elk = new ELK();

    // SvelteFlow hooks - initialized in onMount after SvelteFlowProvider is ready
    let updateNodeInternals: ((ids: string | string[]) => Promise<void>) | undefined;
    let svelteFlowApi: ReturnType<typeof useSvelteFlow> | undefined;

    // Node and edge type maps - cast needed for Svelte 5 component types
    const nodeTypes = {
        [NODE_TYPES.ROOT]: NodeRoot,
        [NODE_TYPES.DIALOGUE]: NodeDialogue,
    } as any;

    const edgeTypes = {
        [EDGE_TYPES.DEFAULT]: EdgeDefault,
        [EDGE_TYPES.HIDDEN]: EdgeHidden,
    } as any;

    // ============================================================================
    // Svelte 5 State (using $state.raw for nodes/edges as per @xyflow/svelte 1.x)
    // ============================================================================

    // Svelte Flow state - must use $state.raw for immutable arrays
    let nodes = $state.raw<GraphNode[]>([]);
    let edges = $state.raw<GraphEdge[]>([]);
    let viewport = $state<Viewport>({ ...DEFAULT_VIEWPORT });

    // UI state
    let actorToAddId = $state<number>(1); // Default to Narrator (DB_DEFAULT_ACTOR_ID)
    let nodesToAddCount = $state<number>(1);
    let currentLayoutAuto = $state<boolean>(false);
    let currentLayoutVertical = $state<boolean>(false);
    let isLoading = $state<boolean>(false);
    let isConversationInitialized = $state<boolean>(false);
    let graphContainerEl: HTMLDivElement | undefined = $state();
    let showSettingsModal = $state<boolean>(false);

    // Focus state
    let unsubscriberFocus: ActionUnsubscriber;
    let focusedRowView = $state<IDbRowView<Conversation> | undefined>(undefined);
    // Derive focusedConversationId from focusedRowView - single source of truth
    let focusedConversationId = $derived(focusedRowView?.id ?? undefined);
    // Track in-flight load to handle race conditions explicitly
    let loadingConversationId: number | undefined = undefined;

    // Table views
    let conversationViews = $state<IDbTableView<Conversation> | undefined>(undefined);
    let nodeViews = $state<IDbTableView<DbNode> | undefined>(undefined);
    let edgeViews = $state<IDbTableView<DbEdge> | undefined>(undefined);
    let localizationViews = $state<IDbTableView<Localization> | undefined>(undefined);

    // Selection tracking
    let nodesSelected = $state<FlowNode[]>([]);
    let edgesSelected = $state<FlowEdge[]>([]);
    let selectedNodeIds = new Set<string>();
    let selectedEdgeIds = new Set<string>();

    // ============================================================================
    // Derived State
    // ============================================================================

    // Actor dropdown options
    let actorOptions = $derived(actorsTable.rows.map(actorRowView => {
        return { value: actorRowView.id, label: actorRowView.data?.name ?? '' };
    }));

    // Code template for file operations
    let codeTemplateView = $derived(getCodeTemplate(codeTemplateTableView.rows));
    let codeTemplate: CodeTemplateType = $derived((codeTemplateView?.data.value as CodeTemplateType) ?? 'unity');

    // Focused conversation data
    let focusedConversation: Conversation | undefined = $derived(
        focusedRowView ? (focusedRowView as IDbRowView<Conversation>).data : undefined
    );

    // Total selection count
    let totalSelected = $derived(nodesSelected.length + edgesSelected.length);

    // Action menu items for the "View" dropdown
    let viewMenuItems: ActionMenuItem[] = $derived([
        {
            type: MENU_ITEM_TOGGLE,
            id: VIEW_MENU_AUTO_LAYOUT,
            label: 'Auto Layout',
            checked: focusedConversation?.is_layout_auto ?? false,
            disabled: isLoading,
        },
        {
            type: MENU_ITEM_TOGGLE,
            id: VIEW_MENU_VERTICAL,
            label: 'Vertical Orientation',
            checked: focusedConversation?.is_layout_vertical ?? false,
            disabled: isLoading,
        },
        { type: MENU_ITEM_SEPARATOR },
        {
            type: MENU_ITEM_BUTTON,
            id: VIEW_MENU_CLEAR_SELECTION,
            label: 'Clear Selection',
            disabled: totalSelected === 0,
        },
        {
            type: MENU_ITEM_BUTTON,
            id: VIEW_MENU_DELETE_SELECTION,
            label: `Delete Selection (${totalSelected})`,
            danger: true,
            disabled: isLoading || totalSelected === 0,
        },
    ]);

    // ============================================================================
    // Semantic Change Signals
    // ============================================================================
    // These derived signals define exactly what changes matter for each subsystem.
    // Effects react to these signals, not raw reactive state.

    // Conversation deletion/validity signal
    let conversationDeletedSignal = $derived(
        focusedRowView ? (focusedRowView.isDisposed || focusedRowView.data?.is_deleted) : false
    );

    // Conversation layout settings signal - triggers layout reconfiguration
    let conversationLayoutSignal = $derived(
        focusedRowView && isConversationInitialized
            ? `${focusedRowView.data.is_layout_auto}:${focusedRowView.data.is_layout_vertical}`
            : null
    );

    // Conversation table membership signal - triggers table change handler
    let conversationTableSignal = $derived(
        conversationViews
            ? conversationViews.rows.map(r => `${r.id}:${r.data?.is_deleted}`).join(',')
            : null
    );

    // Node membership and geometry signal - triggers node reconciliation
    // Includes: id, type, position (affects graph structure and layout)
    let nodeStructureSignal = $derived(
        nodeViews && isConversationInitialized
            ? nodeViews.rows.map(r => {
                const n = r.data;
                return `${r.id}:${n.type}:${n.position_x}:${n.position_y}`;
            }).join('|')
            : null
    );

    // Edge topology signal - triggers edge reconciliation
    // Includes: id, source, target, type (affects graph connectivity)
    let edgeTopologySignal = $derived(
        edgeViews && isConversationInitialized
            ? edgeViews.rows.map(r => {
                const e = r.data;
                return `${r.id}:${e.source}:${e.target}:${e.type}`;
            }).join('|')
            : null
    );

    // ============================================================================
    // Effects (react to semantic signals)
    // ============================================================================

    // React to conversation deletion
    $effect(() => {
        if (conversationDeletedSignal) {
            blur();
        }
    });

    // React to conversation layout settings changes
    $effect(() => {
        if (!conversationLayoutSignal || !focusedRowView) return;
        const rowView = focusedRowView;
        untrack(() => void onConversationModified(rowView.data));
    });

    // React to conversation table membership changes
    $effect(() => {
        if (conversationTableSignal === null) return;
        untrack(() => onConversationTableChanged());
    });

    // React to node structure changes - run reconciliation
    $effect(() => {
        if (nodeStructureSignal === null) return;
        untrack(() => runReconciliation(true));
    });

    // React to edge topology changes - run reconciliation
    $effect(() => {
        if (edgeTopologySignal === null) return;
        untrack(() => runReconciliation(false));
    });

    // ============================================================================
    // Graph Functions for Reconciliation
    // ============================================================================

    const graphFunctionsNodes: GraphFunctions = {
        getLocal: () => nodes,
        setLocal: (items) => { nodes = items as GraphNode[]; },
        creatorLocal: nodeCreateLocal as (remoteObject: IDbRowView<RemoteObject>) => LocalObject,
        updatorLocal: nodeUpdateLocal as (localObject: LocalObject, remoteObject: IDbRowView<RemoteObject>) => LocalObject | null,
    };

    const graphFunctionsEdges: GraphFunctions = {
        getLocal: () => edges,
        setLocal: (items) => { edges = items as GraphEdge[]; },
        creatorLocal: edgeCreateLocal as (remoteObject: IDbRowView<RemoteObject>) => LocalObject,
        updatorLocal: edgeUpdateLocal as (localObject: LocalObject, remoteObject: IDbRowView<RemoteObject>) => LocalObject | null,
    };

    // ============================================================================
    // Viewport Persistence
    // ============================================================================

    function loadViewport(): void {
        if (focusedConversationId) {
            const storedString: string | null = localStorage.getItem(
                conversationIdToViewportKey(focusedConversationId),
            );
            if (storedString) {
                viewport = JSON.parse(storedString);
            }
        }
    }

    function saveViewport(): void {
        if (focusedConversationId) {
            localStorage.setItem(
                conversationIdToViewportKey(focusedConversationId),
                JSON.stringify(viewport),
            );
        }
    }

    // ============================================================================
    // Layout Helpers
    // ============================================================================

    function getSourcePosition(isVertical: boolean): Position {
        return isVertical ? Position.Bottom : Position.Right;
    }

    function getTargetPosition(isVertical: boolean): Position {
        return isVertical ? Position.Top : Position.Left;
    }

    function portIdFromSourceAndTarget(source: string, target: string): string {
        return source + '.' + target;
    }

    function addToNodeToPortMap<T>(map: Map<string, T[]>, nodeId: string, port: T): void {
        let list: T[] | undefined = map.get(nodeId);
        if (!list) {
            list = [];
            map.set(nodeId, list);
        }
        list.push(port);
    }

    // ============================================================================
    // Layout Management
    // ============================================================================

    async function setAutoLayout(isAuto: boolean): Promise<void> {
        if (!focusedRowView) return;
        const conversation: Conversation = focusedRowView.data;
        if (conversation.is_layout_auto === isAuto) return;

        isLoading = true;
        try {
            const oldConversation = { ...conversation };
            const newConversation = { ...conversation, is_layout_auto: isAuto };
            await conversations.updateOne(oldConversation, newConversation);
        } finally {
            isLoading = false;
        }
    }

    async function setVerticalLayout(isVertical: boolean): Promise<void> {
        if (!focusedRowView) return;
        const conversation: Conversation = focusedRowView.data;
        if (conversation.is_layout_vertical === isVertical) return;

        isLoading = true;
        try {
            const oldConversation = { ...conversation };
            const newConversation = { ...conversation, is_layout_vertical: isVertical };
            await conversations.updateOne(oldConversation, newConversation);
        } finally {
            isLoading = false;
        }
    }

    // Layout coalescing - multiple layout requests collapse into one per frame
    let layoutScheduled = false;
    // Layout version counter - incremented on each layout request, used to detect stale results
    let layoutVersion = 0;

    function scheduleLayout(): void {
        if (layoutScheduled) return;
        layoutScheduled = true;
        layoutVersion++;

        const currentVersion = layoutVersion;
        requestAnimationFrame(() => {
            layoutScheduled = false;
            void processLayout(currentVersion);
        });
    }

    async function processLayout(version: number): Promise<void> {
        if (!focusedRowView || !focusedRowView.data.is_layout_auto) return;
        // Check if a newer layout was requested - discard stale computation
        if (version !== layoutVersion) return;

        let flowNodes: GraphNode[] = [...nodes];
        if (flowNodes.length === 0) return;

        let flowEdges: GraphEdge[] = [...edges];
        let shadowNodes: FlowNode[] = [];
        let allNodes: FlowNode[] = [...flowNodes];

        const isVertical: boolean = focusedRowView.data.is_layout_vertical;
        const connectedNodeIds: Set<string> = new Set();
        const elkEdges: ElkExtendedEdge[] = [];
        const nodeIdToPorts: Map<string, ElkPort[]> = new Map();
        const sourcePortSide: string = isVertical ? 'SOUTH' : 'EAST';
        const targetPortSide: string = isVertical ? 'NORTH' : 'WEST';

        for (let i = 0; i < flowEdges.length; i++) {
            const edge: FlowEdge = flowEdges[i];
            const isHidden: boolean = edge.type === EDGE_TYPES.HIDDEN;

            connectedNodeIds.add(edge.source);
            let shadowNodeId: string;
            if (isHidden) {
                shadowNodeId = edge.source + '_' + edge.target + SHADOW_NODE_SUFFIX;
                shadowNodes.push({
                    id: shadowNodeId,
                    position: { x: 0, y: 0 },
                    data: {},
                    measured: {
                        width: TAG_WIDTH,
                        height: TAG_HEIGHT,
                    },
                } as FlowNode);
                connectedNodeIds.add(shadowNodeId);
            } else {
                connectedNodeIds.add(edge.target);
            }

            const sourcePort: string = portIdFromSourceAndTarget(edge.source, edge.target);
            addToNodeToPortMap(nodeIdToPorts, edge.source, {
                id: sourcePort,
                layoutOptions: {
                    'elk.port.side': sourcePortSide,
                },
            } as ElkPort);
            const edgeTarget: string = isHidden ? shadowNodeId! : edge.target;
            const targetPort: string = portIdFromSourceAndTarget(edgeTarget, edge.source);
            addToNodeToPortMap(nodeIdToPorts, edgeTarget, {
                id: targetPort,
                layoutOptions: {
                    'elk.port.side': targetPortSide,
                },
            } as ElkPort);

            elkEdges.push({
                id: edge.id,
                sources: [sourcePort],
                targets: [targetPort],
                labels: [{ text: ' ' }] as ElkLabel[],
            });
        }
        allNodes.push(...shadowNodes);

        const elkNodes: ElkNode[] = [];
        // Use fixed dimensions for layout - eliminates race conditions with DOM measurement
        const defaultDimensions = NODE_DIMENSIONS[NODE_TYPES.DIALOGUE];
        let computedWidth: number = defaultDimensions.width;
        let computedHeight: number = defaultDimensions.height;

        for (let i = 0; i < allNodes.length; i++) {
            const node = allNodes[i];
            const isConnected = connectedNodeIds.has(node.id);
            node.draggable = !isConnected;

            // Get fixed dimensions based on node type
            const nodeType = node.type as NodeTypeName;
            const dimensions = NODE_DIMENSIONS[nodeType] ?? defaultDimensions;
            const width = isConnected ? dimensions.width : 0;
            const height = isConnected ? dimensions.height : 0;

            elkNodes.push({
                id: node.id,
                width: width,
                height: height,
                ports: nodeIdToPorts.get(node.id) ?? [],
                layoutOptions: {
                    'elk.portConstraints': 'FIXED_SIDE',
                },
            });
        }

        // Update draggability - create new array to trigger reactivity
        nodes = flowNodes.map(n => ({ ...n }));

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
        };
        const laidOut: ElkNode = await elk.layout({
            id: 'root',
            layoutOptions: graphOptions,
            children: elkNodes,
            edges: elkEdges,
        });
        // Check if layout was superseded during async operation
        if (version !== layoutVersion) return;
        if (!focusedRowView?.data.is_layout_auto) return;

        flowNodes = [...nodes];
        flowEdges = [...edges];

        // Build maps for ELK results by ID - ELK does not guarantee stable ordering
        const elkNodeById = new Map<string, CustomElkNode>(
            (laidOut.children ?? []).map(n => [n.id, n as CustomElkNode])
        );
        const elkEdgeById = new Map<string, ElkExtendedEdge>(
            (laidOut.edges ?? []).map(e => [e.id, e as ElkExtendedEdge])
        );

        const newPositions: DbNode[] = [];
        const oldPositions: DbNode[] = [];
        for (const flowNode of flowNodes) {
            if (!connectedNodeIds.has(flowNode.id)) continue;
            const elkNode = elkNodeById.get(flowNode.id);
            if (!elkNode) continue;
            if (elkNode.x === flowNode.position.x && elkNode.y === flowNode.position.y) continue;
            newPositions.push({
                id: (flowNode.data as NodeData).rowView.id,
                position_x: elkNode.x!,
                position_y: elkNode.y!,
            } as DbNode);
            oldPositions.push({
                id: (flowNode.data as NodeData).rowView.id,
                position_x: flowNode.position.x,
                position_y: flowNode.position.y,
            } as DbNode);
        }

        if (newPositions.length !== 0) {
            try {
                await nodescrud.updateMany(oldPositions, newPositions, true);
            } catch (error) {
                toastError('Layout update failed', error);
                blur();
                return;
            }
            // Check if layout was superseded during async operation
            if (version !== layoutVersion) return;
            if (!focusedRowView?.data.is_layout_auto) return;
        }

        flowEdges = [...edges];

        // Update edges with ELK data - must create new objects
        const updatedEdges = flowEdges.map((flowEdge) => {
            const elkEdge = elkEdgeById.get(flowEdge.id);
            if (!elkEdge) return flowEdge;
            return {
                ...flowEdge,
                data: { ...(flowEdge.data as EdgeData), elkEdge: elkEdge },
            };
        });
        edges = updatedEdges;
    }

    // ============================================================================
    // Connection Validation
    // ============================================================================

    function isValidConnection(edge: FlowEdge | Connection): boolean {
        if (edge.source === edge.target) return false;
        return !edges.some((e) => e.source === edge.source && e.target === edge.target);
    }

    // ============================================================================
    // Edge Creation (onbeforeconnect in @xyflow/svelte 1.x)
    // ============================================================================

    function onBeforeConnect(connection: Connection): FlowEdge | Connection | false {
        if (!focusedConversationId) return false;

        const source: number = parseInt(connection.source, 10);
        const target: number = parseInt(connection.target, 10);

        if (isNaN(source) || isNaN(target)) {
            toastError(`Invalid source ${connection.source} or target ${connection.target}`);
            return false;
        }

        edgescrud.create({
            conversationId: focusedConversationId,
            source,
            target,
            type: 'default',
        }).catch((error: unknown) => {
            toastError('Failed to create edge', error);
            blur();
        });

        // Return false to block default edge creation - we handle it via DB
        return false;
    }

    // ============================================================================
    // View Menu Handler
    // ============================================================================

    function onViewMenuSelect(itemId: string): void {
        switch (itemId) {
            case VIEW_MENU_AUTO_LAYOUT:
                void setAutoLayout(!focusedConversation?.is_layout_auto);
                break;
            case VIEW_MENU_VERTICAL:
                void setVerticalLayout(!focusedConversation?.is_layout_vertical);
                break;
            case VIEW_MENU_CLEAR_SELECTION:
                onSelectExclusive();
                break;
            case VIEW_MENU_DELETE_SELECTION:
                onDeleteSelection();
                break;
        }
    }

    // ============================================================================
    // Deletion
    // ============================================================================

    function onDeleteSelection(): void {
        void onBeforeDelete({ nodes: nodesSelected, edges: edgesSelected });
    }

    async function onDelete(nodesToDelete: DbNode[], edgesToDelete: DbEdge[]): Promise<void> {
        isLoading = true;
        try {
            const filteredNodes = nodesToDelete.filter((n) => n.type !== NODE_TYPES.ROOT);
            await deleteGraphSelection(filteredNodes, edgesToDelete, codeTemplate);
        } catch (error) {
            toastError('Failed to delete', error);
            blur();
        } finally {
            isLoading = false;
        }
    }

    async function onBeforeDelete(params: {
        nodes: FlowNode[];
        edges: FlowEdge[];
    }): Promise<boolean> {
        const nodesToDelete: DbNode[] = params.nodes.map((flowNode: FlowNode) => ({
            ...(flowNode.data as NodeData).rowView.getValue(),
        }));
        const edgesToDelete: DbEdge[] = params.edges.map((flowEdge: FlowEdge) => ({
            ...(flowEdge.data as EdgeData).rowView.getValue(),
        }));

        void onDelete(nodesToDelete, edgesToDelete);
        onSelectExclusive();

        return false;
    }

    // ============================================================================
    // Copy/Paste
    // ============================================================================

    async function onCopy(): Promise<void> {
        if (document.activeElement !== document.body) return;
        if (nodesSelected.length === 0 && edgesSelected.length === 0) return;

        await createCopyData(nodesSelected, edgesSelected, viewport);
    }

    async function onPaste(): Promise<void> {
        if (document.activeElement !== document.body) return;
        if (!isConversationInitialized || !focusedConversationId) return;

        isLoading = true;
        try {
            await pasteCopyData(focusedConversationId, viewport);
        } catch (error) {
            toastError('Failed to paste', error);
        } finally {
            isLoading = false;
        }
    }

    function handleCopy(_event: ClipboardEvent): void {
        void onCopy();
    }

    function handlePaste(_event: ClipboardEvent): void {
        void onPaste();
    }

    // ============================================================================
    // Node Drag (callback prop in @xyflow/svelte 1.x)
    // ============================================================================

    function onNodeDragStop({
        nodes: draggedNodes,
    }: {
        targetNode: FlowNode | null;
        nodes: FlowNode[];
        event: MouseEvent | TouchEvent;
    }): void {
        const oldNodes: DbNode[] = [];
        const newNodes: DbNode[] = [];

        for (const flowNode of draggedNodes) {
            const originalNode: DbNode = (flowNode.data as NodeData).rowView.getValue();

            if (
                flowNode.position.x === originalNode.position_x &&
                flowNode.position.y === originalNode.position_y
            ) {
                continue;
            }

            if (!flowNode.draggable) continue;

            oldNodes.push({ ...originalNode });
            newNodes.push({
                ...originalNode,
                position_x: flowNode.position.x,
                position_y: flowNode.position.y,
            });
        }

        if (newNodes.length === 0) return;

        nodescrud.updateMany(oldNodes, newNodes).catch((error: unknown) => {
            toastError('Failed to update node positions', error);
            blur();
        });
    }

    // ============================================================================
    // Selection
    // ============================================================================

    function broadcastSelection(selectedNodes: FlowNode[], selectedEdges: FlowEdge[]): void {
        const nodeFocusRequest: FocusRequest = {
            tableType: TABLE_NODES,
            type: FOCUS_REPLACE,
            focus: new Map(),
        };
        const edgeFocusRequest: FocusRequest = {
            tableType: TABLE_EDGES,
            type: FOCUS_REPLACE,
            focus: new Map(),
        };

        for (const node of selectedNodes) {
            const nodeData = node.data as NodeData;
            nodeFocusRequest.focus.set(nodeData.rowView.id, {
                rowId: nodeData.rowView.id,
                payload: GRAPH_FOCUS_PAYLOAD,
            } as Focus);
        }

        for (const edge of selectedEdges) {
            const edgeData = edge.data as EdgeData;
            edgeFocusRequest.focus.set(edgeData.rowView.id, {
                rowId: edgeData.rowView.id,
                payload: GRAPH_FOCUS_PAYLOAD,
            } as Focus);
        }

        focusManager.focus({
            type: FOCUS_MODE_REPLACE,
            requests: [nodeFocusRequest, edgeFocusRequest],
            source: FOCUS_SOURCE_GRAPH,
        });
    }

    function onSelectionChange(params: { nodes: FlowNode[]; edges: FlowEdge[] }): void {
        // Treat onselectionchange as a notification: "selection is now X"
        // Check if selection actually changed using cached ID sets (O(n) instead of O(n log n))
        const newNodes = params.nodes;
        const newEdges = params.edges;

        // Quick size check first
        if (newNodes.length === selectedNodeIds.size && newEdges.length === selectedEdgeIds.size) {
            // Check if all new IDs exist in cached sets
            let unchanged = true;
            for (const node of newNodes) {
                if (!selectedNodeIds.has(node.id)) {
                    unchanged = false;
                    break;
                }
            }
            if (unchanged) {
                for (const edge of newEdges) {
                    if (!selectedEdgeIds.has(edge.id)) {
                        unchanged = false;
                        break;
                    }
                }
            }
            if (unchanged) {
                return;
            }
        }

        // Update cached ID sets
        selectedNodeIds.clear();
        for (const node of newNodes) {
            selectedNodeIds.add(node.id);
        }
        selectedEdgeIds.clear();
        for (const edge of newEdges) {
            selectedEdgeIds.add(edge.id);
        }

        nodesSelected = [...newNodes];
        edgesSelected = [...newEdges];
        broadcastSelection(newNodes, newEdges);
    }

    function onSelectExclusive(nodeIds?: Set<string>, edgeIds?: Set<string>): void {
        nodes = nodes.map(node => ({
            ...node,
            selected: nodeIds ? nodeIds.has(node.id) : false,
        }));
        edges = edges.map(edge => ({
            ...edge,
            selected: edgeIds ? edgeIds.has(edge.id) : false,
        }));
    }

    // ============================================================================
    // Node Creation
    // ============================================================================

    function onCreateNode(_type: NodeTypeName): void {
        if (!focusedConversationId || isLoading) return;

        const view: Viewport = viewport;
        const zoomMultiplier: number = 1 / view.zoom;

        const containerWidth = graphContainerEl?.clientWidth ?? 800;
        const containerHeight = graphContainerEl?.clientHeight ?? 600;

        const centerX = -view.x * zoomMultiplier + (containerWidth / 2) * zoomMultiplier;
        const centerY = -view.y * zoomMultiplier + (containerHeight / 2) * zoomMultiplier;

        isLoading = true;

        const paramsList = [];
        for (let i = 0; i < nodesToAddCount; i++) {
            paramsList.push({
                conversationId: focusedConversationId,
                actor: actorToAddId,
                position_x: currentLayoutVertical ? centerX + NEW_NODE_SPACING * i : centerX,
                position_y: currentLayoutVertical ? centerY : centerY + NEW_NODE_SPACING * i,
            });
        }

        nodescrud.createMany(paramsList)
            .catch((error) => {
                toastError('Failed to create nodes', error);
            })
            .finally(() => {
                isLoading = false;
            });
    }

    // ============================================================================
    // Local Object Creation (for Reconciliation)
    // ============================================================================

    function nodeCreateLocal(remote: IDbRowView<DbNode>): GraphNode {
        const isVertical: boolean = focusedRowView
            ? focusedRowView.getValue().is_layout_vertical
            : true;
        const remoteNode: DbNode = remote.getValue();
        const isNotRoot: boolean = remoteNode.type !== NODE_TYPES.ROOT;

        return {
            id: remote.id.toString(),
            type: remoteNode.type,
            position: { x: remoteNode.position_x, y: remoteNode.position_y },
            data: {
                rowView: remote,
                localizations: localizationViews,
                selected: false,
            } as NodeData,
            selected: false,
            deletable: isNotRoot,
            selectable: isNotRoot,
            draggable: true,
            targetPosition: getTargetPosition(isVertical),
            sourcePosition: getSourcePosition(isVertical),
        };
    }

    function nodeUpdateLocal(local: FlowNode, remoteView: IDbRowView<DbNode>): FlowNode | null {
        const remote: DbNode = remoteView.getValue();

        // No changes needed
        if (
            local.type === remote.type &&
            local.position.x === remote.position_x &&
            local.position.y === remote.position_y
        ) {
            return null;
        }

        const isNotRoot: boolean = remote.type !== NODE_TYPES.ROOT;

        // If this specific node is being dragged, update type but keep current position
        if (local.dragging) {
            return {
                ...local,
                type: remote.type,
                deletable: isNotRoot,
                selectable: isNotRoot,
            };
        }

        // Return new object with updated position
        return {
            ...local,
            type: remote.type,
            deletable: isNotRoot,
            selectable: isNotRoot,
            position: { x: remote.position_x, y: remote.position_y },
        };
    }

    function edgeCreateLocal(remote: IDbRowView<DbEdge>): GraphEdge {
        const remoteEdge: DbEdge = remote.getValue();

        return {
            id: remote.id.toString(),
            type: remoteEdge.type,
            source: remoteEdge.source.toString(),
            target: remoteEdge.target.toString(),
            data: {
                rowView: remote,
                localizations: localizationViews,
                selected: false,
            } as EdgeData,
            selected: false,
        };
    }

    function edgeUpdateLocal(local: FlowEdge, remoteView: IDbRowView<DbEdge>): FlowEdge | null {
        const remote: DbEdge = remoteView.getValue();

        // No changes needed
        if (
            local.type === remote.type &&
            local.source === remote.source.toString() &&
            local.target === remote.target.toString()
        ) {
            return null;
        }

        // Return new object with updated properties
        return {
            ...local,
            type: remote.type,
            source: remote.source.toString(),
            target: remote.target.toString(),
        };
    }

    // ============================================================================
    // Reconciliation
    // ============================================================================

    function runReconciliation(isForNodes: boolean): void {
        let graphFunctions: GraphFunctions;
        let remoteWritable: IDbTableView<RemoteObject>;

        if (isForNodes) {
            graphFunctions = graphFunctionsNodes;
            remoteWritable = nodeViews as IDbTableView<RemoteObject>;
        } else {
            graphFunctions = graphFunctionsEdges;
            remoteWritable = edgeViews as IDbTableView<RemoteObject>;
        }

        const localObjects: LocalObject[] = graphFunctions.getLocal();
        const remoteObjects: IDbRowView<RemoteObject>[] = remoteWritable.rows;

        // Build a map of local objects by ID for O(1) lookup
        const localMap = new Map<number, LocalObject>();
        for (const localObject of localObjects) {
            localMap.set(parseInt(localObject.id), localObject);
        }

        const newObjects: LocalObject[] = [];
        let wasCreationOrDeletion: boolean = false;
        let wasUpdate: boolean = false;

        // Iterate through remote objects (source of truth) in their order
        for (const remoteObject of remoteObjects) {
            const remoteId = remoteObject.id;
            const localObject = localMap.get(remoteId);

            if (localObject) {
                // Exists locally - check for updates
                const updated = graphFunctions.updatorLocal(localObject, remoteObject as any);
                if (updated !== null) {
                    wasUpdate = true;
                    newObjects.push(updated);
                } else {
                    newObjects.push(localObject);
                }
                // Remove from map to track deletions
                localMap.delete(remoteId);
            } else {
                // New remote object - create locally
                newObjects.push(graphFunctions.creatorLocal(remoteObject as any));
                wasCreationOrDeletion = true;
            }
        }

        // Any remaining items in localMap were deleted remotely
        if (localMap.size > 0) {
            wasCreationOrDeletion = true;
        }

        graphFunctions.setLocal(newObjects);

        if ((wasCreationOrDeletion || wasUpdate) && !isForNodes && isConversationInitialized) {
            scheduleLayout();
        }
    }

    // ============================================================================
    // Conversation Change Handling
    // ============================================================================

    function onConversationTableChanged(): void {
        if (!conversationViews || !conversationViews.isInitialized) return;

        const conversationRowViews = conversationViews.rows;
        if (conversationRowViews.length !== 1) {
            void changeFocus(true);
            return;
        }

        const conversationView = conversationRowViews[0];
        const conversation = conversationView.data;

        if (conversation.is_deleted) {
            void changeFocus(true);
            return;
        }

        if (focusedRowView !== conversationView) {
            focusedRowView = conversationView;
        }
    }

    async function onConversationModified(conversation: Conversation): Promise<void> {
        if (!conversation) return;

        let isLayoutRequired: boolean = false;

        if (conversation.is_layout_vertical !== currentLayoutVertical) {
            const nodeIds: string[] = [];
            nodes = nodes.map(node => {
                nodeIds.push(node.id);
                return {
                    ...node,
                    sourcePosition: getSourcePosition(conversation.is_layout_vertical),
                    targetPosition: getTargetPosition(conversation.is_layout_vertical),
                };
            });
            if (updateNodeInternals) {
                await updateNodeInternals(nodeIds);
            }
        }

        if (conversation.is_layout_auto !== currentLayoutAuto) {
            if (conversation.is_layout_auto) {
                isLayoutRequired = true;
            } else {
                edges = edges.map(flowEdge => ({
                    ...flowEdge,
                    data: { ...(flowEdge.data as EdgeData), elkEdge: undefined },
                }));

                nodes = nodes.map(node => ({
                    ...node,
                    draggable: true,
                }));
            }
        }

        if (
            isLayoutRequired ||
            (conversation.is_layout_auto &&
                conversation.is_layout_vertical !== currentLayoutVertical)
        ) {
            scheduleLayout();
        }

        currentLayoutAuto = conversation.is_layout_auto;
        currentLayoutVertical = conversation.is_layout_vertical;
    }

    // ============================================================================
    // Dock Integration
    // ============================================================================

    function isEditorVisible(): boolean {
        try {
            const dockable = findDockable(LAYOUT_ID_CONVERSATION_EDITOR);
            return Boolean(dockable?.currentContainer?.visible);
        } catch {
            return false;
        }
    }

    function onDockFocusChanged(event: Event): void {
        const customEvent = event as CustomEvent<DockSelectionChanged>;
        if (customEvent.detail.layoutId !== LAYOUT_ID_CONVERSATION_EDITOR) {
            if (!isEditorVisible() && (nodesSelected.length > 0 || edgesSelected.length > 0)) {
                onSelectExclusive();
            }
        }
    }

    // ============================================================================
    // Focus Management
    // ============================================================================

    function blur(): void {
        void changeFocus(true);
    }

    function onFocusChanged(): void {
        // Skip if this focus change originated from the graph - we already have the selection
        if (focusManager.getSource() === FOCUS_SOURCE_GRAPH) {
            return;
        }

        const focusMap: readonly Map<number, Focus>[] = focusManager.get();

        let newFocusedConversation: number | undefined = undefined;
        const conversationFocus: Map<number, Focus> = focusMap[TABLE_CONVERSATIONS.id];
        if (conversationFocus.size === 1) {
            newFocusedConversation = conversationFocus.values().next().value!.rowId;
            requestDockSelection(LAYOUT_ID_CONVERSATION_EDITOR);
        }

        const nodeMap: Map<number, Focus> = focusMap[TABLE_NODES.id];
        const newFocusedNodes: number[] = [];
        if (nodeMap.size !== 0) {
            for (const focus of nodeMap.values()) {
                const payload: FocusPayloadGraphElement | undefined = focus.payload as
                    | FocusPayloadGraphElement
                    | undefined;
                if (!payload || payload.requestIsFromGraph) continue;
                newFocusedNodes.push(focus.rowId);
            }
        }

        void changeFocus(false, newFocusedConversation, newFocusedNodes);
    }

    async function changeFocus(
        isBlur: boolean,
        newFocusedConversation?: number,
        newFocusedNodes?: number[],
    ): Promise<void> {
        if (!isBlur) {
            if (newFocusedConversation === undefined) {
                newFocusedConversation = focusedConversationId;
            }
        } else if (newFocusedConversation !== undefined) {
            throw new Error('New conversation focus set during a blur operation');
        }

        const currentId = focusedConversationId;
        if (currentId !== newFocusedConversation) {
            saveViewport();
            clearGraph();

            if (newFocusedConversation !== undefined) {
                // Track loading state for race condition handling
                loadingConversationId = newFocusedConversation;

                try {
                    await loadGraph(newFocusedConversation);
                } catch (error) {
                    toastError('Failed to load conversation', error);
                    // Check if this load is still relevant
                    if (loadingConversationId === newFocusedConversation) {
                        loadingConversationId = undefined;
                    }
                    void changeFocus(true);
                    return;
                }

                // Check if another load superseded this one
                if (loadingConversationId !== newFocusedConversation) {
                    return; // Stale load, ignore
                }
                loadingConversationId = undefined;

                // Effects will handle table watching reactively

                await tick();

                if (!focusedRowView) {
                    void changeFocus(true);
                    return;
                }

                const focusedConv = focusedRowView.data;

                currentLayoutAuto = false;
                currentLayoutVertical = false;

                // Load viewport here, after all async operations complete and right before
                // SvelteFlow renders. Loading it earlier causes the viewport to be reset
                // to DEFAULT_VIEWPORT during the async loadGraph/tick operations due to
                // Svelte 5 reactivity interactions.
                loadViewport();

                isConversationInitialized = true;

                await onConversationModified(focusedConv);
                // Effect handles focusedRowView changes reactively
            } else if (!isBlur) {
                throw new Error('Conversation focus set to undefined during a non-blur');
            }
        }

        if (focusedRowView && newFocusedNodes && newFocusedNodes.length > 0 && svelteFlowApi) {
            const focusedFlowNodes: FlowNode[] = [];
            const selectedNodeIds: Set<string> = new Set();
            for (const focusedNode of newFocusedNodes) {
                const nodeId = focusedNode.toString();
                const flowNode = nodes.find(n => n.id === nodeId);
                if (flowNode) {
                    focusedFlowNodes.push(flowNode);
                    selectedNodeIds.add(nodeId);
                }
            }
            if (focusedFlowNodes.length > 0) {
                onSelectExclusive(selectedNodeIds);

                svelteFlowApi.fitView({
                    duration: 1000,
                    nodes: focusedFlowNodes,
                } as FitViewOptions);
            }
        }
    }

    // ============================================================================
    // Graph Loading
    // ============================================================================

    async function loadGraph(conversationId: number): Promise<void> {
        // Fetch all table views
        conversationViews = common.fetchTable(
            TABLE_CONVERSATIONS,
            query<Conversation>().where('id').eq(conversationId).build(),
        );
        nodeViews = common.fetchTable(
            TABLE_NODES,
            query<DbNode>().where('parent').eq(conversationId).orderBy('id', 'ASC').build(),
        );
        edgeViews = common.fetchTable(
            TABLE_EDGES,
            query<DbEdge>().where('parent').eq(conversationId).orderBy('id', 'ASC').build(),
        );
        localizationViews = common.fetchTable(
            TABLE_LOCALIZATIONS,
            query<Localization>().where('parent').eq(conversationId).build(),
        );

        // Wait for all tables to initialize (poll-based approach)
        await new Promise<void>((resolve, reject) => {
            const checkInitialized = () => {
                if (
                    conversationViews?.isInitialized &&
                    nodeViews?.isInitialized &&
                    edgeViews?.isInitialized &&
                    localizationViews?.isInitialized
                ) {
                    if (conversationViews.rows.length !== 1) {
                        reject('Failed to load conversation');
                        return;
                    }
                    resolve();
                } else {
                    // Check again on next tick
                    setTimeout(checkInitialized, 10);
                }
            };
            checkInitialized();
        });
    }

    function clearGraph(): void {
        isConversationInitialized = false;
        nodesSelected = [];
        edgesSelected = [];
        currentLayoutAuto = false;
        currentLayoutVertical = false;
        focusedRowView = undefined;

        // Release table views (effects will stop reacting automatically)
        if (conversationViews) common.releaseTable(conversationViews);
        if (edgeViews) common.releaseTable(edgeViews);
        if (nodeViews) common.releaseTable(nodeViews);
        if (localizationViews) common.releaseTable(localizationViews);

        // Clear table view references
        conversationViews = undefined;
        nodeViews = undefined;
        edgeViews = undefined;
        localizationViews = undefined;

        if (nodes.length !== 0) nodes = [];
        if (edges.length !== 0) edges = [];
        viewport = { ...DEFAULT_VIEWPORT };
    }

    // ============================================================================
    // Context
    // ============================================================================

    setContext(GRAPH_CONTEXT, {
        onDelete: onDelete,
    } as GraphContext);

    // ============================================================================
    // Lifecycle
    // ============================================================================

    onMount(() => {
        // Initialize SvelteFlow hooks now that we're mounted inside SvelteFlowProvider
        updateNodeInternals = createUpdateNodeInternals();
        svelteFlowApi = useSvelteFlow();

        unsubscriberFocus = focusManager.subscribe(onFocusChanged);

        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);

        window.addEventListener(EVENT_DOCK_SELECTION_CHANGED, onDockFocusChanged);
    });

    onDestroy(() => {
        if (unsubscriberFocus) unsubscriberFocus();

        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('paste', handlePaste);

        window.removeEventListener(EVENT_DOCK_SELECTION_CHANGED, onDockFocusChanged);

        clearGraph();

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && isConversationViewportKey(key)) {
                localStorage.removeItem(key);
            }
        }
    });
</script>

<div class="graph-container" bind:this={graphContainerEl}>
    {#if !isConversationInitialized}
        <div class="graph-placeholder">
            <p>Select a conversation to view the graph</p>
        </div>
    {:else}
        <!-- Toolbar -->
        <div class="graph-toolbar">
            <div class="toolbar-left">
                <input
                    type="number"
                    min="1"
                    max="10"
                    bind:value={nodesToAddCount}
                    disabled={isLoading}
                    class="node-count-input"
                />
                <Dropdown
                    options={actorOptions}
                    bind:value={actorToAddId}
                    disabled={isLoading}
                    fullWidth={false}
                />
                <Button onclick={() => onCreateNode(NODE_TYPES.DIALOGUE)} disabled={isLoading}>
                    Add Node
                </Button>
            </div>

            <div class="toolbar-right">
                <ActionMenu
                    items={viewMenuItems}
                    onselect={onViewMenuSelect}
                    disabled={isLoading}
                >
                    Graph
                </ActionMenu>
                <Button
                    variant="ghost"
                    iconOnly
                    onclick={() => showSettingsModal = true}
                    title="Graph Settings"
                >
                    <IconSettings size={16} />
                </Button>
            </div>
        </div>

        <!-- Graph -->
        <div class="graph-content">
            <SvelteFlow
                id="conversation-editor"
                bind:nodes
                bind:edges
                bind:viewport
                {snapGrid}
                {nodeTypes}
                {edgeTypes}
                {isValidConnection}
                defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                connectionLineType={!focusedConversation || focusedConversation?.is_layout_auto
                    ? ConnectionLineType.Step
                    : ConnectionLineType.Bezier}
                minZoom={MIN_ZOOM}
                proOptions={{ hideAttribution: true }}
                onbeforeconnect={onBeforeConnect}
                onbeforedelete={onBeforeDelete}
                onselectionchange={onSelectionChange}
                onnodedragstop={onNodeDragStop}
                connectionRadius={50}
                zoomOnDoubleClick={false}
            >
                <Controls showLock={false}>
                    <ControlButton
                        onclick={() => graphMinimapVisible.update(v => !v)}
                        title={$graphMinimapVisible ? 'Hide minimap' : 'Show minimap'}
                    >
                        {$graphMinimapVisible ? '🗺' : '🗺'}
                    </ControlButton>
                </Controls>
                <Background gap={snapGrid} variant={BackgroundVariant.Dots} />
                {#if $graphMinimapVisible}
                    <MiniMap />
                {/if}
            </SvelteFlow>
        </div>

        <!-- Status Bar -->
        <GraphStatusBar
            conversationName={focusedConversation?.name}
            selectedNodeCount={nodesSelected.length}
            selectedEdgeCount={edgesSelected.length}
        />
    {/if}
</div>

<!-- Settings Modal -->
<GraphSettingsModal bind:open={showSettingsModal} />

<style>
    .graph-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background: var(--gs-bg-primary);
    }

    .graph-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--gs-fg-secondary);
    }

    .graph-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: var(--gs-bg-tertiary);
        border-bottom: 1px solid var(--gs-border-secondary);
        gap: 12px;
    }

    .toolbar-left,
    .toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .node-count-input {
        width: 50px;
        padding: 4px 8px;
        background: var(--gs-input-bg);
        border: 1px solid var(--gs-input-border);
        color: var(--gs-input-fg);
        border-radius: 2px;
    }

    .graph-content {
        flex: 1;
        position: relative;
    }

    /* Svelte Flow overrides */
    :global(.svelte-flow) {
        background: var(--gs-bg-primary) !important;
    }

    :global(.svelte-flow__background) {
        background: var(--gs-bg-primary) !important;
    }

    :global(.svelte-flow__minimap) {
        background: var(--gs-bg-tertiary) !important;
    }

    :global(.svelte-flow__controls) {
        background: var(--gs-bg-tertiary) !important;
        border: 1px solid var(--gs-border-secondary) !important;
    }

    :global(.svelte-flow__controls-button) {
        background: var(--gs-button-secondary-bg) !important;
        border-bottom: 1px solid var(--gs-border-secondary) !important;
        fill: var(--gs-fg-primary) !important;
    }

    :global(.svelte-flow__controls-button:hover) {
        background: var(--gs-button-secondary-hover-bg) !important;
    }

    :global(.svelte-flow__edge-path) {
        stroke: var(--gs-fg-primary) !important;
        stroke-width: 2 !important;
    }

    :global(.svelte-flow__edge.selected .svelte-flow__edge-path) {
        stroke: var(--gs-border-focus) !important;
        stroke-width: 3 !important;
    }

    :global(.svelte-flow__connection-line) {
        stroke: var(--gs-border-focus) !important;
        stroke-width: 2 !important;
    }

    :global(.svelte-flow__connection-path) {
        stroke: var(--gs-border-focus) !important;
        stroke-width: 2 !important;
    }
</style>
