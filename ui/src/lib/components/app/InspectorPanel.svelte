<script lang="ts">
    /**
     * Fixed Inspector Panel with Connection and Settings Bars.
     *
     * This component is always visible on the right side of the app.
     * It contains:
     * - Top bar with connection button (left) and settings button (right)
     * - Connection accordion (expands below top bar when connection button clicked)
     * - Settings accordion (expands below top bar when settings button clicked)
     * - Inspector content below (shows selected item properties)
     *
     * Only one accordion can be open at a time.
     */
    import { onMount } from 'svelte';
    import { bridge } from '$lib/api';
    import {
        dbConnected,
        dbType,
        connectionStatus,
        getSavedConnectionConfig,
        disconnect as disconnectStore,
        connect as connectStore,
    } from '$lib/stores/connection.js';
    import Inspector from '$lib/components/inspector/Inspector.svelte';
    import SettingsPanel from './SettingsPanel.svelte';
    import { Button, TabGroup, Input } from '$lib/components/common';

    // Notifications
    import { toastError } from '$lib/stores/notifications.js';

    // Panel state - only one can be open at a time
    type ActivePanel = 'none' | 'connection' | 'settings';
    let activePanel: ActivePanel = $state('none');

    // Connection form state
    let selectedDbType: 'sqlite' | 'postgres' = $state('sqlite');
    let isConnecting = $state(false);

    // PostgreSQL form fields
    let pgHost = $state('localhost');
    let pgPort = $state(5432);
    let pgDatabase = $state('');
    let pgUser = $state('');
    let pgPassword = $state('');

    // Load saved PostgreSQL config on mount (for form pre-fill)
    onMount(() => {
        const savedConfig = getSavedConnectionConfig();
        if (savedConfig && savedConfig.type === 'postgres') {
            selectedDbType = 'postgres';
            pgHost = savedConfig.host || 'localhost';
            pgPort = savedConfig.port || 5432;
            pgDatabase = savedConfig.database || '';
            pgUser = savedConfig.username || '';
            // Note: password is never saved
        }
    });

    let connected = $derived($dbConnected);
    let currentDbType = $derived($dbType);
    let status = $derived($connectionStatus);

    function toggleConnectionPanel() {
        if (connected) {
            // If connected, clicking disconnects
            handleDisconnect();
        } else {
            // Toggle connection panel
            activePanel = activePanel === 'connection' ? 'none' : 'connection';
        }
    }

    function toggleSettingsPanel() {
        activePanel = activePanel === 'settings' ? 'none' : 'settings';
    }

    async function handleCreateSqlite() {
        isConnecting = true;
        try {
            const result = await bridge.saveSqliteDialog();
            if (!result.cancelled && result.filePath) {
                connectStore({ type: 'sqlite', filepath: result.filePath }, true);
                activePanel = 'none';
            }
        } catch (error) {
            toastError('Failed to create database', error);
        } finally {
            isConnecting = false;
        }
    }

    async function handleOpenSqlite() {
        isConnecting = true;
        try {
            const result = await bridge.openSqliteDialog();
            if (!result.cancelled && result.filePath) {
                connectStore({ type: 'sqlite', filepath: result.filePath });
                activePanel = 'none';
            }
        } catch (error) {
            toastError('Failed to open database', error);
        } finally {
            isConnecting = false;
        }
    }

    async function handleConnectPostgres() {
        if (!pgDatabase || !pgUser) return;

        isConnecting = true;
        try {
            connectStore({
                type: 'postgres',
                host: pgHost,
                port: pgPort,
                database: pgDatabase,
                username: pgUser,
                password: pgPassword,
            });
            activePanel = 'none';
        } catch (error) {
            toastError('Failed to connect', error);
        } finally {
            isConnecting = false;
        }
    }

    async function handleDisconnect() {
        try {
            // Pass false to keep saved connection for easy reconnect
            disconnectStore(false);
        } catch (error) {
            toastError('Failed to disconnect', error);
        }
    }
</script>

