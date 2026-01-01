<script lang="ts">
    /**
     * Fixed Inspector Panel with Connection Bar.
     *
     * This component is always visible on the right side of the app.
     * It contains:
     * - Connection bar at top (always visible, shows status and connect/disconnect)
     * - Inspector content below (shows selected item properties)
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
    import { Button, TabGroup, Input } from '$lib/components/common';

    // Notifications
    import { toastError } from '$lib/stores/notifications.js';

    // Connection form state
    let showConnectForm = false;
    let selectedDbType: 'sqlite' | 'postgres' = 'sqlite';
    let isConnecting = false;

    // PostgreSQL form fields
    let pgHost = 'localhost';
    let pgPort = 5432;
    let pgDatabase = '';
    let pgUser = '';
    let pgPassword = '';

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

    $: connected = $dbConnected;
    $: currentDbType = $dbType;
    $: status = $connectionStatus;

    function toggleConnectForm() {
        showConnectForm = !showConnectForm;
    }

    async function handleCreateSqlite() {
        isConnecting = true;
        try {
            const result = await bridge.saveSqliteDialog();
            if (!result.cancelled && result.filePath) {
                connectStore({ type: 'sqlite', filepath: result.filePath }, true);
                showConnectForm = false;
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
                showConnectForm = false;
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
            showConnectForm = false;
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
    <!-- Connection Bar -->
    <div class="connection-bar">
        <div class="connection-status">
            <span
                class="status-dot"
                class:connected
                class:disconnected={!connected}
            ></span>
            <span class="status-text">
                {#if status === 'connecting' || isConnecting}
                    Connecting...
                {:else if connected}
                    {currentDbType === 'postgres' ? 'PostgreSQL' : 'SQLite'}
                {:else}
                    Not connected
                {/if}
            </span>
        </div>
        <div class="connection-actions">
            {#if connected}
                <Button variant="danger" size="small" onclick={handleDisconnect} title="Disconnect">
                    Disconnect
                </Button>
            {:else}
                <Button
                    size="small"
                    active={showConnectForm}
                    onclick={toggleConnectForm}
                >
                    {showConnectForm ? 'Cancel' : 'Connect'}
                </Button>
            {/if}
        </div>
    </div>

    <!-- Connection Form (shown when not connected and user clicks Connect) -->
    {#if !connected && showConnectForm}
        <div class="connect-form">
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

    <!-- Inspector Content -->
    <div class="inspector-content">
        <Inspector />
    </div>
</div>

<style>
    .inspector-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--gs-bg-secondary);
        border-left: 1px solid var(--gs-border-primary);
    }

    /* Connection Bar */
    .connection-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: var(--gs-bg-tertiary);
        border-bottom: 1px solid var(--gs-border-primary);
        flex-shrink: 0;
    }

    .connection-status {
        display: flex;
        align-items: center;
        gap: 8px;
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

    .status-text {
        font-size: var(--gs-font-size-small);
        color: var(--gs-fg-secondary);
    }

    /* Connection Form */
    .connect-form {
        padding: 12px;
        background: var(--gs-bg-primary);
        border-bottom: 1px solid var(--gs-border-primary);
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
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
