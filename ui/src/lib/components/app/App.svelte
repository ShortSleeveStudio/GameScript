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

    // Code file watcher settings - notify backend when folder or extension changes
    import { codeOutputFolderTableView, getCodeOutputFolder, codeTemplateTableView, getCodeTemplate, snapshotOutputPathTableView, getSnapshotOutputPath } from '$lib/tables';
    import { bridge } from '$lib/api/bridge';
    import { getFileExtension, type CodeTemplateType } from '@gamescript/shared';

    // Auto-export on blur and keyboard shortcut
    import { autoExportOnBlur } from '$lib/stores/layout-defaults.js';
    import { exportController, triggerSave } from '$lib/export';
    import { undo, redo } from '$lib/undo';

    // Track if stores are initialized
    let initialized = $state(false);

    // Code file watcher - re-triggers when folder or extension changes
    let codeOutputFolderView = $derived(getCodeOutputFolder(codeOutputFolderTableView.rows));
    let codeOutputFolderValue = $derived(codeOutputFolderView?.data.value ?? null);
    let codeTemplateView = $derived(getCodeTemplate(codeTemplateTableView.rows));
    let codeTemplateValue = $derived((codeTemplateView?.data.value ?? 'unity') as CodeTemplateType);
    let codeFileExtension = $derived(getFileExtension(codeTemplateValue));

    // Snapshot output path for auto-export
    let snapshotOutputPathView = $derived(getSnapshotOutputPath(snapshotOutputPathTableView.rows));
    let snapshotOutputPathValue = $derived(snapshotOutputPathView?.data.value ?? null);
    let isSnapshotPathConfigured = $derived(
        snapshotOutputPathValue !== null && snapshotOutputPathValue.trim() !== ''
    );

    $effect(() => {
        // Set up code file watcher when folder or extension changes
        if (bridge.isIde && $dbConnected) {
            bridge.watchCodeFolder(codeOutputFolderValue, codeFileExtension);
        }
    });

    $effect(() => {
        // Set up snapshot command watcher for game engine IPC (Unity Edit button, etc.)
        if (bridge.isIde && $dbConnected) {
            bridge.watchSnapshotFolder(snapshotOutputPathValue);
        }
    });

    // Auto-export configuration
    /** Debounce delay in milliseconds to avoid rapid re-exports when quickly switching windows */
    const AUTO_EXPORT_DEBOUNCE_MS = 500;

    // Debounce timer for auto-export
    let autoExportTimeout: ReturnType<typeof setTimeout> | null = null;
    let isAutoExporting = false;

    /**
     * Check if export is possible (connected + path configured).
     */
    function canExport(): boolean {
        return $dbConnected && isSnapshotPathConfigured && snapshotOutputPathValue !== null;
    }

    /**
     * Handle window blur event for auto-export.
     * Uses debouncing to avoid rapid re-exports when quickly switching windows.
     */
    function handleWindowBlur(): void {
        if (!$autoExportOnBlur || !canExport() || isAutoExporting) {
            return;
        }

        // Clear any pending export
        if (autoExportTimeout) {
            clearTimeout(autoExportTimeout);
        }

        // Debounce to avoid rapid re-exports
        autoExportTimeout = setTimeout(async () => {
            autoExportTimeout = null;
            isAutoExporting = true;

            try {
                await exportController.exportAll(snapshotOutputPathValue!);
            } finally {
                isAutoExporting = false;
            }
        }, AUTO_EXPORT_DEBOUNCE_MS);
    }

    /**
     * Clear pending auto-export when window regains focus.
     */
    function handleWindowFocus(): void {
        if (autoExportTimeout) {
            clearTimeout(autoExportTimeout);
            autoExportTimeout = null;
        }
    }

    // Global error handler
    function handleError(event: ErrorEvent): void {
        event.preventDefault();
        toastError('[GameScript] Unhandled error:', event.error);
    }

    function handleRejection(event: PromiseRejectionEvent): void {
        event.preventDefault();
        toastError('[GameScript] Unhandled rejection:', event.reason);
    }

    // Unsubscribe functions for bridge events
    let unsubUndo: (() => void) | null = null;
    let unsubRedo: (() => void) | null = null;
    let unsubSave: (() => void) | null = null;

    onMount(() => {
        // Initialize stores (pure initialization, no side effects)
        initStores();
        initialized = true;

        // Start the app (triggers side effects like auto-reconnect)
        startApp();

        // Set up global error handlers
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        // Set up auto-export on blur
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('focus', handleWindowFocus);

        // Subscribe to bridge events for edit commands (from IDE plugins)
        unsubUndo = bridge.on('editUndo', () => undo());
        unsubRedo = bridge.on('editRedo', () => redo());
        unsubSave = bridge.on('editSave', () => triggerSave());
    });

    onDestroy(() => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleRejection);
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('focus', handleWindowFocus);

        // Clean up bridge event subscriptions
        unsubUndo?.();
        unsubRedo?.();
        unsubSave?.();

        // Clean up any pending auto-export
        if (autoExportTimeout) {
            clearTimeout(autoExportTimeout);
        }
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