<div class="inspector-panel">
    <!-- Top Bar with Connection and Settings buttons -->
    <div class="top-bar">
        <button
            class="top-bar-button connection-button"
            class:active={activePanel === 'connection'}
            class:connected
            onclick={toggleConnectionPanel}
            title={connected ? 'Click to disconnect' : 'Connect to database'}
        >
            <span
                class="status-dot"
                class:connected
                class:disconnected={!connected}
            ></span>
            <span class="button-text">
                {#if status === 'connecting' || isConnecting}
                    Connecting...
                {:else if connected}
                    {currentDbType === 'postgres' ? 'PostgreSQL' : 'SQLite'}
                {:else}
                    Connect
                {/if}
            </span>
            <span class="button-text-hover">Disconnect</span>
            {#if !connected}
                <span class="chevron" class:expanded={activePanel === 'connection'}>▾</span>
            {/if}
        </button>

        <button
            class="top-bar-button"
            class:active={activePanel === 'settings'}
            onclick={toggleSettingsPanel}
            title="Project settings"
            disabled={!connected}
        >
            <span class="button-text">Settings</span>
            <span class="chevron" class:expanded={activePanel === 'settings'}>▾</span>
        </button>
    </div>

    <!-- Connection Panel (accordion) -->
    {#if activePanel === 'connection' && !connected}
        <div class="accordion-panel">
            <TabGroup
                tabs={[
                    { id: 'sqlite', label: 'SQLite' },
                    { id: 'postgres', label: 'PostgreSQL' }
                ]}
                bind:selected={selectedDbType}
            />

            {#if selectedDbType === 'sqlite'}
                <div class="sqlite-actions">
                    <Button variant="primary" onclick={handleCreateSqlite} disabled={isConnecting}>
                        New Database
                    </Button>
                    <Button onclick={handleOpenSqlite} disabled={isConnecting}>
                        Open Database
                    </Button>
                </div>
            {:else}
                <div class="postgres-form">
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label for="pgHost">Host</label>
                            <Input type="text" bind:value={pgHost} />
                        </div>
                        <div class="form-group" style="width: 80px;">
                            <label for="pgPort">Port</label>
                            <Input type="number" bind:value={pgPort} />
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="pgDatabase">Database</label>
                        <Input type="text" bind:value={pgDatabase} placeholder="database" />
                    </div>
                    <div class="form-group">
                        <label for="pgUser">Username</label>
                        <Input type="text" bind:value={pgUser} placeholder="username" />
                    </div>
                    <div class="form-group">
                        <label for="pgPassword">Password</label>
                        <Input type="password" bind:value={pgPassword} placeholder="password" />
                    </div>
                    <Button
                        variant="primary"
                        onclick={handleConnectPostgres}
                        disabled={isConnecting || !pgDatabase || !pgUser}
                    >
                        Connect
                    </Button>
                </div>
            {/if}
        </div>
    {/if}

    <!-- Settings Panel (accordion) -->
    {#if activePanel === 'settings' && connected}
        <div class="accordion-panel settings-panel">
            <SettingsPanel />
        </div>
    {:else}
        <!-- Inspector Content (hidden when settings panel is open) -->
        <div class="inspector-content">
            <Inspector />
        </div>
    {/if}
</div>

<style>
    .inspector-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--gs-bg-secondary);
        border-left: 1px solid var(--gs-border-primary);
    }

    /* Top Bar */
    .top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        padding: 6px 8px;
        background: var(--gs-bg-tertiary);
        border-bottom: 1px solid var(--gs-border-primary);
        flex-shrink: 0;
    }

    .top-bar-button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: var(--gs-bg-secondary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
        cursor: pointer;
        font-size: var(--gs-font-size-small);
        color: var(--gs-fg-secondary);
        transition: background-color 0.15s, border-color 0.15s;
    }

    .top-bar-button:hover:not(:disabled) {
        background: var(--gs-bg-hover);
        border-color: var(--gs-border-secondary);
    }

    .top-bar-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .top-bar-button.active {
        background: var(--gs-warning-bg);
        border-color: var(--gs-warning-border);
        color: var(--gs-warning-border);
    }

    .top-bar-button.active:hover:not(:disabled) {
        background: var(--gs-warning-bg);
    }

    .top-bar-button.connected {
        border-color: var(--gs-status-success);
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .status-dot.connected {
        background: var(--gs-status-success);
    }

    .status-dot.disconnected {
        background: var(--gs-status-error);
    }

    .button-text {
        flex: 1;
        text-align: left;
    }

    /* Hover text for disconnect - hidden by default */
    .button-text-hover {
        display: none;
        flex: 1;
        text-align: left;
        color: var(--gs-status-error);
    }

    /* When connected and hovered, show "Disconnect" and hide db name */
    .connection-button.connected:hover .button-text {
        display: none;
    }

    .connection-button.connected:hover .button-text-hover {
        display: block;
    }

    .connection-button.connected:hover {
        border-color: var(--gs-status-error);
        background: var(--gs-bg-hover);
    }

    .connection-button.connected:hover .status-dot {
        background: var(--gs-status-error);
    }

    .chevron {
        font-size: 0.625rem;
        transition: transform 0.15s;
    }

    .chevron.expanded {
        transform: rotate(180deg);
    }

    /* Accordion Panel */
    .accordion-panel {
        padding: 12px;
        background: var(--gs-bg-primary);
        border-bottom: 1px solid var(--gs-border-primary);
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 60vh;
        overflow-y: auto;
    }

    /* Settings panel expands to fill available space */
    .accordion-panel.settings-panel {
        flex: 1;
        max-height: none;
        border-bottom: none;
    }

    .sqlite-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .postgres-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .form-row {
        display: flex;
        gap: 8px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .form-group.flex-1 {
        flex: 1;
    }

    .form-group label {
        font-size: var(--gs-font-size-small);
        color: var(--gs-fg-secondary);
    }

    /* Inspector Content */
    .inspector-content {
        flex: 1;
        overflow: hidden;
    }
</style>
