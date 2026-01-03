<script lang="ts">
    /**
     * Settings Panel Component.
     *
     * Displays project settings including:
     * - Snapshot output path configuration
     * - Code workspace path configuration (reuses CodeFolderSelector)
     * - Auto-export options (on save, on focus loss)
     * - Manual "Export Now" button
     */
    import { Button, Checkbox, CodeFolderSelector, Dropdown } from '$lib/components/common';
    import { snapshotOutputPathTableView, getSnapshotOutputPath, codeTemplateTableView, getCodeTemplate } from '$lib/tables';
    import { snapshotOutputPath as snapshotOutputPathCrud, codeTemplate as codeTemplateCrud } from '$lib/crud';
    import type { CodeTemplateValue } from '$lib/crud/crud-code-template.js';
    import { bridge } from '$lib/api/bridge';
    import { toastError, toastSuccess } from '$lib/stores/notifications.js';
    import { autoExportOnBlur } from '$lib/stores/layout-defaults.js';
    import { exportController } from '$lib/export';

    /** Code template options for the dropdown */
    const CODE_TEMPLATE_OPTIONS = [
        { value: 'unity', label: 'Unity (C# Awaitable)' },
        { value: 'godot', label: 'Godot (C# Callback)' },
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

    // Export state - use Svelte store syntax for reactivity
    const exportProgress = exportController.progress;

    // Check if export is in progress
    let isExporting = $derived.by(() => {
        const progress = $exportProgress;
        return (
            progress.phase !== 'complete' &&
            progress.phase !== 'error' &&
            progress.phase !== 'cancelled'
        );
    });

    // Computed progress display
    let progressText = $derived.by(() => {
        const progress = $exportProgress;
        switch (progress.phase) {
            case 'preparing':
                return 'Preparing...';
            case 'fetching':
                return `Fetching ${progress.currentLocale}... (${progress.completedLocales + 1}/${progress.totalLocales})`;
            case 'serializing':
                return `Serializing ${progress.currentLocale}...`;
            case 'writing':
                return `Writing ${progress.currentLocale}...`;
            case 'complete':
                return 'Complete';
            case 'cancelled':
                return 'Cancelled';
            case 'error':
                return `Error: ${progress.error}`;
            default:
                return '';
        }
    });

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
     * Trigger manual snapshot export.
     */
    async function handleExportNow(): Promise<void> {
        if (!isSnapshotPathConfigured || !snapshotOutputPathValue) {
            toastError('Please configure a snapshot output path first');
            return;
        }

        try {
            const result = await exportController.exportAll(snapshotOutputPathValue);

            if (result.success) {
                if (result.localesExported === 0 && result.localesSkipped > 0) {
                    toastSuccess(`No changes to export (${result.localesSkipped} locales unchanged)`);
                } else {
                    const skippedMsg = result.localesSkipped > 0 ? `, ${result.localesSkipped} unchanged` : '';
                    toastSuccess(`Exported ${result.localesExported} locale(s)${skippedMsg} in ${result.durationMs}ms`);
                }
            } else if (result.error !== 'Export cancelled') {
                toastError('Export failed', result.error);
            }
        } catch (error) {
            toastError('Failed to export snapshots', error);
        }
    }

    /**
     * Cancel the current export.
     */
    function handleCancelExport(): void {
        exportController.cancel();
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

    <div class="settings-actions">
        {#if isExporting}
            <div class="export-progress">
                <span class="progress-text">{progressText}</span>
                <Button variant="ghost" size="small" onclick={handleCancelExport}>
                    Cancel
                </Button>
            </div>
        {:else}
            <Button
                variant="primary"
                onclick={handleExportNow}
                disabled={!isSnapshotPathConfigured}
            >
                Export Now
            </Button>
        {/if}
    </div>
</div>

<style>
    .settings-panel {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 0.75rem;
    }

    .settings-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .settings-section-header {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--gs-fg-primary);
        border-bottom: 1px solid var(--gs-border-primary);
        padding-bottom: 0.25rem;
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

    .settings-actions {
        padding-top: 0.5rem;
        border-top: 1px solid var(--gs-border-primary);
    }

    .export-progress {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .progress-text {
        font-size: 0.75rem;
        color: var(--gs-fg-secondary);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
