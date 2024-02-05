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
    import { ASC } from '@lib/api/db/db-filter-interface';
    import { wait } from '@lib/utility/wait';

    type LocalObject = FlowNode | FlowEdge;
    type RemoteObject = Node | Edge;

    const NEW_GRAPH_OBJECT_ID_PREFIX: string = 'x';
    const NODE_TYPE_DIALOGUE = 'dialogue';
    const DEFAULT_VIEWPORT: Viewport = <Viewport>{ x: 0, y: 0, zoom: 1 };
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
    let unsubscriberNodeView: Unsubscriber;
    let unsubscriberEdgeView: Unsubscriber;
    let nodeViews: IDbTableView<Node>;
    let edgeViews: IDbTableView<Edge>;
    let localizations: IDbTableView<Localization>;
    let reconciliationInProgress: boolean = false;
    let pendingReconciliationNodeRemote: boolean = false;
    let pendingReconciliationNodeLocal: boolean = false;
    let pendingReconciliationEdgeLocal: boolean = false;
    let pendingReconciliationEdgeRemote: boolean = false;
    let isLoading: IsLoadingStore = new IsLoadingStore();
    let focused: Focus;
    $: focusedRowView = focused ? focused.rowView : undefined;

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
        focusManager.focus({ tableId: TABLE_ID_NODES, rowView: data.rowView });
    }

    // TODO
    function onClickCreate(): void {
        nodeCreateRemote();
    }

    async function nodeCreateRemote(local?: FlowNode): Promise<void> {
        if (!focused) return;

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
                let nodeType: string;
                let posX: number;
                let posY: number;
                if (local) {
                    nodeType = local.type;
                    posX = local.position.x;
                    posY = local.position.y;
                } else {
                    nodeType = NODE_TYPE_DIALOGUE;
                    posX = 0;
                    posY = 0;
                }
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
                        type: nodeType,
                        positionX: posX,
                        positionY: posY,
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
    }

    async function nodeUpdateRemote(local: FlowEdge, remote: Edge): Promise<void> {}
    async function nodeDeleteRemote(remote: Edge): Promise<void> {}
    function nodeCreateLocal(remote: Edge): FlowNode {}
    function nodeUpdateLocal(local: FlowEdge, remote: Edge): void {}
    async function edgeCreateRemote(local?: FlowEdge): Promise<void> {}
    async function edgeUpdateRemote(local: FlowEdge, remote: Edge): Promise<void> {}
    async function edgeDeleteRemote(remote: Edge): Promise<void> {}
    function edgeCreateLocal(remote: Edge): FlowEdge {}
    function edgeUpdateLocal(local: FlowEdge, remote: Edge): void {}

    async function runReconciliation<Local extends LocalObject, Remote extends RemoteObject>(
        isLocalOrigin: boolean,
        isForNodes: boolean,
    ): Promise<void> {
        // If a reconciliation is already in progress, wait until it finishes
        if (reconciliationInProgress) {
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
        let localObjectStore: Writable<Local[]>;
        let localObjects: Local[];
        let remoteObjects: IDbRowView<Remote>[];
        let creatorRemote: (localObject: Local) => Promise<void>;
        let updatorRemote: (localObject: Local, remoteObject: Remote) => Promise<void>;
        let deletorRemote: (remoteObject: Remote) => Promise<void>;
        let creatorLocal: (remoteObject: Remote) => Local;
        let updatorLocal: (localObject: Local, remoteObject: Remote) => void;
        if (isForNodes) {
            localObjectStore = <Writable<Local[]>>nodes;
            localObjects = <Local[]>get(nodes);
            remoteObjects = <IDbRowView<Remote>[]>get(nodeViews);
            creatorRemote = <(localObject: Local) => Promise<void>>nodeCreateRemote;
            updatorRemote = <(localObject: Local, remoteObject: Remote) => Promise<void>>(
                nodeUpdateRemote
            );
            deletorRemote = <(remoteObject: Remote) => Promise<void>>nodeDeleteRemote;
            creatorLocal = <(remoteObject: Remote) => Local>nodeCreateLocal;
            updatorLocal = <(localObject: Local, remoteObject: Remote) => void>nodeUpdateLocal;
        } else {
            localObjectStore = <Writable<Local[]>>edges;
            localObjects = <Local[]>get(edges);
            remoteObjects = <IDbRowView<Remote>[]>get(edgeViews);
            creatorRemote = <(localObject: Local) => Promise<void>>edgeCreateRemote;
            updatorRemote = <(localObject: Local, remoteObject: Remote) => Promise<void>>(
                edgeUpdateRemote
            );
            deletorRemote = <(remoteObject: Remote) => Promise<void>>edgeDeleteRemote;
            creatorLocal = <(remoteObject: Remote) => Local>edgeCreateLocal;
            updatorLocal = <(localObject: Local, remoteObject: Remote) => void>edgeUpdateLocal;
        }

        const newObjects: Local[] = [];
        let l: number = 0;
        let r: number = 0;
        for (; l < localObjects.length || r < remoteObjects.length; ) {
            const localObject: Local = l < localObjects.length ? localObjects[l] : undefined;
            const remoteObject: IDbRowView<Remote> =
                r < remoteObjects.length ? remoteObjects[r] : undefined;

            // New Local Node
            if (localObject && localObject.id.startsWith(NEW_GRAPH_OBJECT_ID_PREFIX)) {
                if (isLocalOrigin) {
                    // Create Remote
                    // don't capture what's created, another reconciliation will update the ID
                    console.log(`Create remote ${isForNodes ? 'node' : 'edge'}`);
                    await creatorRemote(localObject);
                } else {
                    // Ignore for now, assume this reconcilition will happen soon
                    console.log(`Cached node ${localObject.id} is unexpectedly out of date`);
                }
                l++;
                continue;
            }

            // Compare
            const localId: number = localObject ? parseInt(localObject.id) : Infinity;
            const remoteId: number = remoteObject ? remoteObject.id : Infinity;
            if (localId === remoteId) {
                if (isLocalOrigin) {
                    // Update Remote (if not equal)
                    console.log(`Update remote ${isForNodes ? 'node' : 'edge'}`);
                    await updatorRemote(localObject, get(remoteObject));
                } else {
                    // Update Local (if not equal)
                    console.log(`Update local ${isForNodes ? 'node' : 'edge'}`);
                    updatorLocal(localObject, get(remoteObject));
                }
                newObjects.push(localObject);
                l++;
                r++;
            } else if (localId < remoteId) {
                if (isLocalOrigin) {
                    // Ignore for now, assume this reconcilition will happen soon
                    console.log(`Cached node ${localId} is unexpectedly out of date`);
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
                    await deletorRemote(get(remoteObject));
                } else {
                    // Create Local
                    console.log(`Create local ${isForNodes ? 'node' : 'edge'}`);
                    newObjects.push(creatorLocal(get(remoteObject)));
                }
                r++;
            }
        }

        // If the graph is still loaded, update the stores
        localObjectStore.set(newObjects);

        // Wait
        await wait(300);
        reconciliationInProgress = false;

        // Kick off another reconciliation if needed
        // We always take remote changes over our own, even if they happened after local changes
        // You might lose changes this way, but they'd only be related to deletion / movement and
        // shouldn't happen much in practice
        if (pendingReconciliationNodeRemote) {
            pendingReconciliationNodeRemote = false;
            runReconciliation(false, true);
            return;
        }
        if (pendingReconciliationEdgeRemote) {
            pendingReconciliationEdgeRemote = false;
            runReconciliation(false, false);
            return;
        }
        if (pendingReconciliationNodeLocal) {
            pendingReconciliationNodeLocal = false;
            runReconciliation(true, true);
            return;
        }
        if (pendingReconciliationEdgeLocal) {
            pendingReconciliationEdgeLocal = false;
            runReconciliation(true, false);
            return;
        }

        // Check if focus has changed while saving
        onFocusChanged();
    }

    function onNodeViewsChanged(): void {
        runReconciliation(false, true);

        // nodes.set(
        //     rowViews.map((rowView: IDbRowView<Node>) => {
        //         const node: Node = get(rowView);
        //         return {
        //             id: node.id.toString(),
        //             type: 'dialogue',
        //             position: { x: node.positionX, y: node.positionY },
        //             data: <NodeData>{
        //                 rowView: rowView,
        //                 localizations: localizations,
        //             },
        //         };
        //     }),
        // );
    }

    function onEdgeViewsChanged(): void {
        runReconciliation(false, false);
    }

    function onNodesChanged(): void {
        runReconciliation(true, true);
    }

    function onEdgesChanged(): void {
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
            TABLE_ID_EGDES,
            createFilter<Edge>()
                .where()
                .column('parent')
                .eq(focused.rowView.id)
                .endWhere()
                .orderBy('id', ASC)
                .build(),
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

<div class="graph-container">
    <div class="graph-title-bar">
        <h4>{focusedRowView ? $focusedRowView.name : 'Please seleect a conversation'}</h4>
        <Button size="small" disabled={!focused || $isLoading} on:click={onClickCreate}
            >Create Node</Button
        >
    </div>
    <div class="graph-editor">
        <SvelteFlow
            {viewport}
            {nodes}
            {edges}
            {snapGrid}
            {nodeTypes}
            proOptions={{ hideAttribution: true }}
            on:nodeclick={onNodeClick}
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
