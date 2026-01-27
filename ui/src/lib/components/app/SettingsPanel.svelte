<script lang="ts">
    /**
     * Settings Panel Component.
     *
     * Displays project settings including:
     * - Snapshot output path configuration
     * - Code workspace path configuration (reuses CodeFolderSelector)
     * - Auto-export options (on save, on focus loss)
     * - Google Sheets integration (sign in, spreadsheet selection)
     */
    import { Button, Checkbox, CodeFolderSelector, Dropdown, Input } from '$lib/components/common';
    import { snapshotOutputPathTableView, getSnapshotOutputPath, codeTemplateTableView, getCodeTemplate } from '$lib/tables';
    import { snapshotOutputPath as snapshotOutputPathCrud, codeTemplate as codeTemplateCrud } from '$lib/crud';
    import type { CodeTemplateValue } from '$lib/crud/crud-code-template.js';
    import { bridge } from '$lib/api/bridge';
    import { toastError, toastSuccess } from '$lib/stores/notifications.js';
    import { autoExportOnBlur } from '$lib/stores/layout-defaults.js';
    import {
        googleSheetsHasCredentials,
        googleSheetsAuthenticated,
        googleSheetsEmail,
        googleSheetsSpreadsheet,
        googleSheetsAuthLoading,
        googleSheetsSelectLoading,
        setGoogleSheetsCredentials,
        signInGoogleSheets,
        signOutGoogleSheets,
        selectGoogleSheetsSpreadsheet,
        clearGoogleSheetsSpreadsheet,
    } from '$lib/stores';

    /** Code template options for the dropdown */
    const CODE_TEMPLATE_OPTIONS = [
        { value: 'unity', label: 'Unity (C# Awaitable)' },
        { value: 'godot', label: 'Godot (GDScript)' },
        { value: 'unreal', label: 'Unreal (C++ Delegate)' },
    ];

    // Reactive state from the shared table views
    let snapshotOutputPathView = $derived(getSnapshotOutputPath(snapshotOutputPathTableView.rows));
    let snapshotOutputPathValue = $derived(snapshotOutputPathView?.data.value ?? null);
    let isSnapshotPathConfigured = $derived(
        snapshotOutputPathValue !== null && snapshotOutputPathValue.trim() !== ''
    );
    let isSnapshotInitialized = $derived(snapshotOutputPathTableView.isInitialized);

    // Code template state
    let codeTemplateView = $derived(getCodeTemplate(codeTemplateTableView.rows));
    let codeTemplateValue = $derived((codeTemplateView?.data.value as CodeTemplateValue) ?? 'unity');
    let isTemplateInitialized = $derived(codeTemplateTableView.isInitialized);

    /**
     * Open folder picker and save the selected snapshot output path.
     */
    async function handleSelectSnapshotPath(): Promise<void> {
        try {
            const result = await bridge.selectFolderDialog('Select Snapshot Output Folder');
            if (result.cancelled || !result.filePath) {
                return;
            }
            await snapshotOutputPathCrud.setSnapshotOutputPath(result.filePath);
        } catch (error) {
            toastError('Failed to configure snapshot output path', error);
        }
    }

    /**
     * Handle code template change.
     */
    async function handleTemplateChange(value: string | number): Promise<void> {
        try {
            await codeTemplateCrud.setCodeTemplate(value as CodeTemplateValue);
        } catch (error) {
            toastError('Failed to update code template', error);
        }
    }

    // =========================================================================
    // Google Sheets Credentials State
    // =========================================================================

    let credentialsExpanded = $state(false);
    let clientId = $state('');
    let clientSecret = $state('');
    let apiKey = $state('');
    let credentialsSaving = $state(false);

    /** Whether the credential form has valid input */
    let canSaveCredentials = $derived(clientId.trim() !== '' && clientSecret.trim() !== '');

    // =========================================================================
    // Google Sheets Handlers
    // =========================================================================

    /**
     * Toggle credentials section expanded state.
     */
    function toggleCredentials(): void {
        credentialsExpanded = !credentialsExpanded;
    }

    /**
     * Save Google API credentials.
     */
    async function handleSaveCredentials(): Promise<void> {
        if (!canSaveCredentials) return;

        credentialsSaving = true;
        try {
            const success = await setGoogleSheetsCredentials(clientId.trim(), clientSecret.trim(), apiKey.trim());
            if (success) {
                toastSuccess('Google API credentials saved');
                // Clear the inputs after successful save (they're stored securely)
                clientId = '';
                clientSecret = '';
                apiKey = '';
                credentialsExpanded = false;
            } else {
                toastError('Failed to save credentials');
            }
        } catch (error) {
            toastError('Failed to save credentials', error);
        } finally {
            credentialsSaving = false;
        }
    }

    /**
     * Handle Google Sheets sign in.
     */
    async function handleGoogleSignIn(): Promise<void> {
        try {
            const result = await signInGoogleSheets();
            if (result.success) {
                toastSuccess('Signed in to Google Sheets');
            } else if (result.error) {
                toastError('Failed to sign in to Google Sheets', result.error);
            }
        } catch (error) {
            toastError('Failed to sign in to Google Sheets', error);
        }
    }

    /**
     * Handle Google Sheets sign out.
     */
    async function handleGoogleSignOut(): Promise<void> {
        try {
            await signOutGoogleSheets();
            toastSuccess('Signed out from Google Sheets');
        } catch (error) {
            toastError('Failed to sign out from Google Sheets', error);
        }
    }

    /**
     * Handle spreadsheet selection.
     */
    async function handleSelectSpreadsheet(): Promise<void> {
        try {
            const result = await selectGoogleSheetsSpreadsheet();
            if (result.success) {
                toastSuccess('Spreadsheet selected');
            } else if (result.error && result.error !== 'cancelled') {
                // Don't show error if user just cancelled the picker
                toastError('Failed to select spreadsheet', result.error);
            }
        } catch (error) {
            toastError('Failed to select spreadsheet', error);
        }
    }

    /**
     * Handle clearing the selected spreadsheet.
     */
    async function handleClearSpreadsheet(): Promise<void> {
        try {
            await clearGoogleSheetsSpreadsheet();
        } catch (error) {
            toastError('Failed to clear spreadsheet', error);
        }
    }

    /**
     * Open the selected spreadsheet in the browser.
     */
    function handleOpenSpreadsheet(): void {
        if ($googleSheetsSpreadsheet?.url) {
            bridge.openExternal($googleSheetsSpreadsheet.url);
        }
    }
