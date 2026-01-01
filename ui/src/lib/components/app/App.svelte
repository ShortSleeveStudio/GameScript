<script lang="ts">
    /**
     * Main application component.
     *
     * Uses a fixed split layout:
     * - Left: Golden Layout dock with dockable panels (Graph, Conversations, etc.)
     * - Right: Fixed Inspector panel with connection bar
     *
     * The Inspector is always visible and includes the database connection UI.
     */
    import { onMount, onDestroy } from 'svelte';
    import { initStores, startApp, dbConnected } from '$lib/stores';
    import Dock from './Dock.svelte';
    import ResizableSplit from './ResizableSplit.svelte';
    import InspectorPanel from './InspectorPanel.svelte';

    // Notifications
    import { toastError } from '$lib/stores/notifications.js';

    // Code output folder - notify backend when it changes
    import { codeOutputFolderTableView, getCodeOutputFolder } from '$lib/tables';
    import { bridge } from '$lib/api/bridge';

    // Track if stores are initialized
    let initialized = $state(false);

    // Notify backend when code output folder changes so it can set up file watcher
    let codeOutputFolderView = $derived(getCodeOutputFolder(codeOutputFolderTableView.rows));
    let codeOutputFolderValue = $derived(codeOutputFolderView?.data.value ?? null);

    $effect(() => {
        // Only notify if we're in an IDE and connected to a database
        if (bridge.isIde && $dbConnected) {
            bridge.watchCodeFolder(codeOutputFolderValue);
        }
    });

    // Global error handler
    function handleError(event: ErrorEvent): void {
        event.preventDefault();
        toastError('[GameScript] Unhandled error:', event.error);
    }

    function handleRejection(event: PromiseRejectionEvent): void {
        event.preventDefault();
        toastError('[GameScript] Unhandled rejection:', event.reason);
    }

    onMount(() => {
        // Initialize stores (pure initialization, no side effects)
        initStores();
        initialized = true;

        // Start the app (triggers side effects like auto-reconnect)
        startApp();

        // Set up global error handlers
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);
    });

    onDestroy(() => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleRejection);
    });

    /**
     * Prevent right-click context menu except on input elements.
     */
    function handleContextMenu(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        // Allow context menu on inputs and textareas for copy/paste
        if (tagName === 'input' || tagName === 'textarea') {
            return;
        }
        event.preventDefault();
    }

    let connected = $derived($dbConnected);
</script>

<div class="app" oncontextmenu={handleContextMenu}>
    {#if !initialized}
        <div class="loading">
            <p>Initializing...</p>
        </div>
    {:else}
        <ResizableSplit
            minRightWidth={280}
            maxRightWidth={500}
            initialRightWidth={320}
            storageKey="gs-inspector-width"
        >
            {#snippet left()}
                <div class="dock-container">
                    {#if connected}
                        <Dock />
                    {:else}
                        <div class="welcome">
                            <h1>GameScript</h1>
                            <p class="subtitle">Dialogue authoring for games</p>
                            <p class="hint">Connect to a database using the panel on the right to get started.</p>
                        </div>
                    {/if}
                </div>
            {/snippet}
            {#snippet right()}
                <div class="inspector-container">
                    <InspectorPanel />
                </div>
            {/snippet}
        </ResizableSplit>
    {/if}
</div>

<style>
    .app {
        width: 100%;
        height: 100vh;
        overflow: hidden;
        background: var(--gs-bg-primary);
        color: var(--gs-fg-primary);
        font-family: var(--gs-font-family);
    }

    .loading {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2rem;
    }

    .dock-container {
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .inspector-container {
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .welcome {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2rem;
        background: var(--gs-bg-secondary);
    }

    .welcome h1 {
        margin: 0 0 0.5rem 0;
        color: var(--gs-fg-link);
    }

    .subtitle {
        margin: 0 0 2rem 0;
        opacity: 0.7;
    }

    .hint {
        opacity: 0.7;
        font-size: 0.9rem;
        max-width: 300px;
    }
</style>
