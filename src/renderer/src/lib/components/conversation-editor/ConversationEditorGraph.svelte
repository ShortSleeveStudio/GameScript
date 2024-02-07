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
    } from '@xyflow/svelte';
    import { onDestroy, onMount } from 'svelte';
    import type { ActionUnsubscriber } from '@lib/utility/action';
    import { focusManager, type Focus } from '@lib/stores/app/focus';
    import {
        TABLE_ID_CONVERSATIONS,
        TABLE_ID_EDGES,
        TABLE_ID_NODES,
        type Edge,
        type Node,
        type Localization,
        TABLE_ID_LOCALIZATIONS,
        TABLE_ID_ROUTINES,
        ROUTINE_TYPE_ID_USER,
        type Routine,
        type NodeType,
        type EdgeType,
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
    import type { EdgeData, NodeData } from '@lib/graph/graph-data';
    import { ASC } from '@lib/api/db/db-filter-interface';
    import { wait } from '@lib/utility/wait';
    import { TableWatcher } from '@lib/stores/utility/table-watcher';
    import { nodeDeleteRemote } from '@lib/crud/node-d';

    type LocalObject = FlowNode | FlowEdge;
    type RemoteObject = Node | Edge;
    interface GraphFunctions {
        localObjectStore: Writable<LocalObject[]>;
        creatorRemote: (localObject: LocalObject) => Promise<RemoteObject>;
        updatorRemote: (
            localObject: LocalObject,
            remoteObject: IDbRowView<RemoteObject>,
        ) => Promise<void>;
        deletorRemote: (remoteObject: RemoteObject, isLoading: IsLoadingStore) => Promise<void>;
        creatorLocal: (remoteObject: IDbRowView<RemoteObject>) => LocalObject;
        updatorLocal: (localObject: LocalObject, remoteObject: IDbRowView<RemoteObject>) => void;
        isInteractionActive: () => boolean;
    }

    const MIN_ZOOM: number = 0.1;
    const UPDATE_COOLOFF_MILLIS: number = 300;
    const NEW_GRAPH_OBJECT_ID_PREFIX: string = 'xy';
    const NODE_TYPE_DIALOGUE = 'dialogue';
    const DEFAULT_VIEWPORT: Viewport = <Viewport>{ x: 0, y: 0, zoom: 1 };
    const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = <DefaultEdgeOptions>{
        type: 'smoothstep',
    };
    const viewport: Writable<Viewport> = writable(<Viewport>{ ...DEFAULT_VIEWPORT });
    const nodes: Writable<FlowNode[]> = writable([]);
    const edges: Writable<FlowEdge[]> = writable([]);
    const snapGrid: SnapGrid = [30, 30];
    const nodeTypes = {
        dialogue: NodeDialogue,
    };

    let unsubscriberFocus: ActionUnsubscriber;
    let unsubscriberNode: Unsubscriber;
    let unsubscriberEdge: Unsubscriber;
    let tableWatcherNode: TableWatcher<Node>;
    let tableWatcherEdge: TableWatcher<Edge>;
    let unsubscriberLocalizationView: Unsubscriber;
    let nodeViews: IDbTableView<Node>;
    let edgeViews: IDbTableView<Edge>;
    let localizationViews: IDbTableView<Localization>;
    let reconciliationInProgress: boolean = false;
    let pendingReconciliationNodeRemote: boolean = false;
    let pendingReconciliationNodeLocal: boolean = false;
    let pendingReconciliationEdgeLocal: boolean = false;
    let pendingReconciliationEdgeRemote: boolean = false;
    let isLoading: IsLoadingStore = new IsLoadingStore();
    let nextNodeIndex: number = 0;
    let isConversationInitialized: boolean = false;
    let ignoreLocalUpdate: boolean = false;
    let lastUpdateRequestTime: number;
    let focused: Focus;
    $: focusedRowView = focused ? focused.rowView : undefined;

    const graphFunctionsNodes: GraphFunctions = {
        localObjectStore: nodes,
        creatorRemote: nodeCreateRemote,
        updatorRemote: nodeUpdateRemote,
        deletorRemote: nodeDeleteRemote,
        creatorLocal: nodeCreateLocal,
        updatorLocal: nodeUpdateLocal,
        isInteractionActive: nodeIsInteractionActive,
    };
    const graphFunctionsEdges: GraphFunctions = {
        localObjectStore: edges,
        creatorRemote: edgeCreateRemote,
        updatorRemote: edgeUpdateRemote,
        deletorRemote: edgeDeleteRemote,
        creatorLocal: edgeCreateLocal,
        updatorLocal: edgeUpdateLocal,
        isInteractionActive: edgeIsInteractionActive,
    };

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

    function onNodeClick(
        event: CustomEvent<{ event: MouseEvent | TouchEvent; node: FlowNode }>,
    ): void {
        const node: FlowNode = event.detail.node;
        const data: NodeData = node.data;
        if (!data || !data.rowView) return;
        focusManager.focus({ tableId: TABLE_ID_NODES, rowView: data.rowView });
    }

    function onEdgeClick(
        event: CustomEvent<{ event: MouseEvent | TouchEvent; edge: FlowEdge }>,
    ): void {
        const edge: FlowEdge = event.detail.edge;
        const data: EdgeData = edge.data;
        if (!data || !data.rowView) return;
        focusManager.focus({ tableId: TABLE_ID_EDGES, rowView: data.rowView });
    }

    // TODO
    function onClickCreateRemote(): void {
        nodeCreateRemote(<FlowNode>{
            type: NODE_TYPE_DIALOGUE,
            position: { x: 0, y: 0 },
        });
    }

    function onClickCreateLocal(): void {
        nodes.update((localNodes: FlowNode[]) => {
            localNodes.push(<FlowNode>{
                id: `${NEW_GRAPH_OBJECT_ID_PREFIX}-${nextNodeIndex++}`,
                type: NODE_TYPE_DIALOGUE,
                position: { x: 0, y: 0 },
                draggable: false,
                connectable: false,
            });
            return localNodes;
        });
    }
    // TODO

    async function nodeCreateRemote(local: FlowNode): Promise<Node> {
        let uiText: Localization;
        let voiceText: Localization;
        let condition: Routine;
        let code: Routine;
        let node: Node;
        await isLoading.wrapPromise(
            db.executeTransaction(async (conn: DbConnection) => {
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
                        type: local.type,
                        positionX: local.position.x,
                        positionY: local.position.y,
                    },
                    conn,
                );
            }),
        );

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'node creation',
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await db.deleteRow(TABLE_ID_NODES, node, conn);
                        await db.deleteRow(TABLE_ID_ROUTINES, code, conn);
                        await db.deleteRow(TABLE_ID_ROUTINES, condition, conn);
                        await db.deleteRow(TABLE_ID_LOCALIZATIONS, voiceText, conn);
                        await db.deleteRow(TABLE_ID_LOCALIZATIONS, uiText, conn);
                    });
                }),
                isLoading.wrapFunction(async () => {
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

        return node;
    }

    async function nodeUpdateRemote(local: FlowNode, remoteView: IDbRowView<Node>): Promise<void> {
        const remote: Node = get(remoteView);

        // Skip equality
        if (nodeIsEqual(local, remote)) return;

        // Update node
        const oldNode: Node = <Node>{ ...remote };
        const newNode: Node = <Node>{ ...remote };
        newNode.type = <NodeType>local.type;
        newNode.positionX = local.position.x;
        newNode.positionY = local.position.y;
        await isLoading.wrapPromise(db.updateRow(TABLE_ID_NODES, newNode));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'node update',
                isLoading.wrapFunction(async () => {
                    await db.updateRow(TABLE_ID_NODES, oldNode);
                }),
                isLoading.wrapFunction(async () => {
                    await db.updateRow(TABLE_ID_NODES, newNode);
                }),
            ),
        );
    }

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

        // Ensure remote data is set
        if (!local.data) {
            local.data = <NodeData>{
                rowView: remoteView,
                localizations: localizationViews,
            };
            local.draggable = true;
            local.connectable = true;
        }

        // Skip equality
        if (nodeIsEqual(local, remote)) return;
        local.type = remote.type;
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

    function nodeIsInteractionActive(): boolean {
        const flowNodes: FlowNode[] = get(nodes);
        for (let i = 0; i < flowNodes.length; i++) {
            if (flowNodes[i].dragging) {
                return true;
            }
        }
        return false;
    }

    async function edgeCreateRemote(local: FlowEdge): Promise<Edge> {
        // Sanity
        const [source, target] = isEdgeSourceTargetValid(local);

        // Create edge
        console.log(local);
        const edge: Edge = await isLoading.wrapPromise(
            // Create Node
            db.createRow(TABLE_ID_EDGES, <Edge>{
                parent: focused.rowView.id,
                // Graph Stuff
                type: local.type ?? 'smoothstep',
                source: source,
                target: target,
            }),
        );

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'edge creation',
                isLoading.wrapFunction(async () => {
                    await db.deleteRow(TABLE_ID_EDGES, edge);
                }),
                isLoading.wrapFunction(async () => {
                    await db.createRow(TABLE_ID_EDGES, edge);
                }),
            ),
        );
        return edge;
    }

    async function edgeUpdateRemote(local: FlowEdge, remoteView: IDbRowView<Edge>): Promise<void> {
        // Sanity
        const [source, target] = isEdgeSourceTargetValid(local);
        const remote: Edge = get(remoteView);

        // Skip equality
        if (edgeIsEqual(local, remote)) return;

        // Update node
        const oldEdge: Edge = <Edge>{ ...remote };
        const newEdge: Edge = <Edge>{ ...remote };
        newEdge.type = <EdgeType>local.type;
        newEdge.source = source;
        newEdge.target = target;
        await isLoading.wrapPromise(db.updateRow(TABLE_ID_EDGES, newEdge));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'edge update',
                isLoading.wrapFunction(async () => {
                    await db.updateRow(TABLE_ID_EDGES, oldEdge);
                }),
                isLoading.wrapFunction(async () => {
                    await db.updateRow(TABLE_ID_EDGES, newEdge);
                }),
            ),
        );
    }

    async function edgeDeleteRemote(remote: Edge, isLoading: IsLoadingStore): Promise<void> {
        // Detete
        const edgeToDelete: Edge = <Edge>{ ...remote };
        await isLoading.wrapPromise(db.deleteRow(TABLE_ID_EDGES, edgeToDelete));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'edge deletion',
                isLoading.wrapFunction(async () => {
                    await db.createRow(TABLE_ID_EDGES, edgeToDelete);
                }),
                isLoading.wrapFunction(async () => {
                    await db.deleteRow(TABLE_ID_EDGES, edgeToDelete);
                }),
            ),
        );
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

        // Make sure the row view is set
        if (!local.data) {
            local.data = <EdgeData>{
                rowView: remoteView,
                localizations: localizationViews,
            };
        }

        // Skip equality
        if (edgeIsEqual(local, remote)) return;
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

    function edgeIsInteractionActive(): boolean {
        return false;
    }

    function isEdgeSourceTargetValid(local: FlowEdge): readonly [source: number, target: number] {
        const source: number = parseInt(local.source);
        const target: number = parseInt(local.target);
        if (isNaN(source) || isNaN(target)) {
            throw new Error(
                `New edge had invalid source ${local.source} or target (${local.target})`,
            );
        }
        return [source, target];
    }

    async function runReconciliation(isLocalOrigin: boolean, isForNodes: boolean): Promise<void> {
        // If a reconciliation is already in progress or the conversation isn't initialized, wait
        lastUpdateRequestTime = Date.now();
        if (reconciliationInProgress || !isConversationInitialized) {
            if (isForNodes) {
                if (isLocalOrigin) {
                    pendingReconciliationNodeLocal = true;
                } else {
                    pendingReconciliationNodeRemote = true;
                }
            } else {
                if (isLocalOrigin) {
                    pendingReconciliationEdgeLocal = true;
                } else {
                    pendingReconciliationEdgeRemote = true;
                }
            }
            return;
        }
        reconciliationInProgress = true;

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

        // We apply updates coming in from remote immediately, but we apply updates to the remote
        // asyncronously and wait a cooloff period before sending them out to avoid spamming the
        // server. Also, it helps sidestep an issue with stores whereby we're calling set inside a
        // subscription callback.
        if (isLocalOrigin) {
            let diff: number;
            while ((diff = Date.now() - lastUpdateRequestTime) < UPDATE_COOLOFF_MILLIS) {
                await wait(diff);

                // Reset if interaction is still happening
                if (graphFunctions.isInteractionActive()) {
                    lastUpdateRequestTime = Date.now();
                }
            }
        } else {
            await wait(1); // This sidesteps the store issue mentioned
        }

        // Reset flags as needed
        if (isForNodes) {
            if (isLocalOrigin) {
                if (pendingReconciliationNodeLocal) pendingReconciliationNodeLocal = false;
            } else {
                if (pendingReconciliationNodeRemote) pendingReconciliationNodeRemote = false;
            }
        } else {
            if (isLocalOrigin) {
                if (pendingReconciliationEdgeLocal) pendingReconciliationEdgeLocal = false;
            } else {
                if (pendingReconciliationEdgeRemote) pendingReconciliationEdgeRemote = false;
            }
        }

        console.log(`RUNNING RECON [${isLocalOrigin ? 'LOCAL' : 'REMOTE'}]`);
        let localObjects: LocalObject[] = get(localWritable);
        let remoteObjects: IDbRowView<RemoteObject>[] = get(remoteWritable);
        const newObjects: LocalObject[] = [];
        let l: number = 0;
        let r: number = 0;
        for (; l < localObjects.length || r < remoteObjects.length; ) {
            const localObject: LocalObject = l < localObjects.length ? localObjects[l] : undefined;
            const remoteObject: IDbRowView<RemoteObject> =
                r < remoteObjects.length ? remoteObjects[r] : undefined;

            // New Local Node
            if (localObject && localObject.id.startsWith(NEW_GRAPH_OBJECT_ID_PREFIX)) {
                if (isLocalOrigin) {
                    // Create Remote
                    // don't capture what's created, another reconciliation will update the ID
                    console.log(`Create remote ${isForNodes ? 'node' : 'edge'}`);
                    try {
                        const newObject: RemoteObject =
                            await graphFunctions.creatorRemote(localObject);
                        localObject.id = newObject.id.toString();
                    } catch (error) {
                        focusManager.blur(TABLE_ID_CONVERSATIONS);
                        throw error;
                    }
                } else {
                    // Ignore for now, assume this reconcilition will happen soon
                    console.log(`Cached node ${localObject.id} is unexpectedly out of date`);
                }
                newObjects.push(localObject);
                l++;
                continue;
            }

            // Compare
            const localId: number = localObject ? parseInt(localObject.id) : Infinity;
            const remoteId: number = remoteObject ? remoteObject.id : Infinity;
            if (localId === remoteId) {
                if (isLocalOrigin) {
                    // Update Remote (if not equal)
                    // console.log(`Update remote ${isForNodes ? 'node' : 'edge'}`);
                    try {
                        await graphFunctions.updatorRemote(localObject, remoteObject);
                    } catch (error) {
                        focusManager.blur(TABLE_ID_CONVERSATIONS);
                        throw error;
                    }
                } else {
                    // Update Local (if not equal)
                    console.log(`Update local ${isForNodes ? 'node' : 'edge'}`);
                    graphFunctions.updatorLocal(localObject, remoteObject);
                }
                newObjects.push(localObject);
                l++;
                r++;
            } else if (localId < remoteId) {
                if (isLocalOrigin) {
                    // Ignore for now, assume this reconcilition will happen soon
                    focusManager.blur(TABLE_ID_CONVERSATIONS);
                    throw new Error(`Local node cache contained unexpected node: ${localId}`);
                } else {
                    // Delete Local
                    // Simply don't add to list
                    console.log(`Delete local ${isForNodes ? 'node' : 'edge'}`);
                }
                l++;
            } else {
                // remoteNode.id < localId
                if (isLocalOrigin) {
                    // Delete Remote
                    console.log(`Delete remote ${isForNodes ? 'node' : 'edge'}`);
                    try {
                        await graphFunctions.deletorRemote(get(remoteObject), isLoading);
                    } catch (error) {
                        focusManager.blur(TABLE_ID_CONVERSATIONS);
                        throw error;
                    }
                } else {
                    // Create Local
                    console.log(`Create local ${isForNodes ? 'node' : 'edge'}`);
                    newObjects.push(graphFunctions.creatorLocal(remoteObject));
                }
                r++;
            }
        }

        // Update the local store and ignore updates from subscription
        // This is syncronous, so we're safe from losing any changes
        ignoreLocalUpdate = true;
        graphFunctions.localObjectStore.set(newObjects);
        ignoreLocalUpdate = false;

        // Set finished
        reconciliationInProgress = false;

        // Kick off another reconciliation if needed
        // We always take remote changes over our own, even if they happened after local changes
        // You might lose changes this way, but they'd only be related to deletion / movement and
        // shouldn't happen much in practice
        if (pendingReconciliationNodeRemote) {
            console.log('recursing node recon remote');
            runReconciliation(false, true);
            return;
        }
        if (pendingReconciliationEdgeRemote) {
            console.log('recursing edge recon remote');
            runReconciliation(false, false);
            return;
        }
        if (pendingReconciliationNodeLocal) {
            console.log('recursing node recon local');
            runReconciliation(true, true);
            return;
        }
        if (pendingReconciliationEdgeLocal) {
            console.log('recursing edge recon local');
            runReconciliation(true, false);
            return;
        }

        // Check if focus has changed while saving
        onFocusChanged();
    }

    function onNodeViewsChanged(): void {
        console.log('NODE REMOTE CHANGE');
        updateIsConversationInitialized();
        runReconciliation(false, true);
    }

    function onEdgeViewsChanged(): void {
        updateIsConversationInitialized();
        runReconciliation(false, false);
    }

    function onLocalizationsChanged(): void {
        updateIsConversationInitialized();
        // it doesn't matter that we picked nodes, it'll trigger edge recon too
        runReconciliation(false, true);
    }

    function updateIsConversationInitialized(): void {
        if (!isConversationInitialized) {
            isConversationInitialized =
                nodeViews &&
                edgeViews &&
                localizationViews &&
                nodeViews.isInitialized &&
                edgeViews.isInitialized &&
                localizationViews.isInitialized;
        }
    }

    function onNodesChanged(): void {
        if (ignoreLocalUpdate || !isConversationInitialized) {
            return;
        }
        runReconciliation(true, true);
    }

    function onEdgesChanged(): void {
        if (ignoreLocalUpdate || !isConversationInitialized) {
            return;
        }
        runReconciliation(true, false);
    }

    function onFocusChanged(): void {
        const newFocus = focusManager.get(TABLE_ID_CONVERSATIONS);

        // Skip if already focused or reconciliation is in progress
        if (newFocus === focused || reconciliationInProgress) return;

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
            createFilter<Node>()
                .where()
                .column('parent')
                .eq(focused.rowView.id)
                .endWhere()
                .orderBy('id', ASC)
                .build(),
        );
        edgeViews = db.fetchTable<Edge>(
            TABLE_ID_EDGES,
            createFilter<Edge>()
                .where()
                .column('parent')
                .eq(focused.rowView.id)
                .endWhere()
                .orderBy('id', ASC)
                .build(),
        );
        localizationViews = db.fetchTable<Localization>(
            TABLE_ID_LOCALIZATIONS,
            createFilter().where().column('parent').eq(focused.rowView.id).endWhere().build(),
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

<div class="graph-container">
    <div class="graph-title-bar">
        <h4>{focusedRowView ? $focusedRowView.name : 'Please seleect a conversation'}</h4>
        <Button
            size="small"
            disabled={!focused || $isLoading || reconciliationInProgress}
            on:click={onClickCreateRemote}>Create Node [REMOTE]</Button
        >
        <Button
            size="small"
            disabled={!focused || $isLoading || reconciliationInProgress}
            on:click={onClickCreateLocal}>Create Node [LOCAL]</Button
        >
    </div>
    <div class="graph-editor">
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
            on:nodeclick={onNodeClick}
            on:edgeclick={onEdgeClick}
        >
            <Controls />
            <Background gap={snapGrid} variant={BackgroundVariant.Dots} />
            <MiniMap />
        </SvelteFlow>
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