</script>

<div class="settings-panel">
    <div class="settings-section">
        <div class="settings-section-header">Snapshot Export</div>

        <div class="settings-field">
            <label class="settings-label">Output Path</label>
            {#if !isSnapshotInitialized}
                <div class="settings-loading">Loading...</div>
            {:else if !isSnapshotPathConfigured}
                <div class="settings-path-config">
                    <span class="settings-path-empty">Not configured</span>
                    <Button variant="primary" size="small" onclick={handleSelectSnapshotPath}>
                        Select Folder
                    </Button>
                </div>
            {:else}
                <div class="settings-path-config">
                    <span class="settings-path" title={snapshotOutputPathValue ?? ''}>
                        {snapshotOutputPathValue}
                    </span>
                    <Button variant="ghost" size="small" onclick={handleSelectSnapshotPath} title="Change output path">
                        Change
                    </Button>
                </div>
            {/if}
        </div>

        <div class="settings-field">
            <label class="settings-label">Auto-Export</label>
            <Checkbox
                checked={$autoExportOnBlur}
                onchange={(checked) => $autoExportOnBlur = checked}
                label="Export when IDE loses focus"
            />
        </div>
    </div>

    <div class="settings-section">
        <div class="settings-section-header">Code Workspace</div>
        <div class="settings-field">
            <label class="settings-label">Output Folder</label>
            <CodeFolderSelector showWarning={false} label="" />
        </div>
        <div class="settings-field">
            <label class="settings-label">Template</label>
            {#if !isTemplateInitialized}
                <div class="settings-loading">Loading...</div>
            {:else}
                <Dropdown
                    options={CODE_TEMPLATE_OPTIONS}
                    value={codeTemplateValue}
                    onchange={handleTemplateChange}
                />
            {/if}
        </div>
    </div>

    <div class="settings-section">
        <div class="settings-section-header">Google Sheets</div>

        <!-- API Credentials -->
        <div class="settings-field">
            <label class="settings-label">API Credentials</label>
            <div class="settings-path-config">
                {#if $googleSheetsHasCredentials}
                    <span class="settings-status-ok">Configured</span>
                    <Button
                        variant="ghost"
                        size="small"
                        onclick={toggleCredentials}
                    >
                        {credentialsExpanded ? 'Cancel' : 'Change'}
                    </Button>
                {:else}
                    <span class="settings-path-empty">Not configured</span>
                    <Button
                        variant="primary"
                        size="small"
                        onclick={toggleCredentials}
                    >
                        {credentialsExpanded ? 'Cancel' : 'Configure'}
                    </Button>
                {/if}
            </div>
        </div>

        <!-- Credential Input Fields (expanded) -->
        {#if credentialsExpanded}
            <div class="settings-credentials-form">
                <div class="settings-input-field">
                    <label class="settings-input-label">Client ID</label>
                    <Input
                        type="text"
                        placeholder="OAuth 2.0 Client ID"
                        bind:value={clientId}
                        disabled={credentialsSaving}
                    />
                </div>
                <div class="settings-input-field">
                    <label class="settings-input-label">Client Secret</label>
                    <Input
                        type="password"
                        placeholder="OAuth 2.0 Client Secret"
                        bind:value={clientSecret}
                        disabled={credentialsSaving}
                    />
                </div>
                <div class="settings-input-field">
                    <label class="settings-input-label">API Key <span class="settings-optional">(optional)</span></label>
                    <Input
                        type="text"
                        placeholder="API Key for Picker"
                        bind:value={apiKey}
                        disabled={credentialsSaving}
                    />
                </div>
                <div class="settings-credentials-actions">
                    <Button
                        variant="primary"
                        size="small"
                        onclick={handleSaveCredentials}
                        disabled={!canSaveCredentials || credentialsSaving}
                    >
                        {credentialsSaving ? 'Saving...' : 'Save Credentials'}
                    </Button>
                </div>
            </div>
        {/if}

        <!-- Account -->
        <div class="settings-field">
            <label class="settings-label">Account</label>
            <div class="settings-path-config">
                {#if $googleSheetsAuthenticated}
                    <span class="settings-email" title={$googleSheetsEmail ?? ''}>
                        {$googleSheetsEmail}
                    </span>
                    <Button
                        variant="ghost"
                        size="small"
                        onclick={handleGoogleSignOut}
                        disabled={$googleSheetsAuthLoading}
                    >
                        {$googleSheetsAuthLoading ? 'Signing out...' : 'Sign Out'}
                    </Button>
                {:else}
                    <span class="settings-path-empty">Not connected</span>
                    <Button
                        variant="primary"
                        size="small"
                        onclick={handleGoogleSignIn}
                        disabled={!$googleSheetsHasCredentials || $googleSheetsAuthLoading}
                        title={!$googleSheetsHasCredentials ? 'Configure API credentials first' : ''}
                    >
                        {$googleSheetsAuthLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                {/if}
            </div>
        </div>

        <!-- Spreadsheet -->
        {#if $googleSheetsAuthenticated}
            <div class="settings-field">
                <label class="settings-label">Spreadsheet</label>
                <div class="settings-path-config">
                    {#if $googleSheetsSpreadsheet}
                        <span class="settings-path" title={$googleSheetsSpreadsheet.name}>
                            {$googleSheetsSpreadsheet.name}
                        </span>
                        <Button
                            variant="ghost"
                            size="small"
                            onclick={handleOpenSpreadsheet}
                            title="Open spreadsheet in browser"
                        >
                            Open
                        </Button>
                        <Button
                            variant="ghost"
                            size="small"
                            onclick={handleSelectSpreadsheet}
                            disabled={$googleSheetsSelectLoading}
                            title="Change spreadsheet"
                        >
                            {$googleSheetsSelectLoading ? 'Selecting...' : 'Change'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="small"
                            onclick={handleClearSpreadsheet}
                            title="Clear spreadsheet selection"
                        >
                            Clear
                        </Button>
                    {:else}
                        <span class="settings-path-empty">None selected</span>
                        <Button
                            variant="primary"
                            size="small"
                            onclick={handleSelectSpreadsheet}
                            disabled={$googleSheetsSelectLoading}
                        >
                            {$googleSheetsSelectLoading ? 'Selecting...' : 'Select'}
                        </Button>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .settings-panel {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 0.75rem;
    }

    .settings-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 0.75rem;
        background: var(--gs-bg-tertiary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
    }

    .settings-section-header {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--gs-fg-secondary);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .settings-field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
    }

    .settings-label {
        font-size: 0.75rem;
        color: var(--gs-fg-secondary);
    }

    .settings-loading {
        font-size: 0.75rem;
        color: var(--gs-fg-secondary);
        font-style: italic;
    }

    .settings-path-config {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.5rem;
        background: var(--gs-bg-tertiary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 3px;
    }

    .settings-path-empty {
        font-size: 0.75rem;
        color: var(--gs-fg-secondary);
        font-style: italic;
        flex: 1;
    }

    .settings-path {
        font-size: 0.75rem;
        color: var(--gs-fg-primary);
        font-family: var(--gs-font-mono, monospace);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        min-width: 0;
    }

    .settings-email {
        font-size: 0.75rem;
        color: var(--gs-fg-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        min-width: 0;
    }

    .settings-status-ok {
        font-size: 0.75rem;
        color: var(--gs-fg-success, #22c55e);
        flex: 1;
    }

    .settings-credentials-form {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.5rem;
        background: var(--gs-bg-tertiary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 3px;
        margin-top: -0.375rem;
    }

    .settings-input-field {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .settings-input-label {
        font-size: 0.7rem;
        color: var(--gs-fg-secondary);
    }

    .settings-optional {
        font-style: italic;
        opacity: 0.7;
    }

    .settings-credentials-actions {
        display: flex;
        justify-content: flex-end;
        padding-top: 0.25rem;
    }
</style>
